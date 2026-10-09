# Pharmacy Admin: Reports page + profile save

Unzip into backend\src (overwrite), then run sql\002_reports.sql in Supabase.

| File | Change |
|---|---|
| controllers/reportController.js | New: getPharmacyReports, updateReportStatus. createReport accepts optional report_type and medicine_id |
| routes/reportRoutes.js | GET /api/reports/pharmacy, PATCH /api/reports/:reportId/status (pharmacy admin/staff) |
| controllers/userController.js | Profile update accepts camelCase (firstName, lastName, phoneNumber) as well as snake_case |
| routes/userRoutes.js | GET / PUT / PATCH /api/users/profile (same as /me/profile) |
| sql/002_reports.sql | reports: report_type, medicine_id, response, reviewed_by, reviewed_at, resolved_at, updated_at; statuses PENDING / REVIEWED / RESOLVED / DISMISSED |

GET /api/reports/pharmacy?status=&type=&search=
  -> { success, data: [report...], summary: { pending, reviewed, resolved, dismissed, total } }
  Each report: all reports columns + report_type, customer {...}, customer_name,
  customer_email, medicine {...}, medicine_name.

PATCH /api/reports/:reportId/status   body: { status, response? }
  Notifies the customer and writes an audit log entry.
