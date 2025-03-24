import express from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";
import UserModel from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// ✅ Forget Password Route
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }

    // ✅ Generate Reset Token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    await user.save();

    // ✅ Send Email with Reset Link
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // ✅ Tumhara Gmail
        pass: process.env.EMAIL_PASS, // ✅ Gmail App Password
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset",
      text: `Click the link to reset your password: http://localhost:5000/reset-password/${resetToken}`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "Password reset email sent!" });
  } catch (error) {
    console.error("❌ Forget Password Error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Reset Password Route
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const user = await UserModel.findOne({ resetToken: token });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // ✅ Hash New Password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = "";
    await user.save();

    res.json({ message: "Password reset successfully!" });
  } catch (error) {
    console.error("❌ Reset Password Error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
