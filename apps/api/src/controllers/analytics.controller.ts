import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import * as analyticsService from '../services/analytics.service'

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getSummary(req.user!.id, req.user!.role)
  res.json({ success: true, data })
})

export const getPeakHours = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getPeakHours(req.user!.id, req.user!.role)
  res.json({ success: true, data })
})

export const getTrend = asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30
  const data = await analyticsService.getTrend(req.user!.id, req.user!.role, days)
  res.json({ success: true, data })
})

export const getByService = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getByService(req.user!.id, req.user!.role)
  res.json({ success: true, data })
})

export const getProviderUtilization = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getProviderUtilization(req.user!.id, req.user!.role)
  res.json({ success: true, data })
})
