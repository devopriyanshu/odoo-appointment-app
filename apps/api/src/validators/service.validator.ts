import { z } from 'zod'

export const createServiceSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  durationMinutes: z.number().int().min(5).max(480),
  resourceType: z.enum(['USER', 'RESOURCE']).default('USER'),
  slotScheduleType: z.enum(['WEEKLY', 'FLEXIBLE']).default('WEEKLY'),
  maxCapacityPerSlot: z.number().int().min(1).max(100).default(1),
  manageCapacity: z.boolean().default(false),
  requiresManualConfirm: z.boolean().default(false),
  requiresAdvancePayment: z.boolean().default(false),
  advancePaymentAmount: z.number().positive().optional(),
  location: z.string().max(500).optional(),
  coverImageUrl: z.string().url().optional(),
})

export const updateServiceSchema = createServiceSchema.partial()

export const workingHoursSchema = z.object({
  hours: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      isActive: z.boolean().default(true),
    })
  ),
})

export const flexibleSlotSchema = z.object({
  slots: z.array(
    z.object({
      startDatetime: z.string().datetime(),
      endDatetime: z.string().datetime(),
      maxCapacity: z.number().int().min(1).default(1),
    })
  ),
})

export const bookingQuestionSchema = z.object({
  question: z.string().min(5).max(500),
  isRequired: z.boolean().default(false),
  sequence: z.number().int().default(0),
})

export const addResourceSchema = z.object({
  userId: z.string().cuid().optional(),
  name: z.string().min(1).max(200),
  resourceType: z.enum(['USER', 'RESOURCE']).default('USER'),
})
