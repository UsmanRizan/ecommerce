import { useState } from "react";
import { motion } from "framer-motion";
import { useCartStore } from "../stores/useCartStore";
import { useUserStore } from "../stores/useUserStore";
import { Link } from "react-router-dom";
import { MoveRight } from "lucide-react";
import toast from "react-hot-toast";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import axios from "../lib/axios";
import { formatPrice } from "../lib/currency";

const stripePromise = loadStripe(
  "pk_test_51THalKHs4LhW4XJ0D2BBOZ6fSPZe5gVEiG2fDHaa8S0zl7WOza4nyXCf4AeuTbU63ZNtQVCOQC3GVCjok3MwUUyR00yBe0aJZm",
);

const OrderSummary = () => {
  const { total, subtotal, coupon, isCouponApplied, cart } = useCartStore();
  const { user } = useUserStore();
  const [clientSecret, setClientSecret] = useState(null);
  // "summary" -> "details" (contact + delivery) -> "payment"
  const [step, setStep] = useState("summary");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
  });

  const handleShippingChange = (e) => {
    setShippingInfo({ ...shippingInfo, [e.target.name]: e.target.value });
  };

  const savings = subtotal - total;
  const formattedSubtotal = formatPrice(subtotal);
  const formattedTotal = formatPrice(total);
  const formattedSavings = formatPrice(savings);

  const handlePayment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await axios.post("/payments/create-checkout-session", {
        products: cart,
        couponCode: coupon && isCouponApplied ? coupon.code : null,
        shippingInfo,
      });
      setClientSecret(res.data.clientSecret);
      setStep("payment");
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error(error.response?.data?.error || "Could not start checkout");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "details") {
    return (
      <motion.div
        className="rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-sm sm:p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <button
          onClick={() => setStep("summary")}
          className="mb-4 text-sm text-emerald-400 hover:text-emerald-300"
        >
          ← Back to Summary
        </button>
        <form onSubmit={handlePayment} className="space-y-4">
          <p className="text-xl font-semibold text-emerald-400">
            Contact information
          </p>
          <ShippingInput label="Full name" name="fullName" value={shippingInfo.fullName} onChange={handleShippingChange} autoComplete="name" />
          <ShippingInput label="Email" name="email" type="email" value={shippingInfo.email} onChange={handleShippingChange} autoComplete="email" />
          <ShippingInput label="Phone" name="phone" type="tel" value={shippingInfo.phone} onChange={handleShippingChange} autoComplete="tel" pattern="\+?[0-9\s\-\(\)]{7,20}" title="Digits, spaces, +, - or ( ) only" />

          <p className="pt-2 text-xl font-semibold text-emerald-400">
            Delivery address
          </p>
          <ShippingInput label="Street address" name="address" value={shippingInfo.address} onChange={handleShippingChange} autoComplete="street-address" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ShippingInput label="City" name="city" value={shippingInfo.city} onChange={handleShippingChange} autoComplete="address-level2" />
            <ShippingInput label="Postal code" name="postalCode" value={shippingInfo.postalCode} onChange={handleShippingChange} autoComplete="postal-code" />
          </div>
          <ShippingInput label="Country" name="country" value={shippingInfo.country} onChange={handleShippingChange} autoComplete="country-name" />

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300 disabled:opacity-50"
          >
            {isSubmitting ? "Loading..." : `Continue to Payment · ${formattedTotal}`}
          </button>
        </form>
      </motion.div>
    );
  }

  if (step === "payment" && clientSecret) {
    return (
      <motion.div
        className="rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-sm sm:p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <button
          onClick={() => setStep("details")}
          className="mb-4 text-sm text-emerald-400 hover:text-emerald-300"
        >
          ← Back to Details
        </button>
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{ clientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-sm sm:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <p className="text-xl font-semibold text-emerald-400">Order summary</p>
      <div className="space-y-4">
        <div className="space-y-2">
          <dl className="flex items-center justify-between gap-4">
            <dt className="text-base font-normal text-gray-300">
              Original price
            </dt>
            <dd className="text-base font-medium text-white">
              {formattedSubtotal}
            </dd>
          </dl>
          {savings > 0 && (
            <dl className="flex items-center justify-between gap-4">
              <dt className="text-base font-normal text-gray-300">Savings</dt>
              <dd className="text-base font-medium text-emerald-400">
                -{formattedSavings}
              </dd>
            </dl>
          )}
          {coupon && isCouponApplied && (
            <dl className="flex items-center justify-between gap-4">
              <dt className="text-base font-normal text-gray-300">
                Coupon ({coupon.code})
              </dt>
              <dd className="text-base font-medium text-emerald-400">
                -{coupon.discountPercentage}%
              </dd>
            </dl>
          )}
          <dl className="flex items-center justify-between gap-4 border-t border-gray-600 pt-2">
            <dt className="text-base font-bold text-white">Total</dt>
            <dd className="text-base font-bold text-emerald-400">
              {formattedTotal}
            </dd>
          </dl>
        </div>
        <motion.button
          className="flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setStep("details")}
        >
          Proceed to Checkout
        </motion.button>

        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-normal text-gray-400">or</span>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 underline hover:text-emerald-300 hover:no-underline"
          >
            Continue Shopping
            <MoveRight size={16} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default OrderSummary;

const ShippingInput = ({ label, name, type = "text", ...props }) => (
  <div>
    <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-300">
      {label}
    </label>
    <input
      id={name}
      name={name}
      type={type}
      required
      maxLength={200}
      className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      {...props}
    />
  </div>
);
