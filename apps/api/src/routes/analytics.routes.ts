import { Router } from 'express'
import * as ctrl from '../controllers/analytics.controller'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'

const router = Router()

router.use(authenticate, requireRole('ORGANISER', 'ADMIN'))

router.get('/summary', ctrl.getSummary)
router.get('/peak-hours', ctrl.getPeakHours)
router.get('/trend', ctrl.getTrend)
router.get('/by-service', ctrl.getByService)
router.get('/provider-utilization', ctrl.getProviderUtilization)

export default router
