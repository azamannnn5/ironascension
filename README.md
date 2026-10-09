# Iron Ascension

Full setup + admin panel instructions are in **[`backend/README.md`](backend/README.md)** - start there before deploying.

## What's in this build
- A live, database-backed catalog (Supabase) for the 7 categories, 64 products, and 9 merch items - editable from `/admin.html` with no redeploy once connected.
- A real shopping cart (`order.html` + `js/cart.js`) that lets customers add products and merch, review a running total, and submit an order request.
- No payment processor - order requests are stored and emailed (if configured) for manual follow-up. See `backend/README.md` for why, and for the merch-only alternative if you want real checkout there later.
- A working Contact form, wired to a backend function and Supabase.
- An admin panel (`/admin.html`, single shared password) for categories, products, merch, orders, and site contact settings.

## Before this is live
This ships as a static frontend + Netlify Functions + Supabase, same as the pattern used elsewhere in this project. Nothing here works until you:
1. Create a Supabase project and run `backend/schema.sql`
2. Deploy this repo to Netlify with the environment variables listed in `backend/README.md`

Until then, every page still renders using the built-in placeholder data (same as before) - it just won't reflect anything saved from the admin panel.

## Content status
Every product and merch item is still placeholder content - "Product 1", no price, generic description. The plumbing to edit all of it live is done; someone still needs to go through `/admin.html` and enter the real catalog.
