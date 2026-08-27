const express = require('express')

const {
  getAvailableMedicines,
} = require('../controllers/customerInventoryController')

const router = express.Router()

/**
 * GET customer-visible medicines for a pharmacy
 *
 * No authentication required.
 */
router.get(
  '/:pharmacyId/available-medicines',
  getAvailableMedicines
)

module.exports = router