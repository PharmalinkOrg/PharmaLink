const express = require('express')

const { login, customerLogin, registerCustomer, getCurrentUser } = require('../controllers/authController')
const authenticateUser = require('../middleware/authMiddleware')
const loadPharmaUser = require('../middleware/userMiddleware')

const router = express.Router()

// POST /api/auth/login
router.post('/login', login)
router.post('/customer-login', customerLogin)
router.post('/register', registerCustomer)
router.get('/register', (req, res) => {
	res.status(405).json({
		success: false,
		message: 'Use POST /api/auth/register with first_name, last_name, email, and password to create a customer account',
	})
})
router.get('/me', authenticateUser, loadPharmaUser, getCurrentUser)

module.exports = router
