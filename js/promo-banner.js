/* Iron Ascension - top promo banner
   Sits at the very top of the page, above the header, in normal document
   flow (not fixed) - it scrolls away naturally while the header takes
   over the sticky position, so it never overlaps anything. Auto-rotates
   through the site's real active promos, pulled from the same public
   settings endpoint the cart uses - defaults match promo.js's fallbacks
   so the banner is never wrong even before Supabase is connected.
   Non-dismissible by design (no close button). */

const PROMO_BANNER_DEFAULTS = {
  welcomeDiscountPct: 10,
  cryptoDiscountPct: 5,
  shippingFeeCents: 1500,
  freeShippingThresholdCents: 15000,
  freeCapThresholdCents: 15000,
  mixMatchTiers: [
    { min: 3, max: 5, pct: 5 },
    { min: 6, max: 9, pct: 7 },
    { min: 10, max: null, pct: 10 },
  ],
};

function moneyWhole(cents) {
  return `$${Math.ceil(cents / 100)}`;
}

function buildBannerMessages(settings) {
  // A fixed admin-set announcement (Site Settings -> Homepage
  // Announcement in /admin.html) always takes priority over the usual
  // auto-generated rotating promo messages, since it's meant for a
  // specific one-off notice (a sale, a shipping delay, etc).
  if (settings.announcement) return [settings.announcement];
  const s = settings;
  const topTier = s.mixMatchTiers[s.mixMatchTiers.length - 1];
  return [
    `Flat ${moneyWhole(s.shippingFeeCents)} shipping, free on orders over ${moneyWhole(s.freeShippingThresholdCents)}`,
    `Spend ${moneyWhole(s.freeCapThresholdCents)}+ and get a free Cap`,
    `New here? Sign up for ${s.welcomeDiscountPct}% off your first order`,
    `Pay with Bitcoin and save an extra ${s.cryptoDiscountPct}%`,
    `Buy more, save more - up to ${topTier.pct}% off automatically with Mix & Match`,
  ];
}

async function loadBannerSettings() {
  const settings = { ...PROMO_BANNER_DEFAULTS, announcement: null };
  try {
    const res = await fetch("/.netlify/functions/get-catalog");
    if (!res.ok) return settings;
    const data = await res.json();
    const s = data.settings;
    if (!s) return settings;
    if (s.announcement) settings.announcement = s.announcement;
    if (Array.isArray(s.mixMatchTiers) && s.mixMatchTiers.length) settings.mixMatchTiers = s.mixMatchTiers;
    if (s.welcomeDiscountPct != null) settings.welcomeDiscountPct = Number(s.welcomeDiscountPct);
    if (s.cryptoDiscountPct != null) settings.cryptoDiscountPct = Number(s.cryptoDiscountPct);
    if (s.shippingFeeCents != null) settings.shippingFeeCents = Number(s.shippingFeeCents);
    if (s.freeShippingThresholdCents != null) settings.freeShippingThresholdCents = Number(s.freeShippingThresholdCents);
    if (s.freeCapThresholdCents != null) settings.freeCapThresholdCents = Number(s.freeCapThresholdCents);
  } catch (err) {
    // Offline / backend not connected - defaults above stand.
  }
  return settings;
}

async function buildPromoBanner() {
  const mount = document.getElementById("promo-banner-mount");
  if (!mount) return;

  const settings = await loadBannerSettings();
  const messages = buildBannerMessages(settings);

  mount.innerHTML = `<div class="promo-banner"><div class="promo-banner-track">${messages
    .map((m, i) => `<span class="promo-banner-msg${i === 0 ? " active" : ""}">${m}</span>`)
    .join("")}</div></div>`;

  const slides = mount.querySelectorAll(".promo-banner-msg");
  if (slides.length <= 1) return;
  let index = 0;
  setInterval(() => {
    slides[index].classList.remove("active");
    index = (index + 1) % slides.length;
    slides[index].classList.add("active");
  }, 4000);
}

document.addEventListener("DOMContentLoaded", buildPromoBanner);
