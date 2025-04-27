import dotenv from "dotenv";
import cloudinary from "../utils/cloudinary.js";
dotenv.config();
import {
  sendError,
  sendSuccess,
  sendValidationError,
} from "../utils/response.js";

const uploadFilesToCloudinary = (fileBuffer, fileType, originalFileName) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: "safeTalk",
      use_filename: true,
      unique_filename: false,
      public_id: originalFileName,
    };

    let resourceType = "auto";

    if (fileType.startsWith("image")) {
      uploadOptions.transformation = [
        { quality: "auto:low", width: 800, crop: "scale" },
      ];
      resourceType = "image";
    } else if (fileType.startsWith("video/")) {
      resourceType = "video";
    } else if (fileType.startsWith("application/")) {
      resourceType = "raw";
    } else {
      resourceType = "raw";
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { ...uploadOptions, resource_type: resourceType },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

export const uploadFiles = async (req, res) => {
  try {
    console.log(req.files);
    if (!req.files || req.files.length === 0) {
      return sendError(res, "No files uploaded", null, 400);
    }

    const uploadedUrls = await Promise.all(
      req.files.map((file) =>
        uploadFilesToCloudinary(file.buffer, file.mimetype, file.originalname)
      )
    );

    return sendSuccess(res, "Files uploaded successfully", uploadedUrls, 201);
  } catch (error) {
    console.error("Error uploading files:", error);
    return sendError(res, "Error uploading files", null, 500);
  }
};
