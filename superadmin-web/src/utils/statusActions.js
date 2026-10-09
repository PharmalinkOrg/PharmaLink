// File: superadmin-web/src/utils/statusActions.js
//
// Which status actions are available for pharmacies and user
// accounts, and how each one is presented in the confirm dialog.

export const normalizeStatus = (status) =>
  String(status || '').trim().toUpperCase()

/* ============================================================
   PHARMACIES
============================================================ */

export const PHARMACY_ACTIONS = {
  approve: {
    label: 'Approve',
    nextStatus: 'ACTIVE',
    tone: 'success',
    reasonMode: 'optional',
    title: (name) => `Approve ${name}?`,
    message:
      'The pharmacy becomes visible to customers, and its pharmacy admins can start managing inventory and reservations.',
    confirmLabel: 'Approve Pharmacy',
    notice: (name) => `${name} was approved.`,
  },

  reject: {
    label: 'Reject',
    nextStatus: 'REJECTED',
    tone: 'danger',
    reasonMode: 'required',
    title: (name) => `Reject ${name}?`,
    message:
      'The pharmacy will not be listed. You can activate it later if the issue is resolved.',
    confirmLabel: 'Reject Pharmacy',
    reasonPlaceholder: 'e.g. Incomplete FDA license, address could not be verified...',
    notice: (name) => `${name} was rejected.`,
  },

  deactivate: {
    label: 'Deactivate',
    nextStatus: 'INACTIVE',
    tone: 'danger',
    reasonMode: 'required',
    title: (name) => `Deactivate ${name}?`,
    message:
      'Customers will no longer see this pharmacy or reserve its medicines. Existing records are kept, and you can reactivate it at any time.',
    confirmLabel: 'Deactivate Pharmacy',
    reasonPlaceholder: 'e.g. Pharmacy closed, license expired, partner request...',
    notice: (name) => `${name} was deactivated.`,
  },

  activate: {
    label: 'Activate',
    nextStatus: 'ACTIVE',
    tone: 'success',
    reasonMode: 'optional',
    title: (name) => `Activate ${name}?`,
    message:
      'The pharmacy becomes visible to customers again and can accept reservations.',
    confirmLabel: 'Activate Pharmacy',
    notice: (name) => `${name} was activated.`,
  },
}

export function getPharmacyActions(status) {
  switch (normalizeStatus(status)) {
    case 'PENDING':
      return ['approve', 'reject']
    case 'ACTIVE':
      return ['deactivate']
    default:
      // INACTIVE, SUSPENDED, REJECTED, unknown
      return ['activate']
  }
}

/* ============================================================
   USER ACCOUNTS
============================================================ */

export const USER_ACTIONS = {
  deactivate: {
    label: 'Deactivate',
    nextStatus: 'INACTIVE',
    tone: 'danger',
    reasonMode: 'required',
    title: (name) => `Deactivate ${name}'s account?`,
    message:
      'They will be signed out and will not be able to sign in until the account is reactivated. Their records and history are kept.',
    confirmLabel: 'Deactivate Account',
    reasonPlaceholder: 'e.g. Left the pharmacy, suspicious activity, user request...',
    notice: (name) => `${name}'s account was deactivated.`,
  },

  activate: {
    label: 'Activate',
    nextStatus: 'ACTIVE',
    tone: 'success',
    reasonMode: 'optional',
    title: (name) => `Activate ${name}'s account?`,
    message: 'They will be able to sign in again.',
    confirmLabel: 'Activate Account',
    notice: (name) => `${name}'s account was activated.`,
  },
}

export function getUserActions(user, currentUser) {
  const role = normalizeStatus(user?.role).replace(/[\s-]+/g, '_')

  // Super Admin accounts are not managed from this portal, and an
  // admin can never lock themselves out.
  if (role === 'SUPER_ADMIN') {
    return []
  }

  const userId = user?.user_id ?? user?.id
  const currentUserId = currentUser?.user_id ?? currentUser?.id

  if (currentUserId !== undefined && String(userId) === String(currentUserId)) {
    return []
  }

  return normalizeStatus(user?.status) === 'ACTIVE' ? ['deactivate'] : ['activate']
}
