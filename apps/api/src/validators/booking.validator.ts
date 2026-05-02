import { z } from 'zod'

export const createBookingSchema = z.object({
  appointmentTypeId: z.string().cuid(),
  resourceId: z.string().cuid().optional(),
  scheduledStart: z.string().datetime(),
  capacity: z.number().int().min(1).default(1),
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        answer: z.string(),
      })
    )
    .default([]),
  customerId: z.string().cuid().optional(),
  paymentReference: z.string().optional(),
})

export const rescheduleSchema = z.object({
  scheduledStart: z.string().datetime(),
})

export const cancelSchema = z.object({
  cancelReason: z.string().min(1).max(500).optional(),
})

export const bookingQuerySchema = z.object({
  status: z
    .enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'RESCHEDULED', 'COMPLETED', 'NO_SHOW'])
    .optional(),
  serviceId: z.string().optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  from: z.string().optional(),
  to: z.string().optional(),
})
