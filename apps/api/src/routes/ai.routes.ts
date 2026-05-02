import { Router } from 'express'
import multer from 'multer'
import * as ctrl from '../controllers/ai.controller'
import { authenticate } from '../middleware/auth'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

router.use(authenticate)

router.post('/chat', ctrl.chat)
router.post('/voice', upload.single('audio'), ctrl.voice)
router.post('/transcribe', upload.single('audio'), ctrl.transcribe)
router.post('/confirm-booking', ctrl.confirmAIBooking)

export default router
