const express = require('express')

const {
  getPharmacyInventory,
  createInventory,
  updateInventory,
  deleteInventory,
} = require('../controllers/inventoryController')

const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')
const requireRole = require('../middleware/roleMiddleware')
const pharmacyAccess = require('../middleware/pharmacyAccessMiddleware')

const router = express.Router()

// GET inventory for a pharmacy
router.get(
  '/:pharmacyId/inventory',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN', 'PHARMACY_ADMIN'),
  pharmacyAccess,
  getPharmacyInventory
)

// CREATE inventory for a pharmacy
router.post(
  '/:pharmacyId/inventory',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN', 'PHARMACY_ADMIN'),
  pharmacyAccess,
  createInventory
)

router.patch(
  '/:pharmacyId/inventory/:inventoryId',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN', 'PHARMACY_ADMIN'),
  pharmacyAccess,
  updateInventory
)

router.delete(
  '/:pharmacyId/inventory/:inventoryId',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN', 'PHARMACY_ADMIN'),
  pharmacyAccess,
  deleteInventory
)

module.exports = router
