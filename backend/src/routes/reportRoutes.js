const express = require('express')

const {
  createReport,
  getPharmacyReports,
  updateReportStatus,
} = require('../controllers/reportController')

const authenticateUser =
  require('../middleware/authMiddleware')

const loadPharmaUser =
  require('../middleware/userMiddleware')

const requireRole =
  require('../middleware/roleMiddleware')

const router = express.Router()

router.use(
  authenticateUser,
  loadPharmaUser,
)

router.post(
  '/',
  requireRole('CUSTOMER'),
  createReport,
)

// Pharmacy admin: reports about their own pharmacy
router.get(
  '/pharmacy',
  requireRole('PHARMACY_ADMIN', 'PHARMACY_STAFF'),
  getPharmacyReports,
)

router.patch(
  '/:reportId/status',
  requireRole('PHARMACY_ADMIN', 'PHARMACY_STAFF'),
  updateReportStatus,
)

module.exports = router