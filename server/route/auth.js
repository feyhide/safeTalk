import express from 'express'
import { renewUserKeys, signin, signout, signup, verifyOTP } from '../controller/auth.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.post("/sign-up",signup)
router.post("/sign-in",signin)
router.post("/verify-otp",verifyOTP)
router.get("/sign-out",signout)
router.get("/renew-keys",verifyToken,renewUserKeys)

export default router