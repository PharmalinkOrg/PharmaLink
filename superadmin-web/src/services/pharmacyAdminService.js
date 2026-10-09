// File: superadmin-web/src/services/pharmacyAdminService.js

import { getAllSuperAdminUsers } from './userService'
import { createPharmacyAdmin as createPharmacyAdminRequest } from './pharmacyService'

export { updateUserStatus as updatePharmacyAdminStatus } from './userService'

const isPharmacyAdmin = (user) =>
  String(user?.role || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_') === 'PHARMACY_ADMIN'

/* ============================================================
   GET PHARMACY ADMINS

   GET /api/users/superadmin returns every user, so this loads
   them all and keeps only PHARMACY_ADMIN accounts.
============================================================ */

export async function getPharmacyAdmins() {
  const users = await getAllSuperAdminUsers({ role: 'PHARMACY_ADMIN' })
  return users.filter(isPharmacyAdmin)
}

/* ============================================================
   CREATE PHARMACY ADMIN

   POST /api/users/pharmacy-admin
============================================================ */

export async function createPharmacyAdmin(payload) {
  return createPharmacyAdminRequest(payload)
}
