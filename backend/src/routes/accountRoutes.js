const express = require('express')
const multer = require('multer')

const { getMyAccount, updateMyAccount, uploadAvatar } = require('../controllers/accountController')
const authenticateUser = require('../middleware/authMiddleware')

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

router.get('/me', authenticateUser, getMyAccount)
router.patch('/me', authenticateUser, updateMyAccount)
router.post('/me/avatar', authenticateUser, upload.single('avatar'), uploadAvatar)

module.exports = router