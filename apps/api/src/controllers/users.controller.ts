import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { prisma } from '../config/database'
import { ApiError } from '../utils/ApiError'

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, phone: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, users })
})

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, phone: true },
  })
  if (!user) throw new ApiError(404, 'User not found')
  res.json({ success: true, user })
})

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, phone } = req.body
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { name, phone },
    select: { id: true, name: true, email: true, role: true, phone: true },
  })
  res.json({ success: true, user })
})

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } })
  res.json({ success: true, message: 'User deactivated' })
})

export const changeRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body
  if (!['CUSTOMER', 'ORGANISER', 'ADMIN'].includes(role)) {
    throw new ApiError(400, 'Invalid role')
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  })
  res.json({ success: true, user })
})
