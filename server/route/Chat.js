import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { getChatInfo, getChatList, getMessages } from "../controller/chat.js";

const router = express.Router();

router.get("/get-messages", verifyToken, getMessages);
router.get("/get-chat-info", verifyToken, getChatInfo);
router.get("/get-chat-list", verifyToken, getChatList);

export default router;
