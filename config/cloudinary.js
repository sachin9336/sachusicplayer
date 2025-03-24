import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config(); // ✅ Load environment variables

cloudinary.config({
  cloud_name: "dg2glqqs4", // ✅ Hardcoded from .env
  api_key: "185168688824126", // ✅ Hardcoded from .env
  api_secret: "Fks9Gi1aIL1mMw_rCXYdMtlAzCY", // ✅ Hardcoded from .env
});

console.log("✅ Cloudinary Config Loaded!"); // Debugging ke liye

export default cloudinary;
