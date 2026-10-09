# PharmaLink backend — Super Admin features

## Install

1. Copy these files into your backend (same folders). New files are added,
   changed files replace yours.
2. In Supabase → SQL Editor, run `sql/001_superadmin_features.sql`
   (safe to run more than once; nothing is deleted).
3. Restart the backend.

## New files

| File | Purpose |
|---|---|
| `controllers/superadminAccountController.js` | Approve / reject / activate / deactivate pharmacies; activate / deactivate user accounts |
| `controllers/superadminCatalogController.js` | Global medicine catalog + categories |
| `controllers/superadminReportsController.js` | `GET /api/superadmin/reports/summary` |
| `services/auditLogService.js` | `logActivity()` — writes Super Admin actions to `audit_logs`, the table the Audit Logs page reads |
| `utils/cebu.js` | Cebu bounding box check |
| `utils/fetchAll.js` | Loads more than Supabase's 1000-row limit |
| `sql/001_superadmin_features.sql` | Database changes |

## Changed files

| File | Change |
|---|---|
| `routes/superadminRoutes.js` | New routes |
| `routes/authRoutes.js` | `POST /api/auth/change-password` |
| `controllers/authController.js` | Sign-in uses a fresh client per request; `changePassword`; pharmacy admins can't sign in unless their pharmacy is ACTIVE |
| `controllers/userController.js` | Optional `page` / `limit` / `role` on `GET /api/users/superadmin`; audit entry when a pharmacy admin is created |
| `controllers/pharmacyController.js` | Uses the admin client (fixes queries running as the last signed-in user); public list shows ACTIVE pharmacies only; map pins must be inside Cebu (checked when the pin moves); audit entries on create / edit |
| `controllers/medicineController.js` | `GET /api/medicines?pharmacy_id=X` also returns catalog medicines (`is_catalog: true`; add `include_catalog=false` to exclude); pharmacies can't edit catalog medicines |
| `services/superadminService.js` | `getActivityLogs`: optional `days` window (default: all history, so "Load older logs" works); looks up users and pharmacies in 2 queries instead of 2 per log |
| `controllers/superadminController.js` | Passes the optional `?days=` to `getActivityLogs` |
| `controllers/inventoryController.js` | Pharmacies can stock their own or catalog medicines only (not another pharmacy's, not archived); customers don't see archived medicines or inactive pharmacies; fixes `pharmacy_name` → `name` in `getMedicinePharmacies` |

## New endpoints (all Super Admin only)

| Method | Path |
|---|---|
| PATCH | `/api/superadmin/pharmacies/:id/status` — `{ status, reason }` |
| PATCH | `/api/superadmin/users/:id/status` — `{ status, reason }` |
| GET / POST | `/api/superadmin/medicines` |
| PATCH | `/api/superadmin/medicines/:id` |
| PATCH | `/api/superadmin/medicines/:id/archive` — `{ archived, reason }` |
| GET / POST | `/api/superadmin/medicine-categories` |
| PATCH / DELETE | `/api/superadmin/medicine-categories/:id` |
| GET | `/api/superadmin/reports/summary?from=&to=&interval=` |
| POST | `/api/auth/change-password` — `{ currentPassword, newPassword }` (any signed-in user) |

## How the catalog fits the existing tables

- `medicines.pharmacy_id IS NULL` → global catalog medicine (created by the Super Admin)
- `medicines.pharmacy_id = X` → medicine pharmacy X added itself (unchanged)
- Archive = `status = 'INACTIVE'`, same as the existing soft delete.

## Audit actions written

Written to `audit_logs` (`user_id` = the Super Admin, `pharmacy_id`, `action`,
`entity_type`, `entity_id`, `description`, plus `metadata` with the reason and
before/after values once the SQL has been run).

PHARMACY_CREATED, PHARMACY_UPDATED, PHARMACY_APPROVED, PHARMACY_REJECTED,
PHARMACY_ACTIVATED, PHARMACY_DEACTIVATED, PHARMACY_ADMIN_CREATED,
USER_ACTIVATED, USER_DEACTIVATED, MEDICINE_CREATED, MEDICINE_UPDATED,
MEDICINE_ARCHIVED, MEDICINE_RESTORED, CATEGORY_CREATED, CATEGORY_UPDATED,
CATEGORY_DELETED, PASSWORD_CHANGED
