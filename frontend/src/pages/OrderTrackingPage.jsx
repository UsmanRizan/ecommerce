import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Home,
  Truck,
  PackageCheck,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import LoadingSpinner from "../components/LoadingSpinner";
import OrderStatusBadge from "../components/OrderStatusBadge";
import {
  ORDER_STEPS,
  ORDER_STATUS_LABELS,
  formatDate,
  shortOrderId,
} from "../lib/orderStatus";
import { formatPrice } from "../lib/currency";

const STEP_ICONS = {
  processing: ClipboardList,
  shipped: PackageCheck,
  out_for_delivery: Truck,
  delivered: Home,
};

const OrderTrackingPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await axios.get(`/orders/${id}`);
        setOrder(res.data);
      } catch (error) {
        if (error.response?.status !== 404) {
          toast.error(error.response?.data?.message || "Failed to load order");
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (isLoading) return <LoadingSpinner />;

  if (!order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-3xl font-bold text-emerald-400">Order not found</h1>
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
        >
          <ArrowLeft size={18} />
          Back to My Orders
        </Link>
      </div>
    );
  }

  const status = order.status || "processing";
  // orders created before tracking existed have no history, so fall back to the order date
  const history = order.statusHistory?.length
    ? order.statusHistory
    : [{ status: "processing", date: order.createdAt }];
  const dateFor = (step) =>
    [...history].reverse().find((h) => h.status === step)?.date;

  const subtotal = order.products.reduce(
    (sum, p) => sum + p.price * p.quantity,
    0,
  );
  const discount = subtotal - order.totalAmount;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/orders"
          className="mb-6 inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
        >
          <ArrowLeft size={16} />
          Back to My Orders
        </Link>

        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Order {shortOrderId(order._id)}
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                Placed {formatDate(order.createdAt, true)}
              </p>
            </div>
            <OrderStatusBadge status={status} />
          </div>

          {/* tracking timeline */}
          <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h2 className="mb-6 text-xl font-semibold text-emerald-400">
              Tracking
            </h2>
            {status === "cancelled" ? (
              <div className="flex items-center gap-3 text-red-300">
                <XCircle className="h-8 w-8 shrink-0" />
                <div>
                  <p className="font-semibold">This order was cancelled</p>
                  {dateFor("cancelled") && (
                    <p className="text-sm text-gray-400">
                      {formatDate(dateFor("cancelled"), true)}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <ol className="relative">
                {ORDER_STEPS.map((step, i) => {
                  const currentIndex = ORDER_STEPS.indexOf(status);
                  const isDone = i <= currentIndex;
                  const isCurrent = i === currentIndex;
                  const Icon = STEP_ICONS[step];
                  const date = dateFor(step);
                  const isLast = i === ORDER_STEPS.length - 1;

                  return (
                    <li key={step} className="relative flex gap-4 pb-8 last:pb-0">
                      {!isLast && (
                        <span
                          className={`absolute left-5 top-10 -ml-px h-[calc(100%-2.5rem)] w-0.5 ${
                            i < currentIndex ? "bg-emerald-500" : "bg-gray-600"
                          }`}
                        />
                      )}
                      <span
                        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                          isDone
                            ? "border-emerald-500 bg-emerald-600 text-white"
                            : "border-gray-600 bg-gray-800 text-gray-500"
                        } ${isCurrent ? "ring-4 ring-emerald-500/30" : ""}`}
                      >
                        {isDone && !isCurrent ? (
                          <Check size={18} />
                        ) : (
                          <Icon size={18} />
                        )}
                      </span>
                      <div className="pt-2">
                        <p
                          className={`font-medium ${
                            isDone ? "text-white" : "text-gray-500"
                          }`}
                        >
                          {ORDER_STATUS_LABELS[step]}
                        </p>
                        {isDone && date && (
                          <p className="text-sm text-gray-400">
                            {formatDate(date, true)}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* items */}
            <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
              <h2 className="mb-4 text-xl font-semibold text-emerald-400">
                Items
              </h2>
              <ul className="space-y-4">
                {order.products.map((item) => (
                  <li key={item._id} className="flex items-center gap-4">
                    {item.product?.image ? (
                      <Link to={`/product/${item.product._id}`}>
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="h-16 w-16 rounded-md object-cover"
                        />
                      </Link>
                    ) : (
                      <div className="h-16 w-16 rounded-md bg-gray-700" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">
                        {item.product?.name || "Product no longer available"}
                      </p>
                      <p className="text-sm text-gray-400">
                        Qty {item.quantity} × {formatPrice(item.price)}
                      </p>
                    </div>
                    <p className="font-medium text-white">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>
              <dl className="mt-6 space-y-2 border-t border-gray-700 pt-4 text-sm">
                <div className="flex justify-between text-gray-300">
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(subtotal)}</dd>
                </div>
                {discount > 0.005 && (
                  <div className="flex justify-between text-emerald-400">
                    <dt>Discount</dt>
                    <dd>-{formatPrice(discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-white">
                  <dt>Total paid</dt>
                  <dd className="text-emerald-400">
                    {formatPrice(order.totalAmount)}
                  </dd>
                </div>
              </dl>
            </section>

            {/* delivery */}
            <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
              <h2 className="mb-4 text-xl font-semibold text-emerald-400">
                Delivery details
              </h2>
              {order.shippingInfo?.address ? (
                <div className="space-y-1 text-gray-300">
                  <p className="font-medium text-white">
                    {order.shippingInfo.fullName}
                  </p>
                  <p>{order.shippingInfo.address}</p>
                  <p>
                    {order.shippingInfo.city}, {order.shippingInfo.postalCode}
                  </p>
                  <p>{order.shippingInfo.country}</p>
                  <p className="pt-3 text-sm text-gray-400">
                    {order.shippingInfo.email}
                  </p>
                  <p className="text-sm text-gray-400">
                    {order.shippingInfo.phone}
                  </p>
                </div>
              ) : (
                <p className="text-gray-400">
                  No delivery details recorded for this order.
                </p>
              )}
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;
