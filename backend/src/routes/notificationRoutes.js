const express = require('express')

const {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require('../controllers/notificationController')

// These middleware files use:
// module.exports = authenticateUser
// module.exports = loadPharmaUser
//
// Therefore, DO NOT destructure these imports.
const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')

const router = express.Router()

/**
 * Every notification endpoint requires:
 *
 * 1. Valid Supabase authentication
 * 2. Corresponding PharmaLink users row
 */
router.use(
  authenticateUser,
  loadPharmaUser
)

/**
 * IMPORTANT:
 * Static routes must come before
 * /:notificationId/read.
 */

router.get(
  '/',
  getMyNotifications
)

router.get(
  '/unread-count',
  getUnreadCount
)

router.patch(
  '/read-all',
  markAllNotificationsAsRead
)

router.patch(
  '/:notificationId/read',
  markNotificationAsRead
)

module.exports = router