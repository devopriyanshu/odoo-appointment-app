import { Router } from 'express'
import * as authController from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth'
import { authLimiter } from '../middleware/rateLimiter'
import { validate } from '../middleware/validate'
import {
  signupSchema,
  verifyOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator'

const router = Router()

router.post('/signup', authLimiter, validate(signupSchema), authController.signup)
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), authController.verifyOtp)
router.post('/resend-otp', authLimiter, authController.resendOtp)
router.post('/login', authLimiter, validate(loginSchema), authController.login)
router.post('/logout', authController.logout)
router.get('/me', authenticate, authController.getMe)
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword)
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword)

export default router
