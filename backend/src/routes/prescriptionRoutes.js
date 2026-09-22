const express = require('express')

const {
  createPrescription,
  getCustomerPrescriptions,
  getCustomerPrescriptionById,
  getPharmacyPrescriptions,
  updatePrescriptionStatus,
  getPrescriptionUrl,
} = require('../controllers/prescriptionController')

const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')
const requireRole = require('../middleware/roleMiddleware')

const router = express.Router()

const customerOnly = [
  authenticateUser,
  loadPharmaUser,
  requireRole('CUSTOMER'),
]

const pharmacyAdminOnly = [
  authenticateUser,
  loadPharmaUser,
  requireRole('PHARMACY_ADMIN'),
]

/* ============================================================
   CUSTOMER ROUTES
============================================================ */

// Customer uploads a prescription
router.post(
  '/',
  ...customerOnly,
  createPrescription
)

// Customer views their own prescriptions
router.get(
  '/',
  ...customerOnly,
  getCustomerPrescriptions
)

/* ============================================================
   PHARMACY ADMIN ROUTES
============================================================ */

// Pharmacy admin views prescriptions for their pharmacy
router.get(
  '/pharmacy',
  ...pharmacyAdminOnly,
  getPharmacyPrescriptions
)

// Pharmacy admin gets temporary URL for prescription image
router.get(
  '/:prescriptionId/url',
  ...pharmacyAdminOnly,
  getPrescriptionUrl
)

// Pharmacy admin verifies/rejects prescription
router.patch(
  '/:prescriptionId/status',
  ...pharmacyAdminOnly,
  updatePrescriptionStatus
)

/* ============================================================
   CUSTOMER DETAIL ROUTE

   Keep this after the specific /pharmacy and /:id/url routes.
============================================================ */

// Customer views one of their own prescriptions
router.get(
  '/:prescriptionId',
  ...customerOnly,
  getCustomerPrescriptionById
)

module.exports = router