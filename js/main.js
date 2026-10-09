/* Iron Ascension site-wide JS */
document.addEventListener("DOMContentLoaded", () => {
  const menu = document.querySelector(".mobile-menu");
  const nav = document.querySelector(".navlinks");

  if (menu && nav) {
    menu.addEventListener("click", () => {
      nav.classList.toggle("mobile-open");
    });
  }

  document.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      const value = button.dataset.filter;
      document.querySelectorAll("[data-category]").forEach(card => {
        card.hidden = !(value === "all" || card.dataset.category === value);
      });
    });
  });
});

// ---------- Quantity stepper (+/- buttons) ----------
// Delegated so it works for any .qty-stepper on any page - product detail,
// merch detail, and cart rows all share this one handler. Dispatches a
// real "change" event after adjusting the value, so cart.js's existing
// change listener on .cart-qty-input still fires and updates the cart
// exactly as if the customer had typed a new number in directly.
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".qty-plus, .qty-minus");
  if (!btn) return;
  const input = btn.closest(".qty-stepper")?.querySelector(".qty-input");
  if (!input || input.disabled) return;
  const min = Number(input.min) || 1;
  const current = Number(input.value) || min;
  const next = btn.classList.contains("qty-plus") ? current + 1 : Math.max(min, current - 1);
  if (next === current) return;
  input.value = next;
  input.dispatchEvent(new Event("change", { bubbles: true }));
});
