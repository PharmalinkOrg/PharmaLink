const express = require('express')

const {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notificationController')

const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')

const router = express.Router()

// Any logged-in user (customer or pharmacy admin) can read
// their own notifications, so there is no requireRole here.
router.use(authenticateUser, loadPharmaUser)

// Static paths MUST come before the '/:id' routes.
router.get('/', getMyNotifications)
router.get('/unread-count', getUnreadCount)
router.patch('/read-all', markAllAsRead)

router.patch('/:id/read', markAsRead)
router.delete('/:id', deleteNotification)

module.exports = router