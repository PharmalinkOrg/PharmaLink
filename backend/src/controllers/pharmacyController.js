const supabase = require('../config/supabase')

/* ============================================================
   HELPERS
============================================================ */

/**
 * Check whether a coordinate value was actually provided.
 * Important: null and empty string are NOT treated as coordinates.
 */
const hasCoordinateValue = (value) => {
  return (
    value !== undefined &&
    value !== null &&
    value !== ''
  )
}

/**
 * Validate latitude and longitude.
 *
 * Returns:
 * {
 *   valid: boolean,
 *   latitude: number | null,
 *   longitude: number | null,
 *   message?: string
 * }
 */
const validateCoordinates = (
  latitude,
  longitude,
  { allowClear = false } = {}
) => {
  const hasLatitude = hasCoordinateValue(latitude)
  const hasLongitude = hasCoordinateValue(longitude)

  /*
   * For update requests, allow:
   *
   * latitude: null
   * longitude: null
   *
   * This clears the pharmacy location.
   */
  if (
    allowClear &&
    (latitude === null || latitude === '') &&
    (longitude === null || longitude === '')
  ) {
    return {
      valid: true,
      latitude: null,
      longitude: null,
    }
  }

  /*
   * If neither coordinate was supplied,
   * location is simply not being provided.
   */
  if (!hasLatitude && !hasLongitude) {
    return {
      valid: true,
      latitude: null,
      longitude: null,
    }
  }

  /*
   * Latitude and longitude must always
   * be provided together.
   */
  if (hasLatitude !== hasLongitude) {
    return {
      valid: false,
      message:
        'Latitude and longitude must be provided together',
    }
  }

  const normalizedLatitude = Number(latitude)
  const normalizedLongitude = Number(longitude)

  /*
   * Latitude range:
   * -90 to 90
   */
  if (
    !Number.isFinite(normalizedLatitude) ||
    normalizedLatitude < -90 ||
    normalizedLatitude > 90
  ) {
    return {
      valid: false,
      message:
        'Latitude must be a number between -90 and 90',
    }
  }

  /*
   * Longitude range:
   * -180 to 180
   */
  if (
    !Number.isFinite(normalizedLongitude) ||
    normalizedLongitude < -180 ||
    normalizedLongitude > 180
  ) {
    return {
      valid: false,
      message:
        'Longitude must be a number between -180 and 180',
    }
  }

  return {
    valid: true,
    latitude: normalizedLatitude,
    longitude: normalizedLongitude,
  }
}

/* ============================================================
   GET ALL PHARMACIES
============================================================ */

const getPharmacies = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
      .order('pharmacy_id', {
        ascending: true,
      })

    if (error) {
      console.error(
        'Get pharmacies error:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to retrieve pharmacies',
        error: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error(
      'Get pharmacies server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/* ============================================================
   CREATE PHARMACY
============================================================ */

const createPharmacy = async (req, res) => {
  try {
    const {
      name,
      address,
      contact_number,
      email,
      latitude,
      longitude,
    } = req.body

    /* --------------------------------------------------------
       Validate pharmacy name
    -------------------------------------------------------- */

    if (
      !name ||
      typeof name !== 'string' ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Pharmacy name is required',
      })
    }

    /* --------------------------------------------------------
       Validate pharmacy address
    -------------------------------------------------------- */

    if (
      !address ||
      typeof address !== 'string' ||
      !address.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Pharmacy address is required',
      })
    }

    /* --------------------------------------------------------
       Validate email if provided
    -------------------------------------------------------- */

    if (
      email !== undefined &&
      email !== null &&
      email !== '' &&
      (
        typeof email !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email.trim()
        )
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please provide a valid email address',
      })
    }

    /* --------------------------------------------------------
       Validate coordinates
    -------------------------------------------------------- */

    const coordinateResult =
      validateCoordinates(
        latitude,
        longitude
      )

    if (!coordinateResult.valid) {
      return res.status(400).json({
        success: false,
        message: coordinateResult.message,
      })
    }

    /* --------------------------------------------------------
       Create pharmacy
    -------------------------------------------------------- */

    const { data, error } = await supabase
      .from('pharmacies')
      .insert([
        {
          name: name.trim(),

          address: address.trim(),

          contact_number:
            typeof contact_number ===
              'string' &&
            contact_number.trim()
              ? contact_number.trim()
              : null,

          email:
            typeof email === 'string' &&
            email.trim()
              ? email
                  .trim()
                  .toLowerCase()
              : null,

          latitude:
            coordinateResult.latitude,

          longitude:
            coordinateResult.longitude,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error(
        'Create pharmacy error:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to create pharmacy',
        error: error.message,
      })
    }

    return res.status(201).json({
      success: true,
      message:
        'Pharmacy created successfully',
      data,
    })
  } catch (error) {
    console.error(
      'Create pharmacy server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/* ============================================================
   GET PHARMACY BY ID
============================================================ */

const getPharmacyById = async (
  req,
  res
) => {
  try {
    const { id } = req.params

    /* --------------------------------------------------------
       Validate pharmacy ID
    -------------------------------------------------------- */

    const pharmacyId = Number(id)

    if (
      !Number.isInteger(pharmacyId) ||
      pharmacyId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pharmacy ID',
      })
    }

    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .maybeSingle()

    if (error) {
      console.error(
        'Get pharmacy error:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to retrieve pharmacy',
        error: error.message,
      })
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacy not found',
      })
    }

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    console.error(
      'Get pharmacy server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/* ============================================================
   UPDATE PHARMACY
============================================================ */

const updatePharmacy = async (
  req,
  res
) => {
  try {
    const { id } = req.params

    const {
      name,
      address,
      contact_number,
      email,
      status,
      latitude,
      longitude,
    } = req.body

    /* --------------------------------------------------------
       Validate pharmacy ID
    -------------------------------------------------------- */

    const pharmacyId = Number(id)

    if (
      !Number.isInteger(pharmacyId) ||
      pharmacyId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pharmacy ID',
      })
    }

    /* --------------------------------------------------------
       Validate name if provided
    -------------------------------------------------------- */

    if (
      name !== undefined &&
      (
        typeof name !== 'string' ||
        !name.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Pharmacy name cannot be empty',
      })
    }

    /* --------------------------------------------------------
       Validate address if provided
    -------------------------------------------------------- */

    if (
      address !== undefined &&
      (
        typeof address !== 'string' ||
        !address.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Pharmacy address cannot be empty',
      })
    }

    /* --------------------------------------------------------
       Validate email if provided
    -------------------------------------------------------- */

    if (
      email !== undefined &&
      email !== null &&
      email !== '' &&
      (
        typeof email !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email.trim()
        )
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please provide a valid email address',
      })
    }

    /* --------------------------------------------------------
       Validate status if provided
    -------------------------------------------------------- */

    if (
      status !== undefined &&
      ![
        'ACTIVE',
        'INACTIVE',
        'SUSPENDED',
      ].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pharmacy status',
      })
    }

    /* --------------------------------------------------------
       Determine whether location is being updated
    -------------------------------------------------------- */

    const locationWasProvided =
      latitude !== undefined ||
      longitude !== undefined

    let normalizedLatitude
    let normalizedLongitude

    if (locationWasProvided) {
      const coordinateResult =
        validateCoordinates(
          latitude,
          longitude,
          {
            allowClear: true,
          }
        )

      if (!coordinateResult.valid) {
        return res.status(400).json({
          success: false,
          message:
            coordinateResult.message,
        })
      }

      normalizedLatitude =
        coordinateResult.latitude

      normalizedLongitude =
        coordinateResult.longitude
    }

    /* --------------------------------------------------------
       Make sure pharmacy exists
    -------------------------------------------------------- */

    const {
      data: existingPharmacy,
      error: findError,
    } = await supabase
      .from('pharmacies')
      .select('pharmacy_id')
      .eq('pharmacy_id', pharmacyId)
      .maybeSingle()

    if (findError) {
      console.error(
        'Find pharmacy error:',
        findError
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to verify pharmacy',
        error: findError.message,
      })
    }

    if (!existingPharmacy) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacy not found',
      })
    }

    /* --------------------------------------------------------
       Build update object
    -------------------------------------------------------- */

    const updates = {}

    if (name !== undefined) {
      updates.name = name.trim()
    }

    if (address !== undefined) {
      updates.address = address.trim()
    }

    if (contact_number !== undefined) {
      updates.contact_number =
        typeof contact_number ===
          'string' &&
        contact_number.trim()
          ? contact_number.trim()
          : null
    }

    if (email !== undefined) {
      updates.email =
        typeof email === 'string' &&
        email.trim()
          ? email
              .trim()
              .toLowerCase()
          : null
    }

    if (status !== undefined) {
      updates.status = status
    }

    if (locationWasProvided) {
      updates.latitude =
        normalizedLatitude

      updates.longitude =
        normalizedLongitude
    }

    /* --------------------------------------------------------
       Prevent empty update
    -------------------------------------------------------- */

    if (
      Object.keys(updates).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'No fields provided for update',
      })
    }

    /* --------------------------------------------------------
       Update pharmacy
    -------------------------------------------------------- */

    const { data, error } = await supabase
      .from('pharmacies')
      .update(updates)
      .eq('pharmacy_id', pharmacyId)
      .select()
      .single()

    if (error) {
      console.error(
        'Update pharmacy error:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to update pharmacy',
        error: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      message:
        'Pharmacy updated successfully',
      data,
    })
  } catch (error) {
    console.error(
      'Update pharmacy server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  getPharmacies,
  getPharmacyById,
  createPharmacy,
  updatePharmacy,
}