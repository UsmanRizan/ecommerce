// shared display config for order statuses (keep keys in sync with backend ORDER_STATUSES)
export const ORDER_STEPS = ["processing", "shipped", "out_for_delivery", "delivered"];

export const ORDER_STATUS_LABELS = {
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_STYLES = {
  processing: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  shipped: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  out_for_delivery: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-300 border-red-500/30",
};

export const shortOrderId = (id) => `#${id.slice(-8).toUpperCase()}`;

export const formatDate = (date, withTime = false) =>
  new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime && { hour: "2-digit", minute: "2-digit" }),
  });
