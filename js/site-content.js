/* Iron Ascension - admin-editable site content
   Loaded on every public page. Reads the live settings saved in
   /admin.html (via the same get-catalog endpoint the rest of the site
   uses) and applies them to whatever this page has: footer tagline,
   contact details, working hours, FAQ, Shipping & Returns text, homepage
   hero image and the Featured products row. Anything that hasn't been
   customized in admin simply keeps the page's built-in wording, and if
   the backend isn't reachable nothing here changes at all. */

(function () {
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  // Escaped text with **bold** support.
  function inline(str) {
    return esc(str).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  // Simple text markup used for the Shipping & Returns page:
  //   ## Section heading     ### Sub heading     - bullet     blank line = new paragraph
  // The first paragraph is styled as the page intro.
  function renderMarkup(text) {
    const lines = String(text || "").replace(/\r/g, "").split("\n");
    let html = "";
    let inSection = false;
    let inList = false;
    let para = [];
    let sawIntro = false;
    const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };
    const flushPara = () => {
      if (!para.length) return;
      const cls = !sawIntro && !inSection ? ' class="legal-intro"' : "";
      sawIntro = true;
      html += `<p${cls}>${inline(para.join(" "))}</p>`;
      para = [];
    };
    lines.forEach((raw) => {
      const line = raw.trim();
      if (!line) { flushPara(); closeList(); return; }
      if (line.startsWith("## ")) {
        flushPara(); closeList();
        if (inSection) html += "</section>";
        html += `<section><h2>${inline(line.slice(3))}</h2>`;
        inSection = true;
        return;
      }
      if (line.startsWith("### ")) { flushPara(); closeList(); html += `<h3>${inline(line.slice(4))}</h3>`; return; }
      if (line.startsWith("- ")) {
        flushPara();
        if (!inList) { html += "<ul>"; inList = true; }
        html += `<li>${inline(line.slice(2))}</li>`;
        return;
      }
      closeList();
      para.push(line);
    });
    flushPara(); closeList();
    if (inSection) html += "</section>";
    return html;
  }

  function joinNice(list) {
    return list.length > 1 ? list.slice(0, -1).join(", ") + ", and " + list[list.length - 1] : (list[0] || "");
  }

  // ---------- Apply settings ----------
  function applyFooter(s) {
    if (!s.footerTagline) return;
    document.querySelectorAll(".footer-tagline").forEach((el) => { el.textContent = s.footerTagline; });
  }

  function applyContact(s) {
    if (s.contactPhone) document.querySelectorAll("#legal-phone").forEach((el) => { el.textContent = s.contactPhone; });
    if (s.workingHours) document.querySelectorAll("[data-working-hours]").forEach((el) => { el.textContent = s.workingHours; });
    if (s.contactEmail) {
      document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
        if (a.getAttribute("href") !== "mailto:contact@ironascension.com") return;
        a.setAttribute("href", "mailto:" + s.contactEmail);
        if (a.textContent.trim() === "contact@ironascension.com") a.textContent = s.contactEmail;
      });
    }
  }

  function applyFaq(s) {
    const list = document.getElementById("faq-list");
    if (!list) return;
    const methods = Array.isArray(s.paymentMethods) && s.paymentMethods.length ? s.paymentMethods : null;
    if (Array.isArray(s.faqs) && s.faqs.length) {
      const methodsText = methods ? joinNice(methods) : "";
      list.innerHTML = s.faqs.map((f) => {
        const answer = String(f.a || "").replace(/\{payment_methods\}/g, methodsText);
        return `<div class="faq-item"><button type="button" class="faq-question"><span>${esc(f.q)}</span><span class="faq-icon"></span></button><div class="faq-answer"><p>${esc(answer).replace(/\n/g, "<br>")}</p></div></div>`;
      }).join("");
    } else if (methods) {
      // Built-in FAQ: just keep its payment methods answer in sync.
      const span = document.getElementById("faq-payment-methods");
      if (span) span.textContent = joinNice(methods);
    }
  }

  function applyShipping(s) {
    const body = document.getElementById("shipping-body");
    if (body && s.shippingContent) body.innerHTML = renderMarkup(s.shippingContent);
  }

  function applyHero(s) {
    if (!s.heroImageUrl) return;
    const img = document.querySelector(".hero-art img");
    if (img) img.src = s.heroImageUrl;
  }

  // ---------- Featured products (homepage) ----------
  let featuredItems = [];
  function featuredCard(item, type) {
    const price = item.price;
    const href = (type === "merch" ? "merch-product.html" : "product.html") + "?id=" + encodeURIComponent(item.id);
    const img = type === "merch"
      ? (item.colors && item.colors.length ? item.colors[0].image : item.image) || "assets/images/product-placeholder.svg"
      : item.image || "assets/images/product-placeholder.svg";
    const out = item.inStock === false;
    const action = type === "merch"
      ? `<a class="btn btn-red" href="${href}">${out ? "Out of Stock" : "Choose Options"}</a>`
      : `<button class="btn btn-red" type="button" data-featured-add="${esc(item.id)}"${out ? " disabled" : ""}>${out ? "Out of Stock" : "Add to Cart"}</button>`;
    return `<article class="product">
  <a class="product-image-link" href="${href}"><img class="product-image" src="${esc(img)}" alt="${esc(item.name)}" loading="lazy">${typeof badgeHtml === "function" ? badgeHtml(item.badge) : ""}</a>
  <div class="product-info">
    <div class="product-category">${type === "merch" ? "MERCH" : "CATEGORY " + esc(item.categoryNumber ?? "-") + " &middot; " + esc(item.categoryName || "")}</div>
    <h3>${esc(item.name)}</h3>
    <div class="price">${typeof priceHtml === "function" ? priceHtml(price, item.salePrice) : (price == null ? "Price TBD" : "$" + Math.ceil(price))}</div>
    <div class="card-actions"><a class="btn btn-outline" href="${href}">View</a>${action}</div>
  </div>
</article>`;
  }

  function applyFeatured(s, data) {
    const section = document.getElementById("featured-section");
    const grid = document.getElementById("featured-grid");
    if (!section || !grid) return;
    const ids = Array.isArray(s.featuredProductIds) ? s.featuredProductIds : [];
    const products = Array.isArray(data.products) ? data.products : [];
    const merch = Array.isArray(data.merch) ? data.merch : [];
    const cards = [];
    featuredItems = [];
    ids.forEach((id) => {
      const p = products.find((x) => x.id === id);
      if (p) { featuredItems.push(p); cards.push(featuredCard(p, "product")); return; }
      const m = merch.find((x) => x.id === id);
      if (m) cards.push(featuredCard(m, "merch"));
    });
    if (!cards.length) return;
    grid.innerHTML = cards.join("");
    section.hidden = false;
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-featured-add]");
    if (!btn || btn.disabled || typeof addToCart !== "function") return;
    const item = featuredItems.find((p) => p.id === btn.dataset.featuredAdd);
    if (!item) return;
    const unit = typeof effectivePrice === "function" ? effectivePrice(item.price, item.salePrice) : item.price;
    addToCart({
      id: item.id,
      type: "product",
      name: item.name,
      priceCents: unit == null ? null : Math.round(Number(unit) * 100),
      image: item.image,
    }, 1);
    const original = btn.textContent;
    btn.textContent = "Added";
    btn.disabled = true;
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1100);
  });

  // ---------- Footer social icons ----------
  // Each icon only appears if that platform's URL is filled in under
  // Social Links in /admin.html. Nothing shows by default.
  const SOCIAL_ICON_PATHS = {
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/>',
    tiktok: '<path fill="currentColor" d="M14.5 3h2.2c.2 1.6 1.4 2.9 3.1 3.1v2.2c-1.2 0-2.3-.4-3.1-1v6.2c0 2.8-2.3 5-5.1 5-2.8 0-5-2.2-5-5s2.2-5 5-5c.3 0 .6 0 .9.1v2.3c-.3-.1-.6-.2-.9-.2-1.5 0-2.7 1.2-2.7 2.8s1.2 2.8 2.7 2.8c1.6 0 2.9-1.3 2.9-2.9V3z"/>',
    facebook: '<path fill="currentColor" d="M13.5 21v-7.6h2.6l.4-3h-3v-1.9c0-.9.2-1.5 1.5-1.5h1.6V4.3C15.9 4.2 15 4.1 14 4.1c-2.3 0-3.9 1.4-3.9 4v2.3H7.5v3H10V21h3.5z"/>',
    twitter: '<path fill="currentColor" d="M18.9 5.5h2.4l-5.3 6 6.2 8h-4.8l-3.8-4.9-4.3 4.9H6.9l5.6-6.4-6-7.6h4.9l3.4 4.5 4.1-4.5zm-.8 12.6h1.3L8 6.8H6.6l11.5 11.3z"/>',
    youtube: '<rect x="2.5" y="6" width="19" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path fill="currentColor" d="M10.5 9.5l5 2.5-5 2.5z"/>',
  };
  function applySocials(socials) {
    document.querySelectorAll("#footer-social-mount").forEach((mount) => {
      if (!socials) { mount.innerHTML = ""; return; }
      const links = Object.keys(SOCIAL_ICON_PATHS)
        .filter((key) => socials[key])
        .map((key) => `<a href="${socials[key]}" target="_blank" rel="noopener" aria-label="${key}"><svg viewBox="0 0 24 24">${SOCIAL_ICON_PATHS[key]}</svg></a>`)
        .join("");
      mount.innerHTML = links;
    });
  }

  // ---------- Go ----------
  async function init() {
    try {
      const res = await fetch("/.netlify/functions/get-catalog");
      if (!res.ok) return;
      const data = await res.json();
      const s = data && data.settings;
      if (!s) return;
      applyFooter(s);
      applyContact(s);
      applyFaq(s);
      applyShipping(s);
      applyHero(s);
      applyFeatured(s, data);
      applySocials(s.socials);
    } catch (err) {
      // Offline or backend not connected - built-in page content stands.
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
