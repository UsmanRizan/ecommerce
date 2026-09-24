// all prices in the store are in Sri Lankan rupees (keep in sync with backend CURRENCY)
const formatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
});

export const formatPrice = (amount) => formatter.format(Number(amount) || 0);
