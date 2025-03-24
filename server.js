import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import multer from "multer";
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

// ✅ CORS Configuration
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://sachusicplayerfrontend-15y5.vercel.app",
      "https://sachusicplayerfrontend-15y5-bdpogfrt1.vercel.app" // ✅ Added new origin
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  try {
    const tokenParts = token.split(" ");
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
      return res.status(401).json({ message: "Invalid token format" });
    }

    const decoded = jwt.verify(tokenParts[1], process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

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
    const { playlistId } = req.params;
    const playlist = await Playlist.findById(playlistId).populate("songs");

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    res.json(playlist.songs);
  } catch (err) {
    console.error("❌ Error fetching playlist songs:", err.message);
    res.status(500).json({ message: "Failed to fetch playlist songs" });
  }
});

// ✅ Upload API (Cloudinary + MongoDB)
app.post(
  "/api/songs/upload",
  upload.fields([{ name: "audioFile" }, { name: "coverImage" }]),
  async (req, res) => {
    try {
      if (!req.files.audioFile || !req.files.coverImage) {
        return res.status(400).json({
          message: "Audio file and cover image are required!",
        });
      }

      console.log("📂 Files received:", req.files);

      const audioUpload = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: "video", folder: "music_uploads" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.files.audioFile[0].buffer);
      });

      const imageUpload = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: "image", folder: "cover_images" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.files.coverImage[0].buffer);
      });

      const [audioResult, imageResult] = await Promise.all([
        audioUpload,
        imageUpload,
      ]);

      const newSong = new Song({
        title: req.body.title || "Untitled",
        artist: req.body.artist || "Unknown",
        audioUrl: audioResult.secure_url,
        coverImageUrl: imageResult.secure_url,
      });

      await newSong.save();
      console.log("✅ Song saved to MongoDB Atlas!");

      res.json({
        message: "✅ Song Uploaded Successfully!",
        audioUrl: audioResult.secure_url,
        coverImageUrl: imageResult.secure_url,
      });
    } catch (err) {
      console.error("❌ File Upload Error:", err.message);
      res.status(500).json({ message: "Failed to upload files" });
    }
  }
);

app.get("/", (req, res) => {
  res.send("🚀 Sd Music Player Backend is Running...");
});

// ✅ Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);
  res
    .status(500)
    .json({ message: "Internal Server Error", error: err.message });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
