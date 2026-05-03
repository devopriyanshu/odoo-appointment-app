import { z } from 'zod'

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional().nullable().or(z.literal('').transform(() => undefined)),
  role: z.enum(['CUSTOMER', 'ORGANISER']).default('CUSTOMER'),
})

export const verifyOtpSchema = z.object({
  otpToken: z.string().uuid(),
  otp: z.string().length(6),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
