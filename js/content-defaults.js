/* Iron Ascension - built-in default wording for the content that can be
   edited in /admin.html (FAQ, Shipping & Returns text, order confirmation
   message, status emails). The admin panel loads this file to pre-fill its
   editors, so there is always a sensible starting point to tweak. The
   public site never needs it: when nothing has been saved in admin, each
   page simply keeps its own built-in HTML. */

const DEFAULT_FAQS = [
  {
    "q": "How does ordering work?",
    "a": "Iron Ascension operates via an Order-Request Cart Workflow rather than instant online payment. Browse the catalog, submit an order request through the cart, and our team verifies availability before you receive confirmation with payment and dispatch instructions."
  },
  {
    "q": "Is my card charged when I submit an order request?",
    "a": "No. Submitting a request generates a pending reservation, not an immediate charge. You can modify or cancel your request any time before receiving formal payment and dispatch confirmation."
  },
  {
    "q": "Are Iron Ascension products lab-tested?",
    "a": "Every compound is subject to High-Performance Liquid Chromatography (HPLC) quantitative testing and purity verification before allocation to the catalog."
  },
  {
    "q": "What's your return policy?",
    "a": "Official Iron Ascension apparel and gear can be exchanged for sizing or returned for store credit within 30 days of delivery, provided items are unworn, unwashed, and in original packaging. See our Shipping & Returns page for full details."
  },
  {
    "q": "How long does shipping take?",
    "a": "Order requests are generally reviewed within 24 business hours (Monday-Friday). Once your package is handed to the carrier, you'll receive available tracking information by email."
  },
  {
    "q": "Is there an age requirement?",
    "a": "Yes. You must be at least 18 years of age, or the legal age of majority in your jurisdiction, to use the site or submit an order request."
  },
  {
    "q": "How do I get a discount on my order?",
    "a": "Mix & Match volume discounts apply automatically based on your cart size, first-time customers can sign up for a one-time welcome code, and paying with Bitcoin qualifies for an additional discount. All of these can stack, up to a combined cap."
  },
  {
    "q": "What payment methods do you accept?",
    "a": "{payment_methods}. Your preferred method is selected in the cart and confirmed directly with our team."
  }
];

const DEFAULT_SHIPPING_CONTENT = "At Iron Ascension, we maintain strict quality control, packaging standards, and inventory integrity across our catalog divisions. This policy outlines our order-request reservation process, shipping protocols, and return terms for merchandise and other products, subject to applicable laws and regulations.\n\n## 1. The Order-Request & Reservation Workflow\n\nIron Ascension operates via an Order-Request Cart Workflow rather than instant online payment processing:\n\n- **Step 1: Request Submission.** Browse our catalog, select your items or merchandise sizes, and submit an order request through the reservation cart.\n- **Step 2: Inventory Verification.** Our team reviews your request and verifies product or merchandise availability.\n- **Step 3: Direct Confirmation & Dispatch.** You will receive direct confirmation with applicable payment and fulfillment instructions. Once confirmed, eligible orders move into packaging and dispatch preparation.\n- **Cancellations:** You may modify or cancel an order request before receiving formal payment and dispatch confirmation, subject to applicable policies and law.\n\n## 2. Shipping & Delivery Protocols\n\nWe process and dispatch verified order requests during our standard operational hours:\n\n- **Processing Lead Time:** Order requests are generally reviewed within 24 business hours (Monday–Friday).\n- **Packaging:** Merchandise orders are packaged appropriately for shipment and customer privacy.\n- **Tracking Updates:** Once your package is handed over to the shipping carrier, you will receive available tracking information via email.\n- **Delivery Requirements:** Please ensure your shipping address details are complete and accurate when submitting your order request.\n\n## 3. Returns & Exchanges by Product Division\n\nIron Ascension applies category-based return rules to support product quality, hygiene, and customer satisfaction.\n\n### Iron Ascension Merchandise (Apparel & Gear)\n\n- **30-Day Exchange Window:** Official Iron Ascension apparel, hoodies, gym bags, and lifting accessories may be returned for a size exchange or store credit within 30 days of delivery, subject to the applicable return conditions.\n- **Condition Requirements:** Items must be unworn, unwashed, odor-free, and in their original packaging with tags attached. Customers are responsible for return shipping costs on size exchanges unless an incorrect item was sent by our fulfillment team.\n\n### Regulated or Restricted Products\n\nProducts that are regulated, restricted, or subject to special handling may have additional return, cancellation, shipping, or fulfillment restrictions. Such restrictions will apply as required by applicable law.\n\n## 4. Reshipment for Damaged or Broken Shipments\n\nIron Ascension protects shipments against verified damage or packing errors:\n\n- **Damaged or Compromised Items:** If your package arrives with damaged merchandise or compromised packaging, contact customer support within 48 hours of delivery.\n- **Claim Requirements:** Email contact@ironascension.com with your Order Request ID, a summary of the issue, and photos showing: the damaged product or affected item, the shipping label, and the outer packaging box.\n- **Verified Claims:** Verified damage claims may qualify for a replacement, refund, or other appropriate resolution at no additional cost, subject to availability and applicable policies.\n";

const DEFAULT_CONFIRMATION_MESSAGE = "Thanks for your order request. Our team will reach out shortly to confirm final pricing, payment, and shipping. Nothing has been charged yet.";

const DEFAULT_EMAIL_TEMPLATES = {
  "contacted": {
    "enabled": false,
    "subject": "We've received your order {order_number}",
    "body": "Hi {name},\n\nThanks for your order {order_number}. We've reviewed it and will follow up shortly with payment details.\n\nIron Ascension"
  },
  "paid": {
    "enabled": false,
    "subject": "Payment received for order {order_number}",
    "body": "Hi {name},\n\nWe've received your payment for order {order_number} ({total}). We're now preparing your order for dispatch and will send tracking details as soon as it ships.\n\nThank you,\nIron Ascension"
  },
  "shipped": {
    "enabled": false,
    "subject": "Your order {order_number} has shipped",
    "body": "Hi {name},\n\nGood news, your order {order_number} is on its way. Tracking details will follow by email once the carrier has them.\n\nThank you,\nIron Ascension"
  },
  "fulfilled": {
    "enabled": false,
    "subject": "Order {order_number} complete",
    "body": "Hi {name},\n\nYour order {order_number} is now complete. Thank you for shopping with Iron Ascension. If anything is not right, just reply to this email.\n\nIron Ascension"
  },
  "cancelled": {
    "enabled": false,
    "subject": "Order {order_number} cancelled",
    "body": "Hi {name},\n\nYour order {order_number} has been cancelled. If you did not ask for this or have any questions, just reply to this email.\n\nIron Ascension"
  }
};
