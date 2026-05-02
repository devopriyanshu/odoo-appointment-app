import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { prisma } from '../config/database'
import { ApiError } from '../utils/ApiError'
import { randomUUID } from 'crypto'

const serviceInclude = {
  resources: { include: { user: { select: { id: true, name: true, email: true } } } },
  workingHours: { orderBy: { dayOfWeek: 'asc' as const } },
  flexibleSlots: { where: { isActive: true } },
  bookingQuestions: { orderBy: { sequence: 'asc' as const } },
  _count: { select: { bookings: true } },
}

export const listPublished = asyncHandler(async (_req: Request, res: Response) => {
  const services = await prisma.appointmentType.findMany({
    where: { isPublished: true },
    include: serviceInclude,
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, services })
})

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const services = await prisma.appointmentType.findMany({
    where: { organiserId: req.user!.id },
    include: serviceInclude,
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, services })
})

export const getByShareToken = asyncHandler(async (req: Request, res: Response) => {
  const service = await prisma.appointmentType.findUnique({
    where: { shareToken: req.params.token },
    include: serviceInclude,
  })
  if (!service) throw new ApiError(404, 'Service not found')
  res.json({ success: true, service })
})

export const getService = asyncHandler(async (req: Request, res: Response) => {
  const service = await prisma.appointmentType.findUnique({
    where: { id: req.params.id },
    include: serviceInclude,
  })
  if (!service) throw new ApiError(404, 'Service not found')
  res.json({ success: true, service })
})

export const createService = asyncHandler(async (req: Request, res: Response) => {
  const service = await prisma.appointmentType.create({
    data: {
      ...req.body,
      organiserId: req.user!.id,
      shareToken: randomUUID(),
    },
    include: serviceInclude,
  })
  res.status(201).json({ success: true, service })
})

export const updateService = asyncHandler(async (req: Request, res: Response) => {
  const service = await prisma.appointmentType.findUnique({ where: { id: req.params.id } })
  if (!service) throw new ApiError(404, 'Service not found')
  if (service.organiserId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw new ApiError(403, 'Not authorized')
  }
  const updated = await prisma.appointmentType.update({
    where: { id: req.params.id },
    data: req.body,
    include: serviceInclude,
  })
  res.json({ success: true, service: updated })
})

export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const service = await prisma.appointmentType.findUnique({ where: { id: req.params.id } })
  if (!service) throw new ApiError(404, 'Service not found')
  if (service.organiserId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw new ApiError(403, 'Not authorized')
  }
  await prisma.appointmentType.delete({ where: { id: req.params.id } })
  res.json({ success: true, message: 'Service deleted' })
})

export const togglePublish = asyncHandler(async (req: Request, res: Response) => {
  const service = await prisma.appointmentType.findUnique({ where: { id: req.params.id } })
  if (!service) throw new ApiError(404, 'Service not found')
  if (service.organiserId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw new ApiError(403, 'Not authorized')
  }
  const updated = await prisma.appointmentType.update({
    where: { id: req.params.id },
    data: { isPublished: !service.isPublished },
    include: serviceInclude,
  })
  res.json({ success: true, service: updated })
})

export const addResource = asyncHandler(async (req: Request, res: Response) => {
  const resource = await prisma.resource.create({
    data: { ...req.body, appointmentTypeId: req.params.id },
  })
  res.status(201).json({ success: true, resource })
})

export const removeResource = asyncHandler(async (req: Request, res: Response) => {
  await prisma.resource.delete({ where: { id: req.params.resourceId } })
  res.json({ success: true, message: 'Resource removed' })
})

export const setWorkingHours = asyncHandler(async (req: Request, res: Response) => {
  const { hours } = req.body as { hours: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }> }
  await prisma.workingHours.deleteMany({ where: { appointmentTypeId: req.params.id } })
  await prisma.workingHours.createMany({
    data: hours.map((h) => ({ ...h, appointmentTypeId: req.params.id })),
  })
  const updated = await prisma.workingHours.findMany({ where: { appointmentTypeId: req.params.id } })
  res.json({ success: true, workingHours: updated })
})

export const addFlexibleSlots = asyncHandler(async (req: Request, res: Response) => {
  const { slots } = req.body as { slots: Array<{ startDatetime: string; endDatetime: string; maxCapacity: number }> }
  await prisma.flexibleSlot.createMany({
    data: slots.map((s) => ({
      ...s,
      appointmentTypeId: req.params.id,
      startDatetime: new Date(s.startDatetime),
      endDatetime: new Date(s.endDatetime),
    })),
  })
  res.status(201).json({ success: true, message: 'Flexible slots added' })
})

export const addQuestion = asyncHandler(async (req: Request, res: Response) => {
  const question = await prisma.bookingQuestion.create({
    data: { ...req.body, appointmentTypeId: req.params.id },
  })
  res.status(201).json({ success: true, question })
})

export const removeQuestion = asyncHandler(async (req: Request, res: Response) => {
  await prisma.bookingQuestion.delete({ where: { id: req.params.qid } })
  res.json({ success: true, message: 'Question removed' })
})

export const updateQuestion = asyncHandler(async (req: Request, res: Response) => {
  const question = await prisma.bookingQuestion.update({
    where: { id: req.params.qid },
    data: req.body,
  })
  res.json({ success: true, question })
})
