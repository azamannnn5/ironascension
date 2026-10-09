function productCard(product) {
  return `<article class="product" data-category="${product.categoryNumber}">
  <a class="product-image-link" href="product.html?id=${encodeURIComponent(product.id)}">
    <img class="product-image" src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy">
    ${badgeHtml(product.badge)}
  </a>
  <div class="product-info">
    <div class="product-category">CATEGORY ${product.categoryNumber ?? "-"} &middot; ${escapeHtml(product.categoryName || "")}</div>
    <h3>${escapeHtml(product.name)}</h3>
    <div class="price">${formatPrice(product)}</div>
    <div class="card-actions">
      <a class="btn btn-outline" href="product.html?id=${encodeURIComponent(product.id)}">View Product</a>
      <button class="btn btn-red" type="button" data-add-to-cart data-item-type="product" data-id="${product.id}"${product.inStock === false ? " disabled" : ""}>${product.inStock === false ? "Out of Stock" : "Add to Cart"}</button>
    </div>
  </div>
</article>`;
}

function renderProductGrid(targetId, products = PRODUCTS) {
  const target = document.getElementById(targetId);
  if (target) target.innerHTML = products.map(productCard).join("");
}

function specsTableHtml(specs) {
  if (!specs || !specs.length) return "";
  return `<div class="spec-table">${specs.map((s) => `<div class="spec-row"><span class="spec-label">${escapeHtml(s.label)}</span><span class="spec-value">${escapeHtml(s.value)}</span></div>`).join("")}</div>`;
}
function featuresListHtml(features) {
  if (!features || !features.length) return "";
  return `<ul class="feature-list">${features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`;
}

function renderProductDetail(targetId, id) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const p = findProduct(id);
  if (!p) {
    target.innerHTML = '<section class="section"><div class="container"><div class="card"><h2>Product not found</h2><p class="lead">The requested product could not be found.</p><a class="btn btn-red" href="products.html">Back to Products</a></div></div></section>';
    return;
  }

  // Verbatim structured content (Specifications, Features, QC) only
  // exists for products with approved copy on file - other products
  // still show the plain tagline/description layout only.
  const hasVerbatimDetail = !!(p.specs || p.features || p.qcCompound);

  target.innerHTML = `<section class="section"><div class="container two detail-layout">
  <div class="detail-image-wrap"><img class="detail-image" src="${p.image}" alt="${escapeHtml(p.name)}">${badgeHtml(p.badge)}</div>
  <div class="detail-info">
    <a class="back-link" href="${p.categoryId ? p.categoryId + ".html" : "products.html"}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>Back to ${escapeHtml(p.categoryName || "Products")}</a>
    <div class="eyebrow">Category ${p.categoryNumber ?? "-"} &middot; ${escapeHtml(p.categoryName || "")}</div>
    <h2>${escapeHtml(p.name)}</h2>
    ${p.tagline ? `<p class="lead">${escapeHtml(p.tagline)}</p>` : ""}
    ${p.batchStatus || p.purity ? `<div class="detail-meta-row">${p.batchStatus ? `<span class="detail-meta-tag">${escapeHtml(p.batchStatus)}</span>` : ""}${p.purity ? `<span class="detail-meta-tag">${escapeHtml(p.purity)}</span>` : ""}</div>` : ""}
    <div class="detail-price">${formatPrice(p)}</div>
    <div class="detail-stock-row">${stockStatusHtml(p)}</div>
    <p class="detail-description">${escapeHtml(p.description || "")}</p>
    <div class="qty-row">
      <label for="qty-${p.id}">Qty</label>
      <div class="qty-stepper">
        <button type="button" class="qty-btn qty-minus" aria-label="Decrease quantity"${p.inStock === false ? " disabled" : ""}>&minus;</button>
        <input type="number" id="qty-${p.id}" class="qty-input" min="1" value="1"${p.inStock === false ? " disabled" : ""}>
        <button type="button" class="qty-btn qty-plus" aria-label="Increase quantity"${p.inStock === false ? " disabled" : ""}>+</button>
      </div>
    </div>
    <div class="detail-actions">
      <button class="btn btn-red" type="button" data-add-to-cart data-item-type="product" data-id="${p.id}"${p.inStock === false ? " disabled" : ""}>${p.inStock === false ? "Out of Stock" : "Add to Cart"}</button>
      <a class="btn btn-outline" href="order.html">View Cart</a>
    </div>
    ${promoTeaserHtml()}
  </div>
</div></section>
${hasVerbatimDetail ? `<section class="section gray"><div class="container detail-verbatim">
  ${p.specs ? `<div class="detail-verbatim-block"><h3>Specifications &amp; Composition</h3>${specsTableHtml(p.specs)}</div>` : ""}
  ${p.features ? `<div class="detail-verbatim-block"><h3>Key Performance Features</h3>${featuresListHtml(p.features)}</div>` : ""}
  ${p.qcCompound ? `<div class="detail-verbatim-block"><h3>Quality Control &amp; Lab Verification</h3>
    ${p.qcIntro ? `<p class="qc-intro">${escapeHtml(p.qcIntro)}</p>` : ""}
    <div class="spec-table">
      <div class="spec-row"><span class="spec-label">Compound</span><span class="spec-value">${escapeHtml(p.qcCompound)}</span></div>
      ${p.qcAssayResult ? `<div class="spec-row"><span class="spec-label">Assay Result</span><span class="spec-value">${escapeHtml(p.qcAssayResult)}</span></div>` : ""}
      ${p.qcStatus ? `<div class="spec-row"><span class="spec-label">Status</span><span class="spec-value qc-status-passed">${escapeHtml(p.qcStatus)}</span></div>` : ""}
    </div>
  </div>` : ""}
</div></section>` : ""}
${(() => {
  const related = getRelatedProducts(p, 4);
  if (!related.length) return "";
  return `<section class="section"><div class="container">
    <div class="eyebrow">You May Also Like</div>
    <h2>More from ${escapeHtml(p.categoryName || "this category")}</h2>
    <div class="catalog-grid" style="margin-top:28px">${related.map(productCard).join("")}</div>
  </div></section>`;
})()}`;
}

function renderCategoryPage(targetId, number) {
  const target = document.getElementById(targetId);
  const category = getCategory(number);
  if (!target || !category) return;

  // The static page header above this section also shows the category
  // name/blurb (see category-N.html) - keep it in sync with live data too.
  const heading = document.getElementById("category-heading");
  if (heading) heading.textContent = category.name;
  const blurbEl = document.getElementById("category-blurb");
  if (blurbEl) blurbEl.textContent = category.blurb || "";

  const products = getProductsForCategory(category.number);
  const backLink = `<a class="back-link" href="products.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>Back to All Products</a>`;
  target.innerHTML = products.length
    ? `<section class="section"><div class="container">
        ${backLink}
        <div class="eyebrow">Category ${category.number}</div>
        <h2>${escapeHtml(category.name)}</h2>
        <div class="catalog-grid">${products.map(productCard).join("")}</div>
      </div></section>`
    : `<section class="section"><div class="container">
        ${backLink}
        <div class="eyebrow">Category ${category.number}</div>
        <h2>${escapeHtml(category.name)}</h2>
        <p class="lead">No products in this category yet.</p>
      </div></section>`;
}

// Delegated Add to Cart handler - covers grid quick-add buttons (qty 1)
// and the detail-page button (reads the qty stepper next to it). Disabled
// (out of stock) buttons are excluded up front so no click ever reaches
// this handler for them.
document.addEventListener("click", (e) => {
  const btn = e.target.closest('[data-add-to-cart][data-item-type="product"]');
  if (!btn || btn.disabled) return;
  const product = findProduct(btn.dataset.id);
  if (!product || product.inStock === false) return;
  const qtyInput = document.getElementById(`qty-${product.id}`);
  const qty = qtyInput ? Math.max(1, Number(qtyInput.value) || 1) : 1;
  addToCart({
    id: product.id,
    type: "product",
    name: product.name,
    priceCents: product.price == null ? null : Math.round(Number(effectivePrice(product.price, product.salePrice)) * 100),
    image: product.image,
  }, qty);
  const original = btn.textContent;
  btn.textContent = "Added";
  btn.disabled = true;
  setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1100);
});

document.addEventListener("DOMContentLoaded", () => {
  const doRender = () => {
    renderProductGrid("all-product-grid");
    const id = new URLSearchParams(location.search).get("id");
    renderProductDetail("product-detail-root", id);
    const categoryRoot = document.getElementById("category-product-root");
    if (categoryRoot) renderCategoryPage("category-product-root", categoryRoot.dataset.category);
  };
  if (window.catalogReadyPromise) {
    window.catalogReadyPromise.then(doRender);
  } else {
    doRender();
  }
  document.addEventListener("ia:currencychange", doRender);
});
