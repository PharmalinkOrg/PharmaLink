const express = require('express')

const {
  getPharmacyInventory,
  getPublicPharmacyInventory,
  createInventory,
  updateInventory,
  deleteInventory,
} = require('../controllers/inventoryController')

const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')
const requireRole = require('../middleware/roleMiddleware')
const pharmacyAccess = require('../middleware/pharmacyAccessMiddleware')

const router = express.Router()

/**
 * GET publicly available medicines for a pharmacy
 * GET /api/pharmacies/:pharmacyId/inventory/public
 */
router.get(
  '/:pharmacyId/inventory/public',
  getPublicPharmacyInventory
)

/**
 * GET inventory for a pharmacy
 *
 * SUPER_ADMIN:
 * Can view inventory for any pharmacy.
 *
 * PHARMACY_ADMIN:
 * Can view inventory for their own pharmacy.
 */
router.get(
  '/:pharmacyId/inventory',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN', 'PHARMACY_ADMIN'),
  pharmacyAccess,
  getPharmacyInventory
)

/**
 * CREATE inventory
 *
 * SUPER_ADMIN:
 * Can create inventory for any pharmacy.
 *
 * PHARMACY_ADMIN:
 * Can create inventory for their own pharmacy.
 */
router.post(
  '/:pharmacyId/inventory',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN', 'PHARMACY_ADMIN'),
  pharmacyAccess,
  createInventory
)

/**
 * UPDATE inventory
 *
 * SUPER_ADMIN:
 * Can update inventory for any pharmacy.
 *
 * PHARMACY_ADMIN:
 * Can update inventory for their own pharmacy.
 */
router.patch(
  '/:pharmacyId/inventory/:inventoryId',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN', 'PHARMACY_ADMIN'),
  pharmacyAccess,
  updateInventory
)

/**
 * DELETE inventory
 *
 * SUPER_ADMIN:
 * Can delete inventory for any pharmacy.
 *
 * PHARMACY_ADMIN:
 * Can delete inventory for their own pharmacy.
 */
router.delete(
  '/:pharmacyId/inventory/:inventoryId',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN', 'PHARMACY_ADMIN'),
  pharmacyAccess,
  deleteInventory
)

module.exports = router