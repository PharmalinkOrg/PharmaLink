const express = require('express')

const {
  createMedicineRequest,
  getCustomerMedicineRequests,
  getCustomerMedicineRequestById,
  getPharmacyMedicineRequests,
  getMedicineRequestById,
  updateMedicineRequestStatus,
} = require('../controllers/medicineRequestController')

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
  requireRole('SUPER_ADMIN', 'PHARMACY_ADMIN'),
]

/* ============================================================
   CUSTOMER ROUTES
============================================================ */

router.post(
  '/',
  ...customerOnly,
  createMedicineRequest
)

router.get(
  '/',
  ...customerOnly,
  getCustomerMedicineRequests
)

/* ============================================================
   PHARMACY / SUPER ADMIN ROUTES
============================================================ */

router.get(
  '/pharmacy',
  ...pharmacyAdminOnly,
  getPharmacyMedicineRequests
)

router.patch(
  '/:requestId/status',
  ...pharmacyAdminOnly,
  updateMedicineRequestStatus
)

/*
 * Keep this pharmacy detail route separate from the customer
 * detail route because they use different ownership rules.
 */
router.get(
  '/pharmacy/:requestId',
  ...pharmacyAdminOnly,
  getMedicineRequestById
)

/* ============================================================
   CUSTOMER DETAIL
============================================================ */

router.get(
  '/:requestId',
  ...customerOnly,
  getCustomerMedicineRequestById
)

module.exports = router