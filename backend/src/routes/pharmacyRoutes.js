const express = require('express')

const {
  getPharmacies,
  getPharmacyById,
  createPharmacy,
  updatePharmacy,
} = require('../controllers/pharmacyController')

const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')
const requireRole = require('../middleware/roleMiddleware')

const router = express.Router()

router.get('/', getPharmacies)

router.get('/:id', getPharmacyById)

router.post(
  '/',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN'),
  createPharmacy
)

// UPDATE a pharmacy
router.patch(
  '/:id',
  authenticateUser,
  loadPharmaUser,
  requireRole('SUPER_ADMIN'),
  updatePharmacy
)

module.exports = router