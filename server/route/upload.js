import express from "express";
import multer from "multer";
import { verifyToken } from "../middleware/verifyToken.js";
import { downloadFiles, uploadFiles } from "../controller/upload.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/upload-files", verifyToken, upload.array("files"), uploadFiles);
router.post("/download-file", verifyToken, downloadFiles);

export default router;
