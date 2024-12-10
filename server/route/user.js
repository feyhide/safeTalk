import express from 'express'
import { verifyToken } from '../middleware/verifyToken.js'
import { searchUsers } from '../controller/user.js'

const router = express.Router()

router.post("/search-users",verifyToken,searchUsers)

export default router