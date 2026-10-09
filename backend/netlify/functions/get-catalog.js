// backend/netlify/functions/get-catalog.js
// Public, read-only endpoint. Serves the live catalog (categories,
// products, merch, settings) from Supabase, reshaped into the exact same
// property names js/product-data.js and js/merch-data.js's static arrays
// use (categoryId, categoryNumber, categoryName, price, tagline, etc.) so
// the frontend doesn't need two different data shapes.
//
// Called by product-data.js's loadLiveCatalog() and merch-data.js's
// loadLiveMerch() on every page load. If Supabase isn't connected yet, or
// any of this fails, we return a non-200 response - the frontend's fetch
// call treats that as "keep using the static placeholder data baked into
// product-data.js / merch-data.js", which is the correct behavior before
// the backend is wired up.

const { createClient } = require("@supabase/supabase-js");

exports.handler = async () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return { statusCode: 503, body: JSON.stringify({ error: "Supabase not configured yet" }) };
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    const [{ data: categoryRows, error: cErr }, { data: productRows, error: pErr },
           { data: merchRows, error: mErr }, { data: settingsRows, error: sErr },
           { data: variantRows, error: vErr }] = await Promise.all([
      supabase.from("categories").select("*").order("number", { ascending: true }),
      supabase.from("products").select("*").order("sort_order", { ascending: true, nullsFirst: false }),
      supabase.from("merch").select("*").order("sort_order", { ascending: true, nullsFirst: false }),
      supabase.from("settings").select("*").eq("id", 1).limit(1),
      supabase.from("merch_variants").select("*").order("sort_order", { ascending: true }),
    ]);
    if (cErr) throw cErr;
    if (pErr) throw pErr;
    if (mErr) throw mErr;
    if (sErr) throw sErr;
    if (vErr) throw vErr;

    // Group color-variant rows by merch_id so each merch item gets a
    // `colors` array (matches the shape js/merch-data.js's static
    // fallback data already uses: [{ name, image }]).
    const variantsByMerchId = {};
    (variantRows || []).forEach((v) => {
      if (!variantsByMerchId[v.merch_id]) variantsByMerchId[v.merch_id] = [];
      variantsByMerchId[v.merch_id].push({ name: v.color_name, image: v.image_url });
    });

    const categoryByNumber = {};
    const categories = (categoryRows || []).map((c) => {
      const shaped = {
        id: c.slug,
        number: c.number,
        name: c.name,
        blurb: c.blurb,
        image: c.image_url,
      };
      categoryByNumber[c.number] = shaped;
      return shaped;
    });

    const products = (productRows || []).map((p) => {
      const cat = categoryByNumber[p.category_number] || null;
      return {
        id: p.id,
        number: p.number,
        name: p.name,
        categoryId: cat ? cat.id : null,
        categoryNumber: p.category_number,
        categoryName: cat ? cat.name : null,
        price: p.price_cents == null ? null : p.price_cents / 100,
        tagline: p.tagline,
        description: p.description,
        image: p.image_url,
        inStock: p.in_stock !== false,
        salePrice: p.sale_price_cents == null ? null : p.sale_price_cents / 100,
        badge: p.badge || null,
        sortOrder: p.sort_order,
        specs: Array.isArray(p.specs) && p.specs.length ? p.specs : null,
        features: Array.isArray(p.features) && p.features.length ? p.features : null,
        qcIntro: p.qc_intro || null,
        qcCompound: p.qc_compound || null,
        qcAssayResult: p.qc_assay_result || null,
        qcStatus: p.qc_status || null,
      };
    });

    const merch = (merchRows || []).map((m) => {
      const colors = variantsByMerchId[m.id] && variantsByMerchId[m.id].length
        ? variantsByMerchId[m.id]
        : (m.image_url ? [{ name: "Default", image: m.image_url }] : []);
      return {
        id: m.id,
        name: m.name,
        price: m.price_cents == null ? null : m.price_cents / 100,
        description: m.description,
        image: m.image_url,
        colors,
        inStock: m.in_stock !== false,
        salePrice: m.sale_price_cents == null ? null : m.sale_price_cents / 100,
        badge: m.badge || null,
        sortOrder: m.sort_order,
      };
    });

    const s = (settingsRows && settingsRows[0]) || null;
    const settings = s
      ? {
          contactEmail: s.contact_email,
          contactPhone: s.contact_phone,
          contactAddress: s.contact_address,
          announcement: s.announcement,
          shippingNote: s.shipping_note,
          whatsappNumber: s.whatsapp_number,
          socials: {
            instagram: s.social_instagram_url || null,
            tiktok: s.social_tiktok_url || null,
            facebook: s.social_facebook_url || null,
            twitter: s.social_twitter_url || null,
            youtube: s.social_youtube_url || null,
          },
          heroHeading: s.hero_heading || null,
          heroTagline: s.hero_tagline || null,
          mixMatchTiers: s.mix_match_tiers,
          welcomeDiscountPct: s.welcome_discount_pct,
          cryptoDiscountPct: s.crypto_discount_pct,
          paymentMethods: Array.isArray(s.payment_methods) && s.payment_methods.length ? s.payment_methods : null,
          paymentInstructions: s.payment_instructions && typeof s.payment_instructions === "object" ? s.payment_instructions : {},
          faqs: Array.isArray(s.faqs) && s.faqs.length ? s.faqs : null,
          shippingContent: s.shipping_content || null,
          heroImageUrl: s.hero_image_url || null,
          featuredProductIds: Array.isArray(s.featured_product_ids) ? s.featured_product_ids : [],
          footerTagline: s.footer_tagline || null,
          workingHours: s.working_hours || null,
          stackCapPct: s.stack_cap_pct,
          shippingFeeCents: s.shipping_fee_cents,
          freeShippingThresholdCents: s.free_shipping_threshold_cents,
          freeCapThresholdCents: s.free_cap_threshold_cents,
        }
      : null;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
      body: JSON.stringify({ categories, products, merch, settings }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
