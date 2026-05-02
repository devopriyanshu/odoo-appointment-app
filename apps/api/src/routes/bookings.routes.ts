import { Router } from 'express'
import * as ctrl from '../controllers/bookings.controller'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { validate } from '../middleware/validate'
import { createBookingSchema, rescheduleSchema, cancelSchema } from '../validators/booking.validator'

const router = Router()

router.use(authenticate)

router.get('/', ctrl.listBookings)
router.get('/export', requireRole('ORGANISER', 'ADMIN'), ctrl.exportBookings)
router.get('/:id', ctrl.getBooking)
router.post('/', validate(createBookingSchema), ctrl.createBooking)
router.patch('/:id/cancel', validate(cancelSchema), ctrl.cancelBooking)
router.patch('/:id/reschedule', validate(rescheduleSchema), ctrl.rescheduleBooking)
router.patch('/:id/confirm', requireRole('ORGANISER', 'ADMIN'), ctrl.confirmBooking)
router.patch('/:id/complete', requireRole('ORGANISER', 'ADMIN'), ctrl.completeBooking)
router.patch('/:id/no-show', requireRole('ORGANISER', 'ADMIN'), ctrl.noShowBooking)

export default router
