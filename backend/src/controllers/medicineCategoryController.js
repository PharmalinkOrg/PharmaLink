const supabaseAdmin = require('../config/supabaseAdmin')

/**
 * GET all medicine categories
 * GET /api/medicine-categories
 * Public — reference data, same for every pharmacy.
 */
const getMedicineCategories = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('medicine_categories')
      .select('category_id, name, description, status')
      .eq('status', 'ACTIVE')
      .order('name', { ascending: true })

    if (error) {
      console.error('Get medicine categories error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve medicine categories',
        error: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Get medicine categories server error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    })
  }
}

module.exports = {
  getMedicineCategories,
}