const supabaseAdmin = require('../config/supabaseAdmin')

const inventoryColumns = `
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
`

/**
 * Validate positive integer IDs
 */
const isValidId = (value) => {
  return (
    Number.isInteger(Number(value)) &&
    Number(value) > 0
  )
}

/**
 * Validate YYYY-MM-DD date format
 */
const isValidDateOnly = (value) => {
  if (!value) return false

  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false
  }

  const date = new Date(`${value}T00:00:00Z`)

  if (Number.isNaN(date.getTime())) {
    return false
  }

  return date.toISOString().slice(0, 10) === value
}

/**
 * Get today's date in YYYY-MM-DD format
 */
const getTodayDateOnly = () => {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Determine inventory status
 *
 * Priority:
 * 1. Expired
 * 2. Out of stock
 * 3. Low stock
 * 4. Available
 */
const getInventoryStatus = (
  quantity,
  reorderLevel,
  expirationDate = null
) => {
  if (
    expirationDate &&
    expirationDate < getTodayDateOnly()
  ) {
    return 'EXPIRED'
  }

  if (quantity === 0) {
    return 'OUT_OF_STOCK'
  }

  if (quantity <= reorderLevel) {
    return 'LOW_STOCK'
  }

  return 'AVAILABLE'
}

/**
 * GET inventory for a pharmacy
 *
 * GET /api/pharmacies/:pharmacyId/inventory
 *
 * SUPER_ADMIN:
 * Can view inventory for any pharmacy.
 *
 * PHARMACY_ADMIN:
 * Can view inventory for their own pharmacy.
 */
const getPharmacyInventory = async (req, res) => {
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
      .select(inventoryColumns)
      .eq('pharmacy_id', pharmacyId)
      .order('inventory_id', { ascending: true })

    if (error) {
      console.error(
        'Get pharmacy inventory error:',
        error
      )

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve pharmacy inventory',
      })
    }

    return res.status(200).json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error(
      'Get pharmacy inventory server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/**
 * CREATE inventory
 *
 * POST /api/pharmacies/:pharmacyId/inventory
 *
 * SUPER_ADMIN:
 * Can create inventory for any pharmacy.
 *
 * PHARMACY_ADMIN:
 * Can create inventory for their own pharmacy.
 */
const createInventory = async (req, res) => {
  try {
    const pharmacyId = Number(req.params.pharmacyId)

    const {
      medicine_id,
      batch_number,
      quantity,
      reorder_level,
      unit_price,
      expiration_date,
    } = req.body

    /**
     * Validate pharmacy ID
     */
    if (!isValidId(pharmacyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pharmacy ID',
      })
    }

    /**
     * Validate medicine ID
     */
    if (!isValidId(medicine_id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID',
      })
    }

    /**
     * Validate batch number
     */
    if (
      typeof batch_number !== 'string' ||
      !batch_number.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Batch number is required',
      })
    }

    /**
     * Validate quantity
     */
    if (
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Quantity must be a non-negative integer',
      })
    }

    /**
     * Validate reorder level
     */
    if (
      !Number.isInteger(Number(reorder_level)) ||
      Number(reorder_level) < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Reorder level must be a non-negative integer',
      })
    }

    /**
     * Validate unit price
     */
    if (
      unit_price === undefined ||
      unit_price === null ||
      Number.isNaN(Number(unit_price)) ||
      Number(unit_price) < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Unit price must be a non-negative number',
      })
    }

    /**
     * Validate expiration date
     */
    if (
      expiration_date !== undefined &&
      expiration_date !== null
    ) {
      if (!isValidDateOnly(expiration_date)) {
        return res.status(400).json({
          success: false,
          message:
            'Expiration date must be a valid date in YYYY-MM-DD format',
        })
      }
    }

    const normalizedQuantity = Number(quantity)
    const normalizedReorderLevel = Number(reorder_level)
    const normalizedUnitPrice = Number(unit_price)
    const normalizedExpirationDate =
      expiration_date || null

    /**
     * Determine status automatically
     */
    const status = getInventoryStatus(
      normalizedQuantity,
      normalizedReorderLevel,
      normalizedExpirationDate
    )

    /**
     * Insert inventory
     */
    const { data, error } = await supabaseAdmin
      .from('inventory')
      .insert({
        pharmacy_id: pharmacyId,
        medicine_id: Number(medicine_id),
        batch_number: batch_number.trim(),
        quantity: normalizedQuantity,
        reorder_level: normalizedReorderLevel,
        unit_price: normalizedUnitPrice,
        expiration_date: normalizedExpirationDate,
        status,
      })
      .select(inventoryColumns)
      .single()

    if (error) {
      console.error(
        'Create inventory error:',
        error
      )

      /**
       * PostgreSQL unique violation
       *
       * pharmacy_id + medicine_id + batch_number
       */
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message:
            'This batch already exists for this medicine in this pharmacy',
        })
      }

      /**
       * PostgreSQL foreign key violation
       */
      if (error.code === '23503') {
        return res.status(400).json({
          success: false,
          message:
            'The specified pharmacy or medicine does not exist',
        })
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to create inventory',
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Inventory created successfully',
      data,
    })
  } catch (error) {
    console.error(
      'Create inventory server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/**
 * UPDATE inventory
 *
 * PATCH /api/pharmacies/:pharmacyId/inventory/:inventoryId
 *
 * SUPER_ADMIN:
 * Can update inventory for any pharmacy.
 *
 * PHARMACY_ADMIN:
 * Can update inventory for their own pharmacy.
 */
const updateInventory = async (req, res) => {
  try {
    const pharmacyId = Number(req.params.pharmacyId)
    const inventoryId = Number(req.params.inventoryId)

    /**
     * Validate pharmacy ID
     */
    if (!isValidId(pharmacyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pharmacy ID',
      })
    }

    /**
     * Validate inventory ID
     */
    if (!isValidId(inventoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid inventory ID',
      })
    }

    /**
     * Find existing inventory record
     */
    const {
      data: existing,
      error: existingError,
    } = await supabaseAdmin
      .from('inventory')
      .select(inventoryColumns)
      .eq('inventory_id', inventoryId)
      .eq('pharmacy_id', pharmacyId)
      .maybeSingle()

    if (existingError) {
      console.error(
        'Find inventory before update error:',
        existingError
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to retrieve inventory record',
      })
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Inventory record not found',
      })
    }

    const {
      medicine_id,
      batch_number,
      quantity,
      reorder_level,
      unit_price,
      expiration_date,
    } = req.body

    const updates = {}

    /**
     * Medicine ID
     */
    if (medicine_id !== undefined) {
      if (!isValidId(medicine_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid medicine ID',
        })
      }

      updates.medicine_id = Number(medicine_id)
    }

    /**
     * Batch number
     */
    if (batch_number !== undefined) {
      if (
        typeof batch_number !== 'string' ||
        !batch_number.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Batch number cannot be empty',
        })
      }

      updates.batch_number = batch_number.trim()
    }

    /**
     * Quantity
     */
    if (quantity !== undefined) {
      if (
        !Number.isInteger(Number(quantity)) ||
        Number(quantity) < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Quantity must be a non-negative integer',
        })
      }

      updates.quantity = Number(quantity)
    }

    /**
     * Reorder level
     */
    if (reorder_level !== undefined) {
      if (
        !Number.isInteger(Number(reorder_level)) ||
        Number(reorder_level) < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Reorder level must be a non-negative integer',
        })
      }

      updates.reorder_level =
        Number(reorder_level)
    }

    /**
     * Unit price
     */
    if (unit_price !== undefined) {
      if (
        unit_price === null ||
        Number.isNaN(Number(unit_price)) ||
        Number(unit_price) < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Unit price must be a non-negative number',
        })
      }

      updates.unit_price = Number(unit_price)
    }

    /**
     * Expiration date
     */
    if (expiration_date !== undefined) {
      if (
        expiration_date !== null &&
        !isValidDateOnly(expiration_date)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Expiration date must be a valid date in YYYY-MM-DD format',
        })
      }

      updates.expiration_date =
        expiration_date || null
    }

    /**
     * Prevent empty update
     */
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          'No fields provided for update',
      })
    }

    /**
     * Determine final values.
     *
     * These are used to calculate the new status.
     */
    const finalQuantity =
      updates.quantity !== undefined
        ? updates.quantity
        : existing.quantity

    const finalReorderLevel =
      updates.reorder_level !== undefined
        ? updates.reorder_level
        : existing.reorder_level

    const finalExpirationDate =
      updates.expiration_date !== undefined
        ? updates.expiration_date
        : existing.expiration_date

    /**
     * Recalculate status
     */
    updates.status = getInventoryStatus(
      finalQuantity,
      finalReorderLevel,
      finalExpirationDate
    )

    /**
     * Perform update
     */
    const { data, error } = await supabaseAdmin
      .from('inventory')
      .update(updates)
      .eq('inventory_id', inventoryId)
      .eq('pharmacy_id', pharmacyId)
      .select(inventoryColumns)
      .single()

    if (error) {
      console.error(
        'Update inventory error:',
        error
      )

      /**
       * Duplicate batch
       */
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message:
            'Another inventory record already uses this batch number for this medicine',
        })
      }

      /**
       * Invalid medicine foreign key
       */
      if (error.code === '23503') {
        return res.status(400).json({
          success: false,
          message:
            'The specified medicine does not exist',
        })
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to update inventory',
      })
    }

    return res.status(200).json({
      success: true,
      message:
        'Inventory updated successfully',
      data,
    })
  } catch (error) {
    console.error(
      'Update inventory server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/**
 * DELETE inventory
 *
 * DELETE /api/pharmacies/:pharmacyId/inventory/:inventoryId
 *
 * SUPER_ADMIN:
 * Can delete inventory for any pharmacy.
 *
 * PHARMACY_ADMIN:
 * Can delete inventory for their own pharmacy.
 */
const deleteInventory = async (req, res) => {
  try {
    const pharmacyId = Number(req.params.pharmacyId)
    const inventoryId = Number(req.params.inventoryId)

    /**
     * Validate pharmacy ID
     */
    if (!isValidId(pharmacyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pharmacy ID',
      })
    }

    /**
     * Validate inventory ID
     */
    if (!isValidId(inventoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid inventory ID',
      })
    }

    /**
     * Delete only from the specified pharmacy
     */
    const { data, error } = await supabaseAdmin
      .from('inventory')
      .delete()
      .eq('inventory_id', inventoryId)
      .eq('pharmacy_id', pharmacyId)
      .select('inventory_id')
      .maybeSingle()

    if (error) {
      console.error(
        'Delete inventory error:',
        error
      )

      return res.status(500).json({
        success: false,
        message: 'Failed to delete inventory',
      })
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Inventory record not found',
      })
    }

    return res.status(200).json({
      success: true,
      message:
        'Inventory deleted successfully',
    })
  } catch (error) {
    console.error(
      'Delete inventory server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/**
 * GET publicly available medicines for a pharmacy
 *
 * GET /api/pharmacies/:pharmacyId/inventory/public
 *
 * This endpoint is intended for the customer PWA.
 */
const getPublicPharmacyInventory = async (
  req,
  res
) => {
  try {
    const pharmacyId = Number(req.params.pharmacyId)

    /**
     * Validate pharmacy ID
     */
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
        batch_number,
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
      .in('status', [
        'AVAILABLE',
        'LOW_STOCK',
      ])
      .order('inventory_id', {
        ascending: true,
      })

    if (error) {
      console.error(
        'Get public pharmacy inventory error:',
        error
      )

      /**
       * Do not expose Supabase/PostgreSQL
       * internals through the public API.
       */
      return res.status(500).json({
        success: false,
        message:
          'Failed to retrieve pharmacy medicines',
      })
    }

    /**
     * Return a cleaner API response.
     */
    const medicines = (data || []).map(
      (item) => ({
        inventory_id: item.inventory_id,
        pharmacy_id: item.pharmacy_id,
        medicine_id: item.medicine_id,
        batch_number: item.batch_number,
        quantity: item.quantity,
        unit_price: item.unit_price,
        expiration_date:
          item.expiration_date,
        status: item.status,
        medicine: item.medicines,
      })
    )

    return res.status(200).json({
      success: true,
      data: medicines,
    })
  } catch (error) {
    console.error(
      'Get public pharmacy inventory server error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/**
 * GET pharmacies that have a specific medicine
 *
 * NOTE:
 * This controller is exported below, but its route
 * should be mounted from a router that uses:
 *
 * GET /api/medicines/:medicineId/pharmacies
 */
const getMedicinePharmacies = async (
  req,
  res
) => {
  try {
    const medicineId = Number(
      req.params.medicineId
    )

    /**
     * Validate medicine ID
     */
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
      .in('status', [
        'AVAILABLE',
        'LOW_STOCK',
      ])
      .order('quantity', {
        ascending: false,
      })

    if (error) {
      console.error(
        'Get medicine pharmacies error:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to retrieve pharmacy availability',
      })
    }

    const pharmacies = (data || [])
      .filter((item) => item.pharmacies)
      .map((item) => ({
        inventory_id:
          item.inventory_id,
        pharmacy_id:
          item.pharmacy_id,
        medicine_id:
          item.medicine_id,
        quantity:
          item.quantity,
        unit_price:
          item.unit_price,
        expiration_date:
          item.expiration_date,
        status:
          item.status,
        pharmacy:
          item.pharmacies,
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
    })
  }
}

module.exports = {
  getPharmacyInventory,
  getPublicPharmacyInventory,
  getMedicinePharmacies,
  createInventory,
  updateInventory,
  deleteInventory,
}