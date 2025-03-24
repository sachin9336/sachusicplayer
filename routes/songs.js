import express from "express";
import Song from "../models/Song.js";
import authenticateAdmin from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Fetch Songs API (No Changes)
router.get("/api/songs", async (req, res) => {
  try {
    const songs = await Song.find();
    res.json(songs);
  } catch (error) {
    console.error("Error fetching songs:", error);
    res.status(500).json({ message: "Server error while fetching songs" });
  }
});

// ✅ Edit Song API (Password Confirmation Required)
router.put("/api/songs/:id", authenticateAdmin, async (req, res) => {
  try {
    const { title, artist, password } = req.body;

    // ✅ Verify Admin Password Before Editing
    if (!password || password !== req.session.adminPassword) {
      return res.status(403).json({ error: "❌ Incorrect Password!" });
    }

    const updatedSong = await Song.findByIdAndUpdate(req.params.id, { title, artist }, { new: true });

    if (!updatedSong) return res.status(404).json({ error: "❌ Song not found!" });

    res.json({ success: true, message: "✅ Song Updated Successfully!", song: updatedSong });

  } catch (error) {
    console.error("Error updating song:", error);
    res.status(500).json({ error: "❌ Update failed!" });
  }
});

// ✅ Delete Song API (Password Confirmation Required)
router.delete("/api/songs/:id", authenticateAdmin, async (req, res) => {
  try {
    const { password } = req.body;

    // ✅ Verify Admin Password Before Deleting
    if (!password || password !== req.session.adminPassword) {
      return res.status(403).json({ error: "❌ Incorrect Password!" });
    }

    const deletedSong = await Song.findByIdAndDelete(req.params.id);
    if (!deletedSong) return res.status(404).json({ error: "❌ Song not found!" });

    res.json({ success: true, message: "✅ Song Deleted Successfully!" });

  } catch (error) {
    console.error("Error deleting song:", error);
    res.status(500).json({ error: "❌ Deletion failed!" });
  }
});

export default router;
