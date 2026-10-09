const express = require('express')
const router = express.Router()

const superadminController = require('../controllers/superadminController')
const accountController = require('../controllers/superadminAccountController')
const catalogController = require('../controllers/superadminCatalogController')
const reportsController = require('../controllers/superadminReportsController')

const authenticate = require('../middleware/authMiddleware')
const requireRole = require('../middleware/roleMiddleware')

// authMiddleware sets req.authUser and req.pharmaUser.
router.use(authenticate)
router.use(requireRole('SUPER_ADMIN'))

/* Existing */
router.get('/dashboard/metrics', superadminController.getMetrics)
router.get('/activity-logs', superadminController.getActivityLogs)
router.get('/pharmacies', superadminController.getPharmacies)

/* Pharmacy approval & activation */
router.patch('/pharmacies/:id/status', accountController.updatePharmacyStatus)

/* User account management */
router.patch('/users/:id/status', accountController.updateUserStatus)

/* Global medicine catalog */
router.get('/medicines', catalogController.getCatalogMedicines)
router.post('/medicines', catalogController.createCatalogMedicine)
router.patch('/medicines/:id/archive', catalogController.setMedicineArchived)
router.patch('/medicines/:id', catalogController.updateCatalogMedicine)

router.get('/medicine-categories', catalogController.getCategories)
router.post('/medicine-categories', catalogController.createCategory)
router.patch('/medicine-categories/:id', catalogController.updateCategory)
router.delete('/medicine-categories/:id', catalogController.deleteCategory)

/* Reports */
router.get('/reports/summary', reportsController.getReportSummary)

module.exports = router
