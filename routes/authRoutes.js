import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import crypto from "crypto";
import AdminModel from "../models/Admin.js";
import UserModel from "../models/User.js";

dotenv.config();
const router = express.Router();
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT) || 10;
const JWT_SECRET = process.env.JWT_SECRET || "defaultSecretKey";

// ✅ Default user creation
const ensureUserExists = async () => {
  try {
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash("test123", SALT_ROUNDS);
      await UserModel.create({
        name: "Test User",
        email: "testuser@example.com",
        password: hashedPassword,
      });
      console.log("✅ Default user created: testuser@example.com / test123");
    }
  } catch (error) {
    console.error("❌ Error ensuring user exists:", error.message);
  }
};
ensureUserExists();

// ✅ Signup Route
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = new UserModel({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User created successfully!" });
  } catch (error) {
    console.error("❌ Signup Error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Login Route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ 
      token, 
      user: { id: user._id, name: user.name, email: user.email },
      message: "User login successful" 
    });
  } catch (error) {
    console.error("❌ User Login Error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Reset Password Route
router.post("/reset-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour expiry

    await UserModel.findOneAndUpdate(
      { email },
      { resetToken, resetTokenExpiry },
      { new: true }
    );

    console.log("✅ Reset Token Generated:", resetToken);

    const resetURL = `http://yourfrontend.com/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>Click the link below to reset your password:</p>
             <a href="${resetURL}" target="_blank">${resetURL}</a>`,
    };

    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.log("❌ Email Error:", error.message);
        await UserModel.findOneAndUpdate({ email }, { $unset: { resetToken: 1, resetTokenExpiry: 1 } });
        return res.status(500).json({ message: "Email failed", error: error.message });
      } else {
        console.log("✅ Email Sent Successfully:", info.response);
        res.json({ message: "Password reset email sent!" });
      }
    });
  } catch (error) {
    console.error("❌ Password Reset Error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Verify Reset Token Route
router.post("/verify-reset-token", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const user = await UserModel.findOne({ resetToken: token, resetTokenExpiry: { $gt: Date.now() } });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    res.json({ message: "Token is valid", email: user.email });
  } catch (error) {
    console.error("❌ Verify Reset Token Error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Get Logged-in User Data Route
router.get("/user", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("❌ Get User Error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
