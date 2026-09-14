// File: backend/src/controllers/superadminController.js
// Description: Endpoints for superadmin dashboard (metrics, activity logs, pharmacies)

const {
  getMetrics,
  getActivityLogs,
  getAllPharmacies,
  logActivity
} = require('../services/superadminService');

/**
 * GET /api/superadmin/dashboard/metrics
 * Returns dashboard KPI metrics (just numbers)
 * Response: { totalPharmacies, activeUsers, pendingVerification, complaints }
 */
exports.getMetrics = async (req, res) => {
  try {
    const metrics = await getMetrics();

    res.status(200).json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('getMetrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics',
      message: error.message
    });
  }
};

/**
 * GET /api/superadmin/activity-logs?limit=10&offset=0
 * Returns paginated activity logs (pharmacy verification events from last 48 hours)
 * Response: { activities, pagination }
 */
exports.getActivityLogs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = parseInt(req.query.offset) || 0;

    const result = await getActivityLogs(limit, offset);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('getActivityLogs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs',
      message: error.message
    });
  }
};

/**
 * GET /api/superadmin/pharmacies
 * Returns all pharmacies in the system
 * Response: { pharmacies }
 */
exports.getPharmacies = async (req, res) => {
  try {
    const pharmacies = await getAllPharmacies();

    res.status(200).json({
      success: true,
      data: pharmacies,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('getPharmacies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pharmacies',
      message: error.message
    });
  }
};

/**
 * Helper: Log activity (used by other controllers)
 * Example:
 * superadminController.logActivity(
 *   userId,
 *   'pharmacy_verification_changed',
 *   { event_type: 'approved', pharmacy_id: pharmacyId }
 * )
 */
exports.logActivity = logActivity;