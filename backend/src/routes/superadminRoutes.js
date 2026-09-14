const express = require('express')
const router = express.Router()

const superadminController = require('../controllers/superadminController')
const authenticate = require('../middleware/authMiddleware')
const requireRole = require('../middleware/roleMiddleware')

router.use(authenticate)
router.use(requireRole('SUPER_ADMIN'))

router.get('/dashboard/metrics', superadminController.getMetrics)
router.get('/activity-logs', superadminController.getActivityLogs)
router.get('/pharmacies', superadminController.getPharmacies)

module.exports = router