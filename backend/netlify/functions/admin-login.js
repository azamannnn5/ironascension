// backend/netlify/functions/admin-login.js
// The admin.html login screen calls this once with the password the site
// owner types in. On success, admin.html stores the password in
// sessionStorage and sends it as the x-admin-password header on every
// subsequent admin-*.js call (see _admin-auth.js) - this endpoint doesn't
// issue a separate session token, it just confirms the password is right
// before showing the dashboard.

const { checkAdminAuth } = require("./_admin-auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    const { password } = JSON.parse(event.body || "{}");
    const auth = checkAdminAuth({ headers: { "x-admin-password": password } });
    if (!auth.ok) {
      return { statusCode: auth.statusCode, body: JSON.stringify({ error: auth.error }) };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
