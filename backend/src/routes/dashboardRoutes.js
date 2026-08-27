const express = require('express')

const {
  getPharmacyDashboard,
} = require('../controllers/dashboardController')

const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')
const requireRole = require('../middleware/roleMiddleware')
const pharmacyAccess = require('../middleware/pharmacyAccessMiddleware')

const router = express.Router()

router.get(
  '/:pharmacyId',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN', 'PHARMACY_ADMIN'),
  pharmacyAccess,
  getPharmacyDashboard,
)

module.exports = router