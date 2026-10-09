// File: backend/controllers/superadminAccountController.js
//
// Super Admin account management:
//   PATCH /api/superadmin/pharmacies/:id/status
//   PATCH /api/superadmin/users/:id/status

const supabaseAdmin = require('../config/supabaseAdmin')
const { logActivity } = require('../services/auditLogService')
const { createNotifications } = require('../services/notificationService')

/* ============================================================
   HELPERS
============================================================ */

const isValidId = (value) => {
  const number = Number(value)
  return Number.isInteger(number) && number > 0
}

const REASON_MIN_LENGTH = 5
const REASON_MAX_LENGTH = 500

/**
 * Returns { reason } or { error } for the optional/required reason.
 */
function readReason(rawReason, required) {
  const reason = typeof rawReason === 'string' ? rawReason.trim() : ''

  if (required && reason.length < REASON_MIN_LENGTH) {
    return { error: `Please provide a reason (at least ${REASON_MIN_LENGTH} characters).` }
  }

  if (reason.length > REASON_MAX_LENGTH) {
    return { error: `Reason cannot exceed ${REASON_MAX_LENGTH} characters.` }
  }

  return { reason: reason || null }
}

const fullName = (user) =>
  [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'User'

/**
 * Database rejected the new status value (CHECK constraint or
 * enum). Happens until sql/001_superadmin_features.sql is run.
 */
const isStatusValueError = (error) =>
  error?.code === '23514' || error?.code === '22P02'

/* ============================================================
   PHARMACY STATUS
============================================================ */

const PHARMACY_TRANSITIONS = {
  PENDING: ['ACTIVE', 'REJECTED'],
  ACTIVE: ['INACTIVE', 'SUSPENDED'],
  INACTIVE: ['ACTIVE'],
  SUSPENDED: ['ACTIVE'],
  REJECTED: ['ACTIVE'],
}

const PHARMACY_REASON_REQUIRED = ['INACTIVE', 'SUSPENDED', 'REJECTED']

function describePharmacyChange(fromStatus, toStatus) {
  if (fromStatus === 'PENDING' && toStatus === 'ACTIVE') {
    return { action: 'PHARMACY_APPROVED', verb: 'approved' }
  }

  if (toStatus === 'REJECTED') {
    return { action: 'PHARMACY_REJECTED', verb: 'rejected' }
  }

  if (toStatus === 'ACTIVE') {
    return { action: 'PHARMACY_ACTIVATED', verb: 'activated' }
  }

  return {
    action: 'PHARMACY_DEACTIVATED',
    verb: toStatus === 'SUSPENDED' ? 'suspended' : 'deactivated',
  }
}

/**
 * Tell the pharmacy's admins about the change. Never throws.
 */
async function notifyPharmacyAdmins(pharmacy, { title, message, status }) {
  try {
    const { data: admins, error } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .eq('pharmacy_id', pharmacy.pharmacy_id)
      .in('role', ['PHARMACY_ADMIN', 'PHARMACY_STAFF'])
      .eq('status', 'ACTIVE')

    if (error) {
      console.warn('Pharmacy admin lookup for notification failed:', error.message)
      return
    }

    const userIds = (admins || []).map((admin) => Number(admin.user_id)).filter(isValidId)

    if (userIds.length === 0) {
      return
    }

    await createNotifications({
      userIds,
      title,
      message,
      type: 'SYSTEM',
      referenceType: 'pharmacy',
      referenceId: pharmacy.pharmacy_id,
      metadata: { status },
    })
  } catch (error) {
    console.warn('Pharmacy status notification failed:', error.message)
  }
}

/**
 * PATCH /api/superadmin/pharmacies/:id/status
 * body: { status, reason }
 */
const updatePharmacyStatus = async (req, res) => {
  try {
    const pharmacyId = Number(req.params.id)

    if (!isValidId(pharmacyId)) {
      return res.status(400).json({ success: false, message: 'Invalid pharmacy ID' })
    }

    const nextStatus =
      typeof req.body?.status === 'string' ? req.body.status.trim().toUpperCase() : ''

    const allStatuses = Object.keys(PHARMACY_TRANSITIONS)

    if (!allStatuses.includes(nextStatus) || nextStatus === 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Status must be ACTIVE, INACTIVE, SUSPENDED or REJECTED',
      })
    }

    const { reason, error: reasonError } = readReason(
      req.body?.reason,
      PHARMACY_REASON_REQUIRED.includes(nextStatus)
    )

    if (reasonError) {
      return res.status(400).json({ success: false, message: reasonError })
    }

    /* Load pharmacy */

    const { data: pharmacy, error: findError } = await supabaseAdmin
      .from('pharmacies')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .maybeSingle()

    if (findError) {
      console.error('Pharmacy status lookup error:', findError)
      return res.status(500).json({ success: false, message: 'Failed to load pharmacy' })
    }

    if (!pharmacy) {
      return res.status(404).json({ success: false, message: 'Pharmacy not found' })
    }

    const currentStatus = String(pharmacy.status || '').toUpperCase()

    if (currentStatus === nextStatus) {
      return res.status(409).json({
        success: false,
        message: `This pharmacy is already ${nextStatus.toLowerCase()}.`,
      })
    }

    const allowed = PHARMACY_TRANSITIONS[currentStatus] || ['ACTIVE']

    if (!allowed.includes(nextStatus)) {
      return res.status(409).json({
        success: false,
        message: `A ${currentStatus.toLowerCase() || 'unknown'} pharmacy cannot be changed to ${nextStatus.toLowerCase()}.`,
      })
    }

    /* Update */

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('pharmacies')
      .update({ status: nextStatus })
      .eq('pharmacy_id', pharmacyId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Pharmacy status update error:', updateError)

      if (isStatusValueError(updateError)) {
        return res.status(400).json({
          success: false,
          message: `The database does not accept the status ${nextStatus} yet. Run sql/001_superadmin_features.sql in Supabase.`,
        })
      }

      return res.status(500).json({ success: false, message: 'Failed to update pharmacy status' })
    }

    /* Audit + notify */

    const { action, verb } = describePharmacyChange(currentStatus, nextStatus)

    await logActivity(req, {
      action,
      entityType: 'pharmacy',
      entityId: pharmacyId,
      pharmacyId,
      description: `${verb.charAt(0).toUpperCase() + verb.slice(1)} pharmacy "${pharmacy.name}"${reason ? `. Reason: ${reason}` : ''}`,
      metadata: { from: currentStatus, to: nextStatus, reason },
    })

    await notifyPharmacyAdmins(updated, {
      status: nextStatus,
      title: nextStatus === 'ACTIVE' ? 'Your pharmacy is active' : `Your pharmacy was ${verb}`,
      message:
        nextStatus === 'ACTIVE'
          ? `${pharmacy.name} is now active on PharmaLink and visible to customers.`
          : `${pharmacy.name} was ${verb} by PharmaLink.${reason ? ` Reason: ${reason}` : ''} Contact the PharmaLink team for help.`,
    })

    return res.status(200).json({
      success: true,
      message: `Pharmacy ${verb} successfully`,
      data: updated,
    })
  } catch (error) {
    console.error('Update pharmacy status server error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/* ============================================================
   USER ACCOUNT STATUS
============================================================ */

const USER_STATUSES = ['ACTIVE', 'INACTIVE']
const MANAGEABLE_ROLES = ['CUSTOMER', 'PHARMACY_ADMIN', 'PHARMACY_STAFF']

const USER_COLUMNS =
  'user_id, pharmacy_id, role, first_name, last_name, email, phone, status, created_at, updated_at, last_login_at'

/**
 * PATCH /api/superadmin/users/:id/status
 * body: { status: 'ACTIVE' | 'INACTIVE', reason }
 */
const updateUserStatus = async (req, res) => {
  try {
    const userId = Number(req.params.id)

    if (!isValidId(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' })
    }

    const nextStatus =
      typeof req.body?.status === 'string' ? req.body.status.trim().toUpperCase() : ''

    if (!USER_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' })
    }

    const { reason, error: reasonError } = readReason(req.body?.reason, nextStatus === 'INACTIVE')

    if (reasonError) {
      return res.status(400).json({ success: false, message: reasonError })
    }

    if (Number(req.pharmaUser?.user_id) === userId) {
      return res.status(403).json({
        success: false,
        message: 'You cannot change the status of your own account.',
      })
    }

    const { data: user, error: findError } = await supabaseAdmin
      .from('users')
      .select(USER_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle()

    if (findError) {
      console.error('User status lookup error:', findError)
      return res.status(500).json({ success: false, message: 'Failed to load user' })
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (!MANAGEABLE_ROLES.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Super Admin accounts cannot be changed from this page.',
      })
    }

    if (String(user.status || '').toUpperCase() === nextStatus) {
      return res.status(409).json({
        success: false,
        message: `This account is already ${nextStatus.toLowerCase()}.`,
      })
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ status: nextStatus })
      .eq('user_id', userId)
      .select(USER_COLUMNS)
      .single()

    if (updateError) {
      console.error('User status update error:', updateError)

      if (isStatusValueError(updateError)) {
        return res.status(400).json({
          success: false,
          message: `The database does not accept the status ${nextStatus} for users.`,
        })
      }

      return res.status(500).json({ success: false, message: 'Failed to update account status' })
    }

    const verb = nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'

    await logActivity(req, {
      action: nextStatus === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'user',
      entityId: userId,
      pharmacyId: user.pharmacy_id ?? null,
      description: `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${user.role.toLowerCase().replace(/_/g, ' ')} account "${fullName(user)}"${reason ? `. Reason: ${reason}` : ''}`,
      metadata: {
        from: user.status,
        to: nextStatus,
        role: user.role,
        email: user.email,
        reason,
      },
    })

    return res.status(200).json({
      success: true,
      message: `Account ${verb} successfully`,
      data: updated,
    })
  } catch (error) {
    console.error('Update user status server error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  updatePharmacyStatus,
  updateUserStatus,
}
