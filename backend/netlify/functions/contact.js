// backend/netlify/functions/contact.js
// Stores contact-form submissions in Supabase (visible in /admin.html's
// Messages tab) and, if RESEND_API_KEY is set, also sends two emails:
//   1. To the team inbox, with the message.
//   2. A confirmation to the customer.
//
// Email sending is optional, not a hard requirement - if RESEND_API_KEY
// isn't set, this still stores the message (when Supabase is configured)
// and returns 200. This is the main way a message actually reaches you
// until Resend is wired up: check the Messages tab in the admin panel.

const DEFAULT_TEAM_EMAIL = "contact@ironascension.com";
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

// The contact/support email is admin-editable (Site Settings), so this
// always checks the live settings row instead of hardcoding the address -
// changing it in the admin panel actually changes where contact form
// notifications get sent, with no redeploy needed.
async function getTeamEmail() {
  if (!supabase) return DEFAULT_TEAM_EMAIL;
  try {
    const { data } = await supabase.from("settings").select("contact_email").eq("id", 1).maybeSingle();
    return (data && data.contact_email) || DEFAULT_TEAM_EMAIL;
  } catch (err) {
    return DEFAULT_TEAM_EMAIL;
  }
}

async function sendEmail({ to, subject, html, text }) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Iron Ascension <no-reply@ironascension.com>",
      to,
      subject,
      html,
      text,
    }),
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
      <div style="padding:28px;">
        ${bodyHtml}
      </div>
      <div style="padding:18px 28px; background:${BRAND_DARK}; font-size:12px; color:#999;">
        Iron Ascension &middot; Strength. Science. Discipline.
      </div>
    </div>
  </div>`;
}

function customerEmailHtml({ name, message, teamEmail }) {
  return emailShell(`
    <p style="color:${BRAND_RED}; font-weight:700; letter-spacing:0.5px; font-size:12px; text-transform:uppercase; margin:0 0 8px;">Message Received</p>
    <h1 style="color:${BRAND_DARK}; font-size:22px; margin:0 0 16px;">We've got your message</h1>
    <p style="color:#555; font-size:14px; line-height:1.6; margin:0 0 20px;">
      Hi ${name || "there"}, thanks for reaching out. Our team will reply shortly, usually within 1-2 business days.
    </p>
    <div style="border-top:1px solid #eee; padding-top:16px;">
      <p style="font-size:12px; color:#888; text-transform:uppercase; letter-spacing:0.4px; margin:0 0 8px;">Your message</p>
      <p style="font-size:14px; color:${BRAND_DARK}; white-space:pre-wrap; margin:0;">${escapeHtml(message)}</p>
    </div>
    <p style="color:#555; font-size:13px; line-height:1.6; margin:24px 0 0;">
      Need something sooner? Reply to this email or reach us at
      <a href="mailto:${teamEmail}" style="color:${BRAND_RED}; font-weight:600;">${teamEmail}</a>.
    </p>
  `);
}

function teamEmailHtml({ name, email, message }) {
  const detailRow = (label, value) => `<div style="display:flex; justify-content:space-between; padding:5px 0; font-size:13px; border-bottom:1px solid #eee;">
    <span style="color:#888;">${label}</span><span style="color:${BRAND_DARK}; font-weight:600; text-align:right;">${value || "-"}</span>
  </div>`;
  return emailShell(`
    <p style="color:${BRAND_RED}; font-weight:700; letter-spacing:0.5px; font-size:12px; text-transform:uppercase; margin:0 0 8px;">Website Contact</p>
    <h1 style="color:${BRAND_DARK}; font-size:20px; margin:0 0 16px;">New message from ${escapeHtml(name || email)}</h1>
    ${detailRow("Name", escapeHtml(name || "Not provided"))}
    ${detailRow("Email", escapeHtml(email))}
    <p style="font-size:14px; color:${BRAND_DARK}; white-space:pre-wrap; border-top:1px solid #eee; padding-top:16px; margin-top:16px;">${escapeHtml(message)}</p>
  `);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { name, email, message } = JSON.parse(event.body || "{}");
    if (!email || !message) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email and message required" }) };
    }

    if (supabase) {
      const { error } = await supabase.from("contact_messages").insert({ name, email, message });
      if (error) throw error;
    }

    if (process.env.RESEND_API_KEY) {
      const teamEmail = await getTeamEmail();
      await Promise.all([
        sendEmail({
          to: teamEmail,
          subject: `New contact form message from ${name || email}`,
          html: teamEmailHtml({ name, email, message }),
          text: `From: ${name || "N/A"} <${email}>\n\n${message}`,
        }),
        sendEmail({
          to: email,
          subject: "We've received your message - Iron Ascension",
          html: customerEmailHtml({ name, message, teamEmail }),
          text: `Hi ${name || "there"},\n\nThanks for reaching out. Our team will reply shortly, usually within 1-2 business days.\n\nYour message:\n${message}\n\n- Iron Ascension`,
        }),
      ]);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
