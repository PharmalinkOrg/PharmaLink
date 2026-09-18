const express = require('express')

const {
  createReservation,
  getCustomerReservations,
  getReservationById,
  getPharmacyReservations,
  updateReservationStatus,
  completeReservationWithSale,
  cancelReservation,
} = require('../controllers/reservationController')

const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')
const requireRole = require('../middleware/roleMiddleware')

const router = express.Router()
// Customer reservations
router.get(
  '/',
  authenticateUser,
  loadPharmaUser,
  requireRole('CUSTOMER'),
  getCustomerReservations
)

// Pharmacy reservations
router.get(
  '/pharmacy',
  authenticateUser,
  loadPharmaUser,
  requireRole('PHARMACY_ADMIN'),
  getPharmacyReservations
)

// Complete a confirmed reservation and record its sale atomically
router.post(
  '/:reservationId/complete',
  authenticateUser,
  loadPharmaUser,
  requireRole('PHARMACY_ADMIN'),
  completeReservationWithSale
)

// Pharmacy reservation status update
router.patch(
  '/:reservationId/status',
  authenticateUser,
  loadPharmaUser,
  requireRole('PHARMACY_ADMIN'),
  updateReservationStatus
)

// Customer reservation details
router.get(
  '/:reservationId',
  authenticateUser,
  loadPharmaUser,
  requireRole('CUSTOMER'),
  getReservationById
)

// Customer cancels reservation
router.patch(
  '/:reservationId/cancel',
  authenticateUser,
  loadPharmaUser,
  requireRole('CUSTOMER'),
  cancelReservation
)

// Customer creates reservation
router.post(
  '/',
  authenticateUser,
  loadPharmaUser,
  requireRole('CUSTOMER'),
  createReservation
)

module.exports = router