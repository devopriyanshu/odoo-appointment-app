import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { Response } from 'express'
import { prisma } from '../config/database'
import { redis } from '../config/redis'
import { env } from '../config/env'
import { ApiError } from '../utils/ApiError'
import { logger } from '../utils/logger'
import { SignupInput, LoginInput } from '../validators/auth.validator'

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function generateTokens(user: { id: string; email: string; role: string }) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  )
  const refreshToken = jwt.sign(
    { id: user.id },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  )
  return { accessToken, refreshToken }
}

export function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  })
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

export function clearAuthCookies(res: Response) {
  res.clearCookie('accessToken')
  res.clearCookie('refreshToken')
}

export async function signup(data: SignupInput) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) throw new ApiError(409, 'Email already registered')

  const hashedPassword = await bcrypt.hash(data.password, 12)

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      phone: data.phone,
      role: data.role as 'CUSTOMER' | 'ORGANISER',
      isActive: false,
    },
  })

  const otpToken = uuidv4()
  const otp = generateOtp()
  await redis.set(`otp:${otpToken}`, JSON.stringify({ otp, userId: user.id }), 'EX', 300)

  logger.info(`OTP for ${data.email}: ${otp}`)

  return { otpToken, message: 'OTP sent to your email' }
}

export async function verifyOtp(otpToken: string, otp: string) {
  const stored = await redis.get(`otp:${otpToken}`)
  if (!stored) throw new ApiError(400, 'OTP expired or invalid. Please sign up again.')

  const { otp: storedOtp, userId } = JSON.parse(stored)
  if (storedOtp !== otp) throw new ApiError(400, 'Invalid OTP')

  await prisma.user.update({ where: { id: userId }, data: { isActive: true } })
  await redis.del(`otp:${otpToken}`)

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const tokens = generateTokens(user)

  return { tokens, user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone } }
}

export async function login(data: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: data.email } })
  if (!user) throw new ApiError(401, 'Invalid email or password')
  if (!user.isActive) throw new ApiError(403, 'Account not verified or deactivated')

  const isMatch = await bcrypt.compare(data.password, user.password)
  if (!isMatch) throw new ApiError(401, 'Invalid email or password')

  const tokens = generateTokens(user)
  return {
    tokens,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
  }
}

export async function logout(token: string) {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null
    const ttl = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900
    if (ttl > 0) await redis.set(`blacklist:${token}`, '1', 'EX', ttl)
  } catch {
    // ignore
  }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
  })
  if (!user) throw new ApiError(404, 'User not found')
  return user
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return { message: 'If that email exists, a reset link has been sent.' }

  const resetToken = uuidv4()
  await redis.set(`reset:${resetToken}`, user.id, 'EX', 600)
  logger.info(`Password reset link for ${email}: /reset-password?token=${resetToken}`)

  return { message: 'Password reset link has been sent (check server logs for demo)', resetToken }
}

export async function resetPassword(token: string, newPassword: string) {
  const userId = await redis.get(`reset:${token}`)
  if (!userId) throw new ApiError(400, 'Reset token expired or invalid')

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
  await redis.del(`reset:${token}`)
}
