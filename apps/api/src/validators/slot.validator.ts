import { z } from 'zod'

export const availableSlotsQuerySchema = z.object({
  serviceId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  resourceId: z.string().cuid().optional(),
})
