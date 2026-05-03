import { Router } from 'express'
import * as ctrl from '../controllers/intelligence.controller'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'

const router = Router()

router.use(authenticate, requireRole('ORGANISER', 'ADMIN'))

router.post('/query', ctrl.query)
router.get('/headlines', ctrl.headlines)

export default router
