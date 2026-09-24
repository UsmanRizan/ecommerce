import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import { stripe } from "../lib/stripe.js";

// all store prices are in Sri Lankan rupees (keep in sync with frontend/src/lib/currency.js)
const CURRENCY = "lkr";
// orders at or above this amount (in cents) earn a gift coupon: LKR 20,000
const GIFT_COUPON_THRESHOLD = 20000 * 100;

const SHIPPING_FIELDS = [
  "fullName",
  "email",
  "phone",
  "address",
  "city",
  "postalCode",
  "country",
];

// returns cleaned shipping info, or an error message if invalid
function validateShippingInfo(shippingInfo) {
  if (!shippingInfo || typeof shippingInfo !== "object") {
    return { error: "Contact and delivery details are required" };
  }

  const cleaned = {};
  for (const field of SHIPPING_FIELDS) {
    const value = String(shippingInfo[field] ?? "").trim();
    if (!value) return { error: `${field} is required` };
    if (value.length > 200) return { error: `${field} is too long` };
    cleaned[field] = value;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned.email)) {
    return { error: "Invalid email address" };
  }
  if (!/^\+?[0-9\s\-()]{7,20}$/.test(cleaned.phone)) {
    return { error: "Invalid phone number" };
  }

  return { shippingInfo: cleaned };
}

export const createCheckoutSession = async (req, res) => {
  try {
    const { products, couponCode } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Invalid or empty products array" });
    }

    const { shippingInfo, error: shippingError } = validateShippingInfo(
      req.body.shippingInfo,
    );
    if (shippingError) {
      return res.status(400).json({ error: shippingError });
    }

    let totalAmount = 0;

    const lineItems = products.map((product) => {
      const amount = Math.round(product.price * 100); // stripe wants the amount in cents
      totalAmount += amount * product.quantity;

      return {
        price_data: {
          currency: CURRENCY,
          product_data: {
            name: product.name,
            images: [product.image],
          },
          unit_amount: amount,
        },
        quantity: product.quantity || 1,
      };
    });

    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode,
        userId: req.user._id,
        isActive: true,
      });
      if (coupon) {
        totalAmount -= Math.round(
          (totalAmount * coupon.discountPercentage) / 100,
        );
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      ui_mode: "embedded",
      customer_email: shippingInfo.email,
      return_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      discounts: coupon
        ? [
            {
              coupon: await createStripeCoupon(coupon.discountPercentage),
            },
          ]
        : [],
      metadata: {
        userId: req.user._id.toString(),
        couponCode: couponCode || "",
        // stripe metadata values are limited to 500 chars, so store each field separately
        ...Object.fromEntries(
          SHIPPING_FIELDS.map((field) => [`ship_${field}`, shippingInfo[field]]),
        ),
        products: JSON.stringify(
          products.map((p) => ({
            id: p._id,
            quantity: p.quantity,
            price: p.price,
          })),
        ),
      },
    });

    if (totalAmount >= GIFT_COUPON_THRESHOLD) {
      await createNewCoupon(req.user._id);
    }
    res.status(200).json({
      clientSecret: session.client_secret,
      totalAmount: totalAmount / 100,
    });
  } catch (error) {
    console.error("Error processing checkout:", error);
    res
      .status(500)
      .json({ message: "Error processing checkout", error: error.message });
  }
};

export const checkoutSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata.userId !== req.user._id.toString()) {
      return res.status(403).json({ message: "This checkout session is not yours" });
    }

    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    // This endpoint can be hit more than once for the same session (React StrictMode,
    // page refresh, double requests). Create the order atomically: the upsert only
    // inserts if no order exists for this session, so concurrent calls can't both create one.
    const products = JSON.parse(session.metadata.products);
    const orderData = {
      user: session.metadata.userId,
      products: products.map((product) => ({
        product: product.id,
        quantity: product.quantity,
        price: product.price,
      })),
      totalAmount: session.amount_total / 100, // convert from cents to rupees
      shippingInfo: Object.fromEntries(
        SHIPPING_FIELDS.map((field) => [field, session.metadata[`ship_${field}`]]),
      ),
      stripeSessionId: sessionId,
      status: "processing",
      statusHistory: [{ status: "processing", date: new Date() }],
    };

    let order;
    let isNewOrder = false;
    try {
      const result = await Order.findOneAndUpdate(
        { stripeSessionId: sessionId },
        { $setOnInsert: orderData },
        { upsert: true, new: true, includeResultMetadata: true },
      );
      order = result.value;
      isNewOrder = !result.lastErrorObject?.updatedExisting;
    } catch (error) {
      // two upserts raced and the unique index rejected the loser: the order already exists
      if (error.code !== 11000) throw error;
      order = await Order.findOne({ stripeSessionId: sessionId });
    }

    // side effects only for the request that actually created the order
    if (isNewOrder && session.metadata.couponCode) {
      await Coupon.findOneAndUpdate(
        {
          code: session.metadata.couponCode,
          userId: session.metadata.userId,
        },
        { isActive: false },
      );
    }

    await User.findByIdAndUpdate(session.metadata.userId, { cartItems: [] });

    res.status(200).json({
      success: true,
      message: isNewOrder
        ? "Payment successful, order created, and coupon deactivated if used."
        : "Order already processed.",
      orderId: order._id,
    });
  } catch (error) {
    console.error("Error processing successful checkout:", error);
    res.status(500).json({
      message: "Error processing successful checkout",
      error: error.message,
    });
  }
};

async function createStripeCoupon(discountPercentage) {
  const coupon = await stripe.coupons.create({
    percent_off: discountPercentage,
    duration: "once",
  });

  return coupon.id;
}

async function createNewCoupon(userId) {
  await Coupon.findOneAndDelete({ userId });

  const newCoupon = new Coupon({
    code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    discountPercentage: 10,
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    userId: userId,
  });

  await newCoupon.save();

  return newCoupon;
}
