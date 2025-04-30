import express from "express";
import {
  renewUserKeys,
  resetLink,
  resetPassword,
  signin,
  signout,
  signup,
  verifyOTP,
} from "../controller/auth.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/sign-up", signup);
router.post("/sign-in", signin);
router.post("/verify-otp", verifyOTP);
router.get("/sign-out", signout);
router.get("/renew-keys", verifyToken, renewUserKeys);
router.post("/reset-link", resetLink);
router.post("/reset-password", resetPassword);

export default router;
