/* Iron Ascension - scroll-in reveal animation
   Applied sitewide automatically - no need to hand-tag every section on
   every page. On load, picks out the main content blocks inside each
   <section class="section">, plus card/tile/product grids, tags them with
   .reveal-on-scroll (see css/style.css for the fade+slide styles), and
   uses IntersectionObserver to add .revealed the first time each one
   scrolls into view. Runs after any dynamic content (product/merch grids)
   has rendered, via a short delay plus a rerun on the catalog/merch
   ready promises, so cards added after DOMContentLoaded still animate.

   Bug fixed here: a grid wrapper (e.g. .catalog-grid) and its own
   children were both being tagged .reveal-on-scroll independently. CSS
   opacity compounds with ancestors, so a child showing "revealed"
   (opacity:1) was still invisible until the much taller wrapper *also*
   cleared the intersection threshold - for a large grid (many rows) that
   could take a lot of scrolling, making the whole section look
   permanently blank. Fix: a wrapper that itself contains individually-
   tagged children is skipped, not tagged twice. A timeout safety net
   below also guarantees nothing can stay invisible forever even if a
   future case slips through. */

const GRID_WRAPPER_SELECTOR = ".grid, .catalog-grid, .category-index";
const REVEAL_FORCE_TIMEOUT_MS = 2500;

function applyScrollReveal() {
  const candidates = document.querySelectorAll(
    `.section > .container > *:not(.reveal-on-scroll):not(${GRID_WRAPPER_SELECTOR}), ` +
    ".grid > *:not(.reveal-on-scroll), " +
    ".catalog-grid > *:not(.reveal-on-scroll), " +
    ".category-index > *:not(.reveal-on-scroll)"
  );
  candidates.forEach((el, i) => {
    el.classList.add("reveal-on-scroll");
    // Small stagger within each block of siblings so grids don't all pop
    // in at once - capped so a long list doesn't end up with a multi-second tail.
    const delay = Math.min((i % 8) * 60, 400);
    el.style.transitionDelay = `${delay}ms`;

    // Safety net: if this element is somehow never marked "revealed" (an
    // observer edge case, a layout quirk, anything) it still becomes
    // visible on its own after a short delay rather than staying hidden
    // forever. This is a backstop, not the primary mechanism.
    setTimeout(() => el.classList.add("revealed"), REVEAL_FORCE_TIMEOUT_MS);
  });

  if (!window.__iaScrollObserver) {
    window.__iaScrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            window.__iaScrollObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
  }
  document.querySelectorAll(".reveal-on-scroll:not(.revealed)").forEach((el) => {
    window.__iaScrollObserver.observe(el);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applyScrollReveal();
  // Re-scan once dynamic grids (products/merch) have actually rendered.
  if (window.catalogReadyPromise) window.catalogReadyPromise.then(() => setTimeout(applyScrollReveal, 50));
  if (window.merchReadyPromise) window.merchReadyPromise.then(() => setTimeout(applyScrollReveal, 50));
});
