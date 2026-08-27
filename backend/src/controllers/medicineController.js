const supabaseAdmin = require('../config/supabaseAdmin')

const medicineColumns = `
  medicine_id,
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
 * GET single medicine
 * GET /api/medicines/:medicineId
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
 * GET all medicines
 * GET /api/medicines
 */
const getMedicines = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('medicines')
      .select(medicineColumns)
      .eq('status', 'ACTIVE')
      .order('generic_name', { ascending: true })

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

    // Check if medicine exists
    const {
      data: existingMedicine,
      error: findError,
    } = await supabaseAdmin
      .from('medicines')
      .select(medicineColumns)
      .eq('medicine_id', medicineId)
      .single()

    if (findError || !existingMedicine) {
      if (findError?.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found',
        })
      }

      console.error('Find medicine error:', findError)

      return res.status(500).json({
        success: false,
        message: 'Failed to find medicine',
        error: findError?.message,
        code: findError?.code,
      })
    }

    const updates = {}

    // Category
    if (category_id !== undefined) {
      if (!isValidId(category_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID',
        })
      }

      updates.category_id = Number(category_id)
    }

    // Generic name
    if (generic_name !== undefined) {
      if (
        typeof generic_name !== 'string' ||
        !generic_name.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Generic name cannot be empty',
        })
      }

      updates.generic_name = generic_name.trim()
    }

    // Brand name
    if (brand_name !== undefined) {
      if (
        typeof brand_name !== 'string' ||
        !brand_name.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Brand name cannot be empty',
        })
      }

      updates.brand_name = brand_name.trim()
    }

    // Dosage
    if (dosage !== undefined) {
      if (
        typeof dosage !== 'string' ||
        !dosage.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Dosage cannot be empty',
        })
      }

      updates.dosage = dosage.trim()
    }

    // Dosage form
    if (dosage_form !== undefined) {
      if (
        typeof dosage_form !== 'string' ||
        !dosage_form.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Dosage form cannot be empty',
        })
      }

      updates.dosage_form = dosage_form.trim()
    }

    // Description
    if (description !== undefined) {
      updates.description =
        description === null
          ? null
          : String(description).trim()
    }

    // Prescription requirement
    if (requires_prescription !== undefined) {
      if (typeof requires_prescription !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'requires_prescription must be a boolean',
        })
      }

      updates.requires_prescription = requires_prescription
    }

    // Status
    if (status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid medicine status',
        })
      }

      updates.status = status
    }

    // Prevent empty update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields provided for update',
      })
    }

    // Perform update
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
 * DELETE medicine
 * DELETE /api/medicines/:medicineId
 *
 * Soft delete:
 * Changes medicine status to INACTIVE instead of
 * physically deleting the database record.
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

    // Check if medicine exists
    const {
      data: existingMedicine,
      error: findError,
    } = await supabaseAdmin
      .from('medicines')
      .select('medicine_id, status')
      .eq('medicine_id', medicineId)
      .single()

    if (findError || !existingMedicine) {
      if (findError?.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found',
        })
      }

      console.error('Find medicine for delete error:', findError)

      return res.status(500).json({
        success: false,
        message: 'Failed to find medicine',
        error: findError?.message,
        code: findError?.code,
      })
    }

    // Prevent deleting an already inactive medicine
    if (existingMedicine.status === 'INACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Medicine is already inactive',
      })
    }

    // Soft delete
    const {
      data,
      error,
    } = await supabaseAdmin
      .from('medicines')
      .update({
        status: 'INACTIVE',
      })
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