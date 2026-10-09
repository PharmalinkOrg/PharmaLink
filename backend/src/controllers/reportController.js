const supabaseAdmin = require('../config/supabaseAdmin')
const fetchAll = require('../utils/fetchAll')
const { logActivity } = require('../services/auditLogService')
const { createNotifications } = require('../services/notificationService')

const REPORT_STATUSES = ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED']
const REPORT_TYPES = ['COMPLAINT', 'SIDE_EFFECT', 'SUGGESTION', 'OTHER']

const toKey = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

const isValidId = (value) => {
  const parsed = Number(value)

  return (
    Number.isInteger(parsed) &&
    parsed > 0
  )
}

const createReport = async (req, res) => {
  try {
    const customerId =
      Number(req.pharmaUser?.user_id)

    const role =
      String(
        req.pharmaUser?.role || '',
      ).toUpperCase()

    if (!isValidId(customerId)) {
      return res.status(401).json({
        success: false,
        message:
          'Authenticated customer not found',
      })
    }

    if (role !== 'CUSTOMER') {
      return res.status(403).json({
        success: false,
        message:
          'Only customers can submit reports',
      })
    }

    const {
      pharmacy_id,
      subject,
      description,
      report_type,
      medicine_id,
    } = req.body || {}

    const reportType = report_type ? toKey(report_type) : null

    if (reportType && !REPORT_TYPES.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: `Report type must be one of: ${REPORT_TYPES.join(', ')}`,
      })
    }

    if (
      medicine_id !== undefined &&
      medicine_id !== null &&
      medicine_id !== '' &&
      !isValidId(medicine_id)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine',
      })
    }

    const pharmacyId =
      Number(pharmacy_id)

    if (!isValidId(pharmacyId)) {
      return res.status(400).json({
        success: false,
        message:
          'Please select a valid partner pharmacy',
      })
    }

    const normalizedDescription =
      typeof description === 'string'
        ? description.trim()
        : ''

    const normalizedSubject =
      typeof subject === 'string'
        ? subject.trim()
        : ''

    if (!normalizedDescription) {
      return res.status(400).json({
        success: false,
        message:
          'Report description is required',
      })
    }

    if (
      normalizedDescription.length >
      2000
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Report description cannot exceed 2000 characters',
      })
    }

    if (
      normalizedSubject.length >
      150
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Report subject cannot exceed 150 characters',
      })
    }

    const {
      data: pharmacy,
      error: pharmacyError,
    } = await supabaseAdmin
      .from('pharmacies')
      .select(`
        pharmacy_id,
        name,
        status
      `)
      .eq(
        'pharmacy_id',
        pharmacyId,
      )
      .maybeSingle()

    if (pharmacyError) {
      console.error(
        'Report pharmacy lookup error:',
        pharmacyError,
      )

      return res.status(500).json({
        success: false,
        message:
          'Unable to verify the selected pharmacy',
      })
    }

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message:
          'The selected pharmacy is not a PharmaLink partner',
      })
    }

    if (
      String(
        pharmacy.status || '',
      ).toUpperCase() !== 'ACTIVE'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'The selected pharmacy is currently unavailable',
      })
    }

    const basePayload = {
      customer_id: customerId,
      pharmacy_id: pharmacyId,
      subject: normalizedSubject || null,
      description: normalizedDescription,
      status: 'PENDING',
    }

    // report_type / medicine_id exist after sql/002_reports.sql.
    const extras = {
      ...(reportType ? { report_type: reportType } : {}),
      ...(isValidId(medicine_id) ? { medicine_id: Number(medicine_id) } : {}),
    }

    const insertReport = (payload) =>
      supabaseAdmin.from('reports').insert(payload).select('*').single()

    let {
      data: report,
      error: insertError,
    } = await insertReport({ ...basePayload, ...extras })

    if (insertError?.code === 'PGRST204' && Object.keys(extras).length > 0) {
      ;({ data: report, error: insertError } = await insertReport(basePayload))
    }

    if (insertError) {
      console.error(
        'Create report error:',
        insertError,
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to submit report',
      })
    }

    return res.status(201).json({
      success: true,

      message:
        'Report submitted successfully',

      data: {
        ...report,

        pharmacy: {
          pharmacy_id:
            pharmacy.pharmacy_id,

          name:
            pharmacy.name,
        },
      },
    })
  } catch (error) {
    console.error(
      'Create report server error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        'Server error while submitting report',
    })
  }
}

/* ============================================================
   PHARMACY REPORTS
   GET /api/reports/pharmacy?status=&type=&search=

   Reports customers submitted about the signed-in admin's
   pharmacy, newest first. `summary` counts all reports (before
   filters) for the status tiles.
============================================================ */

const reportCustomerName = (customer) =>
  customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.email
    : null

const reportMedicineName = (medicine) =>
  medicine
    ? [medicine.brand_name || medicine.generic_name, medicine.dosage].filter(Boolean).join(' ')
    : null

/**
 * Adds customer and medicine details to report rows.
 */
async function enrichReports(rows) {
  const customerIds = [...new Set(rows.map((row) => row.customer_id).filter(Boolean))]
  const medicineIds = [...new Set(rows.map((row) => row.medicine_id).filter(Boolean))]

  const [customersResult, medicinesResult] = await Promise.all([
    customerIds.length
      ? supabaseAdmin
          .from('users')
          .select('user_id, first_name, last_name, email, phone')
          .in('user_id', customerIds)
      : Promise.resolve({ data: [] }),
    medicineIds.length
      ? supabaseAdmin
          .from('medicines')
          .select('medicine_id, generic_name, brand_name, dosage, dosage_form')
          .in('medicine_id', medicineIds)
      : Promise.resolve({ data: [] }),
  ])

  const customers = new Map((customersResult.data || []).map((user) => [user.user_id, user]))
  const medicines = new Map(
    (medicinesResult.data || []).map((medicine) => [medicine.medicine_id, medicine])
  )

  return rows.map((row) => {
    const customer = customers.get(row.customer_id) || null
    const medicine = medicines.get(row.medicine_id) || null

    return {
      ...row,
      status: toKey(row.status) || 'PENDING',
      report_type: row.report_type ? toKey(row.report_type) : 'COMPLAINT',
      customer,
      customer_name: reportCustomerName(customer),
      customer_email: customer?.email || null,
      medicine,
      medicine_name: reportMedicineName(medicine),
    }
  })
}

const getPharmacyReports = async (req, res) => {
  try {
    const pharmacyId = Number(req.pharmaUser?.pharmacy_id)

    if (!isValidId(pharmacyId)) {
      return res.status(400).json({
        success: false,
        message: 'Pharmacy account is not assigned to a pharmacy',
      })
    }

    const rows = await fetchAll(() =>
      supabaseAdmin
        .from('reports')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .order('created_at', { ascending: false })
    )

    const reports = await enrichReports(rows)

    const summary = { pending: 0, reviewed: 0, resolved: 0, dismissed: 0, total: reports.length }

    reports.forEach((report) => {
      const key = report.status.toLowerCase()

      if (key in summary) {
        summary[key] += 1
      }
    })

    /* Filters (all optional) */

    const status = toKey(req.query.status)
    const type = toKey(req.query.type || req.query.report_type)
    const tokens = String(req.query.search || '')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)

    const filtered = reports.filter((report) => {
      if (status && status !== 'ALL' && report.status !== status) return false
      if (type && type !== 'ALL' && report.report_type !== type) return false

      if (tokens.length === 0) return true

      const text = [
        report.report_id,
        `#${report.report_id}`,
        report.subject,
        report.description,
        report.customer_name,
        report.customer_email,
        report.medicine_name,
      ]
        .join(' ')
        .toLowerCase()

      return tokens.every((token) => text.includes(token))
    })

    return res.status(200).json({
      success: true,
      data: filtered,
      summary,
    })
  } catch (error) {
    console.error('Get pharmacy reports error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to load reports',
    })
  }
}

/* ============================================================
   UPDATE REPORT STATUS (pharmacy)
   PATCH /api/reports/:reportId/status
   body: { status: 'REVIEWED' | 'RESOLVED' | 'DISMISSED' | 'PENDING', response }
============================================================ */

const STATUS_LABELS = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
}

const updateReportStatus = async (req, res) => {
  try {
    const pharmacyId = Number(req.pharmaUser?.pharmacy_id)
    const reportId = Number(req.params.reportId)
    const status = toKey(req.body?.status)
    const responseText =
      typeof (req.body?.response ?? req.body?.notes) === 'string'
        ? String(req.body.response ?? req.body.notes).trim().slice(0, 2000)
        : ''

    if (!isValidId(pharmacyId)) {
      return res.status(400).json({
        success: false,
        message: 'Pharmacy account is not assigned to a pharmacy',
      })
    }

    if (!isValidId(reportId)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID' })
    }

    if (!REPORT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${REPORT_STATUSES.join(', ')}`,
      })
    }

    const { data: report, error: findError } = await supabaseAdmin
      .from('reports')
      .select('*')
      .eq('report_id', reportId)
      .eq('pharmacy_id', pharmacyId)
      .maybeSingle()

    if (findError) {
      throw findError
    }

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' })
    }

    if (toKey(report.status) === status && !responseText) {
      return res.status(409).json({
        success: false,
        message: `This report is already ${STATUS_LABELS[status]}.`,
      })
    }

    const now = new Date().toISOString()

    // Extra columns exist after sql/002_reports.sql.
    const extras = {
      ...(responseText ? { response: responseText } : {}),
      updated_at: now,
      ...(status === 'REVIEWED' ? { reviewed_at: now, reviewed_by: req.pharmaUser.user_id } : {}),
      ...(status === 'RESOLVED' ? { resolved_at: now, reviewed_by: req.pharmaUser.user_id } : {}),
    }

    const runUpdate = (payload) =>
      supabaseAdmin
        .from('reports')
        .update(payload)
        .eq('report_id', reportId)
        .eq('pharmacy_id', pharmacyId)
        .select('*')
        .single()

    let { data: updated, error: updateError } = await runUpdate({ status, ...extras })

    if (updateError?.code === 'PGRST204') {
      ;({ data: updated, error: updateError } = await runUpdate({ status }))
    }

    if (updateError) {
      console.error('Update report status error:', updateError)

      if (updateError.code === '23514' || updateError.code === '22P02') {
        return res.status(400).json({
          success: false,
          message: `The database does not accept the status ${status} yet. Run sql/002_reports.sql in Supabase.`,
        })
      }

      return res.status(500).json({ success: false, message: 'Failed to update report' })
    }

    await logActivity(req, {
      action: 'REPORT_STATUS_CHANGED',
      entityType: 'report',
      entityId: reportId,
      pharmacyId,
      description: `Marked customer report #${reportId} as ${STATUS_LABELS[status]}`,
      metadata: { from: report.status, to: status, response: responseText || null },
    })

    // Let the customer know. Never blocks the update.
    if (status !== 'PENDING' && isValidId(report.customer_id)) {
      try {
        await createNotifications({
          userIds: [Number(report.customer_id)],
          title: `Your report was ${STATUS_LABELS[status]}`,
          message:
            `Your report #${reportId}${report.subject ? ` ("${report.subject}")` : ''} was marked as ${STATUS_LABELS[status]} by the pharmacy.` +
            (responseText ? ` Response: ${responseText}` : ''),
          type: 'SYSTEM',
          referenceType: 'report',
          referenceId: reportId,
          metadata: { status },
        })
      } catch (notifyError) {
        console.warn('Report notification failed:', notifyError.message)
      }
    }

    const [enriched] = await enrichReports([updated])

    return res.status(200).json({
      success: true,
      message: `Report marked as ${STATUS_LABELS[status]}`,
      data: enriched,
    })
  } catch (error) {
    console.error('Update report status server error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  createReport,
  getPharmacyReports,
  updateReportStatus,
}