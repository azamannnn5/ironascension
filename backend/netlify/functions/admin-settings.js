// backend/netlify/functions/admin-settings.js
// Protected read/write for the settings singleton row, used by every
// settings screen in /admin.html (contact, payments, discounts, content,
// emails...).
// GET  -> the full settings row (admin screens pre-fill from this, so they
//         always show what's really saved, not a cached public copy)
// POST -> partial update: only the keys present in the request body are
//         written, so each admin screen can save its own fields without
//         touching anyone else's.
// Same auth pattern as admin-catalog.js - see _admin-auth.js. The public
// storefront reads settings via get-catalog.js instead (no password).

const { createClient } = require("@supabase/supabase-js");
const { checkAdminAuth } = require("./_admin-auth");

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// ---- value cleaners ----
const text = (v) => (v == null || String(v).trim() === "" ? null : String(v).trim());
const textOrDefault = (fallback) => (v) => text(v) || fallback;
const num = (v) => (v == null || v === "" || Number.isNaN(Number(v)) ? undefined : Number(v));
const intNum = (v) => (num(v) == null ? undefined : Math.round(num(v)));
const stringList = (max) => (v) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, max) : undefined);
const tiers = (v) => (Array.isArray(v) ? v : undefined);

// { "Cashapp": "Send to $tag" } - only keeps non-empty string values.
const stringMap = (v) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const out = {};
  Object.keys(v).forEach((k) => {
    const val = String(v[k] == null ? "" : v[k]).trim();
    if (k.trim() && val) out[k.trim()] = val;
  });
  return out;
};

// [{ q, a }] - drops incomplete entries. An empty list means "use defaults".
const faqList = (v) => {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .map((f) => ({ q: String((f && f.q) || "").trim(), a: String((f && f.a) || "").trim() }))
    .filter((f) => f.q && f.a)
    .slice(0, 60);
  return out.length ? out : null;
};

// { paid: { enabled, subject, body }, shipped: {...} }
const emailTemplates = (v) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const out = {};
  ["contacted", "paid", "shipped", "fulfilled", "cancelled"].forEach((status) => {
    const t = v[status];
    if (!t || typeof t !== "object") return;
    out[status] = {
      enabled: t.enabled === true,
      subject: String(t.subject || "").trim().slice(0, 200),
      body: String(t.body || "").trim().slice(0, 5000),
    };
  });
  return out;
};

// request key -> [column, cleaner]
const FIELDS = {
  contactEmail: ["contact_email", text],
  contactPhone: ["contact_phone", text],
  contactAddress: ["contact_address", text],
  whatsappNumber: ["whatsapp_number", text],
  announcement: ["announcement", text],
  shippingNote: ["shipping_note", text],
  heroHeading: ["hero_heading", text],
  heroTagline: ["hero_tagline", text],
  heroImageUrl: ["hero_image_url", text],
  featuredProductIds: ["featured_product_ids", stringList(12)],
  footerTagline: ["footer_tagline", text],
  workingHours: ["working_hours", text],
  mixMatchTiers: ["mix_match_tiers", tiers],
  welcomeCode: ["welcome_code", textOrDefault("IRONASCENSION26")],
  welcomeDiscountPct: ["welcome_discount_pct", num],
  cryptoDiscountPct: ["crypto_discount_pct", num],
  stackCapPct: ["stack_cap_pct", num],
  shippingFeeCents: ["shipping_fee_cents", intNum],
  freeShippingThresholdCents: ["free_shipping_threshold_cents", intNum],
  freeCapThresholdCents: ["free_cap_threshold_cents", intNum],
  paymentMethods: ["payment_methods", stringList(20)],
  paymentInstructions: ["payment_instructions", stringMap],
  orderConfirmationMessage: ["order_confirmation_message", text],
  emailTemplates: ["email_templates", emailTemplates],
  faqs: ["faqs", faqList],
  shippingContent: ["shipping_content", text],
};
const SOCIALS = {
  instagram: "social_instagram_url",
  tiktok: "social_tiktok_url",
  facebook: "social_facebook_url",
  twitter: "social_twitter_url",
  youtube: "social_youtube_url",
};

exports.handler = async (event) => {
  const auth = checkAdminAuth(event);
  if (!auth.ok) return { statusCode: auth.statusCode, body: JSON.stringify({ error: auth.error }) };
  if (!supabase) {
    return { statusCode: 500, body: JSON.stringify({ error: "Supabase is not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var)" }) };
  }

  try {
    if (event.httpMethod === "GET") {
      const { data, error } = await supabase.from("settings").select("*").eq("id", 1).limit(1);
      if (error) throw error;
      return { statusCode: 200, body: JSON.stringify({ settings: (data && data[0]) || null }) };
    }

    if (event.httpMethod === "POST") {
      const s = JSON.parse(event.body || "{}");
      const row = { id: 1 };
      Object.keys(FIELDS).forEach((key) => {
        if (!(key in s)) return;
        const [column, clean] = FIELDS[key];
        const value = clean(s[key]);
        if (value !== undefined) row[column] = value;
      });
      if (s.socials && typeof s.socials === "object") {
        Object.keys(SOCIALS).forEach((key) => {
          if (key in s.socials) row[SOCIALS[key]] = text(s.socials[key]);
        });
      }
      row.updated_at = new Date().toISOString();
      const { error } = await supabase.from("settings").upsert(row, { onConflict: "id" });
      if (error) throw error;
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
