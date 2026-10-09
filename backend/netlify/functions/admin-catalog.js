// backend/netlify/functions/admin-catalog.js
// Protected CRUD for categories, products, and merch - used by
// /admin.html. All three share one function (distinguished by `type` in
// the request) to keep the function count small; they're small, related
// tables and every write here follows the same auth + upsert shape.
//
// POST   -> upsert (create or update) a category / product / merch row
// DELETE -> remove a product or merch row (?type=product&id=xxx). Category
//           rows are fixed at 7 (numbers 1-7) and can only be edited, not
//           deleted or added, since category-N.html pages are hardcoded
//           to those 7 slots.
//
// Every request must include a correct x-admin-password header - see
// _admin-auth.js. Public reads go through get-catalog.js instead, which
// needs no password.

const { createClient } = require("@supabase/supabase-js");
const { checkAdminAuth } = require("./_admin-auth");

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Sale price, badge and sort order are only written when the request
// actually includes them, so a quick edit (e.g. toggling stock) never
// wipes them.
function applyOptionalFields(row, p) {
  if ("salePriceCents" in p) row.sale_price_cents = p.salePriceCents === "" || p.salePriceCents == null ? null : Number(p.salePriceCents);
  if ("badge" in p) row.badge = p.badge ? String(p.badge).trim().slice(0, 24) : null;
  if ("specs" in p) row.specs = Array.isArray(p.specs) && p.specs.length ? p.specs : null;
  if ("features" in p) row.features = Array.isArray(p.features) && p.features.length ? p.features : null;
  if ("qcIntro" in p) row.qc_intro = p.qcIntro || null;
  if ("qcCompound" in p) row.qc_compound = p.qcCompound || null;
  if ("qcAssayResult" in p) row.qc_assay_result = p.qcAssayResult || null;
  if ("qcStatus" in p) row.qc_status = p.qcStatus || null;
  if ("sortOrder" in p) row.sort_order = p.sortOrder === "" || p.sortOrder == null ? null : Number(p.sortOrder);
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
    if (event.httpMethod === "POST") {
      const p = JSON.parse(event.body || "{}");

      if (p.type === "category") {
        if (!p.number) return badRequest("number is required");
        const row = {
          number: p.number,
          slug: p.slug || `category-${p.number}`,
          name: p.name || `Category ${p.number}`,
          blurb: p.blurb || null,
          image_url: p.image || null,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from("categories").upsert(row, { onConflict: "number" });
        if (error) throw error;
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      }

      if (p.type === "product") {
        if (!p.id || !p.name) return badRequest("id and name are required");
        const row = {
          id: p.id,
          number: p.number || null,
          name: p.name,
          category_number: p.categoryNumber || null,
          price_cents: p.priceCents === "" || p.priceCents == null ? null : Number(p.priceCents),
          tagline: p.tagline || null,
          description: p.description || null,
          image_url: p.image || null,
          in_stock: p.inStock !== false,
          updated_at: new Date().toISOString(),
        };
        applyOptionalFields(row, p);
        const { error } = await supabase.from("products").upsert(row, { onConflict: "id" });
        if (error) throw error;
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      }

      if (p.type === "merch") {
        if (!p.id || !p.name) return badRequest("id and name are required");
        const row = {
          id: p.id,
          name: p.name,
          price_cents: p.priceCents === "" || p.priceCents == null ? null : Number(p.priceCents),
          description: p.description || null,
          image_url: p.image || null,
          in_stock: p.inStock !== false,
          updated_at: new Date().toISOString(),
        };
        applyOptionalFields(row, p);
        const { error } = await supabase.from("merch").upsert(row, { onConflict: "id" });
        if (error) throw error;

        // Color variants (photos) - p.colors is the full replacement list
        // for this merch item: [{ name, image }, ...]. Only touched when
        // the request actually includes a colors array, so a plain field
        // edit (e.g. just changing the price) never wipes the photos.
        if (Array.isArray(p.colors)) {
          const { error: delErr } = await supabase.from("merch_variants").delete().eq("merch_id", p.id);
          if (delErr) throw delErr;
          const clean = p.colors
            .filter((c) => c && c.name && c.image)
            .map((c, i) => ({ merch_id: p.id, color_name: c.name, image_url: c.image, sort_order: i }));
          if (clean.length) {
            const { error: insErr } = await supabase.from("merch_variants").insert(clean);
            if (insErr) throw insErr;
          }
        }
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      }

      return badRequest("type must be one of: category, product, merch");
    }

    if (event.httpMethod === "DELETE") {
      const type = event.queryStringParameters && event.queryStringParameters.type;
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (!id) return badRequest("id query param required");
      if (type === "product") {
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) throw error;
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      }
      if (type === "merch") {
        const { error } = await supabase.from("merch").delete().eq("id", id);
        if (error) throw error;
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      }
      return badRequest("type must be one of: product, merch (categories can't be deleted)");
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
