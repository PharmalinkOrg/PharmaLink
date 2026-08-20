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

const isValidId = (value) => Number.isInteger(Number(value)) && Number(value) > 0

const getInventoryStatus = (quantity, reorderLevel) => {
  if (quantity === 0) return 'OUT_OF_STOCK'
  if (quantity <= reorderLevel) return 'LOW_STOCK'
  return 'AVAILABLE'
}

const getPharmacyInventory = async (req, res) => {
  try {
    const pharmacyId = Number(req.params.pharmacyId)

    if (!isValidId(pharmacyId)) {
      return res.status(400).json({ success: false, message: 'Invalid pharmacy ID' })
    }

    const { data, error } = await supabaseAdmin
      .from('inventory')
      .select(inventoryColumns)
      .eq('pharmacy_id', pharmacyId)
      .order('inventory_id', { ascending: true })

    if (error) {
      console.error('Get pharmacy inventory error:', error)
      return res.status(500).json({ success: false, message: 'Failed to retrieve pharmacy inventory' })
    }

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Get pharmacy inventory server error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const createInventory = async (req, res) => {
  try {
    const pharmacyId = Number(req.params.pharmacyId)
    const { medicine_id, batch_number, quantity, reorder_level, unit_price, expiration_date } = req.body

    if (!isValidId(pharmacyId)) {
      return res.status(400).json({ success: false, message: 'Invalid pharmacy ID' })
    }

    if (
      !isValidId(medicine_id) ||
      !batch_number ||
      !batch_number.trim() ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 0 ||
      !Number.isInteger(Number(reorder_level)) ||
      Number(reorder_level) < 0 ||
      Number.isNaN(Number(unit_price)) ||
      Number(unit_price) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Provide a valid medicine ID, batch number, quantity, reorder level, and unit price',
      })
    }

    const { data, error } = await supabaseAdmin
      .from('inventory')
      .insert({
        pharmacy_id: pharmacyId,
        medicine_id: Number(medicine_id),
        batch_number: batch_number.trim(),
        quantity: Number(quantity),
        reorder_level: Number(reorder_level),
        unit_price: Number(unit_price),
        expiration_date: expiration_date || null,
        status: getInventoryStatus(Number(quantity), Number(reorder_level)),
      })
      .select(inventoryColumns)
      .single()

    if (error) {
      console.error('Create inventory error:', error)
      return res.status(500).json({ success: false, message: 'Failed to create inventory' })
    }

    return res.status(201).json({ success: true, message: 'Inventory created successfully', data })
  } catch (error) {
    console.error('Create inventory server error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const updateInventory = async (req, res) => {
  try {
    const pharmacyId = Number(req.params.pharmacyId)
    const inventoryId = Number(req.params.inventoryId)

    if (!isValidId(pharmacyId) || !isValidId(inventoryId)) {
      return res.status(400).json({ success: false, message: 'Invalid pharmacy or inventory ID' })
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('inventory')
      .select(inventoryColumns)
      .eq('inventory_id', inventoryId)
      .eq('pharmacy_id', pharmacyId)
      .single()

    if (existingError || !existing) {
      return res.status(404).json({ success: false, message: 'Inventory record not found' })
    }

    const { medicine_id, batch_number, quantity, reorder_level, unit_price, expiration_date } = req.body
    const updates = {}

    if (medicine_id !== undefined) {
      if (!isValidId(medicine_id)) return res.status(400).json({ success: false, message: 'Invalid medicine ID' })
      updates.medicine_id = Number(medicine_id)
    }
    if (batch_number !== undefined) {
      if (!batch_number || !batch_number.trim()) return res.status(400).json({ success: false, message: 'Batch number cannot be empty' })
      updates.batch_number = batch_number.trim()
    }
    if (quantity !== undefined) {
      if (!Number.isInteger(Number(quantity)) || Number(quantity) < 0) return res.status(400).json({ success: false, message: 'Quantity must be a non-negative integer' })
      updates.quantity = Number(quantity)
    }
    if (reorder_level !== undefined) {
      if (!Number.isInteger(Number(reorder_level)) || Number(reorder_level) < 0) return res.status(400).json({ success: false, message: 'Reorder level must be a non-negative integer' })
      updates.reorder_level = Number(reorder_level)
    }
    if (unit_price !== undefined) {
      if (Number.isNaN(Number(unit_price)) || Number(unit_price) < 0) return res.status(400).json({ success: false, message: 'Unit price cannot be negative' })
      updates.unit_price = Number(unit_price)
    }
    if (expiration_date !== undefined) updates.expiration_date = expiration_date || null

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update' })
    }

    updates.status = getInventoryStatus(
      updates.quantity ?? existing.quantity,
      updates.reorder_level ?? existing.reorder_level
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
      return res.status(500).json({ success: false, message: 'Failed to update inventory' })
    }

    return res.status(200).json({ success: true, message: 'Inventory updated successfully', data })
  } catch (error) {
    console.error('Update inventory server error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const deleteInventory = async (req, res) => {
  try {
    const pharmacyId = Number(req.params.pharmacyId)
    const inventoryId = Number(req.params.inventoryId)

    if (!isValidId(pharmacyId) || !isValidId(inventoryId)) {
      return res.status(400).json({ success: false, message: 'Invalid pharmacy or inventory ID' })
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
      return res.status(500).json({ success: false, message: 'Failed to delete inventory' })
    }
    if (!data) {
      return res.status(404).json({ success: false, message: 'Inventory record not found' })
    }

    return res.status(200).json({ success: true, message: 'Inventory deleted successfully' })
  } catch (error) {
    console.error('Delete inventory server error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  getPharmacyInventory,
  createInventory,
  updateInventory,
  deleteInventory,
}
