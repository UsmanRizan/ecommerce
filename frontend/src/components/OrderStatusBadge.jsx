import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "../lib/orderStatus";

const OrderStatusBadge = ({ status = "processing" }) => (
  <span
    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${ORDER_STATUS_STYLES[status]}`}
  >
    {ORDER_STATUS_LABELS[status]}
  </span>
);

export default OrderStatusBadge;
