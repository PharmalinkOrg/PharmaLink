const supabaseAdmin = require('../config/supabaseAdmin')

const isValidId = (value) => {
  return Number.isInteger(Number(value)) && Number(value) > 0
}

const normalizeMedicineValue = (value) => {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

const createMedicineKey = (medicine) => {
  return [
    normalizeMedicineValue(medicine.generic_name),
    normalizeMedicineValue(medicine.brand_name),
    normalizeMedicineValue(medicine.dosage),
    normalizeMedicineValue(medicine.dosage_form),
    medicine.requires_prescription ? 'rx' : 'otc',
  ].join('|')
}

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
      .in('status', ['AVAILABLE', 'LOW_STOCK'])
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

/**
 * GET aggregated customer-visible medicines
 *
 * GET /api/pharmacies/available-medicines
 *
 * Equivalent medicine records belonging to different
 * pharmacies are grouped into one customer-facing result.
 *
 * Pharmacy ownership is preserved through offerings.
 */
const getCustomerMedicines = async (req, res) => {
  try {
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
          pharmacy_id,
          category_id,
          generic_name,
          brand_name,
          dosage,
          dosage_form,
          description,
          requires_prescription,
          status
        ),
        pharmacies (
          pharmacy_id,
          name,
          address,
          contact_number,
          status
        )
      `)
      .in('status', ['AVAILABLE', 'LOW_STOCK'])
      .gt('quantity', 0)
      .order('inventory_id', { ascending: true })

    if (error) {
      console.error(
        'Get customer medicines error:',
        error
      )

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve available medicines',
        error: error.message,
        code: error.code,
      })
    }

    const groups = new Map()

    for (const item of data || []) {
      const medicine = item.medicines
      const pharmacy = item.pharmacies

      if (!medicine || !pharmacy) {
        continue
      }

      if (medicine.status !== 'ACTIVE') {
        continue
      }

      if (pharmacy.status !== 'ACTIVE') {
        continue
      }

      /*
       * Ensure all three records belong to
       * the same pharmacy.
       */
      if (
        Number(medicine.pharmacy_id) !==
          Number(item.pharmacy_id) ||
        Number(pharmacy.pharmacy_id) !==
          Number(item.pharmacy_id)
      ) {
        continue
      }

      const medicineKey = createMedicineKey(medicine)

      if (!groups.has(medicineKey)) {
        groups.set(medicineKey, {
          medicine_key: medicineKey,

          generic_name: medicine.generic_name,
          brand_name: medicine.brand_name,
          dosage: medicine.dosage,
          dosage_form: medicine.dosage_form,
          description: medicine.description,
          requires_prescription:
            medicine.requires_prescription,

          category_id: medicine.category_id,

          pharmacy_count: 0,
          total_available_quantity: 0,

          offerings: [],
        })
      }

      const group = groups.get(medicineKey)

      /*
       * A pharmacy medicine can have multiple
       * inventory batches.
       */
      let offering = group.offerings.find(
        (existing) =>
          Number(existing.pharmacy_id) ===
            Number(item.pharmacy_id) &&
          Number(existing.medicine_id) ===
            Number(item.medicine_id)
      )

      if (!offering) {
        offering = {
          pharmacy_id: item.pharmacy_id,
          medicine_id: item.medicine_id,

          pharmacy: {
            pharmacy_id: pharmacy.pharmacy_id,
            name: pharmacy.name,
            address: pharmacy.address,
            contact_number:
              pharmacy.contact_number,
          },

          quantity: 0,
          lowest_price: null,

          batches: [],
        }

        group.offerings.push(offering)
      }

      const quantity = Number(item.quantity) || 0
      const price = Number(item.unit_price)

      offering.quantity += quantity
      group.total_available_quantity += quantity

      if (
        Number.isFinite(price) &&
        (
          offering.lowest_price === null ||
          price < offering.lowest_price
        )
      ) {
        offering.lowest_price = price
      }

      offering.batches.push({
        inventory_id: item.inventory_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        expiration_date: item.expiration_date,
        status: item.status,
      })
    }

    const medicines = Array.from(groups.values())
      .map((medicine) => ({
        ...medicine,

        pharmacy_count: new Set(
          medicine.offerings.map(
            (offering) => offering.pharmacy_id
          )
        ).size,
      }))
      .sort((a, b) =>
        a.generic_name.localeCompare(
          b.generic_name
        )
      )

    return res.status(200).json({
      success: true,
      data: medicines,
    })
  } catch (error) {
    console.error(
      'Get customer medicines server error:',
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
  getCustomerMedicines,
  getMedicinePharmacies,
}