// backend/netlify/functions/admin-upload.js
// Handles file uploads from the admin panel (product photos, merch
// photos) - uploads to the "product-files" Supabase Storage bucket (see
// backend/schema.sql) and returns the public URL, which the admin panel
// then saves onto the product/merch row like any other field.
//
// This is what makes "swap a product photo with no redeploy" actually
// work - without this, the image field would just be a text box where you
// type a path to a file that has to already exist in the deployed site's
// assets folder.
//
// Body: { filename, folder, contentBase64, contentType }
//   folder is restricted to a known set (see ALLOWED_FOLDERS below) so
//   uploads always land somewhere sane and predictable, not user-chosen.
// Response: { url }

const { createClient } = require("@supabase/supabase-js");
const { checkAdminAuth } = require("./_admin-auth");

const BUCKET = "product-files";
const ALLOWED_FOLDERS = new Set(["products", "merch", "site"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8MB - generous for a product photo, well under the free-tier 1GB total
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
]);

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function safeFilename(name) {
  // Strips anything that isn't a letter, number, dot, or hyphen, so the
  // resulting storage path can't escape its folder or collide with
  // control characters - admin-only input, but no reason to trust it blindly.
  return String(name || "file")
    .toLowerCase()
    .replace(/[^a-z0-9.\-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-120); // keep it short, avoids overly long storage keys
}

exports.handler = async (event) => {
  const auth = checkAdminAuth(event);
  if (!auth.ok) return { statusCode: auth.statusCode, body: JSON.stringify({ error: auth.error }) };
  if (!supabase) {
    return { statusCode: 500, body: JSON.stringify({ error: "Supabase is not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var)" }) };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { filename, folder, contentBase64, contentType } = JSON.parse(event.body || "{}");

    if (!ALLOWED_FOLDERS.has(folder)) {
      return { statusCode: 400, body: JSON.stringify({ error: `folder must be one of: ${[...ALLOWED_FOLDERS].join(", ")}` }) };
    }
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return { statusCode: 400, body: JSON.stringify({ error: `contentType must be one of: ${[...ALLOWED_CONTENT_TYPES].join(", ")}` }) };
    }
    if (!contentBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "contentBase64 is required" }) };
    }

    const buffer = Buffer.from(contentBase64, "base64");
    if (buffer.length > MAX_BYTES) {
      return { statusCode: 400, body: JSON.stringify({ error: `File too large - max ${MAX_BYTES / 1024 / 1024}MB` }) };
    }

    const path = `${folder}/${Date.now()}-${safeFilename(filename)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType,
      upsert: false,
    });
    if (error) throw error;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { statusCode: 200, body: JSON.stringify({ url: pub.publicUrl }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
