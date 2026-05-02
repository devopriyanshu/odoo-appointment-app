import { Router } from 'express'
import * as ctrl from '../controllers/services.controller'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'

const router = Router()

router.get('/', ctrl.listPublished)
router.get('/categories', ctrl.listCategories)
router.get('/share/:token', ctrl.getByShareToken)
router.get('/mine', authenticate, ctrl.listMine)
router.get('/:id', ctrl.getService)
router.post('/', authenticate, requireRole('ORGANISER', 'ADMIN'), ctrl.createService)
router.patch('/:id', authenticate, requireRole('ORGANISER', 'ADMIN'), ctrl.updateService)
router.delete('/:id', authenticate, requireRole('ORGANISER', 'ADMIN'), ctrl.deleteService)
router.patch('/:id/publish', authenticate, requireRole('ORGANISER', 'ADMIN'), ctrl.togglePublish)
router.post('/:id/resources', authenticate, requireRole('ORGANISER', 'ADMIN'), ctrl.addResource)
router.delete('/:id/resources/:resourceId', authenticate, requireRole('ORGANISER', 'ADMIN'), ctrl.removeResource)
router.post('/:id/working-hours', authenticate, requireRole('ORGANISER', 'ADMIN'), ctrl.setWorkingHours)
router.post('/:id/flexible-slots', authenticate, requireRole('ORGANISER', 'ADMIN'), ctrl.addFlexibleSlots)
router.post('/:id/questions', authenticate, requireRole('ORGANISER', 'ADMIN'), ctrl.addQuestion)
router.delete('/:id/questions/:qid', authenticate, requireRole('ORGANISER', 'ADMIN'), ctrl.removeQuestion)
router.patch('/:id/questions/:qid', authenticate, requireRole('ORGANISER', 'ADMIN'), ctrl.updateQuestion)

export default router
