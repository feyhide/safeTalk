import dotenv from "dotenv";
import cloudinary from "../utils/cloudinary.js";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import os from "os";
import fs from "fs";

dotenv.config();

import { sendError, sendSuccess } from "../utils/response.js";

const getAudioDuration = (audioFile) => {
  return new Promise((resolve, reject) => {
    const tempFilePath = path.join(
      os.tmpdir(),
      `${Date.now()}_${audioFile.originalname}`
    );
    const outputFilePath = path.join(os.tmpdir(), `${Date.now()}_output.wav`);

    fs.writeFileSync(tempFilePath, audioFile.buffer);

    ffmpeg(tempFilePath)
      .output(outputFilePath)
      .on("end", () => {
        ffmpeg.ffprobe(outputFilePath, (err, data) => {
          if (err) {
            console.log("Error with ffprobe:", err);
            reject(err);
          } else {
            const duration = data.format.duration;
            resolve(duration);
          }
          fs.unlinkSync(tempFilePath);
          fs.unlinkSync(outputFilePath);
        });
      })
      .run();
  });
};

const uploadFilesToCloudinary = (fileBuffer, fileType, originalFileName) => {
  return new Promise((resolve, reject) => {
    const filename = originalFileName.split(".")[0];
    const ext = originalFileName.split(".")[1];
    let uploadOptions;

    if (ext === "wav" || ext === "mp3") {
      uploadOptions = {
        folder: "safeTalk",
        use_filename: true,
        unique_filename: false,
        public_id: filename,
        format: "wav",
      };
    } else {
      uploadOptions = {
        folder: "safeTalk",
        use_filename: true,
        unique_filename: false,
        public_id: filename,
      };
    }

    let resourceType = "auto";

    if (fileType.startsWith("audio")) {
      resourceType = "video";
    } else if (fileType.startsWith("image")) {
      uploadOptions.transformation = [{ quality: "auto:low" }];
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

export const uploadAudio = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, "No audio file uploaded", null, 400);
    }

    const audioFile = req.file;

    if (audioFile.mimetype.startsWith("audio")) {
      const duration = await getAudioDuration(audioFile);
      if (duration > 300) {
        return sendError(
          res,
          "Audio file duration exceeds 5 minutes",
          null,
          400
        );
      }
      const audioUrl = await uploadFilesToCloudinary(
        audioFile.buffer,
        audioFile.mimetype,
        audioFile.originalname
      );

      return sendSuccess(res, "Audio uploaded successfully", audioUrl, 201);
    }
  } catch (error) {
    console.error("Error uploading audio:", error);
    return sendError(res, "Error uploading audio", null, 500);
  }
};

export const uploadFiles = async (req, res) => {
  try {
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

export const downloadFiles = async (req, res) => {
  try {
    const { url } = req.body;

    const cloudinaryUrlPattern =
      /https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9]+\/.*/;

    const isCloudinaryUrl = cloudinaryUrlPattern.test(url);

    if (!isCloudinaryUrl) {
      return sendError(res, "Invalid Url", null, 400);
    }
    const response = await axios.get(url, {
      responseType: "stream",
    });

    let filename = decodeURIComponent(url.split("/").pop());

    const ext = filename.slice(filename.lastIndexOf("."));
    if (filename.indexOf(ext) !== filename.lastIndexOf(ext)) {
      filename = filename.slice(0, filename.lastIndexOf(ext));
    }

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      response.headers["content-type"] || "application/octet-stream"
    );

    response.data.pipe(res);

    response.data.on("end", () => {
      res.end();
    });
  } catch (error) {
    console.error("Error fetching file from Cloudinary:", error);
    return sendError(res, "Error downloading file", null, 500);
  }
};
