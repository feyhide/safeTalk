import express from 'express'
import { verifyToken } from '../middleware/verifyToken.js'
import { getMessages } from '../controller/chat.js'

const router = express.Router()

router.post("/get-messages",verifyToken,getMessages)

export default router