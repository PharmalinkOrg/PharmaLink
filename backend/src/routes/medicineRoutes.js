const express = require('express')

const {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
} = require('../controllers/medicineController')

const router = express.Router()

const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')
const requireRole = require('../middleware/roleMiddleware')

router.get('/', getMedicines)
router.get('/:medicineId', getMedicineById)

router.post(
  '/',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN', 'PHARMACY_ADMIN'),
  createMedicine,
)

router.patch(
  '/:medicineId',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN', 'PHARMACY_ADMIN'),
  updateMedicine,
)

router.delete(
  '/:medicineId',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN', 'PHARMACY_ADMIN'),
  deleteMedicine,
)

module.exports = router