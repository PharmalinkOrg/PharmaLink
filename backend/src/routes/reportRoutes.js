const express = require('express')

const {
  createReport,
} = require('../controllers/reportController')

const authenticateUser =
  require('../middleware/authMiddleware')

const loadPharmaUser =
  require('../middleware/userMiddleware')

const requireRole =
  require('../middleware/roleMiddleware')

const router = express.Router()

router.use(
  authenticateUser,
  loadPharmaUser,
)

router.post(
  '/',
  requireRole('CUSTOMER'),
  createReport,
)

module.exports = router