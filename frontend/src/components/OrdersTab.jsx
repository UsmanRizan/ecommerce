import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import LoadingSpinner from "./LoadingSpinner";
import OrderStatusBadge from "./OrderStatusBadge";
import {
  ORDER_STATUS_LABELS,
  formatDate,
  shortOrderId,
} from "../lib/orderStatus";
import { formatPrice } from "../lib/currency";

const OrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get("/orders");
        setOrders(res.data.orders);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load orders");
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, status) => {
    try {
      const res = await axios.patch(`/orders/${orderId}/status`, { status });
      setOrders((prev) => prev.map((o) => (o._id === orderId ? res.data : o)));
      toast.success(`Order marked as ${ORDER_STATUS_LABELS[status]}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const visibleOrders =
    filter === "all"
      ? orders
      : orders.filter((o) => (o.status || "processing") === filter);

  return (
    <motion.div
      className="mx-auto max-w-7xl overflow-hidden rounded-lg bg-gray-800 shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-700 p-4">
        <p className="text-gray-300">
          {visibleOrders.length} {visibleOrders.length === 1 ? "order" : "orders"}
        </p>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
        >
          <option value="all">All statuses</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {visibleOrders.length === 0 ? (
        <p className="p-8 text-center text-gray-400">No orders found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                {["Order", "Items", "Customer", "Deliver to", "Total", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {visibleOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-700/50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link
                      to={`/orders/${order._id}`}
                      className="font-medium text-white hover:text-emerald-400"
                    >
                      {shortOrderId(order._id)}
                    </Link>
                    <p className="text-sm text-gray-400">
                      {formatDate(order.createdAt)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <ul className="space-y-2">
                      {order.products.map((item) => (
                        <li key={item._id} className="flex items-center gap-3">
                          {item.product?.image ? (
                            <img
                              src={item.product.image}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 shrink-0 rounded bg-gray-700" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm text-white">
                              {item.product?.name || "Deleted product"}
                            </p>
                            <p className="text-xs text-gray-400">
                              Qty {item.quantity} × {formatPrice(item.price)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white">
                      {order.shippingInfo?.fullName || order.user?.name || "—"}
                    </p>
                    <p className="text-sm text-gray-400">
                      {order.shippingInfo?.email || order.user?.email}
                    </p>
                    {order.shippingInfo?.phone && (
                      <p className="text-sm text-gray-400">
                        {order.shippingInfo.phone}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {order.shippingInfo?.address ? (
                      <>
                        <p>{order.shippingInfo.address}</p>
                        <p>
                          {order.shippingInfo.city},{" "}
                          {order.shippingInfo.postalCode},{" "}
                          {order.shippingInfo.country}
                        </p>
                      </>
                    ) : (
                      <span className="text-gray-500">Not provided</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-emerald-400">
                    {formatPrice(order.totalAmount)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex flex-col items-start gap-2">
                      <OrderStatusBadge status={order.status} />
                      <select
                        value={order.status || "processing"}
                        onChange={(e) =>
                          handleStatusChange(order._id, e.target.value)
                        }
                        aria-label={`Update status for order ${shortOrderId(order._id)}`}
                        className="rounded-md border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      >
                        {Object.entries(ORDER_STATUS_LABELS).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default OrdersTab;
