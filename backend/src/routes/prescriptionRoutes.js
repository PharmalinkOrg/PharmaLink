const express = require('express')

const {
  createPrescription,
  getPharmacyPrescriptions,
  updatePrescriptionStatus,
  getPrescriptionUrl,
} = require('../controllers/prescriptionController')

const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')
const requireRole = require('../middleware/roleMiddleware')

const router = express.Router()

// Customer creates a prescription
router.post(
  '/',
  authenticateUser,
  loadPharmaUser,
  requireRole('CUSTOMER'),
  createPrescription
)

// Pharmacy admin views prescriptions for their pharmacy
router.get(
  '/pharmacy',
  authenticateUser,
  loadPharmaUser,
  requireRole('PHARMACY_ADMIN'),
  getPharmacyPrescriptions
)

// Pharmacy admin gets a signed URL to view the image
router.get(
  '/:prescriptionId/url',
  authenticateUser,
  loadPharmaUser,
  requireRole('PHARMACY_ADMIN'),
  getPrescriptionUrl
)

// Pharmacy admin verifies / rejects a prescription
router.patch(
  '/:prescriptionId/status',
  authenticateUser,
  loadPharmaUser,
  requireRole('PHARMACY_ADMIN'),
  updatePrescriptionStatus
)

module.exports = router