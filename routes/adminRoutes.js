import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Admin from "../models/Admin.js";

dotenv.config(); // Load environment variables

const router = express.Router();

// ✅ Debugging Logs
console.log("✅ Admin Routes Loaded");

// ✅ Create Admin (Without Hashing)
router.post("/create-admin", async (req, res) => {
  console.log("🛠 Create Admin API Hit");

  const { username, password } = req.body;
  console.log("📥 Received Data:", req.body);

  try {
    if (!username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Check if admin already exists
    const existingAdmin = await Admin.findOne({ username });
    console.log("🔍 Existing Admin:", existingAdmin);

    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    // ✅ Create new admin (WITHOUT HASHING)
    const newAdmin = new Admin({ username, password });
    await newAdmin.save();

    console.log("✅ Admin Created Successfully!");
    res.status(201).json({ message: "Admin created successfully" });
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Admin Login Route (Without Hashed Password Check)
router.post("/login", async (req, res) => {
  console.log("🛠 Admin Login API Hit");
  console.log("📥 Received Data:", req.body);

  const { username, password } = req.body;

  try {
    const admin = await Admin.findOne({ username });
    console.log("🔍 Admin Found:", admin);

    if (!admin) {
      return res.status(403).json({ message: "Admin not found" });
    }

    // ✅ Directly Compare Plain Text Password
    if (password !== admin.password) {
      console.log("❌ Password Mismatch");
      return res.status(403).json({ message: "Invalid credentials" });
    }

    // ✅ Generate Token
    const token = jwt.sign(
      { id: admin._id },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "1h" }
    );

    console.log("✅ Login Successful");
    res.json({ token, username: admin.username });
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Fetch Admin Data (Protected Route)
router.get("/admin", async (req, res) => {
  console.log("🔍 Fetching Admin Data");

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
    const admin = await Admin.findById(decoded.id).select("-password"); // Hide password

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json(admin);
  } catch (error) {
    console.error("❌ Token Error:", error.message);
    res.status(401).json({ message: "Invalid token" });
  }
});

export default router;
