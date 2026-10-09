// backend/netlify/functions/admin-orders.js
// Protected read/update for submitted orders, used by the Orders screen in
// /admin.html. Orders themselves are created by the public submit-order.js
// function (no password needed there - anyone can submit an order
// request), but only the admin panel can list or update them.
//
// GET    -> most recent orders first (?limit=, default 100)
// PATCH  -> update an order's status (?id=<uuid>, body: { status, notify })
//           When notify is true and the order has a customer email, the
//           status email template saved in Site Settings (Emails screen)
//           is sent to the customer (requires RESEND_API_KEY).
// DELETE -> remove an order (?id=<uuid>)

const { createClient } = require("@supabase/supabase-js");
const { checkAdminAuth } = require("./_admin-auth");
const { money, sendEmail, emailShell, fillTemplate, textToHtml, escapeHtml, BRAND_RED, BRAND_DARK } = require("./_email");

const VALID_STATUSES = new Set(["new", "contacted", "paid", "shipped", "fulfilled", "cancelled"]);

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Sends the admin-written status email for this order. Returns a short
// result string the admin panel can show: "sent", or why nothing was sent.
async function sendStatusEmail(order, status) {
  if (!order.customer_email) return "no customer email on this order";
  if (!process.env.RESEND_API_KEY) return "RESEND_API_KEY is not set";
  const { data } = await supabase.from("settings").select("email_templates, contact_email").eq("id", 1).maybeSingle();
  const tpl = data && data.email_templates && data.email_templates[status];
  if (!tpl || !tpl.enabled || !tpl.body) return "no email template is turned on for this status";

  const vars = {
    name: order.customer_name || "there",
    order_number: order.order_number,
    total: money(order.total_cents),
    payment_method: order.payment_method || "",
  };
  const subject = fillTemplate(tpl.subject || `Update on your order ${order.order_number}`, vars);
  const body = fillTemplate(tpl.body, vars);
  const teamEmail = (data && data.contact_email) || "contact@ironascension.com";
  const res = await sendEmail({
    to: order.customer_email,
    subject,
    html: emailShell(`
      <p style="color:${BRAND_RED}; font-weight:700; letter-spacing:0.5px; font-size:12px; text-transform:uppercase; margin:0 0 8px;">Order ${escapeHtml(order.order_number)}</p>
      <h1 style="color:${BRAND_DARK}; font-size:22px; margin:0 0 16px;">${escapeHtml(subject)}</h1>
      ${textToHtml(body)}
      <p style="color:#555; font-size:13px; line-height:1.6; margin:24px 0 0;">
        Questions? Reply to this email or reach us at
        <a href="mailto:${teamEmail}" style="color:${BRAND_RED}; font-weight:600;">${teamEmail}</a>.
      </p>`),
    text: `${body}\n\n- Iron Ascension (${order.order_number})`,
  });
  return res && res.ok === false ? "the email service rejected the message" : "sent";
}

exports.handler = async (event) => {
  const auth = checkAdminAuth(event);
  if (!auth.ok) return { statusCode: auth.statusCode, body: JSON.stringify({ error: auth.error }) };
  if (!supabase) {
    return { statusCode: 500, body: JSON.stringify({ error: "Supabase is not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var)" }) };
  }

  try {
    if (event.httpMethod === "GET") {
      const limit = Math.min(Number((event.queryStringParameters || {}).limit) || 100, 500);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return { statusCode: 200, body: JSON.stringify({ orders: data || [] }) };
    }

    if (event.httpMethod === "PATCH") {
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: "id query param required" }) };
      const { status, notify } = JSON.parse(event.body || "{}");
      if (!VALID_STATUSES.has(status)) {
        return { statusCode: 400, body: JSON.stringify({ error: `status must be one of: ${[...VALID_STATUSES].join(", ")}` }) };
      }
      const { data: order, error } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw error;

      let email = null;
      if (notify === true && order) {
        try {
          email = await sendStatusEmail(order, status);
        } catch (err) {
          email = `email failed: ${err.message}`;
        }
      }
      return { statusCode: 200, body: JSON.stringify({ ok: true, email }) };
    }

    if (event.httpMethod === "DELETE") {
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: "id query param required" }) };
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
