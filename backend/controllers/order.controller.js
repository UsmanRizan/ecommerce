import mongoose from "mongoose";
import Order, { ORDER_STATUSES } from "../models/order.model.js";

const PRODUCT_FIELDS = "name image price";

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("products.product", PRODUCT_FIELDS);
    res.json({ orders });
  } catch (error) {
    console.log("Error in getMyOrders controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getOrderById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ message: "Order not found" });
  }
  try {
    const order = await Order.findById(id).populate(
      "products.product",
      PRODUCT_FIELDS,
    );

    // customers can only see their own orders; admins can see any
    const isOwner = order && order.user.toString() === req.user._id.toString();
    if (!order || (!isOwner && req.user.role !== "admin")) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.log("Error in getOrderById controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .populate("user", "name email")
      .populate("products.product", PRODUCT_FIELDS);
    res.json({ orders });
  } catch (error) {
    console.log("Error in getAllOrders controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid order status" });
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ message: "Order not found" });
  }

  try {
    // findByIdAndUpdate (not save) so orders created before shippingInfo existed can still be updated
    const order = await Order.findByIdAndUpdate(
      id,
      {
        $set: { status },
        $push: { statusHistory: { status, date: new Date() } },
      },
      { new: true },
    )
      .populate("user", "name email")
      .populate("products.product", PRODUCT_FIELDS);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.log("Error in updateOrderStatus controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
