const express = require('express')

const {
  getPharmacyMedicineRequests,
  getMedicineRequestById,
  updateMedicineRequestStatus,
} = require('../controllers/medicineRequestController')

const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')
const requireRole = require('../middleware/roleMiddleware')

const router = express.Router()

router.get(
  '/pharmacy',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN', 'PHARMACY_ADMIN', 'PHARMACY_STAFF'),
  getPharmacyMedicineRequests,
)

router.get(
  '/:requestId',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN', 'PHARMACY_ADMIN', 'PHARMACY_STAFF'),
  getMedicineRequestById,
)

router.patch(
  '/:requestId/status',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN', 'PHARMACY_ADMIN', 'PHARMACY_STAFF'),
  updateMedicineRequestStatus,
)

module.exports = router