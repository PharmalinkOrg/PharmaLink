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

module.exports = {
  getMedicineById,
  getMedicines,
}