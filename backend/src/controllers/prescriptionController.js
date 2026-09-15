const supabaseAdmin = require('../config/supabaseAdmin')

const isValidDate = (dateString) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false
  }

  const [year, month, day] = dateString.split('-').map(Number)

  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

const createPrescription = async (req, res) => {
  try {
    // --------------------------------------------------
    // 1. Make sure the authenticated PharmaLink user
    //    exists
    // --------------------------------------------------

    const customerId = req.pharmaUser?.user_id
    const authUserId = req.authUser?.id

    if (!customerId || !authUserId) {
      return res.status(401).json({
        success: false,
        message: 'Customer authentication could not be verified',
      })
    }

    // --------------------------------------------------
    // 2. Get request data
    // --------------------------------------------------

    const {
      pharmacy_id,
      image_url,
      prescription_date,
      notes,
    } = req.body

    // --------------------------------------------------
    // 3. Validate pharmacy_id
    // --------------------------------------------------

    const pharmacyId = Number(pharmacy_id)

    if (!Number.isInteger(pharmacyId) || pharmacyId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid pharmacy is required',
      })
    }

    // --------------------------------------------------
    // 4. Validate image path
    // --------------------------------------------------

    if (
      typeof image_url !== 'string' ||
      !image_url.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Prescription image is required',
      })
    }

    const imagePath = image_url.trim()

    // The Storage path must belong to the authenticated
    // Supabase user.
    //
    // Expected:
    // <auth-user-uuid>/<filename>

    const expectedPrefix = `${authUserId}/`

    if (!imagePath.startsWith(expectedPrefix)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prescription file path',
      })
    }

    // Prevent paths such as:
    // uuid/../another-user/file.jpg
    if (imagePath.includes('..')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prescription file path',
      })
    }

    // --------------------------------------------------
    // 5. Validate prescription date
    // --------------------------------------------------

    let validatedDate = null

    if (prescription_date !== undefined && prescription_date !== null) {
      if (
        typeof prescription_date !== 'string' ||
        !isValidDate(prescription_date)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Prescription date must be a valid date in YYYY-MM-DD format',
        })
      }

      const today = new Date()
      const todayString = today.toISOString().split('T')[0]

      if (prescription_date > todayString) {
        return res.status(400).json({
          success: false,
          message: 'Prescription date cannot be in the future',
        })
      }

      validatedDate = prescription_date
    }

    // --------------------------------------------------
    // 6. Validate pharmacy
    // --------------------------------------------------

    const {
      data: pharmacy,
      error: pharmacyError,
    } = await supabaseAdmin
      .from('pharmacies')
      .select('pharmacy_id, name, status')
      .eq('pharmacy_id', pharmacyId)
      .maybeSingle()

    if (pharmacyError) {
      console.error(
        'Prescription pharmacy lookup error:',
        pharmacyError
      )

      return res.status(500).json({
        success: false,
        message: 'Could not verify the selected pharmacy',
      })
    }

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: 'Selected pharmacy was not found',
      })
    }

    if (pharmacy.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'The selected pharmacy is not currently active',
      })
    }

    // --------------------------------------------------
    // 7. Clean notes
    // --------------------------------------------------

    const cleanNotes =
      typeof notes === 'string' && notes.trim()
        ? notes.trim()
        : null

    // --------------------------------------------------
    // 8. Insert prescription
    //
    // customer_id comes from authenticated PharmaLink
    // user, NOT from the frontend.
    //
    // status is intentionally omitted so PostgreSQL
    // applies the PENDING default.
    // --------------------------------------------------

    const {
      data: prescription,
      error: prescriptionError,
    } = await supabaseAdmin
      .from('prescriptions')
      .insert({
        customer_id: customerId,
        pharmacy_id: pharmacyId,
        image_url: imagePath,
        prescription_date: validatedDate,
        notes: cleanNotes,
      })
      .select('*')
      .single()

    if (prescriptionError) {
      console.error(
        'Prescription creation error:',
        prescriptionError
      )

      return res.status(500).json({
        success: false,
        message: 'Could not save the prescription',
      })
    }

    // --------------------------------------------------
    // 9. Return success
    // --------------------------------------------------

    return res.status(201).json({
      success: true,
      message: 'Prescription uploaded successfully',
      data: prescription,
    })
  } catch (error) {
    console.error(
      'Create prescription controller error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while uploading the prescription',
    })
  }
}

module.exports = {
  createPrescription,
}