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

const isValidId = (value) => {
  return Number.isInteger(Number(value)) && Number(value) > 0
}

const getInventoryStatus = (quantity, reorderLevel) => {
  if (quantity === 0) return 'OUT_OF_STOCK'

  if (quantity <= reorderLevel) return 'LOW_STOCK'

  return 'AVAILABLE'
}

/**
 * GET inventory for a pharmacy
 * GET /api/pharmacies/:pharmacyId/inventory
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
      console.error('Get pharmacy inventory error:', error)

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
    console.error('Get pharmacy inventory server error:', error)

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/**
 * CREATE inventory
 * POST /api/pharmacies/:pharmacyId/inventory
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

    if (!isValidId(pharmacyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pharmacy ID',
      })
    }

    if (!isValidId(medicine_id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID',
      })
    }

    if (!batch_number || !batch_number.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Batch number is required',
      })
    }

    if (
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a non-negative integer',
      })
    }

    if (
      !Number.isInteger(Number(reorder_level)) ||
      Number(reorder_level) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Reorder level must be a non-negative integer',
      })
    }

    if (
      unit_price === undefined ||
      Number.isNaN(Number(unit_price)) ||
      Number(unit_price) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Unit price must be a non-negative number',
      })
    }

    const normalizedQuantity = Number(quantity)
    const normalizedReorderLevel = Number(reorder_level)
    const normalizedUnitPrice = Number(unit_price)

    const status = getInventoryStatus(
      normalizedQuantity,
      normalizedReorderLevel
    )

    const { data, error } = await supabaseAdmin
      .from('inventory')
      .insert({
        pharmacy_id: pharmacyId,
        medicine_id: Number(medicine_id),
        batch_number: batch_number.trim(),
        quantity: normalizedQuantity,
        reorder_level: normalizedReorderLevel,
        unit_price: normalizedUnitPrice,
        expiration_date: expiration_date || null,
        status,
      })
      .select(inventoryColumns)
      .single()

    if (error) {
      console.error('Create inventory error:', error)

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
    console.error('Create inventory server error:', error)

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/**
 * UPDATE inventory
 * PATCH /api/pharmacies/:pharmacyId/inventory/:inventoryId
 */
const updateInventory = async (req, res) => {
  try {
    const pharmacyId = Number(req.params.pharmacyId)
    const inventoryId = Number(req.params.inventoryId)

    if (!isValidId(pharmacyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pharmacy ID',
      })
    }

    if (!isValidId(inventoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid inventory ID',
      })
    }

    // Find existing inventory record
    const {
      data: existing,
      error: existingError,
    } = await supabaseAdmin
      .from('inventory')
      .select(inventoryColumns)
      .eq('inventory_id', inventoryId)
      .eq('pharmacy_id', pharmacyId)
      .single()

    if (existingError || !existing) {
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

    // Medicine
    if (medicine_id !== undefined) {
      if (!isValidId(medicine_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid medicine ID',
        })
      }

      updates.medicine_id = Number(medicine_id)
    }

    // Batch number
    if (batch_number !== undefined) {
      if (!batch_number || !batch_number.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Batch number cannot be empty',
        })
      }

      updates.batch_number = batch_number.trim()
    }

    // Quantity
    if (quantity !== undefined) {
      if (
        !Number.isInteger(Number(quantity)) ||
        Number(quantity) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a non-negative integer',
        })
      }

      updates.quantity = Number(quantity)
    }

    // Reorder level
    if (reorder_level !== undefined) {
      if (
        !Number.isInteger(Number(reorder_level)) ||
        Number(reorder_level) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Reorder level must be a non-negative integer',
        })
      }

      updates.reorder_level = Number(reorder_level)
    }

    // Unit price
    if (unit_price !== undefined) {
      if (
        Number.isNaN(Number(unit_price)) ||
        Number(unit_price) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Unit price must be a non-negative number',
        })
      }

      updates.unit_price = Number(unit_price)
    }

    // Expiration date
    if (expiration_date !== undefined) {
      updates.expiration_date = expiration_date || null
    }

    // Prevent empty update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields provided for update',
      })
    }

    // Recalculate inventory status
    const finalQuantity =
      updates.quantity !== undefined
        ? updates.quantity
        : existing.quantity

    const finalReorderLevel =
      updates.reorder_level !== undefined
        ? updates.reorder_level
        : existing.reorder_level

    updates.status = getInventoryStatus(
      finalQuantity,
      finalReorderLevel
    )

    const { data, error } = await supabaseAdmin
      .from('inventory')
      .update(updates)
      .eq('inventory_id', inventoryId)
      .eq('pharmacy_id', pharmacyId)
      .select(inventoryColumns)
      .single()

    if (error) {
      console.error('Update inventory error:', error)

      return res.status(500).json({
        success: false,
        message: 'Failed to update inventory',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Inventory updated successfully',
      data,
    })
  } catch (error) {
    console.error('Update inventory server error:', error)

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/**
 * DELETE inventory
 * DELETE /api/pharmacies/:pharmacyId/inventory/:inventoryId
 */
const deleteInventory = async (req, res) => {
  try {
    const pharmacyId = Number(req.params.pharmacyId)
    const inventoryId = Number(req.params.inventoryId)

    if (!isValidId(pharmacyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pharmacy ID',
      })
    }

    if (!isValidId(inventoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid inventory ID',
      })
    }

    const { data, error } = await supabaseAdmin
      .from('inventory')
      .delete()
      .eq('inventory_id', inventoryId)
      .eq('pharmacy_id', pharmacyId)
      .select('inventory_id')
      .maybeSingle()

    if (error) {
      console.error('Delete inventory error:', error)

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
      message: 'Inventory deleted successfully',
    })
  } catch (error) {
    console.error('Delete inventory server error:', error)

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

const getPublicPharmacyInventory = async (req, res) => {
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
      .in('status', ['AVAILABLE', 'LOW_STOCK'])
      .order('inventory_id', { ascending: true })

    if (error) {
  console.error('Get public pharmacy inventory error:', error)

  return res.status(500).json({
    success: false,
    message: 'Failed to retrieve pharmacy medicines',
    error: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  })
}
    const medicines = (data || []).map((item) => ({
      inventory_id: item.inventory_id,
      pharmacy_id: item.pharmacy_id,
      medicine_id: item.medicine_id,
      batch_number: item.batch_number,
      quantity: item.quantity,
      unit_price: item.unit_price,
      expiration_date: item.expiration_date,
      status: item.status,
      medicine: item.medicines,
    }))

    return res.status(200).json({
      success: true,
      data: medicines,
    })
  } catch (error) {
    console.error('Get public pharmacy inventory server error:', error)

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

module.exports = {
  getPharmacyInventory,
  getPublicPharmacyInventory,
  createInventory,
  updateInventory,
  deleteInventory,
}