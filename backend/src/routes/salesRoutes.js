const express = require('express')

const {
  createSale,
  getPharmacySales,
  getSaleById,
  getSalesSummary,
} = require('../controllers/salesController')

const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')
const requireRole = require('../middleware/roleMiddleware')

const router = express.Router()

// All sales routes require a logged-in pharmacy admin
router.use(
  authenticateUser,
  loadPharmaUser,
  requireRole('PHARMACY_ADMIN'),
)

// Summary (must be before /:saleId to avoid route collision)
router.get('/summary', getSalesSummary)

// List all sales for the pharmacy
router.get('/pharmacy', getPharmacySales)

// Get one sale
router.get('/:saleId', getSaleById)

// Record a new sale
router.post('/', createSale)

module.exports = router