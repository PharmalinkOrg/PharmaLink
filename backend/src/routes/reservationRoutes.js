const express = require('express')

const {
  createReservation,
  getCustomerReservations,
  getReservationById,
  getPharmacyReservations,
  updateReservationStatus,
} = require('../controllers/reservationController')

const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')
const requireRole = require('../middleware/roleMiddleware')

const router = express.Router()

/**
 * Get customer's reservations
 * GET /api/reservations
 */
router.get(
  '/',
  authenticateUser,
  loadPharmaUser,
  requireRole('CUSTOMER'),
  getCustomerReservations
)

/**
 * Get reservations for the authenticated pharmacy
 * GET /api/reservations/pharmacy
 */
router.get(
  '/pharmacy',
  authenticateUser,
  loadPharmaUser,
  requireRole('PHARMACY_ADMIN'),
  getPharmacyReservations
)

router.patch(
  '/:reservationId/status',
  authenticateUser,
  loadPharmaUser,
  requireRole('PHARMACY_ADMIN'),
  updateReservationStatus
)

router.get(
  '/:reservationId',
  authenticateUser,
  loadPharmaUser,
  requireRole('CUSTOMER'),
  getReservationById
)

/**
 * Create customer reservation
 * POST /api/reservations
 */
router.post(
  '/',
  authenticateUser,
  loadPharmaUser,
  requireRole('CUSTOMER'),
  createReservation
)

module.exports = router
