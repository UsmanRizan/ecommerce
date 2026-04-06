import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

// Import routes
import analysisRoutes from "./routes/analysis.route.js";
import authRoutes from "./routes/auth.route.js";
import cartRoutes from "./routes/cart.route.js";
import productRoutes from "./routes/product.route.js";
import couponRoutes from "./routes/coupon.route.js";
import paymentRoutes from "./routes/payment.route.js";
import { connectDB } from "./lib/db.js";
// Load environment variables from .env file
dotenv.config();
// Create an instance of Express
const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "10mb" })); // allow parsing of JSON bodies
app.use(cookieParser()); // allow parsing of cookies

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analysisRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
  connectDB();
});
