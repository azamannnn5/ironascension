// backend/netlify/functions/_email.js
// Shared email helpers used by submit-order.js (order confirmation + team
// notification) and admin-orders.js (status update emails). Emails are
// only sent when RESEND_API_KEY is set in the Netlify environment.

const BRAND_DARK = "#111111";
const BRAND_RED = "#C8102E";

// Netlify sets URL to the site's primary production URL automatically -
// used to build an absolute image URL for the logo, since email clients
// can never load a relative path.
const SITE_URL = (process.env.URL || process.env.DEPLOY_PRIME_URL || "https://ironascension.com").replace(/\/$/, "");
const LOGO_URL = `${SITE_URL}/assets/images/logo/mark-white.png`;

function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(cents) {
  if (cents == null) return "TBD";
  return `$${Math.ceil(cents / 100).toLocaleString()}`;
}

async function sendEmail({ to, subject, html, text }) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Iron Ascension <no-reply@ironascension.com>", to, subject, html, text }),
  });
}

function emailShell(bodyHtml) {
  return `
  <div style="background:#f1f1f1; padding:32px 16px; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; overflow:hidden; border:1px solid #e4e4e4;">
      <div style="background:${BRAND_DARK}; padding:26px 28px; text-align:center;">
        <img src="${LOGO_URL}" alt="Iron Ascension" width="46" height="46" style="display:block; margin:0 auto 10px; border-radius:50%;">
        <span style="color:#ffffff; font-size:16px; font-weight:800; letter-spacing:0.8px;">IRON ASCENSION</span>
      </div>
      <div style="height:4px; background:${BRAND_RED}; line-height:0; font-size:0;">&nbsp;</div>
      <div style="padding:28px;">${bodyHtml}</div>
      <div style="padding:18px 28px; background:${BRAND_DARK}; font-size:12px; color:#999;">
        Iron Ascension &middot; Strength. Science. Discipline.
      </div>
    </div>
  </div>`;
}

// Replaces {name}, {order_number}, {total}, {payment_method},
// {payment_instructions} placeholders in admin-written text.
function fillTemplate(text, vars) {
  return String(text || "").replace(/\{(\w+)\}/g, (m, key) => (vars[key] != null ? String(vars[key]) : m));
}

// Admin-written plain text -> email-safe HTML (blank line = new paragraph).
function textToHtml(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((para) => `<p style="color:#555; font-size:14px; line-height:1.6; margin:0 0 16px;">${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

module.exports = { BRAND_DARK, BRAND_RED, SITE_URL, LOGO_URL, escapeHtml, money, sendEmail, emailShell, fillTemplate, textToHtml };
