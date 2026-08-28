const supabaseAdmin = require('../config/supabaseAdmin')

const medicineColumns = `
  medicine_id,
  pharmacy_id,
  category_id,
  generic_name,
  brand_name,
  dosage,
  dosage_form,
  description,
  requires_prescription,
  status,
  created_at,
  updated_at
`

const isValidId = (value) => {
  return Number.isInteger(Number(value)) && Number(value) > 0
}

/**
 * GET all medicines
 * GET /api/medicines
 * GET /api/medicines?pharmacy_id=1
 *
 * Public. Optionally scoped to a single pharmacy via query param.
 * With no pharmacy_id, returns all active medicines across all
 * pharmacies (for future cross-pharmacy customer search).
 */
const getMedicines = async (req, res) => {
  try {
    const { pharmacy_id } = req.query

    let query = supabaseAdmin
      .from('medicines')
      .select(medicineColumns)
      .eq('status', 'ACTIVE')
      .order('generic_name', { ascending: true })

    if (pharmacy_id !== undefined) {
      if (!isValidId(pharmacy_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pharmacy_id',
        })
      }
      query = query.eq('pharmacy_id', Number(pharmacy_id))
    }

    const { data, error } = await query

    if (error) {
      console.error('Get medicines error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve medicines',
        error: error.message,
        code: error.code,
      })
    }

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Get medicines server error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    })
  }
}

/**
 * GET single medicine
 * GET /api/medicines/:medicineId
 * Public — reading one medicine by ID carries the same low
 * sensitivity as browsing the list.
 */
const getMedicineById = async (req, res) => {
  try {
    const medicineId = Number(req.params.medicineId)

    if (!isValidId(medicineId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID',
      })
    }

    const { data, error } = await supabaseAdmin
      .from('medicines')
      .select(medicineColumns)
      .eq('medicine_id', medicineId)
      .single()

    if (error) {
      console.error('Get medicine error:', error)

      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found',
        })
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve medicine',
        error: error.message,
        code: error.code,
      })
    }

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Get medicine server error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    })
  }
}

/**
 * CREATE medicine
 * POST /api/medicines
 * Restricted to SUPER_ADMIN and PHARMACY_ADMIN.
 * A medicine is always created under the caller's own pharmacy —
 * SUPER_ADMIN must explicitly provide pharmacy_id in the body,
 * PHARMACY_ADMIN is always scoped to their own, regardless of
 * what (if anything) they send.
 */
const createMedicine = async (req, res) => {
  try {
    const {
      category_id,
      generic_name,
      brand_name,
      dosage,
      dosage_form,
      description,
      requires_prescription,
    } = req.body

    let pharmacy_id

    if (req.pharmaUser.role === 'SUPER_ADMIN') {
      if (!isValidId(req.body.pharmacy_id)) {
        return res.status(400).json({
          success: false,
          message: 'pharmacy_id is required for Super Admin',
        })
      }
      pharmacy_id = Number(req.body.pharmacy_id)
    } else {
      // PHARMACY_ADMIN — always scoped to their own pharmacy,
      // ignoring any pharmacy_id the client might send.
      pharmacy_id = req.pharmaUser.pharmacy_id
    }

    if (!isValidId(category_id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
      })
    }

    if (!generic_name || !generic_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Generic name is required',
      })
    }

    if (!dosage || !dosage.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Dosage is required',
      })
    }

    if (!dosage_form || !dosage_form.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Dosage form is required',
      })
    }

    const { data, error } = await supabaseAdmin
      .from('medicines')
      .insert({
        pharmacy_id,
        category_id: Number(category_id),
        generic_name: generic_name.trim(),
        brand_name: brand_name?.trim() || null,
        dosage: dosage.trim(),
        dosage_form: dosage_form.trim(),
        description: description?.trim() || null,
        requires_prescription: Boolean(requires_prescription),
        status: 'ACTIVE',
      })
      .select(medicineColumns)
      .single()

    if (error) {
      console.error('Create medicine error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to create medicine',
        error: error.message,
        code: error.code,
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Medicine created successfully',
      data,
    })
  } catch (error) {
    console.error('Create medicine server error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    })
  }
}

/**
 * Shared ownership check for update/delete.
 * SUPER_ADMIN may act on any medicine.
 * PHARMACY_ADMIN may only act on medicines belonging to
 * their own pharmacy.
 */
const assertOwnership = async (medicineId, pharmaUser) => {
  const { data: existingMedicine, error: findError } = await supabaseAdmin
    .from('medicines')
    .select('medicine_id, pharmacy_id, status')
    .eq('medicine_id', medicineId)
    .single()

  if (findError || !existingMedicine) {
    return { error: { status: 404, message: 'Medicine not found' } }
  }

  if (
    pharmaUser.role !== 'SUPER_ADMIN' &&
    existingMedicine.pharmacy_id !== pharmaUser.pharmacy_id
  ) {
    return {
      error: {
        status: 403,
        message: 'You do not have access to this medicine',
      },
    }
  }

  return { medicine: existingMedicine }
}

/**
 * UPDATE medicine
 * PATCH /api/medicines/:medicineId
 */
const updateMedicine = async (req, res) => {
  try {
    const medicineId = Number(req.params.medicineId)

    if (!isValidId(medicineId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID',
      })
    }

    const { medicine: existingMedicine, error: ownershipError } =
      await assertOwnership(medicineId, req.pharmaUser)

    if (ownershipError) {
      return res.status(ownershipError.status).json({
        success: false,
        message: ownershipError.message,
      })
    }

    const {
      category_id,
      generic_name,
      brand_name,
      dosage,
      dosage_form,
      description,
      requires_prescription,
      status,
    } = req.body

    const updates = {}

    if (category_id !== undefined) {
      if (!isValidId(category_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID',
        })
      }
      updates.category_id = Number(category_id)
    }

    if (generic_name !== undefined) {
      if (typeof generic_name !== 'string' || !generic_name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Generic name cannot be empty',
        })
      }
      updates.generic_name = generic_name.trim()
    }

    if (brand_name !== undefined) {
      if (typeof brand_name !== 'string' || !brand_name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Brand name cannot be empty',
        })
      }
      updates.brand_name = brand_name.trim()
    }

    if (dosage !== undefined) {
      if (typeof dosage !== 'string' || !dosage.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Dosage cannot be empty',
        })
      }
      updates.dosage = dosage.trim()
    }

    if (dosage_form !== undefined) {
      if (typeof dosage_form !== 'string' || !dosage_form.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Dosage form cannot be empty',
        })
      }
      updates.dosage_form = dosage_form.trim()
    }

    if (description !== undefined) {
      updates.description = description === null ? null : String(description).trim()
    }

    if (requires_prescription !== undefined) {
      if (typeof requires_prescription !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'requires_prescription must be a boolean',
        })
      }
      updates.requires_prescription = requires_prescription
    }

    if (status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid medicine status',
        })
      }
      updates.status = status
    }

    // pharmacy_id is intentionally never accepted here — ownership
    // cannot be reassigned through an update, by anyone.

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields provided for update',
      })
    }

    const { data, error } = await supabaseAdmin
      .from('medicines')
      .update(updates)
      .eq('medicine_id', medicineId)
      .select(medicineColumns)
      .single()

    if (error) {
      console.error('Update medicine error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to update medicine',
        error: error.message,
        code: error.code,
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Medicine updated successfully',
      data,
    })
  } catch (error) {
    console.error('Update medicine server error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    })
  }
}

/**
 * DELETE medicine (soft delete)
 * DELETE /api/medicines/:medicineId
 */
const deleteMedicine = async (req, res) => {
  try {
    const medicineId = Number(req.params.medicineId)

    if (!isValidId(medicineId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID',
      })
    }

    const { medicine: existingMedicine, error: ownershipError } =
      await assertOwnership(medicineId, req.pharmaUser)

    if (ownershipError) {
      return res.status(ownershipError.status).json({
        success: false,
        message: ownershipError.message,
      })
    }

    if (existingMedicine.status === 'INACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Medicine is already inactive',
      })
    }

    const { data, error } = await supabaseAdmin
      .from('medicines')
      .update({ status: 'INACTIVE' })
      .eq('medicine_id', medicineId)
      .select(medicineColumns)
      .single()

    if (error) {
      console.error('Delete medicine error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to deactivate medicine',
        error: error.message,
        code: error.code,
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Medicine deactivated successfully',
      data,
    })
  } catch (error) {
    console.error('Delete medicine server error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    })
  }
}

module.exports = {
  getMedicineById,
  getMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine,
}