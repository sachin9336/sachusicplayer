import express from "express";
import Playlist from "../models/Playlist.js";

const router = express.Router();

// Get all playlists
router.get("/", async (req, res) => {
  try {
    const playlists = await Playlist.find();
    res.status(200).json(playlists);
  } catch (error) {
    res.status(500).json({ message: "Error fetching playlists", error });
  }
});

// Create a new playlist
router.post("/", async (req, res) => {
  const { name, songs } = req.body;

  try {
    const newPlaylist = new Playlist({ name, songs });
    await newPlaylist.save();
    res.status(201).json(newPlaylist);
  } catch (error) {
    res.status(500).json({ message: "Error creating playlist", error });
  }
});

export default router;
