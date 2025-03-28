import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { createGroup, getGroupList } from "../controller/group.js";
import { getGroupMessages } from "../controller/chat.js";

const router = express.Router();

router.post("/create-group", verifyToken, createGroup);
router.get("/get-messages", verifyToken, getGroupMessages);
router.get("/get-group-list", verifyToken, getGroupList);

export default router;
