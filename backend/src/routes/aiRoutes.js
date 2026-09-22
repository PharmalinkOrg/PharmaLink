const express = require('express')

const { chat } = require('../controllers/aiController')

const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')
const requireRole = require('../middleware/roleMiddleware')

const router = express.Router()

// POST /api/ai/chat
router.post(
  '/chat',
  authenticateUser,
  loadPharmaUser,
  requireRole('CUSTOMER'),
  chat
)

module.exports = router