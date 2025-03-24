import express from "express";
import upload from "../middlewares/upload.js";
import cloudinary from "../config/cloudinary.js";
import Song from "../models/Song.js";

const router = express.Router();

router.post("/upload", upload.fields([{ name: "audioFile" }, { name: "coverImage" }]), async (req, res) => {
    try {
        console.log("🛠️ Received Body:", req.body);
        console.log("📂 Received Files:", req.files);

        if (!req.body.title || !req.body.artist || !req.files.audioFile || !req.files.coverImage) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        // ✅ Upload to Cloudinary
        const audioUpload = cloudinary.uploader.upload_stream({ resource_type: "video" }, (error, result) => {
            if (error) return res.status(500).json({ message: "Audio upload failed" });
            return result;
        });
        audioUpload.end(req.files.audioFile[0].buffer);

        const imageUpload = cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
            if (error) return res.status(500).json({ message: "Image upload failed" });
            return result;
        });
        imageUpload.end(req.files.coverImage[0].buffer);

        const [audioResult, imageResult] = await Promise.all([audioUpload, imageUpload]);

        // ✅ Save to DB
        const newSong = new Song({
            title: req.body.title,
            artist: req.body.artist,
            audioUrl: audioResult.secure_url,
            coverImageUrl: imageResult.secure_url,
        });

        await newSong.save();
        res.json({ message: "✅ Song Uploaded!", data: newSong });

    } catch (err) {
        console.error("❌ Upload Error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
