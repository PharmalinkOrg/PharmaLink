const supabaseAdmin = require('../config/supabaseAdmin')

/* ============================================================
   HELPERS
============================================================ */

/**
 * Validate positive integer IDs.
 */
const isValidId = (value) => {
  return (
    Number.isInteger(Number(value)) &&
    Number(value) > 0
  )
}

/**
 * Normalize medicine values when generating the
 * customer-facing logical medicine key.
 */
const normalizeMedicineValue = (value) => {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/**
 * Create a logical medicine key.
 *
 * Medicines remain pharmacy-owned and may have different
 * medicine IDs. This key is only used to group equivalent
 * medicine variants for the Customer PWA.
 */
const createMedicineKey = (medicine) => {
  return [
    normalizeMedicineValue(medicine.generic_name),
    normalizeMedicineValue(medicine.brand_name),
    normalizeMedicineValue(medicine.dosage),
    normalizeMedicineValue(medicine.dosage_form),
    medicine.requires_prescription ? 'rx' : 'otc',
  ].join('|')
}

/* ============================================================
   GET AVAILABLE MEDICINES FOR ONE PHARMACY
============================================================ */

/**
 * GET customer-visible inventory for one pharmacy.
 *
 * GET /api/pharmacies/:pharmacyId/available-medicines
 */
const getAvailableMedicines = async (req, res) => {
  try {
    const pharmacyId = Number(
      req.params.pharmacyId
    )

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
          pharmacy_id,
          category_id,
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
      .in('status', [
        'AVAILABLE',
        'LOW_STOCK',
      ])
      .gt('quantity', 0)
      .order('inventory_id', {
        ascending: true,
      })

    if (error) {
      console.error(
        'Get available medicines error:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to retrieve available medicines',
        error: error.message,
        code: error.code,
      })
    }

    /*
     * Supabase embedded filters do not always remove the
     * parent inventory row when the joined medicine does
     * not match, so filter inactive/null medicines here.
     */
    const availableMedicines = (data || []).filter(
      (item) => {
        if (!item.medicines) {
          return false
        }

        if (item.medicines.status !== 'ACTIVE') {
          return false
        }

        /*
         * Ensure the medicine belongs to the same pharmacy
         * as the inventory record.
         */
        return (
          Number(item.medicines.pharmacy_id) ===
          Number(item.pharmacy_id)
        )
      }
    )

    return res.status(200).json({
      success: true,
      data: availableMedicines,
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

/* ============================================================
   GET AGGREGATED CUSTOMER MEDICINES
============================================================ */

/**
 * GET aggregated customer-visible medicines.
 *
 * GET /api/pharmacies/available-medicines
 *
 * Each pharmacy keeps its own medicine records.
 *
 * Equivalent medicine records are grouped into one
 * customer-facing result while preserving each pharmacy's
 * actual pharmacy_id and medicine_id inside "offerings".
 */
const getCustomerMedicines = async (
  req,
  res
) => {
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
      .in('status', [
        'AVAILABLE',
        'LOW_STOCK',
      ])
      .gt('quantity', 0)
      .order('inventory_id', {
        ascending: true,
      })

    if (error) {
      console.error(
        'Get customer medicines error:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to retrieve available medicines',
        error: error.message,
        code: error.code,
      })
    }

    const groups = new Map()

    for (const item of data || []) {
      const medicine = item.medicines
      const pharmacy = item.pharmacies

      /*
       * Ignore rows with broken/missing relationships.
       */
      if (!medicine || !pharmacy) {
        continue
      }

      /*
       * Customer PWA should only see active medicines
       * belonging to active pharmacies.
       */
      if (medicine.status !== 'ACTIVE') {
        continue
      }

      if (pharmacy.status !== 'ACTIVE') {
        continue
      }

      /*
       * Protect against inconsistent ownership.
       *
       * Inventory pharmacy
       *      =
       * Medicine owner
       *      =
       * Joined pharmacy
       */
      if (
        Number(medicine.pharmacy_id) !==
          Number(item.pharmacy_id) ||
        Number(pharmacy.pharmacy_id) !==
          Number(item.pharmacy_id)
      ) {
        continue
      }

      const medicineKey =
        createMedicineKey(medicine)

      /*
       * Create the logical customer-facing medicine
       * the first time this variant is encountered.
       */
      if (!groups.has(medicineKey)) {
        groups.set(medicineKey, {
          medicine_key: medicineKey,

          generic_name:
            medicine.generic_name,

          brand_name:
            medicine.brand_name,

          dosage:
            medicine.dosage,

          dosage_form:
            medicine.dosage_form,

          description:
            medicine.description,

          requires_prescription:
            medicine.requires_prescription,

          category_id:
            medicine.category_id,

          pharmacy_count: 0,

          total_available_quantity: 0,

          offerings: [],
        })
      }

      const group =
        groups.get(medicineKey)

      /*
       * A pharmacy-owned medicine may have multiple
       * inventory batches.
       *
       * Combine those batches into one pharmacy offering.
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
          pharmacy_id:
            item.pharmacy_id,

          medicine_id:
            item.medicine_id,

          pharmacy: {
            pharmacy_id:
              pharmacy.pharmacy_id,

            name:
              pharmacy.name,

            address:
              pharmacy.address,

            contact_number:
              pharmacy.contact_number,
          },

          quantity: 0,

          lowest_price: null,

          batches: [],
        }

        group.offerings.push(offering)
      }

      const quantity =
        Number(item.quantity) || 0

      const price =
        Number(item.unit_price)

      offering.quantity += quantity

      group.total_available_quantity +=
        quantity

      /*
       * A medicine can exist in multiple batches with
       * different prices. Show the lowest currently
       * available price for the pharmacy offering.
       */
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
        inventory_id:
          item.inventory_id,

        quantity:
          item.quantity,

        unit_price:
          item.unit_price,

        expiration_date:
          item.expiration_date,

        status:
          item.status,
      })
    }

    /*
     * Convert Map -> Array and calculate how many
     * distinct pharmacies offer each logical medicine.
     */
    const medicines =
      Array.from(groups.values())
        .map((medicine) => ({
          ...medicine,

          pharmacy_count: new Set(
            medicine.offerings.map(
              (offering) =>
                Number(offering.pharmacy_id)
            )
          ).size,
        }))
        .sort((a, b) => {
          return String(
            a.generic_name || ''
          ).localeCompare(
            String(b.generic_name || '')
          )
        })

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

/* ============================================================
   GET PHARMACIES FOR AN EQUIVALENT MEDICINE
============================================================ */

/**
 * GET pharmacies offering an equivalent medicine.
 *
 * GET /api/pharmacies/medicine/:medicineId/pharmacies
 *
 * The medicineId in the URL represents one pharmacy-owned
 * medicine record.
 *
 * We first determine what logical medicine variant that ID
 * represents, then find equivalent medicine records belonging
 * to other pharmacies.
 *
 * Example:
 *
 * medicine_id 214
 * Rose Pharmacy
 * Ambroxol / Mucosolvan / 30 mg / Tablet
 *
 * becomes:
 *
 * 214 -> Rose Pharmacy
 * 134 -> Gv Botica
 * ... -> other pharmacies
 */
const getMedicinePharmacies = async (
  req,
  res
) => {
  try {
    const medicineId = Number(
      req.params.medicineId
    )

    if (!isValidId(medicineId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID',
      })
    }

    /* --------------------------------------------------------
       1. Get the representative medicine
    -------------------------------------------------------- */

    const {
      data: representativeMedicine,
      error: medicineError,
    } = await supabaseAdmin
      .from('medicines')
      .select(`
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
      `)
      .eq('medicine_id', medicineId)
      .maybeSingle()

    if (medicineError) {
      console.error(
        'Get representative medicine error:',
        medicineError
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to retrieve medicine',
        error: medicineError.message,
        code: medicineError.code,
      })
    }

    if (!representativeMedicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found',
      })
    }

    if (
      representativeMedicine.status !==
      'ACTIVE'
    ) {
      return res.status(404).json({
        success: false,
        message:
          'Medicine is not available',
      })
    }

    /* --------------------------------------------------------
       2. Find equivalent pharmacy-owned medicine records
    -------------------------------------------------------- */

    let equivalentQuery =
      supabaseAdmin
        .from('medicines')
        .select(`
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
        `)
        .eq(
          'generic_name',
          representativeMedicine.generic_name
        )
        .eq(
          'dosage',
          representativeMedicine.dosage
        )
        .eq(
          'dosage_form',
          representativeMedicine.dosage_form
        )
        .eq(
          'requires_prescription',
          representativeMedicine.requires_prescription
        )
        .eq(
          'status',
          'ACTIVE'
        )

    /*
     * PostgreSQL requires IS NULL instead of = NULL.
     */
    if (
      representativeMedicine.brand_name ===
        null ||
      representativeMedicine.brand_name ===
        undefined
    ) {
      equivalentQuery =
        equivalentQuery.is(
          'brand_name',
          null
        )
    } else {
      equivalentQuery =
        equivalentQuery.eq(
          'brand_name',
          representativeMedicine.brand_name
        )
    }

    const {
      data: equivalentMedicines,
      error: equivalentError,
    } = await equivalentQuery

    if (equivalentError) {
      console.error(
        'Get equivalent medicines error:',
        equivalentError
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to retrieve equivalent medicines',
        error: equivalentError.message,
        code: equivalentError.code,
      })
    }

    /*
     * This should normally contain at least the
     * representative medicine itself.
     */
    if (
      !equivalentMedicines ||
      equivalentMedicines.length === 0
    ) {
      return res.status(200).json({
        success: true,

        data: {
          medicine: {
            medicine_id:
              representativeMedicine.medicine_id,

            category_id:
              representativeMedicine.category_id,

            generic_name:
              representativeMedicine.generic_name,

            brand_name:
              representativeMedicine.brand_name,

            dosage:
              representativeMedicine.dosage,

            dosage_form:
              representativeMedicine.dosage_form,

            description:
              representativeMedicine.description,

            requires_prescription:
              representativeMedicine.requires_prescription,
          },

          medicine_key:
            createMedicineKey(
              representativeMedicine
            ),

          pharmacy_count: 0,

          total_available_quantity: 0,

          offerings: [],
        },
      })
    }

    const equivalentMedicineIds =
      equivalentMedicines.map(
        (medicine) =>
          Number(medicine.medicine_id)
      )

    /* --------------------------------------------------------
       3. Retrieve available inventory for equivalents
    -------------------------------------------------------- */

    const {
      data: inventoryRows,
      error: inventoryError,
    } = await supabaseAdmin
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
          name,
          address,
          contact_number,
          status
        )
      `)
      .in(
        'medicine_id',
        equivalentMedicineIds
      )
      .in('status', [
        'AVAILABLE',
        'LOW_STOCK',
      ])
      .gt('quantity', 0)
      .order('inventory_id', {
        ascending: true,
      })

    if (inventoryError) {
      console.error(
        'Get equivalent medicine inventory error:',
        inventoryError
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to retrieve pharmacy availability',
        error: inventoryError.message,
        code: inventoryError.code,
      })
    }

    /* --------------------------------------------------------
       4. Aggregate batches by pharmacy + medicine
    -------------------------------------------------------- */

    const medicineById = new Map(
      equivalentMedicines.map(
        (medicine) => [
          Number(medicine.medicine_id),
          medicine,
        ]
      )
    )

    const offeringsMap = new Map()

    for (
      const item of inventoryRows || []
    ) {
      const pharmacy =
        item.pharmacies

      if (!pharmacy) {
        continue
      }

      if (
        pharmacy.status !== 'ACTIVE'
      ) {
        continue
      }

      const equivalentMedicine =
        medicineById.get(
          Number(item.medicine_id)
        )

      if (!equivalentMedicine) {
        continue
      }

      /*
       * Inventory, medicine and pharmacy must all
       * represent the same pharmacy.
       */
      if (
        Number(
          equivalentMedicine.pharmacy_id
        ) !==
          Number(item.pharmacy_id) ||
        Number(
          pharmacy.pharmacy_id
        ) !==
          Number(item.pharmacy_id)
      ) {
        continue
      }

      const offeringKey =
        `${item.pharmacy_id}:${item.medicine_id}`

      if (
        !offeringsMap.has(
          offeringKey
        )
      ) {
        offeringsMap.set(
          offeringKey,
          {
            pharmacy_id:
              item.pharmacy_id,

            medicine_id:
              item.medicine_id,

            pharmacy: {
              pharmacy_id:
                pharmacy.pharmacy_id,

              name:
                pharmacy.name,

              address:
                pharmacy.address,

              contact_number:
                pharmacy.contact_number,
            },

            quantity: 0,

            lowest_price: null,

            batches: [],
          }
        )
      }

      const offering =
        offeringsMap.get(
          offeringKey
        )

      const quantity =
        Number(item.quantity) || 0

      const price =
        Number(item.unit_price)

      offering.quantity +=
        quantity

      if (
        Number.isFinite(price) &&
        (
          offering.lowest_price ===
            null ||
          price <
            offering.lowest_price
        )
      ) {
        offering.lowest_price =
          price
      }

      offering.batches.push({
        inventory_id:
          item.inventory_id,

        quantity:
          item.quantity,

        unit_price:
          item.unit_price,

        expiration_date:
          item.expiration_date,

        status:
          item.status,
      })
    }

    /* --------------------------------------------------------
       5. Build customer-facing pharmacy offerings
    -------------------------------------------------------- */

    const offerings =
      Array.from(
        offeringsMap.values()
      ).sort((a, b) => {
        /*
         * Lowest price first.
         *
         * Offerings without a valid price go last.
         */
        if (
          a.lowest_price === null &&
          b.lowest_price === null
        ) {
          return 0
        }

        if (
          a.lowest_price === null
        ) {
          return 1
        }

        if (
          b.lowest_price === null
        ) {
          return -1
        }

        return (
          a.lowest_price -
          b.lowest_price
        )
      })

    const totalAvailableQuantity =
      offerings.reduce(
        (total, offering) => {
          return (
            total +
            Number(
              offering.quantity || 0
            )
          )
        },
        0
      )

    const pharmacyCount =
      new Set(
        offerings.map(
          (offering) =>
            Number(
              offering.pharmacy_id
            )
        )
      ).size

    /* --------------------------------------------------------
       6. Return medicine + pharmacy availability
    -------------------------------------------------------- */

    return res.status(200).json({
      success: true,

      data: {
        medicine: {
          medicine_id:
            representativeMedicine.medicine_id,

          category_id:
            representativeMedicine.category_id,

          generic_name:
            representativeMedicine.generic_name,

          brand_name:
            representativeMedicine.brand_name,

          dosage:
            representativeMedicine.dosage,

          dosage_form:
            representativeMedicine.dosage_form,

          description:
            representativeMedicine.description,

          requires_prescription:
            representativeMedicine.requires_prescription,
        },

        medicine_key:
          createMedicineKey(
            representativeMedicine
          ),

        pharmacy_count:
          pharmacyCount,

        total_available_quantity:
          totalAvailableQuantity,

        offerings,
      },
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

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  getAvailableMedicines,
  getCustomerMedicines,
  getMedicinePharmacies,
}