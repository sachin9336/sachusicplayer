import mongoose from "mongoose";

const songSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: String, required: true },
    audioUrl: { type: String, required: true },
    imageUrl: { type: String, required: true }
});

const Song = mongoose.model("Song", songSchema);

export default Song;
