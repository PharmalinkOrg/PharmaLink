const express = require('express')
const { createReservation } = require('../controllers/reservationController')
const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')
const requireRole = require('../middleware/roleMiddleware')

const router = express.Router()

/**
 * Create customer reservation
 * POST /api/reservations
 *
 * Authentication flow:
 * authenticateUser
 *      ↓
 * loadPharmaUser
 *      ↓
 * requireRole('CUSTOMER')
 *      ↓
 * createReservation
 */
router.post(
  '/',
  authenticateUser,
  loadPharmaUser,
  requireRole('CUSTOMER'),
  createReservation
)

module.exports = router