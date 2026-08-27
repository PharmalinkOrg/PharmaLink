const express = require('express')

const {
  createReservation,
  getCustomerReservations,
  getReservationById,
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
 * Get customer's reservation by ID
 * GET /api/reservations/:reservationId
 */
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