import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { createGroup } from "../controller/group.js";
import { getGroupMessages } from "../controller/chat.js";

const router = express.Router();

router.post("/create-group", verifyToken, createGroup);
router.get("/get-messages", verifyToken, getGroupMessages);

export default router;
