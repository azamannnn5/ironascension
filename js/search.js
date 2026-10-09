/* Iron Ascension - live search
   Works on any page that has a #site-search-mount element. Searches
   whichever catalog array is present on the page - PRODUCTS (products.html,
   category pages) or MERCH (merch.html) - so this one file covers both
   without needing to know which page it's on. Results update as you type,
   no submit needed. */

function buildSiteSearch(mountId, opts) {
  const mount = document.getElementById(mountId);
  if (!mount) return;

  mount.innerHTML = `
    <div class="search-wrap">
      <div class="search-input-row">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="${mountId}-input" placeholder="${opts.placeholder}" autocomplete="off">
      </div>
      <div class="search-results" id="${mountId}-results" hidden></div>
    </div>
  `;

  const input = document.getElementById(`${mountId}-input`);
  const results = document.getElementById(`${mountId}-results`);

  function render(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      results.hidden = true;
      results.innerHTML = "";
      return;
    }
    const items = opts.getItems();
    const matches = items.filter((it) => opts.getName(it).toLowerCase().includes(q)).slice(0, 8);
    results.hidden = false;
    results.innerHTML = matches.length
      ? matches.map((it) => `<a class="search-result-row" href="${opts.getUrl(it)}">
          <img class="search-result-img" src="${opts.getImage(it)}" alt="">
          <div><div class="search-result-name">${escapeHtmlSearch(opts.getName(it))}</div><div class="search-result-meta">${escapeHtmlSearch(opts.getMeta(it))}</div></div>
        </a>`).join("")
      : `<div class="search-empty">No results for "${escapeHtmlSearch(query)}"</div>`;
  }

  input.addEventListener("input", () => render(input.value));
  input.addEventListener("focus", () => { if (input.value.trim()) render(input.value); });
  document.addEventListener("click", (e) => {
    if (!mount.contains(e.target)) results.hidden = true;
  });
}

function escapeHtmlSearch(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

document.addEventListener("DOMContentLoaded", () => {
  const productMount = document.getElementById("product-search-mount");
  if (productMount && typeof PRODUCTS !== "undefined") {
    const init = () => buildSiteSearch("product-search-mount", {
      placeholder: "Search products...",
      getItems: () => PRODUCTS,
      getName: (p) => p.name,
      getMeta: (p) => p.categoryName || "",
      getUrl: (p) => `product.html?id=${encodeURIComponent(p.id)}`,
      getImage: (p) => p.image,
    });
    if (window.catalogReadyPromise) window.catalogReadyPromise.then(init);
    else init();
  }

  const merchMount = document.getElementById("merch-search-mount");
  if (merchMount && typeof MERCH !== "undefined") {
    const init = () => buildSiteSearch("merch-search-mount", {
      placeholder: "Search merch...",
      getItems: () => MERCH,
      getName: (m) => m.name,
      getMeta: () => "Merch",
      getUrl: (m) => `merch-product.html?id=${encodeURIComponent(m.id)}`,
      getImage: (m) => merchPrimaryImage(m),
    });
    if (window.merchReadyPromise) window.merchReadyPromise.then(init);
    else init();
  }
});
