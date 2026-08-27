const supabaseAdmin = require('../config/supabaseAdmin')

const isValidId = (value) => {
  return Number.isInteger(Number(value)) && Number(value) > 0
}

/**
 * GET customer-visible inventory for a pharmacy
 *
 * GET /api/pharmacies/:pharmacyId/available-medicines
 */
const getAvailableMedicines = async (req, res) => {
  try {
    const pharmacyId = Number(req.params.pharmacyId)

    if (!isValidId(pharmacyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pharmacy ID',
      })
    }

    const { data, error } = await supabaseAdmin
      .from('inventory')
      .select(`
        inventory_id,
        pharmacy_id,
        medicine_id,
        quantity,
        unit_price,
        expiration_date,
        status,
        medicines (
          medicine_id,
          generic_name,
          brand_name,
          dosage,
          dosage_form,
          description,
          requires_prescription,
          status
        )
      `)
      .eq('pharmacy_id', pharmacyId)
      .eq('status', 'AVAILABLE')
      .gt('quantity', 0)
      .eq('medicines.status', 'ACTIVE')
      .order('inventory_id', { ascending: true })

    if (error) {
      console.error('Get available medicines error:', error)

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve available medicines',
      })
    }

    return res.status(200).json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error(
      'Get available medicines server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

module.exports = {
  getAvailableMedicines,
}