-- Iron Ascension - Supabase schema
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to re-run: every statement below is idempotent (create if not
-- exists / add column if not exists / drop-then-create policy).

-- ============================================
-- Categories (the 7 product categories shown on products.html / the
-- homepage grid). number is the fixed 1-7 slot used by category-N.html;
-- name/blurb/image are editable from /admin.html - this is how "Category 3"
-- etc. get renamed later without touching any code.
-- ============================================
create table if not exists categories (
  number integer primary key check (number between 1 and 7),
  slug text not null,
  name text not null,
  blurb text,
  image_url text,
  updated_at timestamptz default now()
);

-- ============================================
-- Products (the 64-item catalog). id is the stable slug used in URLs
-- (product.html?id=product-7) - kept as "product-N" by default so
-- existing links never break, but admin can also add brand-new products
-- with a custom id.
-- ============================================
create table if not exists products (
  id text primary key,
  number integer,
  name text not null,
  category_number integer references categories(number),
  price_cents integer,
  tagline text,
  description text,
  specs jsonb,
  features jsonb,
  qc_intro text,
  qc_compound text,
  qc_assay_result text,
  qc_status text,
  image_url text,
  in_stock boolean not null default true,
  sort_order integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_products_category on products(category_number);
-- Safe to re-run on a database created before these columns existed.
alter table products add column if not exists specs jsonb;
alter table products add column if not exists features jsonb;
alter table products add column if not exists qc_intro text;
alter table products add column if not exists qc_compound text;
alter table products add column if not exists qc_assay_result text;
alter table products add column if not exists qc_status text;

-- ============================================
-- Merch (the 9-item apparel/accessories line). id is the stable slug used
-- in URLs (merch-product.html?id=merch-hoodie).
-- ============================================
create table if not exists merch (
  id text primary key,
  name text not null,
  price_cents integer,
  description text,
  image_url text,
  in_stock boolean not null default true,
  sort_order integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- Merch color variants. A merch item can have several photographed
-- color options (e.g. the Classic T-Shirt in White / Black / Black with
-- Red Logo) - each row here is one color + its photo for one merch item.
-- image_url on the `merch` row itself is only the fallback used if an
-- item has zero variant rows. Managed from the Merch tab in
-- /admin.html - add or remove a color there, no redeploy needed.
-- ============================================
create table if not exists merch_variants (
  id uuid primary key default gen_random_uuid(),
  merch_id text not null references merch(id) on delete cascade,
  color_name text not null,
  image_url text,
  sort_order integer default 0,
  created_at timestamptz default now()
);
create index if not exists idx_merch_variants_merch_id on merch_variants(merch_id, sort_order);

-- ============================================
-- Single-row table of site-wide settings, editable from /admin.html.
-- id is always 1 - this is a settings singleton, not a list.
-- ============================================
create table if not exists settings (
  id integer primary key default 1,
  -- All prices site-wide are USD ($), rounded up to the nearest whole
  -- dollar - there is no multi-currency switcher.
  contact_email text default 'contact@ironascension.com',
  contact_phone text default '+1 (423) 484-7466',
  contact_address text,
  announcement text,
  shipping_note text,
  -- WhatsApp "chat with us" floating widget - the number the widget
  -- opens a chat with. Stored with country code, no spaces needed
  -- (js/whatsapp-widget.js strips non-digits before building the
  -- wa.me link), e.g. "+1 (423) 484-7466".
  whatsapp_number text default '+1 (423) 484-7466',
  -- Social links - each optional. Leave blank in /admin.html to hide
  -- that icon in the footer; the footer only renders icons for the
  -- ones that are filled in.
  social_instagram_url text,
  social_tiktok_url text,
  social_facebook_url text,
  social_twitter_url text,
  social_youtube_url text,
  -- Homepage hero banner text (the big headline + line under it on
  -- index.html). Leave blank to keep the site's built-in default copy.
  hero_heading text,
  hero_tagline text,
  -- Promo engine config - all editable from /admin.html, no redeploy
  -- needed. mix_match_tiers is an ordered array of {min,max,pct} objects;
  -- max: null means "and above". See js/promo.js for how these are
  -- consumed - it always reads these live values with a hardcoded
  -- fallback matching the defaults below, so the site works even before
  -- Supabase is connected.
  mix_match_tiers jsonb not null default '[{"min":3,"max":5,"pct":5},{"min":6,"max":9,"pct":7},{"min":10,"max":null,"pct":10}]',
  welcome_code text not null default 'IRONASCENSION26',
  welcome_discount_pct numeric not null default 10,
  crypto_discount_pct numeric not null default 5,
  stack_cap_pct numeric not null default 30,
  -- Amounts are in cents (USD): $15 flat shipping, free from $150; free cap from $150.
  shipping_fee_cents integer not null default 1500,
  free_shipping_threshold_cents integer not null default 15000,
  free_cap_threshold_cents integer not null default 15000,
  updated_at timestamptz default now(),
  constraint settings_singleton check (id = 1)
);
insert into settings (id) values (1) on conflict (id) do nothing;
-- Safe to re-run on a database created before these columns existed.
alter table settings add column if not exists mix_match_tiers jsonb not null default '[{"min":3,"max":5,"pct":5},{"min":6,"max":9,"pct":7},{"min":10,"max":null,"pct":10}]';
alter table settings add column if not exists welcome_code text not null default 'IRONASCENSION26';
alter table settings add column if not exists welcome_discount_pct numeric not null default 10;
alter table settings add column if not exists crypto_discount_pct numeric not null default 5;
alter table settings add column if not exists stack_cap_pct numeric not null default 30;
alter table settings add column if not exists shipping_fee_cents integer not null default 1500;
alter table settings add column if not exists free_shipping_threshold_cents integer not null default 15000;
alter table settings add column if not exists free_cap_threshold_cents integer not null default 15000;
-- Flat $15 shipping, free from $150 (also applies to an existing settings row).
update settings set shipping_fee_cents = 1500, free_shipping_threshold_cents = 15000 where id = 1;
alter table settings add column if not exists whatsapp_number text default '+1 (423) 484-7466';
-- Payment methods shown in the cart dropdown (editable in /admin.html -> Site Settings).
alter table settings add column if not exists payment_methods jsonb not null default '["Bitcoin","Cashapp","Apple Pay","Zelle","Chime","PayPal"]';
update settings set payment_methods = '["Bitcoin","Cashapp","Apple Pay","Zelle","Chime","PayPal"]' where id = 1;

-- ============================================
-- Admin-editable content (no redeploy needed). All of these are edited
-- from /admin.html; a null/empty value means "use the site's built-in
-- default wording".
-- ============================================
alter table settings add column if not exists payment_instructions jsonb not null default '{}';   -- { "Cashapp": "Send to $tag ...", ... }
alter table settings add column if not exists order_confirmation_message text;                     -- shown after checkout + in the customer email
alter table settings add column if not exists email_templates jsonb not null default '{}';        -- { "paid": {"enabled":true,"subject":"...","body":"..."}, ... }
alter table settings add column if not exists faqs jsonb;                                         -- [{ "q": "...", "a": "..." }]
alter table settings add column if not exists shipping_content text;                              -- Shipping & Returns page body (simple markup)
alter table settings add column if not exists hero_image_url text;
alter table settings add column if not exists featured_product_ids jsonb not null default '[]';  -- product ids shown in the homepage "Featured" row
alter table settings add column if not exists footer_tagline text;
alter table settings add column if not exists working_hours text;

-- Product / merch extras: sale price (shown struck-through against the
-- regular price) and a small badge such as "New" or "Bestseller".
alter table products add column if not exists sale_price_cents integer;
alter table products add column if not exists badge text;
alter table merch add column if not exists sale_price_cents integer;
alter table merch add column if not exists badge text;

-- Order statuses now include paid + shipped (used by the optional
-- status emails in /admin.html).
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check check (status in ('new','contacted','paid','shipped','fulfilled','cancelled'));
alter table settings add column if not exists social_instagram_url text;
alter table settings add column if not exists social_tiktok_url text;
alter table settings add column if not exists social_facebook_url text;
alter table settings add column if not exists social_twitter_url text;
alter table settings add column if not exists social_youtube_url text;
alter table settings add column if not exists hero_heading text;
alter table settings add column if not exists hero_tagline text;
-- If this database already existed before this update, these two lines
-- move the defaults forward for existing rows (won't override a value
-- you've already customized in /admin.html).
update settings set contact_email = 'contact@ironascension.com' where contact_email = 'support@ironascension.com';
update settings set contact_phone = '+1 (423) 484-7466', whatsapp_number = '+1 (423) 484-7466' where contact_phone is null;

-- ============================================
-- Orders. Submitted from the cart/checkout page (order.html). There is no
-- payment processor wired in - this is a record of what the customer
-- asked for, used for the team-inbox email notification and for the
-- Orders tab in /admin.html, so nothing is lost even if the notification
-- email fails to send. items is the full cart snapshot at submit time
-- (id, type, name, unit price, qty) so historical orders stay accurate
-- even if a product's price changes later.
-- ============================================
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  items jsonb not null default '[]',
  subtotal_cents integer not null default 0,
  discount_pct numeric default 0,
  discount_cents integer default 0,
  discount_label text,
  promo_code text,
  payment_method text,
  gift_items jsonb not null default '[]',
  shipping_free boolean not null default false,
  shipping_cents integer,
  contact_preference text,
  total_cents integer,
  customer_name text,
  -- Nullable: an Order Request via WhatsApp doesn't require an email
  -- (see channel below) - the email-checkout flow still enforces this
  -- at the application layer in submit-order.js.
  customer_email text,
  customer_phone text,
  shipping_address text,
  notes text,
  status text not null default 'new' check (status in ('new','contacted','paid','shipped','fulfilled','cancelled')),
  -- "email" = the full checkout form on order.html (sends a customer
  -- confirmation email). "whatsapp" = the "Send Order Request by
  -- WhatsApp" button - recorded here too so it shows up in the
  -- Notifications tab, but no customer confirmation email is sent for it.
  channel text not null default 'email' check (channel in ('email','whatsapp')),
  -- Has anyone on the team opened/seen this order yet - powers the
  -- Notifications tab in /admin.html. Independent of `status` above,
  -- which tracks fulfillment progress instead.
  read boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_created on orders(created_at desc);
create index if not exists idx_orders_channel_read on orders(channel, read);
-- Safe to re-run on a database created before these columns existed.
alter table orders add column if not exists discount_pct numeric default 0;
alter table orders add column if not exists discount_cents integer default 0;
alter table orders add column if not exists discount_label text;
alter table orders add column if not exists promo_code text;
alter table orders add column if not exists payment_method text;
alter table orders add column if not exists gift_items jsonb not null default '[]';
alter table orders add column if not exists shipping_free boolean not null default false;
alter table orders add column if not exists shipping_cents integer;
alter table orders add column if not exists contact_preference text;   -- Email / Text message / WhatsApp
alter table orders add column if not exists total_cents integer;
alter table orders add column if not exists channel text not null default 'email';
alter table orders add column if not exists read boolean not null default false;
alter table orders alter column customer_email drop not null;

-- Contact form submissions
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  message text,
  -- Has anyone on the team opened/seen this message yet - powers the
  -- Notifications tab in /admin.html.
  read boolean not null default false,
  created_at timestamptz default now()
);
alter table contact_messages add column if not exists read boolean not null default false;
create index if not exists idx_contact_messages_read on contact_messages(read);

-- ============================================
-- Email signup subscribers (the IRONASCENSION26 welcome popup). Enforces
-- "single use, one email per code" server-side: submit-order.js checks
-- discount_used for the customer's email before honoring the welcome
-- code, and sets it true once an order using that code is placed. This is
-- the cross-device/cross-browser backstop - the client also keeps a
-- localStorage flag for instant same-browser feedback, but this table is
-- the authoritative check.
-- ============================================
create table if not exists subscribers (
  email text primary key,
  discount_used boolean not null default false,
  created_at timestamptz default now(),
  discount_used_at timestamptz
);

-- ============================================
-- Storage bucket for admin-uploaded files (product photos, merch photos).
-- Public read (photos need to be viewable by any site visitor), writes
-- only via the service-role key (see admin-upload.js).
-- ============================================
insert into storage.buckets (id, name, public)
values ('product-files', 'product-files', true)
on conflict (id) do nothing;

drop policy if exists "public read product-files" on storage.objects;
create policy "public read product-files" on storage.objects
  for select using (bucket_id = 'product-files');
-- No public insert/update/delete policy, on purpose - uploads only ever
-- go through admin-upload.js using the service role key, which bypasses
-- RLS entirely (same reasoning as every other admin write in this file).

-- ============================================
-- Row Level Security: public can read categories/products/merch/settings,
-- but only service-role (Netlify Functions) can write. All admin writes
-- go through /admin.html's protected Netlify Functions (admin-catalog.js,
-- admin-settings.js, admin-upload.js), which check a shared admin
-- password against ADMIN_PASSWORD before touching the database - there is
-- no Supabase Auth / per-user login involved (see backend/README.md).
-- ============================================
alter table categories enable row level security;
alter table products enable row level security;
alter table merch enable row level security;
alter table settings enable row level security;
alter table orders enable row level security;
alter table contact_messages enable row level security;
alter table subscribers enable row level security;

drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories for select using (true);
drop policy if exists "public read products" on products;
create policy "public read products" on products for select using (true);
drop policy if exists "public read merch" on merch;
create policy "public read merch" on merch for select using (true);
drop policy if exists "public read settings" on settings;
create policy "public read settings" on settings for select using (true);
-- orders/contact_messages: no public select policy - only written via the
-- service-role key inside Netlify Functions (submit-order.js, contact.js),
-- and only read back via the password-gated admin-orders.js function.

-- ============================================
-- Seed data: the real 64-product catalog, 7 categories, and 10 merch items
-- the static site ships with, so a fresh Supabase database starts out
-- identical to what visitors see before the backend is even connected.
--
-- Safe to re-run any time: every insert below uses "on conflict do
-- update", so pasting this whole file again after editing a price, name,
-- description, or image path here updates the existing row instead of
-- erroring or getting silently skipped - nothing needs to be deleted
-- first, and no other table is touched.
-- ============================================
insert into categories (number, slug, name, blurb, image_url) values
  (1, 'category-1', 'Injectables', 'Injectable research compounds', null),
  (2, 'category-2', 'Oral Tablets', 'Oral research compounds', null),
  (3, 'category-3', 'PCT', 'Post Cycle Therapy & cycle support', null),
  (4, 'category-4', 'HCG', 'HCG products', null),
  (5, 'category-5', 'Performance & Support', 'Performance and support products', null),
  (6, 'category-6', 'HGH', 'Human growth hormone products', null),
  (7, 'category-7', 'SARMs', 'SARMs & Selective Labs', null)
on conflict (number) do update set
  slug = excluded.slug,
  name = excluded.name,
  blurb = excluded.blurb,
  image_url = excluded.image_url;

insert into products (id, number, name, category_number, price_cents, tagline, description, image_url, sort_order) values
  ('product-1', 1, 'Test Propionate 100', 1, 5500, 'Injectable Solution (10 mL Vial)', 'Iron Ascension Test Propionate 100 is a fast-acting injectable testosterone ester engineered for rapid systemic absorption and immediate anabolic support. Designed for short-cycle application, cutting phases, and precise hormonal titration, it delivers quick increases in serum testosterone levels with minimal fluid retention.', 'assets/images/products/product-1-test-propionate-100.jpg', 1),
  ('product-2', 2, 'Testosterone Enanthate 250', 1, 5500, 'Injectable Solution (10 mL Vial)', 'Iron Ascension Testosterone Enanthate 250 is a long-acting injectable testosterone ester engineered for sustained systemic release and reliable anabolic support. Designed for foundational bulking phases, baseline testosterone replacement, and consistent muscle mass retention, it delivers stable hormone levels with a convenient dosing schedule.', 'assets/images/products/product-2-testosterone-enanthate-250.jpg', 2),
  ('product-3', 3, 'Testosterone Enanthate 300', 1, 6000, 'Injectable Solution (10 mL Vial)', 'Iron Ascension Testosterone Enanthate 300 provides a higher-concentration, long-acting testosterone formula designed to deliver maximum anabolic potency per milliliter. Engineered for advanced athletic protocols, mass-building cycles, and sustained hormone maintenance, it enables efficient dosing while promoting rapid gains in strength and muscle volume.', 'assets/images/products/product-3-testosterone-enanthate-300.jpg', 3),
  ('product-4', 4, 'Testosterone Enanthate 500', 1, 6500, 'Injectable Solution (10 mL Vial)', 'Iron Ascension Testosterone Enanthate 500 is an ultra-high-concentration anabolic formula engineered for maximum efficiency and heavy-duty mass protocols. Designed for experienced users seeking high-dosage testosterone support with minimal liquid volume, it provides standard sustained-release kinetics in an exceptionally concentrated delivery system.', 'assets/images/products/product-4-testosterone-enanthate-500.jpg', 4),
  ('product-5', 5, 'Testosterone Cypionate 250', 1, 5500, 'Injectable Solution (10 mL Vial)', 'Iron Ascension Testosterone Cypionate 250 is a classic long-acting anabolic compound designed for consistent hormone release and dependable athletic baseline support. Widely utilized in both foundational mass-building cycles and hormone replacement protocols, it promotes steady, sustained improvements in power, muscle preservation, and systemic recovery.', 'assets/images/products/product-5-testosterone-cypionate-250.jpg', 5),
  ('product-6', 6, 'Sustanon 250', 1, 5500, 'Injectable Solution (10 mL Vial)', 'Iron Ascension Sustanon 250 is a multi-ester testosterone blend engineered to deliver both immediate release and long-lasting anabolic activity. Combining short, medium, and long-chain esters, it provides a rapid onset of action while maintaining steady, elevated blood plasma levels over extended periods for maximum performance and mass development.', 'assets/images/products/product-6-sustanon-250.jpg', 6),
  ('product-7', 7, 'T400', 1, 6000, 'Injectable Solution (10 mL Vial)', 'Iron Ascension T400 is a high-potency testosterone blend designed to maximize anabolic impact while minimizing injection volume. Formulated with a synergistic combination of fast and slow-acting esters, it delivers an initial burst of active compound followed by sustained, long-term release for high-volume cycles and massive strength development.', 'assets/images/products/product-7-t400.jpg', 7),
  ('product-8', 8, 'Deca 300', 1, 5500, 'Injectable Solution (10 mL Vial)', 'Iron Ascension Deca 300 (Nandrolone Decanoate) is a classic, slow-acting anabolic compound engineered for heavy mass construction, joint relief, and sustained muscular recovery. Known for its high anabolic-to-androgenic ratio, it facilitates substantial lean muscle growth with minimal androgenic side effects and reduced strain on connective tissues.', 'assets/images/products/product-8-deca-300.jpg', 8),
  ('product-9', 9, 'NPP 150', 1, 6000, 'Injectable Solution (10 mL Vial)', 'Iron Ascension NPP 150 (Nandrolone Phenylpropionate) is a short-acting nandrolone ester designed for rapid systemic clearance and precise cycle management. Offering all the muscular hypertrophy and joint-supportive benefits of traditional nandrolone, its shorter ester profile allows for faster onset of action and easier side effect control.', 'assets/images/products/product-9-npp-150.jpg', 9),
  ('product-10', 10, 'Equipoise (EQ) 300', 1, 6000, 'Injectable Solution (10 mL Vial)', 'Iron Ascension Equipoise (EQ) 300 (Boldenone Undecylenate) is a long-acting anabolic compound engineered for steady, steady-state lean tissue expansion and vascularity. Renowned for boosting red blood cell production and appetite without extreme water retention, it provides a slow, high-quality build in strength and endurance over extended cycles.', 'assets/images/products/product-10-equipoise-eq-300.jpg', 10),
  ('product-11', 11, 'Trenbolone Enanthate 200', 1, 7000, 'Injectable Solution (10 mL Vial)', 'Iron Ascension Trenbolone Enanthate 200 is a potent, long-acting anabolic compound engineered for powerful mass gains, radical strength increases, and high-level conditioning. Designed for long-cycle efficiency, it delivers high binding affinity to androgen receptors without converting to estrogen, making it an essential tool for advanced recomposition and cutting phases.', 'assets/images/products/product-11-trenbolone-enanthate-200.jpg', 11),
  ('product-12', 12, 'Trenbolone Acetate 100', 1, 5500, 'Injectable Solution (10 mL Vial)', 'Iron Ascension Trenbolone Acetate 100 is a fast-acting, high-potency anabolic compound designed for rapid strength delivery, extreme muscle hardness, and accelerated fat loss. Its short-ester profile allows for quick systemic absorption, precise dose control, and immediate physical transformation during prep and recomposition phases.', 'assets/images/products/product-12-trenbolone-acetate-100.jpg', 12),
  ('product-13', 13, 'TNT Blend 400', 1, 6000, 'Injectable Solution (10 mL Vial)', 'Iron Ascension TNT Blend 400 is a heavy-duty combination formula pairing Testosterone Enanthate and Trenbolone Enanthate for maximum anabolic synergy. Engineered for advanced mass-building and recomposition protocols, this dual-compound blend delivers high-potency force, rapid recovery, and dense muscle tissue development in a single streamlined administration.', 'assets/images/products/product-13-tnt-blend-400.jpg', 13),
  ('product-14', 14, 'Masteron Propionate 150', 1, 5500, 'Injectable Solution (10 mL Vial)', 'Iron Ascension Masteron Propionate 150 (Drostanolone Propionate) is a fast-acting, anti-estrogenic anabolic agent engineered for pre-contest conditioning and peak muscle definition. Designed to deliver a hard, grainy physical appearance, it works efficiently to eliminate subcutaneous water while protecting lean tissue during high-deficit cutting phases.', 'assets/images/products/product-14-masteron-propionate-150.jpg', 14),
  ('product-15', 15, 'Masteron Enanthate 200', 1, 5500, 'Injectable Solution (10 mL Vial)', 'Iron Ascension Masteron Enanthate 200 (Drostanolone Enanthate) is a long-acting anabolic compound engineered for sustained muscle hardening, anti-estrogenic support, and physique refinement. Designed for longer cutting cycles, it delivers steady plasma levels to strip away residual fluid and enhance muscle density with fewer required injections.', 'assets/images/products/product-15-masteron-enanthate-200.jpg', 15),
  ('product-16', 16, 'Primobolan 100', 1, 7000, 'Injectable Solution (10 mL Vial)', 'Iron Ascension Primobolan 100 (Methenolone Enanthate) is a premium, mild anabolic agent engineered for high-quality lean muscle preservation and clean conditioning. Featuring an exceptionally low androgenic profile and zero estrogenic activity, it is ideal for cutting cycles, protecting lean mass in calorie deficits, and building solid, dry tissue without fluid retention.', 'assets/images/products/product-16-primobolan-100.jpg', 16),
  ('product-17', 17, 'Primobolan 200', 1, 12000, 'Injectable Solution (10 mL Vial)', 'Iron Ascension Primobolan 200 (Methenolone Enanthate) is a double-concentration formulation of our premium, clean anabolic agent. Engineered for high-dose protocol efficiency with lower liquid volume, it provides superior lean tissue preservation, zero estrogenic activity, and steady muscular conditioning for advanced performance cutting phases.', 'assets/images/products/product-17-primobolan-200.jpg', 17),
  ('product-18', 18, 'Winstrol 50 (Injectable)', 1, 8100, 'Injectable Suspension/Solution (10 mL Vial)', 'Iron Ascension Winstrol 50 (Stanozolol) is a potent injectable anabolic compound engineered for maximum physical hardness, vascularity, and explosive speed output. Preferred over oral delivery to avoid primary liver breakdown, it drives rapid fluid clearance and enhances free testosterone levels by binding strongly to Sex Hormone Binding Globulin (SHBG).', 'assets/images/products/product-18-winstrol-50-injectable.jpg', 18),
  ('product-19', 19, 'Superdrol 40 (Injectable)', 1, 8100, 'Injectable Solution (10 mL Vial)', 'Iron Ascension Superdrol 40 (Methasterone) is an ultra-potent injectable formulation engineered for extreme muscle density, dry mass expansion, and rapid strength increases. Designed to bypass initial hepatic metabolism associated with oral administration, it delivers immediate, unadulterated anabolic activity without estrogenic conversion.', 'assets/images/products/product-19-superdrol-40-injectable.jpg', 19),
  ('product-20', 20, 'Anavar 5', 2, 6000, 'Oral Tablets (200 Tablet Bottle)', 'Iron Ascension Anavar 5 (Oxandrolone) is a low-dose, high-precision oral anabolic agent designed for clean lean muscle preservation, steady strength development, and enhanced fat loss support. Featuring exceptional tolerability and zero estrogenic conversion, it is ideal for fine-tuned dosing protocols, metabolic cutting cycles, and micro-dosing strategies.', 'assets/images/products/product-20-anavar-5.jpg', 20),
  ('product-21', 21, 'Anavar 10', 2, 5000, 'Oral Tablets (100 Tablet Bottle)', 'Iron Ascension Anavar 10 (Oxandrolone) is a high-purity oral anabolic agent designed for clean muscle preservation, dry strength gains, and body recomposition support. Known for its exceptional safety profile and zero estrogenic conversion, it delivers precise dosing for targeted fat loss, vascularity, and lean mass retention without water retention.', 'assets/images/products/product-21-anavar-10.jpg', 21),
  ('product-22', 22, 'Turinabol 10', 2, 7000, 'Oral Tablets (100 Tablet Bottle)', 'Iron Ascension Turinabol 10 (Chlorodehydromethyltestosterone) is a specialized oral anabolic compound designed for steady, high-quality lean muscle gains, endurance enhancement, and dry strength development. Formulated without aromatizing activity, it provides steady performance elevation and improved recovery without subcutaneous water retention or estrogenic side effects.', 'assets/images/products/product-22-turinabol-10.jpg', 22),
  ('product-23', 23, 'Superdrol 10', 2, 7000, 'Oral Tablets (100 Tablet Bottle)', 'Iron Ascension Superdrol 10 (Methasterone) is an ultra-potent oral anabolic agent engineered for rapid mass accumulation, severe strength output, and intense muscular fullness. Recognized as one of the most powerful oral compounds available, it delivers immediate anabolic action without converting to estrogen, driving dense muscle gains during short, focused power cycles.', 'assets/images/products/product-23-superdrol-10.jpg', 23),
  ('product-24', 24, 'Dianabol 25', 2, 5500, 'Oral Tablets (100 Tablet Bottle)', 'Iron Ascension Dianabol 25 (Methandrostenolone) is a fast-acting oral anabolic agent engineered for rapid, explosive mass gains, enhanced protein synthesis, and extreme strength increases. Regarded as a classic, heavy-duty kickstarter for bulking protocols, it creates a powerful anabolic environment that rapidly drives muscular volume and glycogen storage.', 'assets/images/products/product-24-dianabol-25.jpg', 24),
  ('product-25', 25, 'Anadrol 25', 2, 8600, 'Oral Tablets (100 Tablet Bottle)', 'Iron Ascension Anadrol 25 (Oxymetholone) is a potent oral anabolic agent engineered for rapid mass expansion, extreme muscle fullness, and dramatic power gains. Formulated in an adaptable 25 mg dose, it allows for controlled administration and precise titration while driving high-level nitrogen retention, red blood cell production, and rapid strength increases during heavy bulking phases.', 'assets/images/products/product-25-anadrol-25.jpg', 25),
  ('product-26', 26, 'Winstrol 25', 2, 8100, 'Oral Tablets (100 Tablet Bottle)', 'Iron Ascension Winstrol 25 (Stanozolol) is an oral anabolic agent engineered for physical hardness, vascularity, and raw athletic performance. Formulated to drive rapid fluid clearance and enhance active hormone efficiency, it binds strongly to Sex Hormone Binding Globulin (SHBG) to promote a crisp, dry, and defined aesthetic.', 'assets/images/products/product-26-winstrol-25.jpg', 26),
  ('product-27', 27, 'Anavar 50', 2, 18100, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension Anavar 50 (Oxandrolone) is a high-concentration oral anabolic agent formulated for maximum lean muscle preservation, accelerated fat oxidation, and dramatic strength development. Delivering a potent 50 mg per tablet, it provides an efficient high-dose protocol to maintain extreme muscular density, vascularity, and peak power output without fluid retention.', 'assets/images/products/product-27-anavar-50.jpg', 27),
  ('product-28', 28, 'Halotestin 10', 2, 7000, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension Halotestin 10 (Fluoxymesterone) is an extremely potent oral androgenic agent engineered for raw strength surges, aggressive neural drive, and rapid muscle hardening. Widely utilized by powerlifters, strength athletes, and contest-prep bodybuilders, it provides instantaneous performance acceleration without converting to estrogen or adding fluid weight.', 'assets/images/products/product-28-halotestin-10.jpg', 28),
  ('product-29', 29, 'Proviron 25', 2, 7000, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension Proviron 25 (Mesterolone) is an oral androgenic compound engineered to enhance muscle hardness, boost free testosterone levels, and optimize overall anabolic efficiency. By binding strongly to Sex Hormone Binding Globulin (SHBG) and acting as an unyielding aromatase inhibitor, it prevents estrogenic conversion while delivering a hard, grainy, and dry physical aesthetic.', 'assets/images/products/product-29-proviron-25.jpg', 29),
  ('product-30', 30, 'Clomid 50', 3, 5000, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension Clomid 50 (Clomiphene Citrate) is a selective estrogen receptor modulator (SERM) engineered to stimulate endogenously suppressed testosterone recovery following anabolic protocols. By selectively blocking estrogen receptors at the pituitary-hypothalamic axis, it triggers the release of Luteinizing Hormone (LH) and Follicle-Stimulating Hormone (FSH) to rapidly restart natural testicular production.', 'assets/images/products/product-30-clomid-50.jpg', 30),
  ('product-31', 31, 'Nolvadex 25', 3, 5000, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension Nolvadex 25 (Tamoxifen Citrate) is a core selective estrogen receptor modulator (SERM) engineered for targeted estrogen receptor blockade and endocrine recovery. By competitively binding to estrogen receptors in mammary tissue and at the hypothalamic-pituitary level, it provides direct protection against gynecomastia while stimulating the release of gonadotropins to restore endogenous testosterone production.', 'assets/images/products/product-31-nolvadex-25.jpg', 31),
  ('product-32', 32, 'Gonasi 5000 IU', 4, 8100, 'Lyophilized Powder + Bacteriostatic Water (Includes Diluent)', 'Iron Ascension Gonasi 5000 IU (Human Chorionic Gonadotropin / hCG) is a high-purity polypeptide hormone engineered to maintain testicular function, preserve fertility, and accelerate Leydig cell reactivation. Mimicking Luteinizing Hormone (LH), it prevents testicular atrophy during heavy anabolic protocols and lays the essential foundation for full HPTA recovery. Each kit includes dedicated bacteriostatic water for multi-dose reconstitutions.', 'assets/images/products/product-32-gonasi-5000-iu.jpg', 32),
  ('product-33', 33, 'Letrozole 2.5', 5, 6000, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension Letrozole 2.5 is a highly potent third-generation non-steroidal aromatase inhibitor (AI) engineered for maximum estrogen suppression and water retention control. By competitively binding to the aromatase enzyme, it blocks the conversion of aromatizable compounds into estrogen, mitigating gynecomastia, fluid buildup, and estrogen-related feedback loops.', 'assets/images/products/product-33-letrozole-2-5.jpg', 33),
  ('product-34', 34, 'Arimidex 1', 5, 5000, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension Arimidex 1 (Anastrozole) is a selective, non-steroidal aromatase inhibitor (AI) engineered for precise systemic estrogen control and water retention mitigation. By binding competitively to the aromatase enzyme, it prevents the conversion of testosterone into estradiol, ensuring a dry physique while shielding against estrogen-related side effects.', 'assets/images/products/product-34-arimidex-1.jpg', 34),
  ('product-35', 35, 'Aromasin 25', 5, 5000, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension Aromasin 25 (Exemestane) is a potent, steroidal irreversible aromatase inhibitor engineered to eliminate estrogenic side effects and prevent rebound estrogen spikes. Acting as a "suicide inhibitor," it permanently inactivates the aromatase enzyme, guaranteeing superior estrogen suppression, enhanced fluid clearance, and optimized free testosterone levels.', 'assets/images/products/product-35-aromasin-25.jpg', 35),
  ('product-36', 36, 'Testogel 16.2', 5, 5500, 'Transdermal Gel (60 Metered Pump Doses / 88g Bottle)', 'Iron Ascension Testogel 16.2 (Testosterone Gel 1.62%) is a advanced transdermal androgen delivery system engineered for steady, continuous systemic hormone absorption. Formulated with a specialized hydroalcoholic carrier, it penetrates the stratum corneum rapidly to elevate serum testosterone levels without the concentration spikes and troughs associated with short-acting injectable esters.', 'assets/images/products/product-36-testogel-16-2.jpg', 36),
  ('product-37', 37, 'Viagra 25', 5, 6000, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension Viagra 25 (Sildenafil Citrate) is a selective phosphodiesterase type 5 (PDE5) inhibitor engineered to enhance systemic blood flow, optimize vascular responsiveness, and support maximum erectile quality. Formulated at a precise 25 mg dose, it allows for flexible protocol management, improved microcirculation, and reliable performance on demand.', 'assets/images/products/product-37-viagra-25.jpg', 37),
  ('product-38', 38, 'Cialis 25', 5, 6000, 'Oral Tablets (50 Tablet Bottle)', 'Iron Ascension Cialis 25 (Tadalafil) is a long-acting selective phosphodiesterase type 5 (PDE5) inhibitor engineered to enhance systemic blood flow, promote sustained vascularity, and optimize erectile performance. Featuring an extended half-life, it supports continuous arterial dilation, improved exercise capacity, and robust vascular responsiveness over an extended therapeutic window.', 'assets/images/products/product-38-cialis-25.jpg', 38),
  ('product-39', 39, 'Superman 50', 5, 7000, 'Oral Tablets (50 Tablet Bottle)', 'Iron Ascension Superman 50 is a dual-action oral performance blend engineered to deliver maximal vasodilation, enhanced stamina, and reliable erectile support. Combining high-potency PDE5 inhibitors, this synergistic formulation optimizes systemic blood flow, accelerates vascular responsiveness, and sustains peak performance capacity throughout extended physical activity.', 'assets/images/products/product-39-superman-50.jpg', 39),
  ('product-40', 40, 'Lipo X 125', 5, 7000, 'Oral Tablets (100 Tablet Bottle)', 'Iron Ascension Lipo X 125 is a high-potency thermogenic metabolic complex engineered to accelerate lipid oxidation, increase basal metabolic rate, and preserve lean muscle mass during aggressive cutting phases. Formulated at 125 mg per tablet, it enhances mitochondrial energy expenditure and sustains high physical output while suppressing appetite and eliminating stubborn fluid retention.', 'assets/images/products/product-40-lipo-x-125.jpg', 40),
  ('product-41', 41, 'Cytomel T3 25', 5, 7000, 'Oral Tablets (100 Tablet Bottle)', 'Iron Ascension Cytomel T3 25 (Liothyronine Sodium) is a synthetic thyroid hormone engineered to significantly accelerate basal metabolic rate, enhance cellular energy turnover, and drive targeted fat oxidation. As the active form of thyroid hormone (T3), it directly upregulates nutrient metabolism and ATP production to maximize fat loss during strict calorie deficits.', 'assets/images/products/product-41-cytomel-t3-25.jpg', 41),
  ('product-42', 42, 'Clenbuterol 50', 5, 7000, 'Oral Tablets (100 Tablet Bottle)', 'Iron Ascension Clenbuterol 50 is a powerful selective beta-2 sympathomimetic amine engineered to stimulate rapid thermogenesis, elevate basal metabolic rate, and preserve lean tissue during intense cutting cycles. Delivering a potent 50 mcg per tablet, it directly targets lipolysis while enhancing central nervous system output and bronchial airflow for maximum training endurance.', 'assets/images/products/product-42-clenbuterol-50.jpg', 42),
  ('product-43', 43, 'Clenbuterol 200', 5, 7000, 'Oral Liquid (30 mL Dropper Bottle)', 'Iron Ascension Clenbuterol 200 is a high-concentration oral liquid beta-2 sympathomimetic formulation engineered for rapid metabolic rate elevation, accelerated lipolysis, and precise micro-dosing. Delivering 200 mcg per mL, this liquid presentation offers superior dosing flexibility to easily titrate protocols while driving intense thermogenesis and preserving lean tissue during aggressive cutting phases.', 'assets/images/products/product-43-clenbuterol-200.jpg', 43),
  ('product-44', 44, '5-Amino-1MQ 50', 5, 22000, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension 5-Amino-1MQ 50 is an advanced small-molecule selective NNMT (Nicotinamide N-methyltransferase) inhibitor engineered to optimize cellular energy dynamics, accelerate lipid oxidation, and preserve lean muscle tissue. By preventing the depletion of intracellular NAD+ and SAM (S-adenosylmethionine), it drives mitochondrial efficiency, enhances fat loss, and supports metabolic longevity without central nervous system stimulation.', 'assets/images/products/product-44-5-amino-1mq-50.jpg', 44),
  ('product-45', 45, 'Ibutamoren (MK-677) 10', 5, 7000, 'Oral Tablets (100 Tablet Bottle)', 'Iron Ascension Ibutamoren 10 (MK-677) is an orally active, non-peptide ghrelin receptor agonist engineered to stimulate endogenous Human Growth Hormone (HGH) and Insulin-Like Growth Factor 1 (IGF-1) secretion. Designed to mimic the natural growth-hormone-releasing action of ghrelin, it promotes deep recovery, accelerates nitrogen retention, enhances lean mass buildup, and optimizes bone mineral density without suppressing natural test levels.', 'assets/images/products/product-45-ibutamoren-mk-677-10.jpg', 45),
  ('product-46', 46, 'Metabol (SR-9011) 10', 5, 9100, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension Metabol 10 (SR-9011) is an advanced REV-ERBa receptor agonist engineered to modulate the body’s circadian metabolic machinery, optimize energy expenditure, and dramatically boost physical endurance. By activating REV-ERB protein pathways in skeletal muscle, liver, and adipose tissue, it increases mitochondrial density, accelerates fatty acid oxidation, and elevates aerobic capacity without central nervous system stimulation.', 'assets/images/products/product-46-metabol-sr-9011-10.jpg', 46),
  ('product-47', 47, 'Stenabolic (SR-9009) 10', 5, 8100, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension Stenabolic 10 (SR-9009) is a specialized REV-ERBa agonist engineered to enhance metabolic rate, boost aerobic capacity, and accelerate lipid oxidation. By directly activating REV-ERB proteins within skeletal muscle and metabolic tissues, it stimulates mitochondrial biogenesis, turns off fat-storing genes, and enhances VO2 max and physical stamina without impacting the central nervous system or endocrine system.', 'assets/images/products/product-47-stenabolic-sr-9009-10.jpg', 47),
  ('product-48', 48, 'Lipoline (GW-0742) 10', 5, 8100, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension Lipoline 10 (GW-0742) is a next-generation selective Peroxisome Proliferator-Activated Receptor delta (PPARd) agonist engineered to rapidly accelerate lipid oxidation, enhance cardiovascular endurance, and optimize metabolic efficiency. Formulated at 10 mg per tablet, it shifts energy reliance directly toward fatty acid breakdown, driving intense fat loss and dramatically extending physical stamina without altering natural hormone production.', 'assets/images/products/product-48-lipoline-gw-0742-10.jpg', 48),
  ('product-49', 49, 'Cardarine (GW-501516) 10', 5, 8100, 'Oral Tablets (100 Tablet Bottle)', 'Iron Ascension Cardarine 10 (GW-501516) is a premier selective Peroxisome Proliferator-Activated Receptor delta (PPARd) agonist engineered to dramatically elevate aerobic capacity, accelerate targeted fat oxidation, and improve cardiovascular endurance. By optimizing energy utilization and shifting muscle metabolism toward fatty acid oxidation, it enables longer, more intense training sessions while promoting a lean, defined physique without hormone suppression.', 'assets/images/products/product-49-cardarine-gw-501516-10.jpg', 49),
  ('product-50', 50, 'Humatrope 100 IU', 6, 25100, 'Lyophilized Powder + Bacteriostatic Water (Includes Diluent)', 'Iron Ascension Humatrope 100 IU (Somatropin) is a high-purity, 191-amino-acid recombinant Human Growth Hormone identical to the naturally produced pituitary hormone. Engineered to stimulate protein synthesis, accelerate lipolysis, promote deep tissue recovery, and elevate systemic IGF-1 levels, it serves as a cornerstone for hyper-trophic cellular growth and metabolic enhancement. Each kit includes dedicated bacteriostatic water for multi-dose reconstitution and stability.', 'assets/images/products/product-50-humatrope-100-iu.jpg', 50),
  ('product-51', 51, 'Dynatrope 100 IU', 6, 38100, 'Lyophilized Powder + Bacteriostatic Water (Includes Diluent)', 'Iron Ascension Dynatrope 100 IU (Somatropin) is a premium, 191-amino-acid recombinant Human Growth Hormone designed for maximal bioavailability and potent biological activity. Engineered to drive protein synthesis, enhance cellular proliferation, and accelerate lipid oxidation, Dynatrope significantly elevates systemic IGF-1 levels to promote rapid tissue repair, lean skeletal muscle retention, and joint matrix resilience. Each kit includes dedicated bacteriostatic water for smooth reconstitution and extended solution stability.', 'assets/images/products/product-51-dynatrope-100-iu.jpg', 51),
  ('product-52', 52, 'Genotrophin 36 IU', 6, 20000, 'Lyophilized Cartridges (Multi-Dose Cartridge)', 'Iron Ascension Genotrophin 36 IU (Somatropin) is a high-grade, 191-amino-acid recombinant Human Growth Hormone formulated in a convenient dual-chamber cartridge design. Engineered to stimulate protein synthesis, drive systemic cellular regeneration, and elevate circulating IGF-1 levels, it accelerates lipolysis, enhances muscle tissue recovery, and supports bone density and connective tissue integrity. The cartridge presentation ensures maximal stability, precise dosing control, and rapid preparation.', 'assets/images/products/product-52-genotrophin-36-iu.jpg', 52),
  ('product-53', 53, 'Somatotropin Kit 100 IU', 6, 15000, 'Lyophilized Powder (10 Vials x 10 IU Kit)', 'Iron Ascension Somatotropin Kit (Somatropin) is a high-grade 191-amino-acid recombinant Human Growth Hormone kit designed to accelerate tissue recovery, stimulate protein synthesis, and optimize body composition. Formulated as a 10-vial multi-dose presentation, it elevates circulating IGF-1 levels, promotes targeted subcutaneous fat oxidation, and strengthens connective tissue to withstand demanding physical performance.', 'assets/images/products/product-53-somatotropin-kit-100-iu.jpg', 53),
  ('product-54', 54, 'Hygetropin 200 IU Kit', 6, 25100, 'Lyophilized Powder (20 Vials x 10 IU Kit)', 'Iron Ascension Hygetropin 200 IU (Somatropin) is a premium, 191-amino-acid recombinant Human Growth Hormone kit engineered for enhanced bioavailability, accelerated tissue repair, and targeted body recomposition. Designed as a high-capacity 20-vial kit, it stimulates hepatic IGF-1 output, promotes continuous lipolysis, and drives skeletal muscle protein synthesis while expanding joint and connective tissue resilience.', 'assets/images/products/product-54-hygetropin-200-iu-kit.jpg', 54),
  ('product-55', 55, 'HGH Kit 100 IU', 6, 8100, 'Lyophilized Powder + Bacteriostatic Water (10 Vials x 10 IU Kit)', 'Iron Ascension HGH Kit 100 IU (Somatropin) is a high-purity, 191-amino-acid recombinant Human Growth Hormone kit engineered to optimize body composition, accelerate muscular recovery, and promote continuous systemic regeneration. Formulated as a convenient 10-vial presentation, it drives hepatic IGF-1 output, enhances nitrogen retention, and targets subcutaneous fat oxidation. Each kit includes dedicated bacteriostatic water for smooth reconstitution and multi-dose stability.', 'assets/images/products/product-55-hgh-kit-100-iu.jpg', 55),
  ('product-56', 56, 'S23 (Ultrabolic) 25', 7, 8600, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension S23 (Ultrabolic) 25 is a high-affinity, non-steroidal Selective Androgen Receptor Modulator engineered to promote extreme lean muscle accretion, enhanced strength output, and rapid muscle hardness. Designed with an exceptionally high binding affinity to androgen receptors in skeletal muscle and bone tissue, it mimics the potent anabolic effects of traditional androgenic agents while facilitating a dry, vascular, and highly detailed physical composition.', 'assets/images/products/product-56-s23-ultrabolic-25.jpg', 56),
  ('product-57', 57, 'Andarine (S4) 25', 7, 8600, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension Andarine (S4) 25 is a potent selective androgen receptor modulator engineered to drive rapid lean muscle retention, enhanced muscular hardness, and targeted body recomposition. By selectively binding to androgen receptors in skeletal muscle and bone, it promotes anabolic activity and accelerated lipolysis without causing subcutaneous water retention or estrogenic conversion, making it ideal for cutting and recomp protocols.', 'assets/images/products/product-57-andarine-s4-25.jpg', 57),
  ('product-58', 58, 'Ligandrol (LGD-4033) 10', 7, 8100, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension Ligandrol 10 (LGD-4033) is a highly potent selective androgen receptor modulator engineered to accelerate skeletal muscle tissue growth, boost total strength output, and enhance nitrogen retention. By selectively binding to androgen receptors in muscle and bone with high affinity, it drives significant anabolic gains, increases lean tissue mass, and aids tissue recovery without causing unwanted androgenic side effects.', 'assets/images/products/product-58-ligandrol-lgd-4033-10.jpg', 58),
  ('product-59', 59, 'Megabolic (LGD-3033) 10', 7, 8600, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension Megabolic 10 (LGD-3033) is an advanced, high-potency selective androgen receptor modulator engineered to stimulate rapid lean muscle hypertrophy, significant strength increases, and enhanced muscle tissue density. Possessing an exceptionally high binding affinity for skeletal muscle androgen receptors, LGD-3033 delivers targeted anabolic activity to accelerate nitrogen retention and protein synthesis without promoting water retention or unwanted estrogenic activity.', 'assets/images/products/product-59-megabolic-lgd-3033-10.jpg', 59),
  ('product-60', 60, 'Sustalone (RAD-150) 10', 7, 9100, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension Sustalone 10 (RAD-150) is an advanced anabolic esterified SARM (TLB-150 Benzoate) engineered to deliver sustained androgen receptor binding, increased systemic bioavailability, and rapid lean muscle accretion. By attaching an ester moiety to the original RAD-140 structure, RAD-150 provides a extended half-life, ensuring steady plasma concentration levels to promote continuous tissue anabolic signaling, dramatic strength increases, and superior muscular hardness.', 'assets/images/products/product-60-sustalone-rad-150-10.jpg', 60),
  ('product-61', 61, 'Myobol (YK-11) 5', 7, 8600, 'Oral Tablets (60 Tablet Bottle)', 'Iron Ascension Myobol 5 (YK-11) is an advanced steroidal SARM and myostatin inhibitor engineered to break through natural genetic muscle-building limits. By selectively binding to androgen receptors in skeletal muscle while simultaneously inducing the expression of Follistatin, YK-11 downregulates myostatin—the primary protein that restricts muscular growth. This dual-action mechanism accelerates rapid muscle tissue expansion, promotes extreme hardness, and drives massive strength output.', 'assets/images/products/product-61-myobol-yk-11-5.jpg', 61),
  ('product-62', 62, 'Ostarine (MK-2866) 10', 7, 8100, 'Oral Tablets (100 Tablet Bottle)', 'Iron Ascension Ostarine 10 (MK-2866) is a versatile selective androgen receptor modulator engineered to stimulate lean muscle retention, accelerate soft tissue repair, and support steady metabolic recomposition. By binding selectively to androgen receptors in bone and muscle tissue, it drives protein synthesis and protects lean muscle mass during caloric deficits without promoting fluid retention or adverse androgenic side effects.', 'assets/images/products/product-62-ostarine-mk-2866-10.jpg', 62),
  ('product-63', 63, 'Testolone (RAD-140) 10', 7, 9100, 'Oral Tablets (100 Tablet Bottle)', 'Iron Ascension Testolone 10 (RAD-140) is a high-potency selective androgen receptor modulator engineered to drive rapid skeletal muscle hypertrophy, significant strength increases, and enhanced power output. Designed with an exceptionally high anabolic-to-androgenic ratio, RAD-140 selectively targets androgen receptors in muscle and bone tissue to stimulate protein synthesis and muscular hardness without triggering estrogenic side effects or excessive fluid retention.', 'assets/images/products/product-63-testolone-rad-140-10.jpg', 63),
  ('product-64', 64, 'Testosterone Suspension 100', 1, 5500, 'Injectable Suspension (10 mL Vial)', 'Iron Ascension Testosterone Suspension 100 is an unesterified, micro-crystallized aqueous testosterone formula designed for rapid hormonal release and immediate physiological impact. Unlike esterified compounds, pure testosterone suspension bypasses delayed metabolic release, delivering rapid increases in circulating androgen levels to promote immediate strength capacity, aggressive training output, and powerful protein synthesis without extended clear times.', 'assets/images/products/product-64-testosterone-suspension-100.jpg', 64)
on conflict (id) do update set
  name = excluded.name,
  category_number = excluded.category_number,
  price_cents = excluded.price_cents,
  tagline = excluded.tagline,
  description = excluded.description,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order;

insert into merch (id, name, price_cents, description, image_url, sort_order) values
  ('merch-classic-tshirt', 'Classic T-Shirt', 3000, 'Iron Ascension classic training T-shirt.', 'assets/images/merch/classic-tshirt-white.jpg', 1),
  ('merch-performance-tank', 'Performance Tank', 2800, 'Lightweight training tank.', 'assets/images/merch/performance-tank-black.jpg', 2),
  ('merch-long-sleeve', 'Long-Sleeve Training Shirt', 3500, 'Long-sleeve training layer.', 'assets/images/merch/long-sleeve-white.jpg', 3),
  ('merch-polo', 'Polo', 4000, 'Clean everyday Iron Ascension polo.', 'assets/images/merch/polo-black.jpg', 4),
  ('merch-hoodie', 'Hoodie', 6000, 'Heavyweight gym and lifestyle hoodie.', 'assets/images/merch/hoodie-white.jpg', 5),
  ('merch-joggers', 'Joggers', 5000, 'Training and recovery joggers.', 'assets/images/merch/joggers-black.jpg', 6),
  ('merch-gym-shorts', 'Gym Shorts', 3500, 'Training shorts built for movement.', 'assets/images/merch/gym-shorts-white.jpg', 7),
  ('merch-cap', 'Cap', 2500, 'Iron Ascension training cap.', 'assets/images/merch/cap-grey.jpg', 8),
  ('merch-shaker', 'Shaker Bottle', 1800, 'Training shaker bottle.', 'assets/images/merch/shaker-black.jpg', 9),
  ('merch-sports-bra', 'Sports Bra', 3200, 'Racerback training sports bra.', 'assets/images/merch/sports-bra-black.jpg', 10)
on conflict (id) do update set
  name = excluded.name,
  price_cents = excluded.price_cents,
  description = excluded.description,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order;

-- Seed real color-variant photos for the merch line (matches the
-- photography that already ships in assets/images/merch/). Safe to
-- re-run: skips a merch item if it already has variant rows (so it
-- won't duplicate colors you've since edited or removed in /admin.html).
do $$
declare
  has_rows boolean;
begin
  select exists(select 1 from merch_variants where merch_id = 'merch-classic-tshirt') into has_rows;
  if not has_rows then
    insert into merch_variants (merch_id, color_name, image_url, sort_order) values
      ('merch-classic-tshirt', 'White', 'assets/images/merch/classic-tshirt-white.jpg', 0),
      ('merch-classic-tshirt', 'Black', 'assets/images/merch/classic-tshirt-black.jpg', 1),
      ('merch-classic-tshirt', 'Black (Red Logo)', 'assets/images/merch/classic-tshirt-black-red.jpg', 2);
  end if;
  select exists(select 1 from merch_variants where merch_id = 'merch-performance-tank') into has_rows;
  if not has_rows then
    insert into merch_variants (merch_id, color_name, image_url, sort_order) values
      ('merch-performance-tank', 'Black', 'assets/images/merch/performance-tank-black.jpg', 0),
      ('merch-performance-tank', 'White', 'assets/images/merch/performance-tank-white.jpg', 1),
      ('merch-performance-tank', 'Black (Red Logo)', 'assets/images/merch/performance-tank-black-red.jpg', 2);
  end if;
  select exists(select 1 from merch_variants where merch_id = 'merch-long-sleeve') into has_rows;
  if not has_rows then
    insert into merch_variants (merch_id, color_name, image_url, sort_order) values
      ('merch-long-sleeve', 'White', 'assets/images/merch/long-sleeve-white.jpg', 0),
      ('merch-long-sleeve', 'Black', 'assets/images/merch/long-sleeve-black.jpg', 1);
  end if;
  select exists(select 1 from merch_variants where merch_id = 'merch-polo') into has_rows;
  if not has_rows then
    insert into merch_variants (merch_id, color_name, image_url, sort_order) values
      ('merch-polo', 'Black', 'assets/images/merch/polo-black.jpg', 0),
      ('merch-polo', 'White', 'assets/images/merch/polo-white.jpg', 1);
  end if;
  select exists(select 1 from merch_variants where merch_id = 'merch-hoodie') into has_rows;
  if not has_rows then
    insert into merch_variants (merch_id, color_name, image_url, sort_order) values
      ('merch-hoodie', 'White', 'assets/images/merch/hoodie-white.jpg', 0),
      ('merch-hoodie', 'Black', 'assets/images/merch/hoodie-black.jpg', 1),
      ('merch-hoodie', 'Black (Red Logo)', 'assets/images/merch/hoodie-black-red.jpg', 2);
  end if;
  select exists(select 1 from merch_variants where merch_id = 'merch-joggers') into has_rows;
  if not has_rows then
    insert into merch_variants (merch_id, color_name, image_url, sort_order) values
      ('merch-joggers', 'Black', 'assets/images/merch/joggers-black.jpg', 0),
      ('merch-joggers', 'White', 'assets/images/merch/joggers-white.jpg', 1),
      ('merch-joggers', 'Black (Red Logo)', 'assets/images/merch/joggers-black-red.jpg', 2);
  end if;
  select exists(select 1 from merch_variants where merch_id = 'merch-gym-shorts') into has_rows;
  if not has_rows then
    insert into merch_variants (merch_id, color_name, image_url, sort_order) values
      ('merch-gym-shorts', 'White', 'assets/images/merch/gym-shorts-white.jpg', 0),
      ('merch-gym-shorts', 'Black', 'assets/images/merch/gym-shorts-black.jpg', 1);
  end if;
  select exists(select 1 from merch_variants where merch_id = 'merch-cap') into has_rows;
  if not has_rows then
    insert into merch_variants (merch_id, color_name, image_url, sort_order) values
      ('merch-cap', 'Grey', 'assets/images/merch/cap-grey.jpg', 0),
      ('merch-cap', 'White', 'assets/images/merch/cap-white.jpg', 1),
      ('merch-cap', 'Black', 'assets/images/merch/cap-black.jpg', 2);
  end if;
  select exists(select 1 from merch_variants where merch_id = 'merch-shaker') into has_rows;
  if not has_rows then
    insert into merch_variants (merch_id, color_name, image_url, sort_order) values
      ('merch-shaker', 'Black', 'assets/images/merch/shaker-black.jpg', 0),
      ('merch-shaker', 'White', 'assets/images/merch/shaker-white.jpg', 1),
      ('merch-shaker', 'Pink', 'assets/images/merch/shaker-pink.jpg', 2);
  end if;
  select exists(select 1 from merch_variants where merch_id = 'merch-sports-bra') into has_rows;
  if not has_rows then
    insert into merch_variants (merch_id, color_name, image_url, sort_order) values
      ('merch-sports-bra', 'Black', 'assets/images/merch/sports-bra-black.jpg', 0),
      ('merch-sports-bra', 'White', 'assets/images/merch/sports-bra-white.jpg', 1),
      ('merch-sports-bra', 'Grey', 'assets/images/merch/sports-bra-grey.jpg', 2);
  end if;
end $$;
