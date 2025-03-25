import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import cloudinary from "./config/cloudinary.js";
import Song from "./models/Song.js";
import Playlist from "./models/Playlist.js";
import authRoutes from "./routes/authRoutes.js";
import songsRoutes from "./routes/songsRoutes.js";
import playlistRoutes from "./routes/playlistRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ Error: MONGO_URI is not defined in .env file!");
  process.exit(1);
}

// ✅ MongoDB Atlas Connection
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Atlas Connected!"))
  .catch((err) => {
    console.error("❌ DB Connection Error:", err.message);
    process.exit(1);
  });

console.log("🎵 Sd Music Player Backend Starting...");

// ✅ CORS Configuration (Only Allow Deployed Frontend)
const allowedOrigins = [
  "https://sachusicplayerfrontend-15y5.vercel.app",
  "https://sachusicplayerfrontend-15y5-bdpogfrt1.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Agar origin undefined ho (jaise Postman/curl), toh allow karo
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("❌ Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// ✅ Multer Setup for File Uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ JWT Token Verification Middleware
const verifyToken = (req, res, next) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) return res.status(403).json({ message: "No token provided" });

    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ✅ API Routes
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/songs", songsRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/history", historyRoutes);

// ✅ Fetch Random Songs for Home
app.get("/api/songs/home", async (req, res) => {
  try {
    const songs = await Song.find().sort({ createdAt: -1 }).limit(10);
    res.json(songs);
  } catch (err) {
    console.error("❌ Error fetching songs:", err.message);
    res.status(500).json({ message: "Failed to fetch songs" });
  }
});

// ✅ Fetch Songs by Playlist ID
app.get("/api/playlists/:playlistId/songs", async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.playlistId).populate("songs");
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });
    res.json(playlist.songs);
  } catch (err) {
    console.error("❌ Error fetching playlist songs:", err.message);
    res.status(500).json({ message: "Failed to fetch playlist songs" });
  }
});

// ✅ Upload API (Cloudinary + MongoDB)
app.post("/api/songs/upload", upload.fields([{ name: "audioFile" }, { name: "coverImage" }]), async (req, res) => {
  try {
    if (!req.files?.audioFile || !req.files?.coverImage) {
      return res.status(400).json({ message: "Audio file and cover image are required!" });
    }

    console.log("📂 Files received:", req.files);

    const audioPromise = new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "video", folder: "music_uploads" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.files.audioFile[0].buffer);
    });

    const imagePromise = new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "image", folder: "cover_images" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.files.coverImage[0].buffer);
    });

    const [audioResult, imageResult] = await Promise.all([audioPromise, imagePromise]);

    const newSong = await Song.create({
      title: req.body.title || "Untitled",
      artist: req.body.artist || "Unknown",
      audioUrl: audioResult.secure_url,
      coverImageUrl: imageResult.secure_url,
    });

    console.log("✅ Song saved to MongoDB Atlas!");
    res.json({
      message: "✅ Song Uploaded Successfully!",
      song: newSong,
    });
  } catch (err) {
    console.error("❌ File Upload Error:", err.message);
    res.status(500).json({ message: "Failed to upload files", error: err.message });
  }
});

// ✅ Serve React Frontend (If Frontend Build is served from Same Domain)
// Agar tum apne React frontend ko backend ke saath serve karna chahte ho, to niche code enable karo.
// Note: Agar frontend alag host par hai, to iski zarurat nahi hai.
app.use(express.static(path.join(path.resolve(), "frontend", "dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(path.resolve(), "frontend", "dist", "index.html"));
});

// ✅ Home Route
app.get("/", (req, res) => {
  res.send("🚀 Sd Music Player Backend is Running...");
});

// ✅ Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);
  res.status(500).json({ message: "Internal Server Error", error: err.message });
});

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
