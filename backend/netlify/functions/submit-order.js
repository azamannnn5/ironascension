// backend/netlify/functions/submit-order.js
// Handles cart checkout submissions from order.html. There is no payment
// processor wired in - this stores the order in Supabase (so it always
// shows up in the Orders tab of /admin.html even if email fails) and, if
// RESEND_API_KEY is set, sends a confirmation to the customer and a
// notification to the team inbox. Nothing is charged; this is a request
// for the team to follow up and arrange payment manually.
//
// This is also the authoritative point for the promo engine: the client
// (order.html) sends its own computed discount/gift/shipping figures for
// a snappy live cart, but everything below is recomputed independently
// from Supabase settings + the real subscribers table before anything is
// stored or emailed. The client's numbers are never trusted for the
// actual order record - in particular, the welcome code's single-use
// enforcement (subscribers.discount_used) only happens here.
//
// Body: {
//   items: [{id,type,name,priceCents,qty}],
//   customer: {name,email,phone,address,notes},
//   promoCode, paymentMethod,
// }
// Response: { ok: true, orderNumber } on success.

const { BRAND_DARK, BRAND_RED, escapeHtml, money, sendEmail, emailShell, fillTemplate, textToHtml } = require("./_email");

const DEFAULT_TEAM_EMAIL = "contact@ironascension.com";
const DEFAULT_CONFIRMATION_MESSAGE = "Thanks for your order request. Our team will reach out shortly to confirm final pricing, payment, and shipping. Nothing has been charged yet.";

const DEFAULT_MIX_MATCH_TIERS = [
  { min: 3, max: 5, pct: 5 },
  { min: 6, max: 9, pct: 7 },
  { min: 10, max: null, pct: 10 },
];
const DEFAULT_WELCOME_CODE = "IRONASCENSION26";
const DEFAULT_WELCOME_PCT = 10;
const DEFAULT_CRYPTO_PCT = 5;
const DEFAULT_STACK_CAP_PCT = 30;
const DEFAULT_SHIPPING_FEE_CENTS = 1500;
const DEFAULT_FREE_SHIPPING_CENTS = 15000;
const DEFAULT_FREE_CAP_CENTS = 15000;
const CONTACT_OPTIONS = ["Email", "Text message", "WhatsApp"];

const GIFT_CAP_ID = "merch-cap";
const GIFT_CAP_DEFAULT = { id: GIFT_CAP_ID, name: "Cap", color: "Grey", size: null, image: "assets/images/merch/cap-grey.jpg" };

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { createClient } = require("@supabase/supabase-js");
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function getSettings() {
  const defaults = {
    teamEmail: DEFAULT_TEAM_EMAIL,
    mixMatchTiers: DEFAULT_MIX_MATCH_TIERS,
    welcomeCode: DEFAULT_WELCOME_CODE,
    welcomePct: DEFAULT_WELCOME_PCT,
    cryptoPct: DEFAULT_CRYPTO_PCT,
    stackCapPct: DEFAULT_STACK_CAP_PCT,
    shippingFeeCents: DEFAULT_SHIPPING_FEE_CENTS,
    freeShippingCents: DEFAULT_FREE_SHIPPING_CENTS,
    freeCapCents: DEFAULT_FREE_CAP_CENTS,
    confirmationMessage: DEFAULT_CONFIRMATION_MESSAGE,
    paymentInstructions: {},
  };
  if (!supabase) return defaults;
  try {
    const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
    if (!data) return defaults;
    return {
      teamEmail: data.contact_email || defaults.teamEmail,
      mixMatchTiers: Array.isArray(data.mix_match_tiers) && data.mix_match_tiers.length ? data.mix_match_tiers : defaults.mixMatchTiers,
      welcomeCode: (data.welcome_code || defaults.welcomeCode).trim().toUpperCase(),
      welcomePct: data.welcome_discount_pct ?? defaults.welcomePct,
      cryptoPct: data.crypto_discount_pct ?? defaults.cryptoPct,
      stackCapPct: data.stack_cap_pct ?? defaults.stackCapPct,
      shippingFeeCents: data.shipping_fee_cents ?? defaults.shippingFeeCents,
      freeShippingCents: data.free_shipping_threshold_cents ?? defaults.freeShippingCents,
      freeCapCents: data.free_cap_threshold_cents ?? defaults.freeCapCents,
      confirmationMessage: (data.order_confirmation_message || "").trim() || defaults.confirmationMessage,
      paymentInstructions: data.payment_instructions && typeof data.payment_instructions === "object" ? data.payment_instructions : {},
    };
  } catch (err) {
    return defaults;
  }
}

function mixMatchPct(itemCount, tiers) {
  const tier = tiers.find((t) => itemCount >= t.min && (t.max == null || itemCount <= t.max));
  return tier ? tier.pct : 0;
}

function itemsListHtml(items) {
  return `<ul style="margin:0 0 18px; padding:0; list-style:none;">
    ${items.map((it) => `<li style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee; font-size:14px; color:${BRAND_DARK};">
      <span>${escapeHtml(it.name)} &times; ${it.qty}</span><span>${money(it.priceCents != null ? it.priceCents * it.qty : null)}</span>
    </li>`).join("")}
    ${(items._gifts || []).map((g) => `<li style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee; font-size:14px; color:#1f7a34;">
      <span>${escapeHtml(g.name)}${g.color ? ` (${escapeHtml(g.color)}${g.size ? ", " + escapeHtml(g.size) : ""})` : ""} - Free Gift</span><span>$0</span>
    </li>`).join("")}
  </ul>`;
}

function pricingBlockHtml({ subtotalCents, discountPct, discountCents, shippingCents, shippingFree, totalCents }) {
  const hasDiscount = discountCents > 0;
  const row = (label, value, extra = "") => `<div style="display:flex; justify-content:space-between; padding:4px 0; font-size:14px; ${extra}"><span>${label}</span><span>${value}</span></div>`;
  const shippingText = shippingCents == null ? "Confirmed after order request" : (shippingFree ? "Free" : money(shippingCents));
  return `
    ${hasDiscount ? row("Subtotal", money(subtotalCents), "color:#999; text-decoration:line-through;") + row(`Discount (${discountPct}% off)`, "-" + money(discountCents), "color:#1f7a34; font-weight:700;") : row("Subtotal", money(subtotalCents), `color:${BRAND_DARK};`)}
    ${row("Shipping", shippingText, `color:${BRAND_DARK};`)}
    <div style="display:flex; justify-content:space-between; padding-top:8px; font-size:16px; font-weight:700; color:${BRAND_DARK}; border-top:1px solid #eee; margin-top:4px;">
      <span>Total</span><span>${money(totalCents)}</span>
    </div>
  `;
}

function customerEmailHtml({ name, items, pricing, orderNumber, teamEmail, confirmationMessage, paymentMethod, paymentInstructions, contactPreference }) {
  const vars = { name: name || "there", order_number: orderNumber, total: money(pricing.totalCents), payment_method: paymentMethod || "", payment_instructions: paymentInstructions || "" };
  const instructionsBlock = paymentInstructions
    ? `<div style="border:1px solid #e4e4e4; border-left:4px solid ${BRAND_RED}; padding:14px 16px; margin:0 0 20px; font-size:14px; color:${BRAND_DARK}; line-height:1.6;">
        <strong>How to pay${paymentMethod ? ` with ${escapeHtml(paymentMethod)}` : ""}</strong><br>${escapeHtml(paymentInstructions).replace(/\n/g, "<br>")}
      </div>`
    : "";
  return emailShell(`
    <p style="color:${BRAND_RED}; font-weight:700; letter-spacing:0.5px; font-size:12px; text-transform:uppercase; margin:0 0 8px;">Order Received &middot; ${orderNumber}</p>
    <h1 style="color:${BRAND_DARK}; font-size:22px; margin:0 0 16px;">Thanks, your order request is in</h1>
    ${textToHtml(`Hi ${vars.name},\n\n`.trim())}
    ${textToHtml(fillTemplate(confirmationMessage, vars))}
    ${itemsListHtml(items)}
    ${pricingBlockHtml(pricing)}
    ${contactPreference ? `<p style="color:#555; font-size:13px; margin:16px 0 0;">We'll contact you by <strong>${escapeHtml(contactPreference)}</strong>.</p>` : ""}
    ${instructionsBlock ? `<div style="margin-top:20px;">${instructionsBlock}</div>` : ""}
    <p style="color:#555; font-size:13px; line-height:1.6; margin:24px 0 0;">
      Questions in the meantime? Reply to this email or reach us at
      <a href="mailto:${teamEmail}" style="color:${BRAND_RED}; font-weight:600;">${teamEmail}</a>.
    </p>
  `);
}

function teamEmailHtml({ name, email, phone, contactPreference, address, notes, items, pricing, orderNumber, paymentMethod, promoCode }) {
  const detailRow = (label, value) => `<div style="display:flex; justify-content:space-between; padding:5px 0; font-size:13px; border-bottom:1px solid #eee;">
    <span style="color:#888;">${label}</span><span style="color:${BRAND_DARK}; font-weight:600; text-align:right;">${escapeHtml(value) || "-"}</span>
  </div>`;
  return emailShell(`
    <p style="color:${BRAND_RED}; font-weight:700; letter-spacing:0.5px; font-size:12px; text-transform:uppercase; margin:0 0 8px;">New Order Request &middot; ${orderNumber}</p>
    <h1 style="color:${BRAND_DARK}; font-size:22px; margin:0 0 16px;">${escapeHtml(name || email)} - ${money(pricing.totalCents)}</h1>
    ${itemsListHtml(items)}
    ${pricingBlockHtml(pricing)}
    <div style="margin-top:16px;">
      ${detailRow("Name", name)}
      ${detailRow("Email", email)}
      ${detailRow("Phone", phone)}
      ${detailRow("Contact by", contactPreference)}
      ${detailRow("Shipping Address", address)}
      ${detailRow("Payment Method", paymentMethod)}
      ${detailRow("Promo Code", promoCode)}
    </div>
    ${notes ? `<p style="font-size:13px; color:${BRAND_DARK}; white-space:pre-wrap; border-top:1px solid #eee; padding-top:12px; margin-top:12px;"><strong>Notes:</strong> ${escapeHtml(notes)}</p>` : ""}
  `);
}

function makeOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `IA-${stamp}-${rand}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const items = Array.isArray(body.items) ? body.items : [];
    const customer = body.customer || {};
    const paymentMethod = body.paymentMethod || null;
    const typedPromoCode = (body.promoCode || "").trim();
    // "email" (default) is the full checkout flow - requires an email,
    // sends a customer confirmation + team notification. "whatsapp" is
    // the lighter Order Request via WhatsApp button on order.html - it
    // still gets recorded here (so it shows up in the admin panel's
    // Notifications tab and Orders tab) but doesn't require an email and
    // never sends a customer confirmation email, since the customer is
    // getting their confirmation directly in the WhatsApp chat instead.
    const channel = body.channel === "whatsapp" ? "whatsapp" : "email";

    if (!items.length) {
      return { statusCode: 400, body: JSON.stringify({ error: "Cart is empty" }) };
    }
    if (channel === "email" && !customer.email) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email is required" }) };
    }
    if (channel === "whatsapp" && !customer.email && !customer.phone && !customer.name) {
      return { statusCode: 400, body: JSON.stringify({ error: "At least a name or phone number is required" }) };
    }
    const contactPreference = CONTACT_OPTIONS.includes(customer.contactPreference) ? customer.contactPreference : null;
    customer.contactPreference = contactPreference;
    const cleanEmail = customer.email ? String(customer.email).trim().toLowerCase() : null;

    const settings = await getSettings();

    // ---- Authoritative discount calculation (never trust the client) ----
    const subtotalCents = items.reduce((sum, it) => {
      if (it.priceCents == null) return sum;
      return sum + it.priceCents * (Number(it.qty) || 1);
    }, 0);
    const hasUnpricedItem = items.some((it) => it.priceCents == null);
    const itemCount = items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);

    const mmPct = mixMatchPct(itemCount, settings.mixMatchTiers);
    const cryptoPct = String(paymentMethod || "").trim().toLowerCase() === "bitcoin" ? settings.cryptoPct : 0;

    let welcomePct = 0;
    let welcomeCodeAccepted = false;
    if (cleanEmail && typedPromoCode && typedPromoCode.toUpperCase() === settings.welcomeCode) {
      let alreadyUsed = false;
      if (supabase) {
        const { data: sub } = await supabase.from("subscribers").select("discount_used").eq("email", cleanEmail).maybeSingle();
        alreadyUsed = !!(sub && sub.discount_used);
      }
      if (!alreadyUsed) {
        welcomePct = settings.welcomePct;
        welcomeCodeAccepted = true;
      }
    }

    const rawPct = mmPct + cryptoPct + welcomePct;
    const appliedPct = Math.min(rawPct, settings.stackCapPct);
    const discountCents = hasUnpricedItem ? 0 : Math.round((subtotalCents * appliedPct) / 100);
    // Gift and free-shipping eligibility use the discounted total before
    // shipping; the final total then adds the flat shipping fee.
    const discountedCents = hasUnpricedItem ? null : subtotalCents - discountCents;
    const shippingFree = discountedCents != null && discountedCents >= settings.freeShippingCents;
    const shippingCents = discountedCents == null ? null : (shippingFree ? 0 : settings.shippingFeeCents);
    const totalCents = discountedCents == null ? null : discountedCents + shippingCents;

    // Eligibility (whether a gift happens at all, and which ones) is
    // server-computed from the verified total - never trust the client on
    // that. The specific color/size within an eligible gift is a free
    // customization with no monetary impact, so the client's choice
    // (sent in body.giftItems) is honored as-is, falling back to a
    // sensible default if it's missing or malformed.
    const clientGifts = Array.isArray(body.giftItems) ? body.giftItems : [];
    function resolveGift(id, fallback) {
      const match = clientGifts.find((g) => g && g.id === id);
      return match ? { id, name: fallback.name, color: match.color || fallback.color, size: match.size ?? fallback.size, image: match.image || fallback.image } : fallback;
    }
    let gifts = [];
    if (discountedCents != null && discountedCents >= settings.freeCapCents) {
      gifts = [resolveGift(GIFT_CAP_ID, GIFT_CAP_DEFAULT)];
    }

    const orderNumber = makeOrderNumber();
    const shippingText = shippingCents == null ? "confirmed after order request" : (shippingFree ? "free" : money(shippingCents));
    const pricing = { subtotalCents, discountPct: appliedPct, discountCents, shippingCents, shippingFree, totalCents };

    if (supabase) {
      const { error } = await supabase.from("orders").insert({
        order_number: orderNumber,
        items,
        subtotal_cents: subtotalCents,
        discount_pct: appliedPct,
        discount_cents: discountCents,
        discount_label: [
          mmPct ? `Mix & Match ${mmPct}%` : null,
          cryptoPct ? `Bitcoin ${cryptoPct}%` : null,
          welcomeCodeAccepted ? `Welcome code ${welcomePct}%` : null,
        ].filter(Boolean).join(" + ") || null,
        promo_code: welcomeCodeAccepted ? settings.welcomeCode : null,
        payment_method: paymentMethod,
        gift_items: gifts,
        shipping_free: shippingFree,
        shipping_cents: shippingCents,
        contact_preference: contactPreference,
        total_cents: totalCents,
        customer_name: customer.name || null,
        customer_email: customer.email || null,
        customer_phone: customer.phone || null,
        shipping_address: customer.address || null,
        notes: customer.notes || null,
        status: "new",
        channel,
        read: false,
      });
      if (error) throw error;

      // Mark the welcome code as used for this email, only once it's
      // actually attached to a real order - not at validate-promo time,
      // so an abandoned cart doesn't burn the customer's single use.
      if (welcomeCodeAccepted && cleanEmail) {
        await supabase.from("subscribers").upsert(
          { email: cleanEmail, discount_used: true, discount_used_at: new Date().toISOString() },
          { onConflict: "email" }
        );
      }
    }

    const paymentInstructions = paymentMethod && settings.paymentInstructions
      ? String(settings.paymentInstructions[paymentMethod] || "").trim()
      : "";

    if (process.env.RESEND_API_KEY) {
      const itemsWithGifts = items.slice();
      itemsWithGifts._gifts = gifts;
      const emailsToSend = [
        sendEmail({
          to: settings.teamEmail,
          subject: `New order request ${orderNumber} via ${channel === "whatsapp" ? "WhatsApp" : "Email"} - ${customer.name || customer.email || "Customer"} (${money(totalCents)})`,
          html: teamEmailHtml({ ...customer, items: itemsWithGifts, pricing, orderNumber, paymentMethod, promoCode: welcomeCodeAccepted ? settings.welcomeCode : null }),
          text: `New order ${orderNumber} (via ${channel}).\n\nShipping: ${shippingText}\nTotal: ${money(totalCents)}\nDiscount: ${appliedPct}%\nPayment Method: ${paymentMethod || "-"}\n\nCustomer: ${customer.name || "-"}\nEmail: ${customer.email || "-"}\nPhone: ${customer.phone || "-"}\nContact by: ${contactPreference || "-"}\nAddress: ${customer.address || "-"}\nNotes: ${customer.notes || "-"}`,
        }),
      ];
      // Only the full email-checkout flow gets a customer confirmation -
      // a WhatsApp order request's "confirmation" is the WhatsApp chat
      // itself, and there may not even be an email on file for it.
      if (channel === "email" && customer.email) {
        emailsToSend.push(
          sendEmail({
            to: customer.email,
            subject: `We've received your order (${orderNumber}) - Iron Ascension`,
            html: customerEmailHtml({ name: customer.name, items: itemsWithGifts, pricing, orderNumber, teamEmail: settings.teamEmail, confirmationMessage: settings.confirmationMessage, paymentMethod, paymentInstructions, contactPreference }),
            text: `Hi ${customer.name || "there"},\n\n${fillTemplate(settings.confirmationMessage, { name: customer.name || "there", order_number: orderNumber, total: money(totalCents) })}\n\nOrder ${orderNumber} - total: ${money(totalCents)} (shipping: ${shippingText})${paymentInstructions ? `\n\nHow to pay${paymentMethod ? ` with ${paymentMethod}` : ""}:\n${paymentInstructions}` : ""}\n\n- Iron Ascension`,
          })
        );
      }
      await Promise.all(emailsToSend);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, orderNumber, confirmationMessage: fillTemplate(settings.confirmationMessage, { name: customer.name || "there", order_number: orderNumber, total: money(totalCents) }), paymentInstructions }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
