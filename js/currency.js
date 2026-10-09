/* Iron Ascension - price formatting
   The site prices everything in US Dollars (USD) only - there is no
   multi-currency switcher. All prices are always rounded UP to the
   nearest whole dollar (no cents shown), e.g. $43, not $43.37. */

function formatMoneyUSD(amount) {
  if (amount == null) return "Price TBD";
  const whole = Math.ceil(Number(amount));
  return `$${whole.toLocaleString()}`;
}

// Same formatting, for a value already in cents (used by cart.js).
function formatMoneyCentsUSD(amountInCents) {
  if (amountInCents == null) return "Price TBD";
  return formatMoneyUSD(amountInCents / 100);
}

// ---------- Sale price + badge helpers ----------
// A sale price (set per product/merch item in /admin.html) only counts
// when it is lower than the regular price; otherwise it is ignored.
function hasSalePrice(price, sale) {
  return price != null && sale != null && Number(sale) >= 0 && Number(sale) < Number(price);
}
function effectivePrice(price, sale) {
  return hasSalePrice(price, sale) ? Number(sale) : price;
}
// Regular price struck through next to the sale price, or just the price.
function priceHtml(price, sale) {
  if (price == null) return "Price TBD";
  if (hasSalePrice(price, sale)) {
    return `<span class="price-was">${formatMoneyUSD(price)}</span><span class="price-now">${formatMoneyUSD(sale)}</span>`;
  }
  return formatMoneyUSD(price);
}
function badgeHtml(badge) {
  if (!badge) return "";
  const safe = String(badge).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return `<span class="product-badge">${safe}</span>`;
}
