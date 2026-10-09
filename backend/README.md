# Iron Ascension - Backend Setup

This mirrors the ProFound Peptides pattern: static frontend + Supabase + Netlify Functions.

## What's built
- `schema.sql` - database schema (categories, products, merch, settings, orders, contact_messages) with Row Level Security, seeded with the same 64 placeholder products / 7 placeholder categories / 9 merch items the static site already ships with.
- `netlify/functions/get-catalog.js` - public, read-only endpoint the storefront fetches on every page load. If it's not reachable (backend not connected yet), pages fall back to the static placeholder arrays baked into `js/product-data.js` / `js/merch-data.js` - the site never renders blank.
- `netlify/functions/admin-login.js`, `admin-catalog.js`, `admin-settings.js`, `admin-upload.js`, `admin-orders.js` - password-gated CRUD used by `/admin.html`. See "Admin panel" below.
- `netlify/functions/contact.js` - contact form handler (writes to `contact_messages`, optional Resend email notification).
- `netlify/functions/submit-order.js` - cart checkout handler. **There is no payment processor wired in** - this stores the order (so it always shows up in the admin panel's Orders tab, even if email fails) and optionally emails a notification. Nothing is charged; it's a request for your team to follow up manually.
- **Cart (`order.html` + `js/cart.js`)**: customers add products/merch to a cart (stored in the browser via localStorage), review it on `order.html`, fill in name/email/phone/address/notes, and submit. That becomes an order request row you can see and manage from `/admin.html`'s Orders tab.
- **Admin panel (`admin.html`)**: single shared password (see "Admin panel" below) - manage the 7 categories, all products, all merch, site settings, and view/update order status. No per-user accounts, no Supabase Auth.

## To go live, you need to:

1. **Create a Supabase project** at supabase.com
2. Run `schema.sql` in the Supabase SQL editor (Project → SQL Editor → New query, paste, run). It's safe to re-run.
3. Copy your project URL, anon key, and service-role key (Project Settings → API)
4. In Netlify site settings → Environment variables, add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep secret - server-side functions only)
   - `ADMIN_PASSWORD` - whatever password you want to use to log into `/admin.html`
   - `RESEND_API_KEY` (optional - only needed if you want order/contact email notifications; see "Email notifications" below)
5. `npm install` inside `backend/` so Netlify Functions can resolve `@supabase/supabase-js`
6. Connect this repo to Netlify (or drag-and-drop deploy) - `netlify.toml` at the repo root already points Netlify at `backend/netlify/functions`
7. Deploy. Once the environment variables above are set and a deploy has run, `/admin.html` will log in and every edit you make there is live on the site within about a minute - no further deploys needed for content changes.

## Admin panel
Go to `yoursite.com/admin.html`, log in with the `ADMIN_PASSWORD` you set in Netlify. From there:
- **Categories tab** - rename any of the 7 fixed category slots and give them a real blurb (replaces "Category 3", "Product placeholders", etc.)
- **Products tab** - edit any of the 64 products (name, category, price, tagline, description, photo, in/out of stock), delete ones you don't want, or add new ones.
- **Merch tab** - same, for the 9 apparel/accessory items.
- **Orders tab** - every cart checkout submission lands here with a status you can move through New → Contacted → Fulfilled (or Cancelled).
- **Site Settings tab** - support email/phone/address (used on the Contact page and in order/contact emails) and an optional homepage announcement / shipping note.

Product and merch photos can either be a path to a file already in `assets/images/` or uploaded directly from the admin form (stored in Supabase Storage, in the `product-files` bucket that `schema.sql` creates automatically).

## Email notifications (optional)
Without `RESEND_API_KEY` set, orders and contact messages are still stored and visible in `/admin.html` - you just won't get an email. To turn on notifications:
1. Create a free account at resend.com and verify a sending domain (or use their test domain while developing)
2. Add `RESEND_API_KEY` to Netlify's environment variables
3. Update the `from` address in `contact.js` and `submit-order.js` if you're not sending from `ironascension.com`

## Known limitations / what's still open
- **No payment processor.** Orders are a request, not a charge - nothing is collected on the site itself. Given the product categories (Injectables, Oral Tablets, HGH, Performance & Support), mainstream processors like Stripe/PayPal/Square generally won't support this catalog anyway; the merch line specifically could be wired to a real processor later if wanted, kept separate from the supplement/PED line.
- **All 64 products and 9 merch items are still placeholder content** - names like "Product 1", no prices, generic descriptions/images. The admin panel makes editing them possible without a redeploy, but nobody has entered the real catalog yet. That's the next step once you have real names, prices, descriptions, and photos.
- **Category page hero text.** Each `category-N.html` page's product grid (and its own in-page heading) is live-updated from the admin panel. The very top hero banner on those pages is also synced by ID, but the three-tile category list on `products.html` and the homepage's category grid are static marketing copy (matches the site's original design) and won't reflect a renamed category automatically - let me know if you'd like those made live too.
- **Single shared admin password**, not per-user login - fine for one site owner, not built for a team with audit trails. If you need that later, swap `_admin-auth.js` for Supabase Auth.
- **No inventory/quantity tracking** - "In Stock" / "Out of Stock" is a manual toggle per item, not tied to a real quantity count.
