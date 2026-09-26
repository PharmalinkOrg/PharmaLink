const supabaseAdmin = require('../config/supabaseAdmin')

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
    } = req.body || {}

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

    const {
      data: report,
      error: insertError,
    } = await supabaseAdmin
      .from('reports')
      .insert({
        customer_id:
          customerId,

        pharmacy_id:
          pharmacyId,

        subject:
          normalizedSubject ||
          null,

        description:
          normalizedDescription,

        status:
          'PENDING',
      })
      .select(`
        report_id,
        customer_id,
        pharmacy_id,
        subject,
        description,
        status,
        created_at
      `)
      .single()

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

module.exports = {
  createReport,
}