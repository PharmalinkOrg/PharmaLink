const express = require('express')

const {
  getCurrentUserProfile,
  createPharmacyAdmin,
  updateCurrentUserProfile,
  getSuperAdminUsers,
} = require('../controllers/userController')

const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')
const requireRole = require('../middleware/roleMiddleware')

const router = express.Router()

// Get currently logged-in user's profile
router.get(
  '/me/profile',
  authenticateUser,
  loadPharmaUser,
  getCurrentUserProfile
)

// Update currently logged-in user's profile
router.patch(
  '/me/profile',
  authenticateUser,
  loadPharmaUser,
  updateCurrentUserProfile
)

// Get users for Super Admin
// Only PHARMACY_ADMIN and CUSTOMER are returned by the controller
router.get(
  '/superadmin',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN'),
  getSuperAdminUsers
)

// Create a pharmacy admin
// Only SUPER_ADMIN can create pharmacy admins
router.post(
  '/pharmacy-admin',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN'),
  createPharmacyAdmin
)

module.exports = router