const express = require('express')

const {
  createMedicineRequest,
  getCustomerMedicineRequests,
  getCustomerMedicineRequestById,
  cancelMedicineRequest,

  getPharmacyMedicineRequests,
  getMedicineRequestById,
  respondToMedicineRequest,

  updateMedicineRequestStatus,
} = require('../controllers/medicineRequestController')

const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')
const requireRole = require('../middleware/roleMiddleware')

const router = express.Router()

// ============================================================
// AUTH MIDDLEWARE GROUPS
// ============================================================

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

const pharmacyOrSuperAdmin = [
  authenticateUser,
  loadPharmaUser,
  requireRole(
    'SUPER_ADMIN',
    'PHARMACY_ADMIN'
  ),
]

const superAdminOnly = [
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN'),
]

// ============================================================
// CUSTOMER ROUTES
// ============================================================

/**
 * Create broadcast medicine request.
 *
 * POST /api/medicine-requests
 */
router.post(
  '/',
  ...customerOnly,
  createMedicineRequest
)

/**
 * Get authenticated customer's requests.
 *
 * GET /api/medicine-requests
 */
router.get(
  '/',
  ...customerOnly,
  getCustomerMedicineRequests
)

/**
 * Cancel customer's open request.
 *
 * PATCH /api/medicine-requests/:requestId/cancel
 */
router.patch(
  '/:requestId/cancel',
  ...customerOnly,
  cancelMedicineRequest
)

// ============================================================
// PHARMACY ROUTES
// ============================================================

/**
 * Pharmacy Admin:
 *   sees OPEN broadcast requests plus requests
 *   previously responded to.
 *
 * Super Admin:
 *   sees all requests.
 *
 * GET /api/medicine-requests/pharmacy
 */
router.get(
  '/pharmacy',
  ...pharmacyOrSuperAdmin,
  getPharmacyMedicineRequests
)

/**
 * Get pharmacy-side request details.
 *
 * GET /api/medicine-requests/pharmacy/:requestId
 */
router.get(
  '/pharmacy/:requestId',
  ...pharmacyOrSuperAdmin,
  getMedicineRequestById
)

/**
 * Pharmacy responds to a customer request.
 *
 * POST /api/medicine-requests/:requestId/respond
 */
router.post(
  '/:requestId/respond',
  ...pharmacyAdminOnly,
  respondToMedicineRequest
)

// ============================================================
// SUPER ADMIN ROUTES
// ============================================================

/**
 * Directly change the overall request lifecycle.
 *
 * PATCH /api/medicine-requests/:requestId/status
 *
 * Pharmacy Admins DO NOT use this route.
 * Their AVAILABLE / PARTIALLY_AVAILABLE / UNAVAILABLE
 * state belongs to medicine_request_responses.
 */
router.patch(
  '/:requestId/status',
  ...superAdminOnly,
  updateMedicineRequestStatus
)

// ============================================================
// CUSTOMER DETAIL
// ============================================================
//
// Keep the generic /:requestId route LAST.
// Otherwise it can interfere with more specific paths.
// ============================================================

router.get(
  '/:requestId',
  ...customerOnly,
  getCustomerMedicineRequestById
)

module.exports = router