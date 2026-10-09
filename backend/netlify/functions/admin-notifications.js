// backend/netlify/functions/admin-notifications.js
// Protected read/update for the Notifications tab in /admin.html, which
// has three sections: Contact form messages, Orders received by email
// (the normal checkout form), and Orders received by WhatsApp (the
// "Send Order Request by WhatsApp" button on order.html). Both order
// channels live in the same `orders` table (distinguished by the
// `channel` column) - contact form messages live in `contact_messages`.
// Each row has an independent `read` flag, separate from an order's
// fulfillment `status`, used purely to power "seen / not seen yet" here.
//
// GET   -> { contactMessages, ordersEmail, ordersWhatsapp }, newest first
// PATCH -> mark one or many rows read/unread
//   body: { table: "contact_messages" | "orders", ids: [...], read: true }

const { createClient } = require("@supabase/supabase-js");
const { checkAdminAuth } = require("./_admin-auth");

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function badRequest(msg) {
  return { statusCode: 400, body: JSON.stringify({ error: msg }) };
}

exports.handler = async (event) => {
  const auth = checkAdminAuth(event);
  if (!auth.ok) return { statusCode: auth.statusCode, body: JSON.stringify({ error: auth.error }) };
  if (!supabase) {
    return { statusCode: 500, body: JSON.stringify({ error: "Supabase is not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var)" }) };
  }

  try {
    if (event.httpMethod === "GET") {
      const limit = Math.min(Number((event.queryStringParameters || {}).limit) || 200, 500);
      const [{ data: messages, error: mErr }, { data: ordersEmail, error: eErr }, { data: ordersWhatsapp, error: wErr }] = await Promise.all([
        supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(limit),
        supabase.from("orders").select("*").eq("channel", "email").order("created_at", { ascending: false }).limit(limit),
        supabase.from("orders").select("*").eq("channel", "whatsapp").order("created_at", { ascending: false }).limit(limit),
      ]);
      if (mErr) throw mErr;
      if (eErr) throw eErr;
      if (wErr) throw wErr;
      return {
        statusCode: 200,
        body: JSON.stringify({
          contactMessages: messages || [],
          ordersEmail: ordersEmail || [],
          ordersWhatsapp: ordersWhatsapp || [],
        }),
      };
    }

    if (event.httpMethod === "PATCH") {
      const body = JSON.parse(event.body || "{}");
      const table = body.table;
      const ids = Array.isArray(body.ids) ? body.ids : [];
      const read = body.read !== false;
      if (table !== "contact_messages" && table !== "orders") return badRequest("table must be contact_messages or orders");
      if (!ids.length) return badRequest("ids array required");
      const { error } = await supabase.from(table).update({ read }).in("id", ids);
      if (error) throw error;
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    if (event.httpMethod === "DELETE") {
      const table = event.queryStringParameters && event.queryStringParameters.table;
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (table !== "contact_messages" && table !== "orders") return badRequest("table must be contact_messages or orders");
      if (!id) return badRequest("id query param required");
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
