import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import Song from "../models/Song.js";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Cloudinary Upload Function
const uploadToCloudinary = (buffer, folder, resourceType) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: resourceType, folder },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

// ✅ Upload a new song
router.post(
    "/upload",
    upload.fields([{ name: "audioFile" }, { name: "coverImage" }]),
    async (req, res) => {
        try {
            if (!req.files?.audioFile?.[0] || !req.files?.coverImage?.[0]) {
                return res.status(400).json({ error: "⚠️ Audio file and cover image are required!" });
            }

            const { title, artist } = req.body;

            // ✅ Upload audio file to Cloudinary
            const audioResult = await uploadToCloudinary(req.files.audioFile[0].buffer, "songs", "video");

            // ✅ Upload cover image to Cloudinary
            const imageResult = await uploadToCloudinary(req.files.coverImage[0].buffer, "covers", "image");

            // ✅ Save song info in MongoDB
            const newSong = new Song({
                title: title || "Untitled",
                artist: artist || "Unknown",
                audioUrl: audioResult.secure_url,
                imageUrl: imageResult.secure_url,
                cloudinaryAudioId: audioResult.public_id,
                cloudinaryImageId: imageResult.public_id,
            });

            await newSong.save();
            res.json({ message: "✅ Song Uploaded Successfully!", song: newSong });
        } catch (error) {
            console.error("❌ Upload Error:", error.message);
            res.status(500).json({ error: "Internal server error!" });
        }
    }
);

// ✅ Get all songs
router.get("/", async (req, res) => {
    try {
        const songs = await Song.find().sort({ createdAt: -1 });
        res.status(200).json(songs);
    } catch (error) {
        console.error("❌ Fetch Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Get a single song by ID
router.get("/:songId", async (req, res) => {
    const { songId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(songId)) {
        return res.status(400).json({ error: "⚠️ Invalid song ID format" });
    }

    try {
        const song = await Song.findById(songId);
        if (!song) return res.status(404).json({ error: "⚠️ Song not found" });
        res.status(200).json(song);
    } catch (error) {
        console.error("❌ Fetch Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Update a song
router.put("/:songId", async (req, res) => {
    const { songId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(songId)) {
        return res.status(400).json({ error: "⚠️ Invalid song ID format" });
    }

    try {
        const { title, artist } = req.body;
        const song = await Song.findByIdAndUpdate(songId, { title, artist }, { new: true });
        if (!song) return res.status(404).json({ error: "⚠️ Song not found" });
        res.status(200).json({ message: "✅ Song Updated Successfully!", song });
    } catch (error) {
        console.error("❌ Update Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Delete a song with Cloudinary cleanup
router.delete("/:songId", async (req, res) => {
    const { songId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(songId)) {
        return res.status(400).json({ error: "⚠️ Invalid song ID format" });
    }

    try {
        const { password } = req.body;
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ error: "⚠️ Unauthorized! Incorrect Admin Password." });
        }

        const song = await Song.findById(songId);
        if (!song) return res.status(404).json({ error: "⚠️ Song not found" });

        // ✅ Delete song files from Cloudinary
        const deleteCloudinaryFile = async (publicId, resourceType) => {
            if (publicId) await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        };

        await deleteCloudinaryFile(song.cloudinaryAudioId, "video");
        await deleteCloudinaryFile(song.cloudinaryImageId, "image");

        await Song.findByIdAndDelete(songId);
        res.status(200).json({ message: "✅ Song Deleted Successfully!" });
    } catch (error) {
        console.error("❌ Deletion Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
