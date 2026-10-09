// File: backend/services/auditLogService.js
//
// Records Super Admin actions in the audit_logs table — the same
// table superadminService.getActivityLogs reads for the Audit Logs
// page and the dashboard's recent activity.
//
// (superadminService.logActivity writes to a different table,
// activity_logs, which nothing currently displays.)
//
// logActivity() never throws: a failed log write is reported in
// the server console but never cancels the action itself.

const supabaseAdmin = require('../config/supabaseAdmin')

const AUDIT_LOG_TABLE = 'audit_logs'
const MAX_DESCRIPTION_LENGTH = 1000

/**
 * @param {object} req  Express request (actor = req.pharmaUser)
 * @param {object} entry
 * @param {string} entry.action       e.g. 'PHARMACY_APPROVED'
 * @param {string} [entry.entityType] e.g. 'pharmacy', 'user', 'medicine'
 * @param {number} [entry.entityId]
 * @param {number} [entry.pharmacyId] pharmacy the action relates to
 * @param {string} [entry.description] human-readable summary (shown on the page)
 * @param {object} [entry.metadata]   extra details (reason, before/after)
 */
async function logActivity(
  req,
  {
    action,
    entityType = null,
    entityId = null,
    pharmacyId = null,
    description = null,
    metadata = null,
  } = {}
) {
  if (!action) {
    return
  }

  const row = {
    user_id: req?.pharmaUser?.user_id ?? null,
    pharmacy_id: pharmacyId ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    description: description ? String(description).slice(0, MAX_DESCRIPTION_LENGTH) : null,
  }

  try {
    let { error } = await supabaseAdmin
      .from(AUDIT_LOG_TABLE)
      .insert(metadata ? { ...row, metadata } : row)

    // PGRST204 = the metadata column doesn't exist yet (added by
    // sql/001_superadmin_features.sql). Save the entry without it.
    if (error?.code === 'PGRST204' && metadata) {
      ;({ error } = await supabaseAdmin.from(AUDIT_LOG_TABLE).insert(row))
    }

    if (error) {
      console.warn(`Audit log write failed (${action}):`, error.message)
    }
  } catch (error) {
    console.warn(`Audit log write failed (${action}):`, error.message)
  }
}

module.exports = {
  AUDIT_LOG_TABLE,
  logActivity,
}
