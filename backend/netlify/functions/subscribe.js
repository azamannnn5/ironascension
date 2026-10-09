// backend/netlify/functions/subscribe.js
// Handles the welcome-popup email signup. Stores the email in
// `subscribers` (idempotent - re-submitting the same email does not
// duplicate the row or re-send the email) and, if RESEND_API_KEY is set,
// emails the WELCOME10-style discount code once. The code itself is never
// returned in this function's response - it only ever reaches the
// customer via the email, per the "code never shown on-page" requirement.
//
// Body: { email }
// Response: { ok: true } on success (including "already subscribed" -
// that's still a success from the client's point of view, it just quietly
// does not re-send).

const DEFAULT_TEAM_EMAIL = "contact@ironascension.com";
const DEFAULT_WELCOME_CODE = "IRONASCENSION26";
const DEFAULT_WELCOME_PCT = 10;
const BRAND_DARK = "#111111";
const BRAND_RED = "#C8102E";
// Netlify sets URL to the site's primary production URL automatically -
// used to build an absolute image URL for the logo, since email clients
// can never load a relative path. Falls back to the real domain if this
// ever runs outside a Netlify deploy context (e.g. local testing).
const SITE_URL = (process.env.URL || process.env.DEPLOY_PRIME_URL || "https://ironascension.com").replace(/\/$/, "");
const LOGO_URL = `${SITE_URL}/assets/images/logo/mark-white.png`;

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { createClient } = require("@supabase/supabase-js");
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function getWelcomeSettings() {
  if (!supabase) return { code: DEFAULT_WELCOME_CODE, pct: DEFAULT_WELCOME_PCT, teamEmail: DEFAULT_TEAM_EMAIL };
  try {
    const { data } = await supabase.from("settings").select("welcome_code, welcome_discount_pct, contact_email").eq("id", 1).maybeSingle();
    return {
      code: (data && data.welcome_code) || DEFAULT_WELCOME_CODE,
      pct: (data && data.welcome_discount_pct) || DEFAULT_WELCOME_PCT,
      teamEmail: (data && data.contact_email) || DEFAULT_TEAM_EMAIL,
    };
  } catch (err) {
    return { code: DEFAULT_WELCOME_CODE, pct: DEFAULT_WELCOME_PCT, teamEmail: DEFAULT_TEAM_EMAIL };
  }
}

async function sendEmail({ to, subject, html, text }) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Iron Ascension <no-reply@ironascension.com>", to, subject, html, text }),
  });
}

function welcomeEmailHtml({ code, pct, teamEmail }) {
  return `
  <div style="background:#f1f1f1; padding:32px 16px; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; overflow:hidden; border:1px solid #e4e4e4;">
      <div style="background:${BRAND_DARK}; padding:26px 28px; text-align:center;">
        <img src="${LOGO_URL}" alt="Iron Ascension" width="46" height="46" style="display:block; margin:0 auto 10px; border-radius:50%;">
        <span style="color:#ffffff; font-size:16px; font-weight:800; letter-spacing:0.8px;">IRON ASCENSION</span>
      </div>
      <div style="height:4px; background:${BRAND_RED}; line-height:0; font-size:0;">&nbsp;</div>
      <div style="padding:32px 28px;">
        <p style="color:${BRAND_RED}; font-weight:700; letter-spacing:0.5px; font-size:12px; text-transform:uppercase; margin:0 0 8px;">Welcome</p>
        <h1 style="color:${BRAND_DARK}; font-size:22px; margin:0 0 16px;">Here's your ${pct}% off code</h1>
        <p style="color:#555; font-size:14px; line-height:1.6; margin:0 0 24px;">
          Thanks for signing up. Use the code below on your first order request.
        </p>
        <div style="background:#f5f5f5; border:1.5px dashed #ccc; border-radius:4px; padding:18px; text-align:center; margin:0 0 24px;">
          <span style="font-size:22px; font-weight:800; letter-spacing:2px; color:${BRAND_DARK};">${code}</span>
        </div>
        <p style="color:#888; font-size:12px; line-height:1.6; margin:0;">
          Valid on your first order only, one use per customer. Enter this code in the Promo Code field in your cart.
        </p>
      </div>
      <div style="padding:18px 28px; background:${BRAND_DARK}; font-size:12px; color:#999;">
        Iron Ascension &middot; Strength. Science. Discipline. &middot; Questions? <a href="mailto:${teamEmail}" style="color:${BRAND_RED};">${teamEmail}</a>
      </div>
    </div>
  </div>`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email } = JSON.parse(event.body || "{}");
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { statusCode: 400, body: JSON.stringify({ error: "A valid email is required" }) };
    }

    let alreadySubscribed = false;
    if (supabase) {
      const { data: existing } = await supabase.from("subscribers").select("email").eq("email", cleanEmail).maybeSingle();
      if (existing) {
        alreadySubscribed = true;
      } else {
        const { error } = await supabase.from("subscribers").insert({ email: cleanEmail });
        if (error) throw error;
      }
    }

    // Only send the welcome email the first time this address signs up -
    // never re-send on repeat popup submissions from other browsers.
    if (!alreadySubscribed && process.env.RESEND_API_KEY) {
      const { code, pct, teamEmail } = await getWelcomeSettings();
      await sendEmail({
        to: cleanEmail,
        subject: `Your ${pct}% off code - Iron Ascension`,
        html: welcomeEmailHtml({ code, pct, teamEmail }),
        text: `Thanks for signing up. Your code: ${code} (${pct}% off your first order, one use per customer). Enter it in the Promo Code field in your cart.`,
      });
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
