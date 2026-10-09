// backend/netlify/functions/_admin-auth.js
// Shared helper for every admin-*.js function. There is no user login
// system on this site - the admin panel (/admin.html) is gated by a single
// shared password, set as the ADMIN_PASSWORD environment variable in
// Netlify. The password is sent as an `x-admin-password` header on every
// admin request (the frontend stores it in sessionStorage after the login
// screen, not localStorage, so it clears when the browser tab closes).
//
// This is deliberately simple - good enough for a single site-owner admin
// area over HTTPS, not a substitute for real multi-user auth. If this site
// ever needs more than one admin user or audit logging, replace this with
// Supabase Auth.

function checkAdminAuth(event) {
  const provided = event.headers["x-admin-password"] || event.headers["X-Admin-Password"];
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return { ok: false, statusCode: 503, error: "ADMIN_PASSWORD is not set in the Netlify environment yet." };
  }
  if (!provided || provided !== expected) {
    return { ok: false, statusCode: 401, error: "Incorrect admin password." };
  }
  return { ok: true };
}

module.exports = { checkAdminAuth };
