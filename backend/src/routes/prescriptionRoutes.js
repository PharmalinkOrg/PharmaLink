const express = require('express')

const {
  createPrescription,
} = require('../controllers/prescriptionController')

const authenticateUser = require('../middleware/authMiddleware')
const requireRole = require('../middleware/roleMiddleware')

const router = express.Router()

router.post(
  '/',
  authenticateUser,
  requireRole('CUSTOMER'),
  createPrescription
)

module.exports = router