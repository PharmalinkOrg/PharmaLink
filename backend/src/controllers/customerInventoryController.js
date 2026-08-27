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
        error: error.message,
        code: error.code,
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
      error: error.message,
    })
  }
}

/**
 * GET pharmacies that have a specific medicine
 *
 * GET /api/pharmacies/medicine/:medicineId/pharmacies
 */
const getMedicinePharmacies = async (req, res) => {
  try {
    const medicineId = Number(req.params.medicineId)

    if (!isValidId(medicineId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID',
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
        pharmacies (
          pharmacy_id,
          pharmacy_name,
          address,
          contact_number,
          status
        )
      `)
      .eq('medicine_id', medicineId)
      .in('status', ['AVAILABLE', 'LOW_STOCK'])
      .gt('quantity', 0)
      .eq('pharmacies.status', 'ACTIVE')
      .order('quantity', { ascending: false })

    if (error) {
      console.error(
        'Get medicine pharmacies error:',
        error
      )

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve pharmacy availability',
        error: error.message,
        code: error.code,
      })
    }

    const pharmacies = (data || [])
      .filter((item) => item.pharmacies)
      .map((item) => ({
        inventory_id: item.inventory_id,
        pharmacy_id: item.pharmacy_id,
        medicine_id: item.medicine_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        expiration_date: item.expiration_date,
        status: item.status,
        pharmacy: item.pharmacies,
      }))

    return res.status(200).json({
      success: true,
      data: pharmacies,
    })
  } catch (error) {
    console.error(
      'Get medicine pharmacies server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    })
  }
}

module.exports = {
  getAvailableMedicines,
  getMedicinePharmacies,
}