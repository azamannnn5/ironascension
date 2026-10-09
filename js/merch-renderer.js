function merchCard(item) {
  const img = merchPrimaryImage(item);
  return `<article class="product merch-product">
  <a class="product-image-link" href="merch-product.html?id=${encodeURIComponent(item.id)}">
    <img class="product-image" src="${img}" alt="${escapeHtmlMerch(item.name)}" loading="lazy">
    ${badgeHtml(item.badge)}
  </a>
  <div class="product-info">
    <div class="product-category">MERCH</div>
    <h3>${escapeHtmlMerch(item.name)}</h3>
    <p>${escapeHtmlMerch(item.description || "")}</p>
    <div class="price">${formatMerchPrice(item)}</div>
    <div class="card-actions">
      <a class="btn btn-outline" href="merch-product.html?id=${encodeURIComponent(item.id)}">View Merch</a>
      <button class="btn btn-red" type="button" data-add-to-cart data-item-type="merch" data-id="${item.id}"${item.inStock === false ? " disabled" : ""}>${item.inStock === false ? "Out of Stock" : "Add to Cart"}</button>
    </div>
  </div>
</article>`;
}

function renderMerchGrid(targetId) {
  const target = document.getElementById(targetId);
  if (target) target.innerHTML = MERCH.map(merchCard).join("");
}

function merchStockHtml(item) {
  return item.inStock === false
    ? `<span class="stock-text out-of-stock">Out of Stock</span>`
    : `<span class="stock-text in-stock">In Stock</span>`;
}

function renderMerchDetail(targetId, id) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const item = findMerch(id);
  if (!item) {
    target.innerHTML = '<section class="section"><div class="container"><div class="card"><h2>Merch item not found</h2><p class="lead">The requested merchandise item could not be found.</p><a class="btn btn-red" href="merch.html">Back to Merch</a></div></div></section>';
    return;
  }

  const colors = item.colors && item.colors.length ? item.colors : [{ name: "Default", image: "assets/images/product-placeholder.svg" }];
  const hasSizes = merchHasSizes(item);
  const disabled = item.inStock === false;

  const galleryDots = colors.map((c, i) => `<button type="button" class="gallery-dot${i === 0 ? " active" : ""}" data-index="${i}" aria-label="View ${escapeHtmlMerch(c.name)}"></button>`).join("");
  const colorSwatches = colors.map((c, i) => `<button type="button" class="color-swatch${i === 0 ? " active" : ""}" data-index="${i}" data-name="${escapeHtmlMerch(c.name)}">${escapeHtmlMerch(c.name)}</button>`).join("");
  const customColorBtn = `<button type="button" class="color-swatch color-swatch-custom" data-index="custom" data-name="Custom Color">Custom Color</button>`;

  const sizeButtons = hasSizes
    ? item.sizes.map((s, i) => `<button type="button" class="size-swatch${i === item.sizes.length - 1 ? " active" : ""}" data-size="${s.size}" data-price="${s.price}">${s.size}</button>`).join("")
      + `<button type="button" class="size-swatch size-swatch-custom" data-size="custom" data-price="">Custom Size</button>`
    : "";

  const defaultSize = hasSizes ? item.sizes[item.sizes.length - 1] : null;
  const initialPrice = hasSizes ? defaultSize.price : item.price;

  target.innerHTML = `<section class="section"><div class="container two detail-layout">
  <div class="merch-gallery">
    <div class="detail-image-wrap" id="merch-gallery-frame">
      ${badgeHtml(item.badge)}
      ${colors.map((c, i) => `<img class="detail-image gallery-slide${i === 0 ? " active" : ""}" data-index="${i}" src="${c.image}" alt="${escapeHtmlMerch(item.name)} - ${escapeHtmlMerch(c.name)}">`).join("")}
      <button type="button" class="gallery-arrow gallery-arrow-prev" aria-label="Previous color">&lsaquo;</button>
      <button type="button" class="gallery-arrow gallery-arrow-next" aria-label="Next color">&rsaquo;</button>
    </div>
    ${colors.length > 1 ? `<div class="gallery-dots">${galleryDots}</div>` : ""}
  </div>
  <div class="detail-info">
    <a class="back-link" href="merch.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>Back to Merch</a>
    <div class="eyebrow">Merch</div>
    <h2>${escapeHtmlMerch(item.name)}</h2>
    <p class="lead">${escapeHtmlMerch(item.description || "")}</p>
    <div class="detail-price" id="merch-detail-price">${priceHtml(initialPrice, merchSalePrice(item))}</div>
    <div class="detail-stock-row">${merchStockHtml(item)}</div>

    <div class="option-group">
      <div class="option-label">Color<span class="option-selected" id="merch-color-selected">${escapeHtmlMerch(colors[0].name)}</span></div>
      <div class="swatch-row">${colorSwatches}${customColorBtn}</div>
      <div class="custom-request-field" id="custom-color-field" hidden>
        <label for="custom-color-input">Tell us the color you'd like</label>
        <input type="text" id="custom-color-input" placeholder="e.g. Royal Blue">
      </div>
    </div>

    ${hasSizes ? `<div class="option-group">
      <div class="option-label">Size<span class="option-selected" id="merch-size-selected">${defaultSize.size}</span></div>
      <div class="swatch-row">${sizeButtons}</div>
      <div class="custom-request-field" id="custom-size-field" hidden>
        <label for="custom-size-input">Tell us the size you need</label>
        <input type="text" id="custom-size-input" placeholder="e.g. 3XL, or specific measurements">
      </div>
    </div>` : ""}

    <div class="qty-row">
      <label for="qty-${item.id}">Qty</label>
      <div class="qty-stepper">
        <button type="button" class="qty-btn qty-minus" aria-label="Decrease quantity"${disabled ? " disabled" : ""}>&minus;</button>
        <input type="number" id="qty-${item.id}" class="qty-input" min="1" value="1"${disabled ? " disabled" : ""}>
        <button type="button" class="qty-btn qty-plus" aria-label="Increase quantity"${disabled ? " disabled" : ""}>+</button>
      </div>
    </div>
    <div class="detail-actions">
      <button class="btn btn-red" type="button" data-add-to-cart data-item-type="merch" data-id="${item.id}"${disabled ? " disabled" : ""}>${disabled ? "Out of Stock" : "Add to Cart"}</button>
      <a class="btn btn-outline" href="order.html">View Cart</a>
    </div>
    ${promoTeaserHtml()}
  </div>
</div></section>`;

  initMerchDetailInteractions(item, colors, hasSizes);
}

// Handles gallery swipe/arrows/dots, color swatch selection (incl. custom
// color request field), and size selection with live price updates (incl.
// custom size request field). All state lives in data attributes on the
// rendered elements plus a couple of closured variables here - no need to
// re-render the whole detail block on every interaction.
function initMerchDetailInteractions(item, colors, hasSizes) {
  const frame = document.getElementById("merch-gallery-frame");
  if (!frame) return;
  const slides = Array.from(frame.querySelectorAll(".gallery-slide"));
  const dots = Array.from(document.querySelectorAll(".gallery-dot"));
  let activeIndex = 0;

  function showSlide(i) {
    if (i < 0 || i >= slides.length) return;
    activeIndex = i;
    slides.forEach((s, idx) => s.classList.toggle("active", idx === i));
    dots.forEach((d, idx) => d.classList.toggle("active", idx === i));
    document.querySelectorAll(".color-swatch[data-index]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.index === String(i));
    });
    const nameEl = document.getElementById("merch-color-selected");
    if (nameEl && colors[i]) nameEl.textContent = colors[i].name;
    const customField = document.getElementById("custom-color-field");
    if (customField) customField.hidden = true;
  }

  document.querySelector(".gallery-arrow-prev")?.addEventListener("click", () => showSlide((activeIndex - 1 + slides.length) % slides.length));
  document.querySelector(".gallery-arrow-next")?.addEventListener("click", () => showSlide((activeIndex + 1) % slides.length));
  dots.forEach((d) => d.addEventListener("click", () => showSlide(Number(d.dataset.index))));

  document.querySelectorAll(".color-swatch[data-index]:not(.color-swatch-custom)").forEach((btn) => {
    btn.addEventListener("click", () => showSlide(Number(btn.dataset.index)));
  });
  const customColorBtn = document.querySelector(".color-swatch-custom");
  const customColorField = document.getElementById("custom-color-field");
  if (customColorBtn && customColorField) {
    customColorBtn.addEventListener("click", () => {
      document.querySelectorAll(".color-swatch").forEach((b) => b.classList.remove("active"));
      customColorBtn.classList.add("active");
      const nameEl = document.getElementById("merch-color-selected");
      if (nameEl) nameEl.textContent = "Custom";
      customColorField.hidden = false;
      document.getElementById("custom-color-input")?.focus();
    });
  }

  // Touch swipe support on the gallery frame.
  let touchStartX = null;
  frame.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  frame.addEventListener("touchend", (e) => {
    if (touchStartX == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      if (dx < 0) showSlide((activeIndex + 1) % slides.length);
      else showSlide((activeIndex - 1 + slides.length) % slides.length);
    }
    touchStartX = null;
  }, { passive: true });

  if (hasSizes) {
    const priceEl = document.getElementById("merch-detail-price");
    const sizeSelectedEl = document.getElementById("merch-size-selected");
    const customSizeField = document.getElementById("custom-size-field");
    document.querySelectorAll(".size-swatch:not(.size-swatch-custom)").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".size-swatch").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if (sizeSelectedEl) sizeSelectedEl.textContent = btn.dataset.size;
        if (priceEl) priceEl.innerHTML = formatMoneyUSD(Number(btn.dataset.price));
        if (customSizeField) customSizeField.hidden = true;
      });
    });
    const customSizeBtn = document.querySelector(".size-swatch-custom");
    if (customSizeBtn && customSizeField) {
      customSizeBtn.addEventListener("click", () => {
        document.querySelectorAll(".size-swatch").forEach((b) => b.classList.remove("active"));
        customSizeBtn.classList.add("active");
        if (sizeSelectedEl) sizeSelectedEl.textContent = "Custom";
        customSizeField.hidden = false;
        document.getElementById("custom-size-input")?.focus();
      });
    }
  }
}

// Same escaping approach as product-data.js's escapeHtml - merch pages
// don't always load product-data.js, so this file carries its own copy
// rather than depending on load order between the two.
function escapeHtmlMerch(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Delegated Add to Cart handler. Reads the currently-selected size/color
// (including any custom-request text) straight from the rendered detail
// page at click time, so no extra state tracking is needed here beyond
// what's already on screen. Grid quick-add buttons (no detail page open)
// fall back to the item's default color/size.
document.addEventListener("click", (e) => {
  const btn = e.target.closest('[data-add-to-cart][data-item-type="merch"]');
  if (!btn || btn.disabled) return;
  const item = findMerch(btn.dataset.id);
  if (!item || item.inStock === false) return;

  const qtyInput = document.getElementById(`qty-${item.id}`);
  const qty = qtyInput ? Math.max(1, Number(qtyInput.value) || 1) : 1;

  const activeColorBtn = document.querySelector(".color-swatch.active");
  let colorLabel = item.colors && item.colors.length ? item.colors[0].name : null;
  let customColor = null;
  if (activeColorBtn) {
    if (activeColorBtn.classList.contains("color-swatch-custom")) {
      customColor = document.getElementById("custom-color-input")?.value.trim() || null;
      colorLabel = "Custom";
    } else {
      colorLabel = activeColorBtn.dataset.name;
    }
  }

  const activeSizeBtn = document.querySelector(".size-swatch.active");
  let sizeLabel = merchHasSizes(item) ? item.sizes[item.sizes.length - 1].size : null;
  let customSize = null;
  let unitPrice = effectivePrice(merchCardPrice(item), merchSalePrice(item));
  if (activeSizeBtn) {
    if (activeSizeBtn.classList.contains("size-swatch-custom")) {
      customSize = document.getElementById("custom-size-input")?.value.trim() || null;
      sizeLabel = "Custom";
    } else {
      sizeLabel = activeSizeBtn.dataset.size;
      unitPrice = Number(activeSizeBtn.dataset.price);
    }
  }

  const activeImage = document.querySelector(".gallery-slide.active");
  const image = activeImage ? activeImage.src : merchPrimaryImage(item);

  addToCart({
    id: item.id,
    type: "merch",
    name: item.name,
    priceCents: unitPrice == null ? null : Math.round(Number(unitPrice) * 100),
    image,
    size: sizeLabel,
    color: colorLabel,
    customSize,
    customColor,
  }, qty);

  const original = btn.textContent;
  btn.textContent = "Added";
  btn.disabled = true;
  setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1100);
});

document.addEventListener("DOMContentLoaded", () => {
  const doRender = () => {
    renderMerchGrid("merch-grid");
    const id = new URLSearchParams(location.search).get("id");
    renderMerchDetail("merch-detail-root", id);
  };
  if (window.merchReadyPromise) {
    window.merchReadyPromise.then(doRender);
  } else {
    doRender();
  }
  // Re-render on currency change so every displayed price (grid and any
  // in-progress size/color selection) reflects the newly selected
  // currency - simpler and more reliable than patching each live price
  // span individually.
  document.addEventListener("ia:currencychange", doRender);
});
