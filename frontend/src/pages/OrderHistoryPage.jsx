import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Package } from "lucide-react";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import LoadingSpinner from "../components/LoadingSpinner";
import OrderStatusBadge from "../components/OrderStatusBadge";
import { formatDate, shortOrderId } from "../lib/orderStatus";
import { formatPrice } from "../lib/currency";

const OrderHistoryPage = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get("/orders/my");
        setOrders(res.data.orders);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load orders");
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.h1
          className="mb-8 text-center text-4xl font-bold text-emerald-400"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          My Orders
        </motion.h1>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Package className="h-16 w-16 text-gray-500" />
            <p className="text-xl text-gray-300">You have no orders yet.</p>
            <Link
              to="/"
              className="rounded-md bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-700"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {orders.map((order) => (
              <OrderRow key={order._id} order={order} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

const OrderRow = ({ order }) => {
  const itemCount = order.products.reduce((sum, p) => sum + p.quantity, 0);
  const images = order.products
    .map((p) => p.product?.image)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <Link
      to={`/orders/${order._id}`}
      className="flex flex-col gap-4 rounded-lg border border-gray-700 bg-gray-800 p-4 transition-colors hover:border-emerald-500/50 sm:flex-row sm:items-center sm:p-6"
    >
      <div className="flex shrink-0 -space-x-3">
        {images.length > 0 ? (
          images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="h-14 w-14 rounded-md border-2 border-gray-800 object-cover"
            />
          ))
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-gray-700">
            <Package className="text-gray-400" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-white">
            Order {shortOrderId(order._id)}
          </span>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-sm text-gray-400">
          Placed {formatDate(order.createdAt)} · {itemCount}{" "}
          {itemCount === 1 ? "item" : "items"}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span className="text-lg font-bold text-emerald-400">
          {formatPrice(order.totalAmount)}
        </span>
        <ChevronRight className="text-gray-500" />
      </div>
    </Link>
  );
};

export default OrderHistoryPage;
