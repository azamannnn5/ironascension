/* Iron Ascension - merch catalog
   Each sized item carries a sizes[] array (S/M/L/XL/XXL, each with its
   own price) plus a "Custom Size" request option handled in the UI, not
   listed here. Each item carries a colors[] array of real product photos
   (its color variants) plus a "Custom Color" request option, also
   UI-only. Cap and Shaker have no sizes - just a flat price. Same
   live-data pattern as product-data.js: the real data below renders
   instantly, then loadLiveMerch() overwrites MERCH in place with
   whatever's saved through /admin.html, if the backend is reachable. */

const MERCH_SIZES = ["S", "M", "L", "XL", "XXL"];

const MERCH = [
  {
    id: "merch-classic-tshirt", name: "Classic T-Shirt",
    description: "Iron Ascension classic training T-shirt.",
    sizes: [
      { size: "S", price: 30 }, { size: "M", price: 30 },
      { size: "L", price: 32 }, { size: "XL", price: 32 },
      { size: "XXL", price: 35 },
    ],
    colors: [
      { name: "White", image: "assets/images/merch/classic-tshirt-white.jpg" },
      { name: "Black", image: "assets/images/merch/classic-tshirt-black.jpg" },
      { name: "Black (Red Logo)", image: "assets/images/merch/classic-tshirt-black-red.jpg" },
    ],
    inStock: true,
  },
  {
    id: "merch-performance-tank", name: "Performance Tank",
    description: "Lightweight training tank.",
    sizes: [
      { size: "S", price: 28 }, { size: "M", price: 28 },
      { size: "L", price: 30 }, { size: "XL", price: 30 },
      { size: "XXL", price: 34 },
    ],
    colors: [
      { name: "Black", image: "assets/images/merch/performance-tank-black.jpg" },
      { name: "White", image: "assets/images/merch/performance-tank-white.jpg" },
      { name: "Black (Red Logo)", image: "assets/images/merch/performance-tank-black-red.jpg" },
    ],
    inStock: true,
  },
  {
    id: "merch-long-sleeve", name: "Long-Sleeve Training Shirt",
    description: "Long-sleeve training layer.",
    sizes: [
      { size: "S", price: 35 }, { size: "M", price: 35 },
      { size: "L", price: 37 }, { size: "XL", price: 37 },
      { size: "XXL", price: 40 },
    ],
    colors: [
      { name: "White", image: "assets/images/merch/long-sleeve-white.jpg" },
      { name: "Black", image: "assets/images/merch/long-sleeve-black.jpg" },
    ],
    inStock: true,
  },
  {
    id: "merch-polo", name: "Polo",
    description: "Clean everyday Iron Ascension polo.",
    sizes: [
      { size: "S", price: 40 }, { size: "M", price: 40 },
      { size: "L", price: 42 }, { size: "XL", price: 42 },
      { size: "XXL", price: 45 },
    ],
    colors: [
      { name: "Black", image: "assets/images/merch/polo-black.jpg" },
      { name: "White", image: "assets/images/merch/polo-white.jpg" },
    ],
    inStock: true,
  },
  {
    id: "merch-hoodie", name: "Hoodie",
    description: "Heavyweight gym and lifestyle hoodie.",
    sizes: [
      { size: "S", price: 60 }, { size: "M", price: 60 },
      { size: "L", price: 63 }, { size: "XL", price: 63 },
      { size: "XXL", price: 68 },
    ],
    colors: [
      { name: "White", image: "assets/images/merch/hoodie-white.jpg" },
      { name: "Black", image: "assets/images/merch/hoodie-black.jpg" },
      { name: "Black (Red Logo)", image: "assets/images/merch/hoodie-black-red.jpg" },
    ],
    inStock: true,
  },
  {
    id: "merch-joggers", name: "Joggers",
    description: "Training and recovery joggers.",
    sizes: [
      { size: "S", price: 50 }, { size: "M", price: 50 },
      { size: "L", price: 53 }, { size: "XL", price: 53 },
      { size: "XXL", price: 58 },
    ],
    colors: [
      { name: "Black", image: "assets/images/merch/joggers-black.jpg" },
      { name: "White", image: "assets/images/merch/joggers-white.jpg" },
      { name: "Black (Red Logo)", image: "assets/images/merch/joggers-black-red.jpg" },
    ],
    inStock: true,
  },
  {
    id: "merch-gym-shorts", name: "Gym Shorts",
    description: "Training shorts built for movement.",
    sizes: [
      { size: "S", price: 35 }, { size: "M", price: 35 },
      { size: "L", price: 37 }, { size: "XL", price: 37 },
      { size: "XXL", price: 40 },
    ],
    colors: [
      { name: "White", image: "assets/images/merch/gym-shorts-white.jpg" },
      { name: "Black", image: "assets/images/merch/gym-shorts-black.jpg" },
    ],
    inStock: true,
  },
  {
    id: "merch-cap", name: "Cap",
    description: "Iron Ascension training cap.",
    price: 25,
    colors: [
      { name: "Grey", image: "assets/images/merch/cap-grey.jpg" },
      { name: "White", image: "assets/images/merch/cap-white.jpg" },
      { name: "Black", image: "assets/images/merch/cap-black.jpg" },
    ],
    inStock: true,
  },
  {
    id: "merch-shaker", name: "Shaker Bottle",
    description: "Training shaker bottle.",
    price: 18,
    colors: [
      { name: "Black", image: "assets/images/merch/shaker-black.jpg" },
      { name: "White", image: "assets/images/merch/shaker-white.jpg" },
      { name: "Pink", image: "assets/images/merch/shaker-pink.jpg" },
    ],
    inStock: true,
  },
  {
    id: "merch-sports-bra", name: "Sports Bra",
    description: "Racerback training sports bra.",
    sizes: [
      { size: "S", price: 32 }, { size: "M", price: 32 },
      { size: "L", price: 34 }, { size: "XL", price: 34 },
      { size: "XXL", price: 37 },
    ],
    colors: [
      { name: "Black", image: "assets/images/merch/sports-bra-black.jpg" },
      { name: "White", image: "assets/images/merch/sports-bra-white.jpg" },
      { name: "Grey", image: "assets/images/merch/sports-bra-grey.jpg" },
    ],
    inStock: true,
  },
];

function findMerch(id) {
  return MERCH.find((item) => item.id === id) || null;
}
function merchHasSizes(item) {
  return Array.isArray(item.sizes) && item.sizes.length > 0;
}
// Card price: for sized items, the XXL tier (the highest, shown by
// default before a customer picks a size on the detail page). For
// unsized items (Cap, Shaker), the flat price.
function merchCardPrice(item) {
  if (merchHasSizes(item)) {
    const xxl = item.sizes.find((s) => s.size === "XXL");
    return xxl ? xxl.price : item.sizes[item.sizes.length - 1].price;
  }
  return item.price;
}
function merchPriceForSize(item, sizeLabel) {
  if (!merchHasSizes(item)) return item.price;
  const match = item.sizes.find((s) => s.size === sizeLabel);
  return match ? match.price : merchCardPrice(item);
}
// A sale price only applies to items with a single flat price - sized
// items price each size separately, so a sale price is ignored for them.
function merchSalePrice(item) {
  return merchHasSizes(item) ? null : item.salePrice;
}
function formatMerchPrice(item) {
  const price = merchCardPrice(item);
  return priceHtml(price, merchSalePrice(item));
}
function merchPrimaryImage(item) {
  return item.colors && item.colors.length ? item.colors[0].image : "assets/images/product-placeholder.svg";
}

// ---------- Live merch (admin panel support) ----------
// Independent fetch from product-data.js's loadLiveCatalog() - merch.html
// and merch-product.html don't load product-data.js at all, so this keeps
// the merch line self-contained. Same graceful-fallback behavior: if the
// backend isn't connected, MERCH stays as the static array above.
async function loadLiveMerch() {
  try {
    const res = await fetch("/.netlify/functions/get-catalog");
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.merch) && data.merch.length) {
      MERCH.length = 0;
      MERCH.push(...data.merch);
    }
  } catch (err) {
    // Offline, backend not connected, or function not deployed - fine,
    // the static MERCH array above is used as-is.
  }
}
window.merchReadyPromise = loadLiveMerch();
