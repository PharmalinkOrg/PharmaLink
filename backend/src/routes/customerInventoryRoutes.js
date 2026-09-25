const express = require('express')

const {
  getAvailableMedicines,
  getCustomerMedicines,
  getMedicinePharmacies,
} = require('../controllers/customerInventoryController')

const router = express.Router()

// All available medicines across pharmacies
router.get(
  '/available-medicines',
  getCustomerMedicines
)

// Pharmacies carrying a medicine
router.get(
  '/medicine/:medicineId/pharmacies',
  getMedicinePharmacies
)

// Available medicines from one pharmacy
router.get(
  '/:pharmacyId/available-medicines',
  getAvailableMedicines
)

module.exports = router