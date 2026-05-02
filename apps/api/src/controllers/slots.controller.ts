import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { generateAvailableSlots } from '../services/slot.service'

export const getAvailableSlots = asyncHandler(async (req: Request, res: Response) => {
  const { serviceId, date, resourceId } = req.query as {
    serviceId: string
    date: string
    resourceId?: string
  }
  const result = await generateAvailableSlots(serviceId, date, resourceId)
  res.json({ success: true, ...result })
})
