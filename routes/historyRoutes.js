import express from "express";
import History from "../models/History.js";

const router = express.Router();

// Get user history
router.get("/:userId", async (req, res) => {
  try {
    const history = await History.find({ userId: req.params.userId });
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: "Error fetching history", error });
  }
});

// Add song to history
router.post("/", async (req, res) => {
  const { userId, songId } = req.body;

  try {
    const newHistory = new History({ userId, songId });
    await newHistory.save();
    res.status(201).json(newHistory);
  } catch (error) {
    res.status(500).json({ message: "Error adding to history", error });
  }
});

export default router;
