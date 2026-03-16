import { redis } from "../lib/redis.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.access_Token_secret, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ userId }, process.env.refresh_Token_secret, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, refreshToken) => {
  await redis.set(
    `refreshToken:${userId}`,
    refreshToken,
    "EX",
    7 * 24 * 60 * 60,
  ); //Store for 7 days
};

const setCookie = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true, // prevent cross-site scripting attacks
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", // prevent cross-site request forgery attacks
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true, // prevent cross-site scripting attacks
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", // prevent cross-site request forgery attacks
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const signup = async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "Email already in use" });
    }
    const user = await User.create({ name, email, password });

    // authenticate user and generate token here
    const { accessToken, refreshToken } = generateTokens(user._id);
    await storeRefreshToken(user._id, refreshToken);

    setCookie(res, accessToken, refreshToken);

    res.status(201).json({
      message: "User created successfully",
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  res.send("Login route");
};

export const logout = async (req, res) => {
  res.send("Logout route");
};
