const supabaseAdmin = require('../config/supabaseAdmin')

/* ============================================================
   HELPERS
============================================================ */

/**
 * Validate a YYYY-MM-DD calendar date.
 */
const isValidDate = (dateString) => {
  if (
    typeof dateString !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateString)
  ) {
    return false
  }

  const [year, month, day] = dateString
    .split('-')
    .map(Number)

  const date = new Date(
    Date.UTC(year, month - 1, day)
  )

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/**
 * Return the current PharmaLink business date
 * using Philippine time.
 *
 * Format:
 * YYYY-MM-DD
 *
 * IMPORTANT:
 * Do not use:
 *
 * new Date().toISOString().split('T')[0]
 *
 * for business-date validation because toISOString()
 * always uses UTC. A deployed server can therefore
 * still be on the previous UTC calendar date while
 * it is already the next day in the Philippines.
 */
const getPhilippineDateString = () => {
  const parts = new Intl.DateTimeFormat(
    'en-US',
    {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).formatToParts(new Date())

  const dateParts = {}

  for (const part of parts) {
    if (
      part.type === 'year' ||
      part.type === 'month' ||
      part.type === 'day'
    ) {
      dateParts[part.type] = part.value
    }
  }

  return (
    `${dateParts.year}-` +
    `${dateParts.month}-` +
    `${dateParts.day}`
  )
}

/* ============================================================
   CREATE PRESCRIPTION
   POST /api/prescriptions
============================================================ */

const createPrescription = async (req, res) => {
  try {
    // --------------------------------------------------
    // 1. Make sure the authenticated PharmaLink user
    //    exists
    // --------------------------------------------------

    const customerId =
      req.pharmaUser?.user_id

    const authUserId =
      req.authUser?.id

    if (!customerId || !authUserId) {
      return res.status(401).json({
        success: false,
        message:
          'Customer authentication could not be verified',
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

    const pharmacyId =
      Number(pharmacy_id)

    if (
      !Number.isInteger(pharmacyId) ||
      pharmacyId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'A valid pharmacy is required',
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
        message:
          'Prescription image is required',
      })
    }

    const imagePath =
      image_url.trim()

    /*
     * The Storage path must belong to
     * the authenticated Supabase user.
     *
     * Expected:
     *
     * <auth-user-uuid>/<filename>
     */

    const expectedPrefix =
      `${authUserId}/`

    if (
      !imagePath.startsWith(
        expectedPrefix
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid prescription file path',
      })
    }

    /*
     * Prevent paths such as:
     *
     * uuid/../another-user/file.jpg
     */
    if (imagePath.includes('..')) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid prescription file path',
      })
    }

    // --------------------------------------------------
    // 5. Validate prescription date
    // --------------------------------------------------

    let validatedDate = null

    if (
      prescription_date !== undefined &&
      prescription_date !== null
    ) {
      if (
        typeof prescription_date !==
          'string' ||
        !isValidDate(
          prescription_date
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Prescription date must be a valid date in YYYY-MM-DD format',
        })
      }

      /*
       * IMPORTANT:
       *
       * Use the PharmaLink Philippine
       * business date instead of UTC.
       *
       * Example:
       *
       * Philippines:
       * 2026-09-26 12:30 AM
       *
       * UTC:
       * 2026-09-25 4:30 PM
       *
       * Using toISOString() would
       * incorrectly return 2026-09-25.
       */
      const todayString =
        getPhilippineDateString()

      if (
        prescription_date >
        todayString
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Prescription date cannot be in the future',
        })
      }

      validatedDate =
        prescription_date
    }

    // --------------------------------------------------
    // 6. Validate pharmacy
    // --------------------------------------------------

    const {
      data: pharmacy,
      error: pharmacyError,
    } = await supabaseAdmin
      .from('pharmacies')
      .select(
        'pharmacy_id, name, status'
      )
      .eq(
        'pharmacy_id',
        pharmacyId
      )
      .maybeSingle()

    if (pharmacyError) {
      console.error(
        'Prescription pharmacy lookup error:',
        pharmacyError
      )

      return res.status(500).json({
        success: false,
        message:
          'Could not verify the selected pharmacy',
      })
    }

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message:
          'Selected pharmacy was not found',
      })
    }

    if (
      pharmacy.status !== 'ACTIVE'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'The selected pharmacy is not currently active',
      })
    }

    // --------------------------------------------------
    // 7. Clean notes
    // --------------------------------------------------

    const cleanNotes =
      typeof notes === 'string' &&
      notes.trim()
        ? notes.trim()
        : null

    // --------------------------------------------------
    // 8. Insert prescription
    //
    // customer_id comes from authenticated
    // PharmaLink user, NOT from the frontend.
    //
    // status is intentionally omitted so
    // PostgreSQL applies the PENDING default.
    // --------------------------------------------------

    const {
      data: prescription,
      error: prescriptionError,
    } = await supabaseAdmin
      .from('prescriptions')
      .insert({
        customer_id:
          customerId,

        pharmacy_id:
          pharmacyId,

        image_url:
          imagePath,

        prescription_date:
          validatedDate,

        notes:
          cleanNotes,
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
        message:
          'Could not save the prescription',
      })
    }

    // --------------------------------------------------
    // 9. Return success
    // --------------------------------------------------

    return res.status(201).json({
      success: true,
      message:
        'Prescription uploaded successfully',
      data:
        prescription,
    })
  } catch (error) {
    console.error(
      'Create prescription controller error:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'An unexpected error occurred while uploading the prescription',
    })
  }
}

/* ============================================================
   GET CUSTOMER PRESCRIPTIONS
   GET /api/prescriptions
============================================================ */

const getCustomerPrescriptions =
  async (req, res) => {
    try {
      const customerId =
        req.pharmaUser?.user_id

      if (!customerId) {
        return res.status(401).json({
          success: false,
          message:
            'Authenticated customer not found',
        })
      }

      const {
        data: prescriptions,
        error,
      } = await supabaseAdmin
        .from('prescriptions')
        .select(`
          prescription_id,
          customer_id,
          pharmacy_id,
          prescription_date,
          status,
          notes,
          verified_at,
          created_at,
          updated_at,

          pharmacies (
            pharmacy_id,
            name,
            address,
            status
          )
        `)
        .eq(
          'customer_id',
          Number(customerId)
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )

      if (error) {
        console.error(
          'Get customer prescriptions error:',
          error
        )

        return res.status(500).json({
          success: false,
          message:
            'Failed to load prescriptions',
        })
      }

      return res.status(200).json({
        success: true,
        message:
          'Prescriptions loaded successfully',
        data:
          prescriptions || [],
      })
    } catch (error) {
      console.error(
        'Get customer prescriptions server error:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Server error',
      })
    }
  }

/* ============================================================
   GET CUSTOMER PRESCRIPTION BY ID
   GET /api/prescriptions/:prescriptionId
============================================================ */

const getCustomerPrescriptionById =
  async (req, res) => {
    try {
      const customerId =
        req.pharmaUser?.user_id

      const prescriptionId =
        Number(
          req.params.prescriptionId
        )

      if (!customerId) {
        return res.status(401).json({
          success: false,
          message:
            'Authenticated customer not found',
        })
      }

      if (
        !Number.isInteger(
          prescriptionId
        ) ||
        prescriptionId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Valid prescription ID is required',
        })
      }

      const {
        data: prescription,
        error,
      } = await supabaseAdmin
        .from('prescriptions')
        .select(`
          prescription_id,
          customer_id,
          pharmacy_id,
          prescription_date,
          status,
          notes,
          verified_at,
          created_at,
          updated_at,

          pharmacies (
            pharmacy_id,
            name,
            address,
            status
          )
        `)
        .eq(
          'prescription_id',
          prescriptionId
        )
        .eq(
          'customer_id',
          Number(customerId)
        )
        .maybeSingle()

      if (error) {
        console.error(
          'Get customer prescription by ID error:',
          error
        )

        return res.status(500).json({
          success: false,
          message:
            'Failed to load prescription',
        })
      }

      if (!prescription) {
        return res.status(404).json({
          success: false,
          message:
            'Prescription not found',
        })
      }

      return res.status(200).json({
        success: true,
        message:
          'Prescription loaded successfully',
        data:
          prescription,
      })
    } catch (error) {
      console.error(
        'Get customer prescription by ID server error:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Server error',
      })
    }
  }

/* ============================================================
   GET PHARMACY PRESCRIPTIONS
   GET /api/prescriptions/pharmacy
============================================================ */

const getPharmacyPrescriptions =
  async (req, res) => {
    try {
      const pharmacyId =
        req.pharmaUser?.pharmacy_id

      if (!pharmacyId) {
        return res.status(400).json({
          success: false,
          message:
            'Pharmacy account is not assigned to a pharmacy',
        })
      }

      const {
        data: prescriptions,
        error,
      } = await supabaseAdmin
        .from('prescriptions')
        .select(`
          prescription_id,
          customer_id,
          pharmacy_id,
          image_url,
          prescription_date,
          status,
          verified_by,
          verified_at,
          notes,
          created_at,
          updated_at,

          users!fk_prescriptions_customer (
            user_id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq(
          'pharmacy_id',
          Number(pharmacyId)
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )

      if (error) {
        console.error(
          'Get pharmacy prescriptions error:',
          error
        )

        return res.status(500).json({
          success: false,
          message:
            'Failed to load prescriptions',
        })
      }

      return res.status(200).json({
        success: true,
        message:
          'Prescriptions loaded successfully',
        data:
          prescriptions || [],
      })
    } catch (error) {
      console.error(
        'Get pharmacy prescriptions server error:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Server error',
      })
    }
  }

/* ============================================================
   UPDATE PRESCRIPTION STATUS
   PATCH /api/prescriptions/:prescriptionId/status
============================================================ */

const updatePrescriptionStatus =
  async (req, res) => {
    try {
      const pharmacyId =
        req.pharmaUser?.pharmacy_id

      const staffUserId =
        req.pharmaUser?.user_id

      if (!pharmacyId) {
        return res.status(400).json({
          success: false,
          message:
            'Pharmacy account is not assigned to a pharmacy',
        })
      }

      if (!staffUserId) {
        return res.status(401).json({
          success: false,
          message:
            'Authenticated staff member not found',
        })
      }

      const prescriptionId =
        Number(
          req.params.prescriptionId
        )

      if (
        !Number.isInteger(
          prescriptionId
        ) ||
        prescriptionId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Valid prescription ID is required',
        })
      }

      const status =
        typeof req.body?.status ===
        'string'
          ? req.body.status
              .trim()
              .toUpperCase()
          : null

      const allowedStatuses = [
        'VERIFIED',
        'REJECTED',
      ]

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid status. Allowed values: VERIFIED, REJECTED',
        })
      }

      const {
        data: prescription,
        error: lookupError,
      } = await supabaseAdmin
        .from('prescriptions')
        .select(
          'prescription_id, pharmacy_id, status'
        )
        .eq(
          'prescription_id',
          prescriptionId
        )
        .eq(
          'pharmacy_id',
          Number(pharmacyId)
        )
        .maybeSingle()

      if (lookupError) {
        console.error(
          'Prescription lookup error:',
          lookupError
        )

        return res.status(500).json({
          success: false,
          message:
            'Failed to load prescription',
        })
      }

      if (!prescription) {
        return res.status(404).json({
          success: false,
          message:
            'Prescription not found',
        })
      }

      if (
        prescription.status !==
        'PENDING'
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Prescription is already ${prescription.status.toLowerCase()}`,
        })
      }

      const {
        data: updated,
        error: updateError,
      } = await supabaseAdmin
        .from('prescriptions')
        .update({
          status,

          verified_by:
            Number(staffUserId),

          verified_at:
            new Date().toISOString(),
        })
        .eq(
          'prescription_id',
          prescriptionId
        )
        .eq(
          'pharmacy_id',
          Number(pharmacyId)
        )
        .select(`
          prescription_id,
          customer_id,
          pharmacy_id,
          image_url,
          prescription_date,
          status,
          verified_by,
          verified_at,
          notes,
          created_at,
          updated_at
        `)
        .single()

      if (updateError) {
        console.error(
          'Update prescription status error:',
          updateError
        )

        return res.status(500).json({
          success: false,
          message:
            'Failed to update prescription status',
        })
      }

      return res.status(200).json({
        success: true,
        message:
          `Prescription ${status.toLowerCase()} successfully`,
        data:
          updated,
      })
    } catch (error) {
      console.error(
        'Update prescription status server error:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Server error',
      })
    }
  }

/* ============================================================
   GET PRESCRIPTION SIGNED URL
   GET /api/prescriptions/:prescriptionId/url

   Returns a temporary signed URL to the private
   prescription Storage object.
============================================================ */

const getPrescriptionUrl =
  async (req, res) => {
    try {
      const pharmacyId =
        req.pharmaUser?.pharmacy_id

      if (!pharmacyId) {
        return res.status(400).json({
          success: false,
          message:
            'Pharmacy account is not assigned to a pharmacy',
        })
      }

      const prescriptionId =
        Number(
          req.params.prescriptionId
        )

      if (
        !Number.isInteger(
          prescriptionId
        ) ||
        prescriptionId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Valid prescription ID is required',
        })
      }

      const {
        data: prescription,
        error,
      } = await supabaseAdmin
        .from('prescriptions')
        .select(
          'prescription_id, pharmacy_id, image_url'
        )
        .eq(
          'prescription_id',
          prescriptionId
        )
        .eq(
          'pharmacy_id',
          Number(pharmacyId)
        )
        .maybeSingle()

      if (error) {
        console.error(
          'Prescription URL lookup error:',
          error
        )

        return res.status(500).json({
          success: false,
          message:
            'Failed to load prescription',
        })
      }

      if (!prescription) {
        return res.status(404).json({
          success: false,
          message:
            'Prescription not found',
        })
      }

      const {
        data: signed,
        error: signedError,
      } =
        await supabaseAdmin.storage
          .from('prescriptions')
          .createSignedUrl(
            prescription.image_url,
            60 * 10
          )

      if (signedError) {
        console.error(
          'Signed URL error:',
          signedError
        )

        return res.status(500).json({
          success: false,
          message:
            'Failed to generate prescription URL',
        })
      }

      return res.status(200).json({
        success: true,
        message:
          'Signed URL generated',
        data: {
          signed_url:
            signed.signedUrl,
        },
      })
    } catch (error) {
      console.error(
        'Get prescription URL server error:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Server error',
      })
    }
  }

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  // Customer
  createPrescription,
  getCustomerPrescriptions,
  getCustomerPrescriptionById,

  // Pharmacy Admin
  getPharmacyPrescriptions,
  updatePrescriptionStatus,
  getPrescriptionUrl,
}