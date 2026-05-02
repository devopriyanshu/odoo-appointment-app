import { Router } from 'express'
import * as ctrl from '../controllers/slots.controller'
import { validate } from '../middleware/validate'
import { availableSlotsQuerySchema } from '../validators/slot.validator'

const router = Router()

router.get('/available', validate(availableSlotsQuerySchema, 'query'), ctrl.getAvailableSlots)

export default router
