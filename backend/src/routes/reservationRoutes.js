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

// Customer creates reservation
router.post(
  '/',
  authenticateUser,
  loadPharmaUser,
  requireRole('CUSTOMER'),
  createReservation
)

module.exports = router