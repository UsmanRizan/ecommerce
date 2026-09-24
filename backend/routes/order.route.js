import express from "express";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import {
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/order.controller.js";

const router = express.Router();

router.get("/", protectRoute, adminRoute, getAllOrders);
router.get("/my", protectRoute, getMyOrders); // keep before /:id
router.get("/:id", protectRoute, getOrderById);
router.patch("/:id/status", protectRoute, adminRoute, updateOrderStatus);

export default router;
