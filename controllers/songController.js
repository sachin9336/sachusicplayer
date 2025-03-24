import cloudinary from "../config/cloudinary.js";
import Song from "../models/Song.js";

const uploadSong = async (req, res) => {
  try {
    console.log("🔥 Upload API Hit - Song Upload Process Started...");
    console.log("📂 Received Files:", req.files);

    if (!req.files || !req.files.audioFile || !req.files.coverImage) {
      console.log("❌ Error: Missing audio file or cover image!");
      return res.status(400).json({ message: "⚠ Audio & Cover Image required!" });
    }

    console.log("🚀 Uploading files to Cloudinary...");

    // ✅ Audio file upload to Cloudinary
    console.log("🎵 Uploading Audio File...");
    const audioUpload = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "video", folder: "songs/" },
        (error, result) => {
          if (error) {
            console.error("❌ Audio Upload Failed:", error.message);
            reject(error);
          } else {
            console.log("✅ Audio Upload Successful:", result.secure_url);
            resolve(result);
          }
        }
      );
      uploadStream.end(req.files.audioFile[0].buffer);
    });

    // ✅ Cover image upload to Cloudinary
    console.log("🖼 Uploading Cover Image...");
    const imageUpload = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "image", folder: "covers/" },
        (error, result) => {
          if (error) {
            console.error("❌ Image Upload Failed:", error.message);
            reject(error);
          } else {
            console.log("✅ Cover Image Upload Successful:", result.secure_url);
            resolve(result);
          }
        }
      );
      uploadStream.end(req.files.coverImage[0].buffer);
    });

    // ✅ Wait for both uploads
    const [audioResult, imageResult] = await Promise.all([audioUpload, imageUpload]);

    console.log("✅ All files uploaded successfully!");
    console.log("🎵 Final Audio URL:", audioResult.secure_url);
    console.log("🖼 Final Cover Image URL:", imageResult.secure_url);

    // ✅ MongoDB me song save karo
    console.log("💾 Saving song details in MongoDB...");
    const newSong = new Song({
      title: req.body.title || "Untitled",
      artist: req.body.artist || "Unknown",
      album: req.body.album || "Unknown",
      genre: req.body.genre || "Unknown",
      releaseDate: req.body.releaseDate || "Unknown",
      audioUrl: audioResult.secure_url,
      coverImageUrl: imageResult.secure_url,
    });

    await newSong.save();
    console.log("✅ Song successfully saved to MongoDB Atlas!");

    res.status(201).json({
      message: "✅ Song Uploaded Successfully!",
      song: newSong,
    });
  } catch (error) {
    console.error("❌ Upload API Error:", error.message);
    res.status(500).json({ message: "Upload Failed", error: error.message });
  }
};

export { uploadSong };
