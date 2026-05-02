import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import * as bookingService from '../services/booking.service'
import { prisma } from '../config/database'

export const listBookings = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    status: req.query.status as string | undefined,
    serviceId: req.query.serviceId as string | undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  }
  const result = await bookingService.getBookings(req.user!.id, req.user!.role, filters)
  res.json({ success: true, ...result })
})

export const getBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user!.id, req.user!.role)
  res.json({ success: true, booking })
})

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  if (req.body.customerId && req.user!.role !== 'ORGANISER' && req.user!.role !== 'ADMIN') {
    delete req.body.customerId
  }
  const booking = await bookingService.createBooking(req.body, req.user!.id)
  res.status(201).json({ success: true, booking })
})

export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.cancelBooking(
    req.params.id,
    req.user!.id,
    req.body.cancelReason,
    req.user!.role
  )
  res.json({ success: true, booking })
})

export const rescheduleBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.rescheduleBooking(
    req.params.id,
    req.body.scheduledStart,
    req.user!.id,
    req.user!.role
  )
  res.json({ success: true, booking })
})

export const confirmBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.updateBookingStatus(
    req.params.id, req.user!.id, 'CONFIRMED', 'CONFIRMED'
  )
  res.json({ success: true, booking })
})

export const completeBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.updateBookingStatus(
    req.params.id, req.user!.id, 'COMPLETED', 'COMPLETED'
  )
  res.json({ success: true, booking })
})

export const noShowBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.updateBookingStatus(
    req.params.id, req.user!.id, 'NO_SHOW', 'NO_SHOW'
  )
  res.json({ success: true, booking })
})

export const exportBookings = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query as { from?: string; to?: string }
  const where: Record<string, unknown> = {}
  if (req.user!.role === 'ORGANISER') {
    const services = await prisma.appointmentType.findMany({ where: { organiserId: req.user!.id }, select: { id: true } })
    where.appointmentTypeId = { in: services.map((s) => s.id) }
  }
  if (from) (where as any).scheduledStart = { ...((where as any).scheduledStart ?? {}), gte: new Date(from) }
  if (to) (where as any).scheduledStart = { ...((where as any).scheduledStart ?? {}), lte: new Date(to) }

  const bookings = await prisma.booking.findMany({
    where: where as any,
    include: {
      customer: { select: { name: true, email: true } },
      appointmentType: { select: { name: true } },
      resource: { select: { name: true } },
    },
    orderBy: { scheduledStart: 'desc' },
  })

  const headers = ['Code', 'Customer', 'Email', 'Service', 'Provider', 'Start', 'Status', 'PaymentStatus', 'Amount']
  const rows = bookings.map((b) => [
    b.confirmationCode,
    b.customer.name,
    b.customer.email,
    b.appointmentType.name,
    b.resource?.name ?? '',
    b.scheduledStart.toISOString(),
    b.status,
    b.paymentStatus,
    b.paymentAmount?.toString() ?? '0',
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="bookings-export.csv"')
  res.send(csv)
})
