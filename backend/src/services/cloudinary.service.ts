import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadoncloudinary = async (localfilepath: string) => {
  try {
    if (!localfilepath) {
      return null;
    }

    const result = await cloudinary.uploader.upload(localfilepath, {
      resource_type: "auto",
      folder: "theevidence/blogs",
    });

    // Delete temporary file after successful upload
    try {
      await fs.unlink(localfilepath);
    } catch (error) {
      console.error("Temp file deletion error:", error);
    }

    return result;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);

    // Delete temporary file even if upload fails
    try {
      await fs.unlink(localfilepath);
    } catch (error) {
      // File may already be deleted or may not exist
    }

    return null;
  }
};

// Added: optional `resource_type` param, defaulting to "image" so every
// existing call site you already have keeps working unchanged.
// It matters for PDFs specifically — Cloudinary uploads PDFs under
// resource_type "raw" (or however "auto" resolved them), and destroy()
// silently no-ops if you call it with the wrong resource_type.
const deleteCloudnery = async (
  public_id: string,
  resource_type: "image" | "raw" | "video" = "image"
) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type,
    });

    return result;
  } catch (error) {
    console.log("Cloudinary delete Error:", error);

    return null;
  }
};

export {
  uploadoncloudinary,
  deleteCloudnery,
};