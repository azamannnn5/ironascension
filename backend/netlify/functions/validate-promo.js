// backend/netlify/functions/validate-promo.js
// Validates a promo code the customer typed into the cart, without ever
// exposing the real code string to the browser (get-catalog.js
// deliberately omits it - see that file's comment). The client sends what
// the customer typed; this compares it server-side and returns only a
// valid/pct result.
//
// This is a *live preview* check only, for showing the discount in the
// cart before checkout - it does not mark the code as used. The
// authoritative, single-use-enforcing check happens again in
// submit-order.js at actual order-submit time, using the customer's
// email. A code can "validate" here and still be rejected at submit if
// that email already used it.
//
// Body: { code, email? }
// Response: { valid: boolean, pct?: number, reason?: string }

const DEFAULT_WELCOME_CODE = "IRONASCENSION26";
const DEFAULT_WELCOME_PCT = 10;

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { createClient } = require("@supabase/supabase-js");
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { code, email } = JSON.parse(event.body || "{}");
    const typed = (code || "").trim().toUpperCase();
    if (!typed) {
      return { statusCode: 200, body: JSON.stringify({ valid: false }) };
    }

    let realCode = DEFAULT_WELCOME_CODE;
    let pct = DEFAULT_WELCOME_PCT;
    if (supabase) {
      const { data } = await supabase.from("settings").select("welcome_code, welcome_discount_pct").eq("id", 1).maybeSingle();
      if (data) {
        realCode = (data.welcome_code || DEFAULT_WELCOME_CODE).trim().toUpperCase();
        pct = data.welcome_discount_pct || DEFAULT_WELCOME_PCT;
      }
    }

    if (typed !== realCode) {
      return { statusCode: 200, body: JSON.stringify({ valid: false, reason: "Invalid code" }) };
    }

    // If we already know the email at this point (it may not be filled in
    // yet), give an early heads-up that it's already been used - purely
    // informational here, submit-order.js is what actually blocks it.
    if (email && supabase) {
      const cleanEmail = String(email).trim().toLowerCase();
      const { data: sub } = await supabase.from("subscribers").select("discount_used").eq("email", cleanEmail).maybeSingle();
      if (sub && sub.discount_used) {
        return { statusCode: 200, body: JSON.stringify({ valid: false, reason: "This code has already been used on this email" }) };
      }
    }

    return { statusCode: 200, body: JSON.stringify({ valid: true, pct }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
