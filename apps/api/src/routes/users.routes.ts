import { Router } from 'express'
import * as usersController from '../controllers/users.controller'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'

const router = Router()

router.use(authenticate)

router.get('/', requireRole('ADMIN', 'ORGANISER'), usersController.listUsers)
router.get('/customers', requireRole('ADMIN', 'ORGANISER'), usersController.listCustomers)
router.get('/:id', usersController.getUser)
router.patch('/:id', usersController.updateUser)
router.delete('/:id', requireRole('ADMIN'), usersController.deleteUser)
router.patch('/:id/role', requireRole('ADMIN'), usersController.changeRole)

export default router
