/* Iron Ascension - promo teaser callout
   A small, tasteful mention on product and merch detail pages pointing
   customers toward the site's active promos (Mix & Match, free gifts,
   welcome code, Bitcoin discount). Uses the same default figures as the
   fallback values everywhere else in the promo system - the banner at
   the very top of the page always shows the live, admin-set numbers, so
   this stays a lightweight nudge rather than a second source of truth to
   keep in sync. */
function promoTeaserHtml() {
  return `<div class="promo-teaser">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L3 3v6.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83z"></path><circle cx="7.5" cy="7.5" r="1.5"></circle></svg>
    <span>Buy more, save more - Mix &amp; Match discounts apply automatically at checkout. Spend $150+ for a free Cap and free shipping (flat $15 shipping below that).</span>
  </div>`;
}
