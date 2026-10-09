/* Iron Ascension - shared cart module
   Loaded on every page (see js/main.js include order). Cart state lives in
   localStorage under CART_KEY as an array of line items:
     { id, type: "product"|"merch", name, priceCents, image, qty,
       size, color, customSize, customColor }
   size/color/customSize/customColor only apply to merch lines; product
   lines simply omit them. priceCents can be null (price not set yet in
   admin) - such lines still add to the cart so a customer can request an
   item before pricing is final, but they're excluded from the running
   subtotal and flagged with "Price TBD" everywhere the cart is shown. */

const CART_KEY = "ia_cart_v1";

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (err) {
    // Storage unavailable (private browsing, quota, etc.) - the cart just
    // won't persist across page loads. Not fatal.
  }
  updateCartBadge();
}

// Two lines are "the same" line only if id, type, size, and color all
// match - a Black/L T-Shirt and a White/S T-Shirt stay as separate cart
// rows even though they share a product id.
function sameLine(a, b) {
  return a.id === b.id && a.type === b.type && (a.size || null) === (b.size || null) && (a.color || null) === (b.color || null);
}

function addToCart(item, qty) {
  qty = Math.max(1, Number(qty) || 1);
  const cart = getCart();
  const existing = cart.find((line) => sameLine(line, item));
  if (existing) {
    existing.qty += qty;
    // Refresh name/price/image in case the admin panel changed them since
    // this item was first added, so the cart never shows stale info.
    existing.name = item.name;
    existing.priceCents = item.priceCents;
    existing.image = item.image;
    existing.customSize = item.customSize || null;
    existing.customColor = item.customColor || null;
  } else {
    cart.push({
      id: item.id, type: item.type, name: item.name, priceCents: item.priceCents, image: item.image, qty,
      size: item.size || null, color: item.color || null,
      customSize: item.customSize || null, customColor: item.customColor || null,
    });
  }
  saveCart(cart);
  return cart;
}

function updateCartQty(id, type, qty, size, color) {
  qty = Number(qty) || 0;
  let cart = getCart();
  const key = { id, type, size: size || null, color: color || null };
  if (qty <= 0) {
    cart = cart.filter((line) => !sameLine(line, key));
  } else {
    const line = cart.find((l) => sameLine(l, key));
    if (line) line.qty = qty;
  }
  saveCart(cart);
  return cart;
}

function removeFromCart(id, type, size, color) {
  const key = { id, type, size: size || null, color: color || null };
  const cart = getCart().filter((line) => !sameLine(line, key));
  saveCart(cart);
  return cart;
}

// Builds a short "Size: L · Color: Black" style label for a cart line, or
// an empty string if the line has no variant info (all product lines,
// and any merch item with neither sizes nor colors).
function cartLineVariantLabel(line) {
  const parts = [];
  if (line.size) parts.push(`Size: ${line.size}${line.size === "Custom" && line.customSize ? ` (${line.customSize})` : ""}`);
  if (line.color) parts.push(`Color: ${line.color}${line.color === "Custom" && line.customColor ? ` (${line.customColor})` : ""}`);
  return parts.join(" \u00b7 ");
}

function clearCart() {
  saveCart([]);
}

function cartCount() {
  return getCart().reduce((sum, line) => sum + (Number(line.qty) || 0), 0);
}

function cartSubtotalCents() {
  const cart = getCart();
  let subtotal = 0;
  let hasUnpriced = false;
  cart.forEach((line) => {
    if (line.priceCents == null) {
      hasUnpriced = true;
    } else {
      subtotal += line.priceCents * (Number(line.qty) || 0);
    }
  });
  return { subtotalCents: subtotal, hasUnpriced };
}

function formatCents(cents) {
  if (cents == null) return "Price TBD";
  // currency.js (loaded after cart.js on every page) overrides the plain
  // USD display with the customer's selected currency; if it hasn't
  // loaded for some reason, fall back to plain USD so this never breaks.
  if (typeof formatMoneyCentsUSD === "function") return formatMoneyCentsUSD(cents);
  return `$${(cents / 100).toFixed(2)}`;
}

function updateCartBadge() {
  const count = cartCount();
  document.querySelectorAll("#cart-count").forEach((el) => {
    el.textContent = String(count);
    el.hidden = count === 0;
  });
}

document.addEventListener("DOMContentLoaded", updateCartBadge);
