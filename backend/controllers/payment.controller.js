import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import { stripe } from "../lib/stripe.js";
import dotenv from "dotenv";
dotenv.config();

export const checkoutSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      if (session.metadata.couponCode) {
        await Coupon.findOneAndUpdate(
          {
            code: session.metadata.couponCode,
            userId: session.metadata.userId,
          },
          {
            isActive: false,
          },
        );
      }
    }

    // create new order

    const products = JSON.parse(session.metadata.products);
    const newOrder = new Order({
      user: session.metadata.userId,
      products: products.map((product) => ({
        productId: product.id,
        quantity: product.quantity,
        price: product.price,
      })),
      totalAmount: session.amount_total / 100,
      stripeSessionId: session.id,
    });

    await newOrder.save();
    res.status(200).json({
      message: "Order created successfully.",
      success: true,
      orderId: newOrder._id,
    });
  } catch (error) {
    console.error("Error retrieving checkout session:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const createCheckoutSession = async (req, res) => {
  try {
    const { products, couponCode } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res
        .status(400)
        .json({ error: "Products must be a non-empty array." });
    }

    let totalAmount = 0;

    const lineItems = products.map((product) => {
      const amount = Math.round(product.price * 100); // Convert to cents
      totalAmount += amount * product.quantity;
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            image: [product.image],
          },
          unit_amount: amount,
        },
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
      success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/purchasing-cancel`,
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
        products: JSON.stringify(
          products.map((p) => ({
            id: p.id,
            name: p.name,
            quantity: p.quantity,
          })),
        ),
      },
    });

    if (totalAmount > 20000) {
      await createNewCoupon(req.user._id);
    }

    res.status(200).json({ id: session.id, totalAmount: totalAmount / 100 });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Internal server error." });
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
  const newCoupon = new Coupon({
    code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    discountPercentage: 10,
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 gün geçerli
    userId: userId,
  });
  await newCoupon.save();
  return newCoupon;
}
