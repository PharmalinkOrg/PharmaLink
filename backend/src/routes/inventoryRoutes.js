const express = require('express')

const {
  getPharmacyInventory,
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

module.exports = router