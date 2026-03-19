import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Middleware to protect routes and ensure the user is authenticated
export const protectRoute = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }
    try {
      const decoded = jwt.verify(accessToken, process.env.access_Token_secret);
      const user = await User.findById(decoded.userId).select("-password");
      if (!user) {
        return res
          .status(401)
          .json({ message: "Unauthorized: User not found" });
      }
      req.user = user;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Unauthorized: Token expired" });
      }
      throw error; // Re-throw other errors to be caught by the outer catch block
    }
  } catch (error) {
    console.error("middleware error:    ", error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

// Middleware to check if the authenticated user has admin privileges
export const adminRoute = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }
};
