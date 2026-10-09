/* Iron Ascension - promo/discount engine
   Loaded on order.html only, after cart.js. Computes the live price
   breakdown shown in the cart: Mix & Match volume discount, the
   IRONASCENSION26 welcome code, the Bitcoin payment discount, free
   flat shipping (free over the threshold), and the free Cap gift - discounts stacking
   additively up to a capped percentage.

   All numbers below are defaults; loadPromoSettings() overwrites them
   in place with whatever's saved in Site Settings (admin.html), same
   graceful-fallback pattern as product-data.js / merch-data.js. */

const PROMO_SETTINGS = {
  mixMatchTiers: [
    { min: 3, max: 5, pct: 5 },
    { min: 6, max: 9, pct: 7 },
    { min: 10, max: null, pct: 10 },
  ],
  welcomeDiscountPct: 10,
  cryptoDiscountPct: 5,
  stackCapPct: 30,
  shippingFeeCents: 1500,
  freeShippingThresholdCents: 15000,
  freeCapThresholdCents: 15000,
  paymentInstructions: {},
};

let PAYMENT_METHODS = ["Bitcoin", "Cashapp", "Apple Pay", "Zelle", "Chime", "PayPal"];

// The free gift (a Cap). Customers pick the color themselves once it
// unlocks - these are just the available options and a default. Kept here
// rather than reaching into MERCH so this file works even on pages that
// don't load merch-data.js; the color/image pairs mirror merch-data.js's
// real cap/tee photos exactly.
const GIFT_CAP_OPTIONS = [
  { color: "Grey", image: "assets/images/merch/cap-grey.jpg" },
  { color: "White", image: "assets/images/merch/cap-white.jpg" },
  { color: "Black", image: "assets/images/merch/cap-black.jpg" },
];
const GIFT_CAP_DEFAULT_COLOR = "Grey";

function giftCapImage(color) {
  const match = GIFT_CAP_OPTIONS.find((o) => o.color === color);
  return match ? match.image : GIFT_CAP_OPTIONS[0].image;
}

async function loadPromoSettings() {
  try {
    const res = await fetch("/.netlify/functions/get-catalog");
    if (!res.ok) return;
    const data = await res.json();
    const s = data.settings;
    if (!s) return;
    if (Array.isArray(s.mixMatchTiers) && s.mixMatchTiers.length) PROMO_SETTINGS.mixMatchTiers = s.mixMatchTiers;
    if (s.welcomeDiscountPct != null) PROMO_SETTINGS.welcomeDiscountPct = Number(s.welcomeDiscountPct);
    if (s.cryptoDiscountPct != null) PROMO_SETTINGS.cryptoDiscountPct = Number(s.cryptoDiscountPct);
    if (Array.isArray(s.paymentMethods) && s.paymentMethods.length) PAYMENT_METHODS = s.paymentMethods;
    if (s.paymentInstructions && typeof s.paymentInstructions === "object") PROMO_SETTINGS.paymentInstructions = s.paymentInstructions;
    if (s.stackCapPct != null) PROMO_SETTINGS.stackCapPct = Number(s.stackCapPct);
    if (s.shippingFeeCents != null) PROMO_SETTINGS.shippingFeeCents = Number(s.shippingFeeCents);
    if (s.freeShippingThresholdCents != null) PROMO_SETTINGS.freeShippingThresholdCents = Number(s.freeShippingThresholdCents);
    if (s.freeCapThresholdCents != null) PROMO_SETTINGS.freeCapThresholdCents = Number(s.freeCapThresholdCents);
  } catch (err) {
    // Offline / backend not connected - the defaults above stand.
  }
}
window.promoSettingsPromise = loadPromoSettings();

function mixMatchPct(itemCount) {
  const tier = PROMO_SETTINGS.mixMatchTiers.find((t) => itemCount >= t.min && (t.max == null || itemCount <= t.max));
  return tier ? tier.pct : 0;
}

// Item count that Mix & Match tiers key off - the customer's actual cart
// only (gift items are never added to the real cart, so nothing needs to
// be excluded here; see order.html).
function cartItemCount(cart) {
  return cart.reduce((sum, line) => sum + (Number(line.qty) || 0), 0);
}

// Central pricing calculation for the cart page. Returns everything
// order.html needs to render the summary, in one pass.
//   cart            - result of getCart()
//   welcomeApplied  - boolean, whether a validated welcome code is active
//   paymentMethod   - string | null, the selected dropdown value
function computePromoState(cart, welcomeApplied, paymentMethod) {
  const itemCount = cartItemCount(cart);
  const { subtotalCents, hasUnpriced } = cartSubtotalCents();

  const mmPct = mixMatchPct(itemCount);
  const welcomePct = welcomeApplied ? PROMO_SETTINGS.welcomeDiscountPct : 0;
  const cryptoPct = String(paymentMethod || "").trim().toLowerCase() === "bitcoin" ? PROMO_SETTINGS.cryptoDiscountPct : 0;

  const rawPct = mmPct + welcomePct + cryptoPct;
  const appliedPct = Math.min(rawPct, PROMO_SETTINGS.stackCapPct);

  const discountCents = Math.round((subtotalCents * appliedPct) / 100);
  const totalAfterDiscount = subtotalCents - discountCents;

  // Flat shipping fee, waived once the discounted total reaches the free
  // shipping threshold.
  const freeShipping = totalAfterDiscount >= PROMO_SETTINGS.freeShippingThresholdCents;
  // With an unpriced item the final total isn't known, so shipping is
  // confirmed by the team too (null).
  const shippingCents = hasUnpriced ? null : (freeShipping ? 0 : PROMO_SETTINGS.shippingFeeCents);
  const grandTotalCents = totalAfterDiscount + (shippingCents || 0);

  // The free Cap gift unlocks at its own threshold (based on the
  // discounted total, before shipping).
  const giftCapUnlocked = totalAfterDiscount >= PROMO_SETTINGS.freeCapThresholdCents;

  // Nudge toward the next Mix & Match tier (by item count).
  let nextTierNudge = null;
  const nextTier = PROMO_SETTINGS.mixMatchTiers.find((t) => itemCount < t.min);
  if (nextTier) {
    const needed = nextTier.min - itemCount;
    nextTierNudge = `Add ${needed} more item${needed === 1 ? "" : "s"} to unlock ${nextTier.pct}% off`;
  }

  // Nudge toward the free Cap / free shipping threshold, whichever is
  // nearest and not yet reached.
  let nextThresholdNudge = null;
  const thresholds = [
    { cents: PROMO_SETTINGS.freeCapThresholdCents, label: "a free Cap" },
    { cents: PROMO_SETTINGS.freeShippingThresholdCents, label: "free shipping" },
  ].filter((t) => totalAfterDiscount < t.cents).sort((a, b) => a.cents - b.cents);
  if (thresholds.length) {
    const near = thresholds.filter((t) => t.cents === thresholds[0].cents).map((t) => t.label).join(" and ");
    const remaining = thresholds[0].cents - totalAfterDiscount;
    nextThresholdNudge = `Add ${formatCents(remaining)} more to unlock ${near}`;
  }

  return {
    itemCount, subtotalCents, hasUnpriced,
    mmPct, welcomePct, cryptoPct, rawPct, appliedPct,
    discountCents, totalAfterDiscount,
    freeShipping, shippingCents, grandTotalCents, giftCapUnlocked,
    nextTierNudge, nextThresholdNudge,
  };
}
