const express = require('express')

const {
  chat,
  listConversations,
  getConversation,
  closeCustomerConversation,
} = require('../controllers/aiController')

const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')
const requireRole = require('../middleware/roleMiddleware')

const router = express.Router()

const customerOnly = [
  authenticateUser,
  loadPharmaUser,
  requireRole('CUSTOMER'),
]

router.post(
  '/chat',
  ...customerOnly,
  chat
)

router.get(
  '/conversations',
  ...customerOnly,
  listConversations
)

router.get(
  '/conversations/:conversationId',
  ...customerOnly,
  getConversation
)

router.patch(
  '/conversations/:conversationId/close',
  ...customerOnly,
  closeCustomerConversation
)

module.exports = router