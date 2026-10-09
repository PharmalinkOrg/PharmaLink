// File: superadmin-web/src/services/medicineService.js
//
// Global medicine catalog (Super Admin).
//
// medicines.pharmacy_id IS NULL -> global catalog medicine
// medicines.pharmacy_id = X      -> medicine added by pharmacy X
// Archived = status 'INACTIVE'.
//
// Endpoints:
//   GET    /api/superadmin/medicines?include_archived=true
//   POST   /api/superadmin/medicines
//   PATCH  /api/superadmin/medicines/:id
//   PATCH  /api/superadmin/medicines/:id/archive   { archived, reason }
//
//   GET    /api/superadmin/medicine-categories
//   POST   /api/superadmin/medicine-categories
//   PATCH  /api/superadmin/medicine-categories/:id
//   DELETE /api/superadmin/medicine-categories/:id

import { apiRequest } from './apiClient'

export const DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Suspension',
  'Drops',
  'Injection',
  'Cream',
  'Ointment',
  'Gel',
  'Inhaler',
  'Nebule',
  'Powder',
  'Suppository',
  'Patch',
  'Other',
]

/* ============================================================
   NORMALIZERS

   The UI works with one shape; these map the database columns
   (and a few common alternatives) onto it.
============================================================ */

const toBoolean = (value) =>
  value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true'

export function normalizeMedicine(raw = {}) {
  const status = String(raw.status || '').toUpperCase()

  return {
    id: raw.medicine_id ?? raw.id,
    genericName: raw.generic_name ?? raw.name ?? '',
    brandName: raw.brand_name ?? '',
    dosage: raw.dosage ?? raw.strength ?? '',
    form: raw.dosage_form ?? raw.form ?? '',
    categoryId: raw.category_id ?? raw.category?.category_id ?? raw.category?.id ?? null,
    categoryName: raw.category_name ?? raw.category?.name ?? '',
    requiresPrescription: toBoolean(
      raw.requires_prescription ?? raw.prescription_required ?? raw.is_prescription_required
    ),
    description: raw.description ?? '',
    isArchived:
      toBoolean(raw.is_archived) || status === 'INACTIVE' || status === 'ARCHIVED',
    pharmacyId: raw.pharmacy_id ?? null,
    pharmacyName: raw.pharmacy_name ?? '',
    isCatalog: raw.is_catalog ?? (raw.pharmacy_id === null || raw.pharmacy_id === undefined),
    // null = the server couldn't count inventory listings
    pharmacyCount:
      raw.pharmacy_count === null || raw.pharmacy_count === undefined
        ? null
        : Number(raw.pharmacy_count) || 0,
    createdAt: raw.created_at ?? null,
    updatedAt: raw.updated_at ?? null,
  }
}

export function normalizeCategory(raw = {}) {
  return {
    id: raw.category_id ?? raw.id,
    name: raw.name ?? raw.category_name ?? '',
    description: raw.description ?? '',
    medicineCount: Number(raw.medicine_count ?? raw.medicines_count ?? 0) || 0,
  }
}

function toMedicinePayload(medicine) {
  return {
    generic_name: medicine.genericName.trim(),
    brand_name: medicine.brandName.trim() || null,
    dosage: medicine.dosage.trim(),
    dosage_form: medicine.form,
    category_id: medicine.categoryId ? Number(medicine.categoryId) : null,
    requires_prescription: Boolean(medicine.requiresPrescription),
    description: medicine.description.trim() || null,
  }
}

/* ============================================================
   MEDICINES
============================================================ */

export async function getMedicines() {
  const result = await apiRequest('/superadmin/medicines', {
    query: { include_archived: true },
  })

  return (Array.isArray(result.data) ? result.data : []).map(normalizeMedicine)
}

export async function createMedicine(medicine) {
  const result = await apiRequest('/superadmin/medicines', {
    method: 'POST',
    body: toMedicinePayload(medicine),
  })

  return result.data ? normalizeMedicine(result.data) : null
}

export async function updateMedicine(medicineId, medicine) {
  const result = await apiRequest(`/superadmin/medicines/${medicineId}`, {
    method: 'PATCH',
    body: toMedicinePayload(medicine),
  })

  return result.data ? normalizeMedicine(result.data) : null
}

export async function setMedicineArchived(medicineId, archived, reason = null) {
  const result = await apiRequest(`/superadmin/medicines/${medicineId}/archive`, {
    method: 'PATCH',
    body: { archived, reason },
  })

  return result.data ? normalizeMedicine(result.data) : null
}

/* ============================================================
   CATEGORIES
============================================================ */

export async function getMedicineCategories() {
  const result = await apiRequest('/superadmin/medicine-categories')
  return (Array.isArray(result.data) ? result.data : []).map(normalizeCategory)
}

export async function createMedicineCategory({ name, description }) {
  const result = await apiRequest('/superadmin/medicine-categories', {
    method: 'POST',
    body: { name: name.trim(), description: description.trim() || null },
  })

  return result.data ? normalizeCategory(result.data) : null
}

export async function updateMedicineCategory(categoryId, { name, description }) {
  const result = await apiRequest(`/superadmin/medicine-categories/${categoryId}`, {
    method: 'PATCH',
    body: { name: name.trim(), description: description.trim() || null },
  })

  return result.data ? normalizeCategory(result.data) : null
}

export async function deleteMedicineCategory(categoryId) {
  await apiRequest(`/superadmin/medicine-categories/${categoryId}`, {
    method: 'DELETE',
  })
}
