import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import * as authService from '../services/auth.service'

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.signup(req.body)
  res.status(201).json({ success: true, ...result })
})

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { otpToken, otp } = req.body
  const { tokens, user } = await authService.verifyOtp(otpToken, otp)
  authService.setAuthCookies(res, tokens)
  res.json({ success: true, user })
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { tokens, user } = await authService.login(req.body)
  authService.setAuthCookies(res, tokens)
  res.json({ success: true, user })
})

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '')
  if (token) await authService.logout(token)
  authService.clearAuthCookies(res)
  res.json({ success: true, message: 'Logged out' })
})

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id)
  res.json({ success: true, user })
})

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body.email)
  res.json({ success: true, ...result })
})

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.newPassword)
  res.json({ success: true, message: 'Password updated successfully' })
})
