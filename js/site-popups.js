/* Iron Ascension - age gate + welcome popup
   Loaded on every customer-facing page (not admin.html). The age gate
   blocks the entire page behind a full-screen overlay on every single
   visit - it deliberately does not remember the visitor, per policy. Only
   after it's cleared does the welcome-signup popup get scheduled, and
   only on pages other than the cart/checkout page, so it never
   interrupts someone already mid-order. */

(function () {
  const AGE_GATE_SEEN_KEY = "ia_age_gate_seen";
  const WELCOME_SEEN_KEY = "ia_welcome_popup_seen";
  const WELCOME_POPUP_DELAY_MS = 8000;

  function buildAgeGate() {
    // sessionStorage, not localStorage: clears the moment the tab/browser
    // closes, so it never "remembers" the visitor long-term (shows again
    // on every new visit/session) - but it also shouldn't re-block every
    // single internal link click within the same browsing session, which
    // is what localStorage-free would otherwise cause.
    if (sessionStorage.getItem(AGE_GATE_SEEN_KEY)) {
      scheduleWelcomePopup();
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "age-gate-overlay";
    overlay.id = "age-gate-overlay";
    overlay.innerHTML = `
      <div class="age-gate-box">
        <img class="age-gate-logo" src="assets/images/logo/logo-footer.png" alt="Iron Ascension">
        <h2>Age Verification Required</h2>
        <p>Iron Ascension's catalog includes products intended for adults only.</p>
        <p class="age-gate-question">Are you 21 years of age or older?</p>
        <div class="age-gate-actions">
          <button type="button" id="age-gate-yes" class="btn btn-red">Yes, I am 21 or older</button>
          <button type="button" id="age-gate-no" class="btn btn-outline" style="color:#fff;border-color:#555">No, I am under 21</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = "hidden";

    document.getElementById("age-gate-yes").addEventListener("click", () => {
      sessionStorage.setItem(AGE_GATE_SEEN_KEY, "1");
      overlay.remove();
      document.documentElement.style.overflow = "";
      scheduleWelcomePopup();
    });
    document.getElementById("age-gate-no").addEventListener("click", () => {
      window.location.href = "https://www.google.com";
    });
  }

  function scheduleWelcomePopup() {
    if (document.body.dataset.page === "checkout") return;
    if (localStorage.getItem(WELCOME_SEEN_KEY)) return;
    setTimeout(showWelcomePopup, WELCOME_POPUP_DELAY_MS);
  }

  function showWelcomePopup() {
    if (localStorage.getItem(WELCOME_SEEN_KEY)) return;
    localStorage.setItem(WELCOME_SEEN_KEY, "1");

    const overlay = document.createElement("div");
    overlay.className = "welcome-popup-overlay";
    overlay.id = "welcome-popup-overlay";
    overlay.innerHTML = `
      <div class="welcome-popup-box">
        <button type="button" class="welcome-popup-close" id="welcome-popup-close" aria-label="Close">&times;</button>
        <h2>Get 10% Off Your First Order</h2>
        <p>Sign up and we'll email you a one-time discount code to use at checkout.</p>
        <form class="welcome-popup-form" id="welcome-popup-form" novalidate>
          <input type="email" id="welcome-popup-email" placeholder="you@example.com" required>
          <button type="submit" class="btn btn-red" id="welcome-popup-submit">Send Me My Code</button>
        </form>
        <div id="welcome-popup-msg" class="welcome-popup-msg" hidden></div>
      </div>`;
    document.body.appendChild(overlay);

    function closePopup() {
      overlay.remove();
    }
    document.getElementById("welcome-popup-close").addEventListener("click", closePopup);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closePopup();
    });

    document.getElementById("welcome-popup-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById("welcome-popup-email");
      const submitBtn = document.getElementById("welcome-popup-submit");
      const msg = document.getElementById("welcome-popup-msg");
      const email = emailInput.value.trim();
      if (!email) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
      try {
        const res = await fetch("/.netlify/functions/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong.");
        msg.hidden = false;
        msg.className = "welcome-popup-msg success";
        msg.textContent = "Check your email for your code.";
        document.getElementById("welcome-popup-form").hidden = true;
        setTimeout(closePopup, 2600);
      } catch (err) {
        msg.hidden = false;
        msg.className = "welcome-popup-msg error";
        msg.textContent = "Couldn't sign you up right now - please try again later.";
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Me My Code";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", buildAgeGate);
})();
