import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import Song from "../models/Song.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Upload a new song
router.post("/upload", upload.fields([{ name: "audioFile" }, { name: "coverImage" }]), async (req, res) => {
    try {
        if (!req.files?.audioFile || !req.files?.coverImage) {
            return res.status(400).json({ error: "⚠️ Audio file and cover image are required!" });
        }

        const { title, artist } = req.body;

        // ✅ Upload audio file to Cloudinary
        const audioResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream({ resource_type: "video", folder: "songs" }, (error, result) => {
                if (error) reject(error);
                else resolve(result);
            });
            uploadStream.end(req.files.audioFile[0].buffer);
        });

        // ✅ Upload cover image to Cloudinary
        const imageResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream({ resource_type: "image", folder: "covers" }, (error, result) => {
                if (error) reject(error);
                else resolve(result);
            });
            uploadStream.end(req.files.coverImage[0].buffer);
        });

        // ✅ Extract public IDs from URLs
        const audioPublicId = audioResult.public_id;
        const imagePublicId = imageResult.public_id;

        // ✅ Save song info in MongoDB
        const newSong = new Song({
            title: title || "Untitled",
            artist: artist || "Unknown",
            audioUrl: audioResult.secure_url,
            imageUrl: imageResult.secure_url,
            cloudinaryAudioId: audioPublicId,  // ✅ Store Cloudinary public_id for easy deletion
            cloudinaryImageId: imagePublicId,
        });

        await newSong.save();

        res.json({ message: "✅ Song Uploaded Successfully!", song: newSong });
    } catch (error) {
        console.error("❌ Upload Error:", error.message);
        res.status(500).json({ error: "Internal server error!" });
    }
});

// ✅ Get all songs
router.get("/", async (req, res) => {
    try {
        const songs = await Song.find().sort({ createdAt: -1 });

        // ✅ Extract public IDs correctly
        const formattedSongs = songs.map(song => ({
            ...song.toObject(),
            audioPublicId: song.cloudinaryAudioId,
            imagePublicId: song.cloudinaryImageId
        }));

        res.status(200).json(formattedSongs);
    } catch (error) {
        console.error("❌ Fetch Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Get a single song by ID
router.get("/:songId", async (req, res) => {
    try {
        const song = await Song.findById(req.params.songId);
        if (!song) return res.status(404).json({ error: "⚠️ Song not found" });

        // ✅ Extract public IDs correctly
        const formattedSong = {
            ...song.toObject(),
            audioPublicId: song.cloudinaryAudioId,
            imagePublicId: song.cloudinaryImageId
        };

        res.status(200).json(formattedSong);
    } catch (error) {
        console.error("❌ Fetch Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Update a song
router.put("/:songId", async (req, res) => {
    try {
        const { title, artist } = req.body;
        const song = await Song.findByIdAndUpdate(
            req.params.songId,
            { title, artist },
            { new: true }
        );

        if (!song) return res.status(404).json({ error: "⚠️ Song not found" });

        res.status(200).json({ message: "✅ Song Updated Successfully!", song });
    } catch (error) {
        console.error("❌ Update Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Delete a song with Cloudinary cleanup & admin password verification
router.delete("/:songId", express.json(), async (req, res) => {
    try {
        const { password } = req.body;

        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ error: "⚠️ Unauthorized! Incorrect Admin Password." });
        }

        const song = await Song.findById(req.params.songId);
        if (!song) return res.status(404).json({ error: "⚠️ Song not found" });

        // ✅ Delete song files from Cloudinary
        try {
            if (song.cloudinaryAudioId) {
                await cloudinary.uploader.destroy(song.cloudinaryAudioId, { resource_type: "video" });
            }
            if (song.cloudinaryImageId) {
                await cloudinary.uploader.destroy(song.cloudinaryImageId, { resource_type: "image" });
            }
        } catch (cloudinaryError) {
            console.error("❌ Cloudinary Deletion Error:", cloudinaryError.message);
        }

        // ✅ Delete song from MongoDB
        await Song.findByIdAndDelete(req.params.songId);

        res.status(200).json({ message: "✅ Song Deleted Successfully!" });
    } catch (error) {
        console.error("❌ Deletion Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
