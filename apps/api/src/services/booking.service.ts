import { prisma } from '../config/database'
import { redis } from '../config/redis'
import { ApiError } from '../utils/ApiError'

interface CreateBookingData {
  appointmentTypeId: string
  resourceId?: string
  scheduledStart: string
  capacity: number
  answers: Array<{ questionId: string; answer: string }>
  customerId?: string
  paymentReference?: string
}

export async function createBooking(data: CreateBookingData, actorId: string) {
  const lockKey = `slot_lock:${data.appointmentTypeId}:${data.scheduledStart}:${data.resourceId ?? 'any'}`
  const lockAcquired = await redis.set(lockKey, actorId, 'EX', 300, 'NX')

  if (!lockAcquired) {
    throw new ApiError(409, 'Slot is being booked. Please try again in a moment.')
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const service = await tx.appointmentType.findUnique({
        where: { id: data.appointmentTypeId },
      })
      if (!service || !service.isPublished) {
        throw new ApiError(404, 'Service not found or not published')
      }

      const existing = await tx.booking.findMany({
        where: {
          appointmentTypeId: data.appointmentTypeId,
          scheduledStart: new Date(data.scheduledStart),
          status: { notIn: ['CANCELLED'] },
        },
      })
      const bookedCapacity = existing.reduce((sum, b) => sum + b.capacity, 0)

      if (bookedCapacity + data.capacity > service.maxCapacityPerSlot) {
        throw new ApiError(409, 'Slot is no longer available. Please choose another time.')
      }

      const customerId = data.customerId ?? actorId
      const scheduledEnd = new Date(
        new Date(data.scheduledStart).getTime() + service.durationMinutes * 60000
      )

      const booking = await tx.booking.create({
        data: {
          customerId,
          appointmentTypeId: data.appointmentTypeId,
          resourceId: data.resourceId,
          scheduledStart: new Date(data.scheduledStart),
          scheduledEnd,
          capacity: data.capacity,
          status: service.requiresManualConfirm ? 'PENDING' : 'CONFIRMED',
          paymentStatus: service.requiresAdvancePayment ? 'PAID' : 'UNPAID',
          paymentAmount: service.advancePaymentAmount,
          paymentReference: data.paymentReference,
          bookedByAdminId: data.customerId ? actorId : null,
        },
        include: {
          appointmentType: true,
          resource: true,
          customer: { select: { id: true, name: true, email: true } },
        },
      })

      if (data.answers?.length) {
        await tx.bookingAnswer.createMany({
          data: data.answers.map((a) => ({
            bookingId: booking.id,
            questionId: a.questionId,
            answer: a.answer,
          })),
        })
      }

      await tx.bookingAuditLog.create({
        data: {
          bookingId: booking.id,
          actorId,
          action: 'CREATED',
          metadata: {
            capacity: data.capacity,
            paymentReference: data.paymentReference,
            bookedOnBehalfOf: data.customerId ?? null,
          },
        },
      })

      return booking
    })
  } finally {
    await redis.del(lockKey)
  }
}

export async function cancelBooking(bookingId: string, actorId: string, cancelReason?: string, role?: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) throw new ApiError(404, 'Booking not found')

  if (booking.customerId !== actorId && role !== 'ORGANISER' && role !== 'ADMIN') {
    throw new ApiError(403, 'Not authorized to cancel this booking')
  }

  if (booking.status === 'CANCELLED') throw new ApiError(400, 'Booking already cancelled')

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED', cancelReason },
    include: { appointmentType: true, customer: { select: { id: true, name: true, email: true } } },
  })

  await prisma.bookingAuditLog.create({
    data: { bookingId, actorId, action: 'CANCELLED', metadata: { cancelReason } },
  })

  return updated
}

export async function rescheduleBooking(bookingId: string, newStart: string, actorId: string, role?: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { appointmentType: true },
  })
  if (!booking) throw new ApiError(404, 'Booking not found')
  if (booking.customerId !== actorId && role !== 'ORGANISER' && role !== 'ADMIN') {
    throw new ApiError(403, 'Not authorized to reschedule this booking')
  }
  if (new Date(newStart) <= new Date()) {
    throw new ApiError(400, 'New start time must be in the future')
  }

  const lockKey = `slot_lock:${booking.appointmentTypeId}:${newStart}:${booking.resourceId ?? 'any'}`
  const lockAcquired = await redis.set(lockKey, actorId, 'EX', 300, 'NX')
  if (!lockAcquired) throw new ApiError(409, 'Slot is being booked. Please try again.')

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findMany({
        where: {
          appointmentTypeId: booking.appointmentTypeId,
          scheduledStart: new Date(newStart),
          status: { notIn: ['CANCELLED'] },
          id: { not: bookingId },
        },
      })
      const bookedCapacity = existing.reduce((sum, b) => sum + b.capacity, 0)
      if (bookedCapacity + booking.capacity > booking.appointmentType.maxCapacityPerSlot) {
        throw new ApiError(409, 'Selected slot is not available')
      }

      const oldStart = booking.scheduledStart
      const newEnd = new Date(new Date(newStart).getTime() + booking.appointmentType.durationMinutes * 60000)

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { scheduledStart: new Date(newStart), scheduledEnd: newEnd, status: 'RESCHEDULED' },
        include: { appointmentType: true, customer: { select: { id: true, name: true, email: true } } },
      })

      await tx.bookingAuditLog.create({
        data: {
          bookingId,
          actorId,
          action: 'RESCHEDULED',
          metadata: { oldStart: oldStart.toISOString(), newStart },
        },
      })

      return updated
    })
  } finally {
    await redis.del(lockKey)
  }
}

export async function updateBookingStatus(
  bookingId: string,
  actorId: string,
  action: string,
  status: string
) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) throw new ApiError(404, 'Booking not found')

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: status as any },
    include: { appointmentType: true, customer: { select: { id: true, name: true, email: true } } },
  })

  await prisma.bookingAuditLog.create({
    data: { bookingId, actorId, action },
  })

  return updated
}

export async function getBookings(userId: string, role: string, filters: {
  status?: string
  serviceId?: string
  page: number
  limit: number
  from?: string
  to?: string
}) {
  const where: Record<string, unknown> = {}

  if (role === 'CUSTOMER') {
    where.customerId = userId
  } else if (role === 'ORGANISER') {
    where.appointmentType = { organiserId: userId }
  }

  if (filters.status) where.status = filters.status
  if (filters.serviceId) where.appointmentTypeId = filters.serviceId
  if (filters.from || filters.to) {
    where.scheduledStart = {
      ...(filters.from && { gte: new Date(filters.from) }),
      ...(filters.to && { lte: new Date(filters.to) }),
    }
  }

  const [total, bookings] = await Promise.all([
    prisma.booking.count({ where: where as any }),
    prisma.booking.findMany({
      where: where as any,
      include: {
        appointmentType: { select: { id: true, name: true, durationMinutes: true, location: true } },
        resource: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { scheduledStart: 'desc' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
  ])

  return { bookings, total, page: filters.page, limit: filters.limit }
}

export async function getBookingById(bookingId: string, userId: string, role: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      appointmentType: {
        include: { bookingQuestions: { orderBy: { sequence: 'asc' } } },
      },
      resource: true,
      customer: { select: { id: true, name: true, email: true, phone: true } },
      answers: { include: { question: true } },
      auditLog: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!booking) throw new ApiError(404, 'Booking not found')

  if (role === 'CUSTOMER' && booking.customerId !== userId) {
    throw new ApiError(403, 'Not authorized')
  }

  return booking
}
