import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { prisma } from '../config/database'
import { ApiError } from '../utils/ApiError'

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const where = req.user?.role === 'ORGANISER' ? { role: 'CUSTOMER' as const } : undefined
  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, phone: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, users })
})

/** Compact customer search/list for organisers and admins booking on behalf. */
export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const q = (req.query.q as string | undefined)?.trim()
  const where: Record<string, unknown> = { role: 'CUSTOMER', isActive: true }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ]
  }
  const customers = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, phone: true },
    orderBy: { name: 'asc' },
    take: 50,
  })
  res.json({ success: true, customers })
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
  const { name, phone, isActive } = req.body
  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (phone !== undefined) data.phone = phone
  if (isActive !== undefined) data.isActive = isActive
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, name: true, email: true, role: true, phone: true, isActive: true },
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
