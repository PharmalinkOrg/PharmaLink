const supabaseAdmin = require('../config/supabaseAdmin')

// GET inventory for a specific pharmacy
const getPharmacyInventory = async (req, res) => {
  try {
    const pharmacyId = Number(req.params.pharmacyId)

    if (!Number.isInteger(pharmacyId) || pharmacyId <= 0) {
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
        batch_number,
        quantity,
        reorder_level,
        unit_price,
        expiration_date,
        status,
        created_at,
        updated_at
      `)
      .eq('pharmacy_id', pharmacyId)
      .order('inventory_id', { ascending: true })

    if (error) {
      console.error('Get pharmacy inventory error:', error)

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve pharmacy inventory',
      })
    }

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Get pharmacy inventory server error:', error)

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

module.exports = {
  getPharmacyInventory,
}