require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const cookieParser = require("cookie-parser");

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET;

// 📝 Signup API
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
});

// 📝 Helper function to generate Access Token
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, SECRET_KEY, { expiresIn: "1h" });
};

// 📝 Helper function to generate Refresh Token
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, SECRET_KEY, { expiresIn: "7d" });
};

// 🔑 Login API
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(400).json({ message: "Invalid credentials" });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Set refresh token as a cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, // true in production (HTTPS)
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ message: "Login successful", token: accessToken, user });

  } catch (error) {
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
});

// 🔄 Refresh Token API (For getting a new access token)
router.post("/refresh-token", (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "No refresh token" });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const newAccessToken = generateAccessToken(decoded.id);
    res.json({ token: newAccessToken });
  } catch (error) {
    return res.status(403).json({ message: "Invalid refresh token" });
  }
});

// 👤 Get User Profile (Protected)
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// 🛑 Logout Route
router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
});
module.exports = router;
