const supabaseAdmin = require('../config/supabaseAdmin')

/* ============================================================
   HELPERS
============================================================ */

const isValidId = (value) => {
  const n = Number(value)
  return Number.isInteger(n) && n > 0
}

const isValidAmount = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0
}

const ALLOWED_PAYMENT_METHODS = [
  'CASH',
  'CARD',
  'GCASH',
  'MAYA',
  'BANK_TRANSFER',
  'OTHER',
]

/* ============================================================
   CREATE SALE
   POST /api/sales
   Pharmacy admin records a completed in-person sale.
============================================================ */

const createSale = async (req, res) => {
  try {
    const pharmacyId = req.pharmaUser?.pharmacy_id
    const staffUserId = req.pharmaUser?.user_id

    if (!pharmacyId) {
      return res.status(400).json({
        success: false,
        message: 'Pharmacy account is not assigned to a pharmacy',
      })
    }

    if (!staffUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated staff member not found',
      })
    }

    const {
      customer_id = null,
      reservation_id = null,
      payment_method = 'CASH',
      notes = null,
      items = [],
    } = req.body || {}

    /* --------------------------------------------------------
       Validate items
    -------------------------------------------------------- */

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one medicine is required',
      })
    }

    const seenMedicineIds = new Set()

    for (const item of items) {
      if (!item || typeof item !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Invalid sale item',
        })
      }

      if (!isValidId(item.medicine_id)) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid medicine ID',
        })
      }

      const qty = Number(item.quantity)
      if (!Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a positive quantity',
        })
      }

      if (!isValidAmount(item.unit_price)) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid unit price',
        })
      }

      if (seenMedicineIds.has(Number(item.medicine_id))) {
        return res.status(400).json({
          success: false,
          message: 'Cannot add the same medicine twice to one sale',
        })
      }
      seenMedicineIds.add(Number(item.medicine_id))
    }

    /* --------------------------------------------------------
       Normalize + compute totals server-side
    -------------------------------------------------------- */

    const normalizedItems = items.map((item) => {
      const quantity = Number(item.quantity)
      const unitPrice = Number(item.unit_price)
      return {
        medicine_id: Number(item.medicine_id),
        quantity,
        unit_price: unitPrice,
        subtotal: Number((quantity * unitPrice).toFixed(2)),
      }
    })

    const totalAmount = Number(
      normalizedItems
        .reduce((sum, item) => sum + item.subtotal, 0)
        .toFixed(2),
    )

    /* --------------------------------------------------------
       Validate payment method
    -------------------------------------------------------- */

    const paymentMethod = String(payment_method || 'CASH').toUpperCase()

    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid payment method. Allowed: ' +
          ALLOWED_PAYMENT_METHODS.join(', '),
      })
    }

    /* --------------------------------------------------------
       Verify all medicines exist and belong to this pharmacy
    -------------------------------------------------------- */

    const medicineIds = normalizedItems.map((i) => i.medicine_id)

    const { data: validMedicines, error: medError } = await supabaseAdmin
      .from('medicines')
      .select('medicine_id')
      .in('medicine_id', medicineIds)

    if (medError) {
      console.error('Sale medicine lookup error:', medError)
      return res.status(500).json({
        success: false,
        message: 'Failed to validate medicines',
      })
    }

    const validIds = new Set((validMedicines || []).map((m) => m.medicine_id))
    const missing = medicineIds.filter((id) => !validIds.has(id))

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Unknown medicine ID(s): ${missing.join(', ')}`,
      })
    }

    /* --------------------------------------------------------
       Insert sale
    -------------------------------------------------------- */

    const salePayload = {
      pharmacy_id: Number(pharmacyId),
      processed_by: Number(staffUserId),
      total_amount: totalAmount,
      payment_method: paymentMethod,
      payment_status: 'PAID',
      status: 'COMPLETED',
    }

    if (isValidId(customer_id)) {
      salePayload.customer_id = Number(customer_id)
    }

    if (isValidId(reservation_id)) {
      salePayload.reservation_id = Number(reservation_id)
    }

    const { data: sale, error: saleError } = await supabaseAdmin
      .from('sales')
      .insert(salePayload)
      .select('*')
      .single()

    if (saleError) {
      console.error('Sale insert error:', saleError)
      return res.status(500).json({
        success: false,
        message: 'Failed to record sale',
      })
    }

    /* --------------------------------------------------------
       Insert sale_items
    -------------------------------------------------------- */

    const itemsPayload = normalizedItems.map((item) => ({
      sale_id: sale.sale_id,
      medicine_id: item.medicine_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('sale_items')
      .insert(itemsPayload)

    if (itemsError) {
      console.error('Sale items insert error:', itemsError)

      // Best-effort rollback — remove the sale row
      await supabaseAdmin
        .from('sales')
        .delete()
        .eq('sale_id', sale.sale_id)

      return res.status(500).json({
        success: false,
        message: 'Failed to record sale items',
      })
    }

    /* --------------------------------------------------------
       Reload full sale with items
    -------------------------------------------------------- */

    const { data: fullSale, error: reloadError } = await supabaseAdmin
      .from('sales')
      .select(`
        sale_id,
        pharmacy_id,
        customer_id,
        reservation_id,
        processed_by,
        total_amount,
        payment_method,
        payment_status,
        status,
        sale_date,
        created_at,
        updated_at,
        sale_items (
          sale_item_id,
          sale_id,
          medicine_id,
          quantity,
          unit_price,
          subtotal,
          medicines (
            medicine_id,
            generic_name,
            brand_name,
            dosage,
            dosage_form
          )
        )
      `)
      .eq('sale_id', sale.sale_id)
      .single()

    if (reloadError) {
      console.error('Sale reload error:', reloadError)
      return res.status(201).json({
        success: true,
        message: 'Sale recorded successfully',
        data: { ...sale, items: normalizedItems },
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Sale recorded successfully',
      data: fullSale,
    })
  } catch (error) {
    console.error('Create sale server error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/* ============================================================
   GET PHARMACY SALES
   GET /api/sales/pharmacy
   Optional query params: from=YYYY-MM-DD, to=YYYY-MM-DD
============================================================ */

const getPharmacySales = async (req, res) => {
  try {
    const pharmacyId = req.pharmaUser?.pharmacy_id

    if (!pharmacyId) {
      return res.status(400).json({
        success: false,
        message: 'Pharmacy account is not assigned to a pharmacy',
      })
    }

    const { from, to } = req.query

    let query = supabaseAdmin
      .from('sales')
      .select(`
        sale_id,
        pharmacy_id,
        customer_id,
        reservation_id,
        processed_by,
        total_amount,
        payment_method,
        payment_status,
        status,
        sale_date,
        created_at,
        updated_at,
        users!fk_sales_customer (
          user_id,
          first_name,
          last_name,
          email,
          phone
        ),
        reservations (
          reservation_id,
          pickup_date,
          pickup_time
        ),
        sale_items (
          sale_item_id,
          sale_id,
          medicine_id,
          quantity,
          unit_price,
          subtotal,
          medicines (
            medicine_id,
            generic_name,
            brand_name,
            dosage,
            dosage_form
          )
        )
      `)
      .eq('pharmacy_id', Number(pharmacyId))
      .order('sale_date', { ascending: false })

    if (from) {
      query = query.gte('sale_date', `${from}T00:00:00`)
    }
    if (to) {
      query = query.lte('sale_date', `${to}T23:59:59`)
    }

    const { data: sales, error } = await query

    if (error) {
      console.error('Get pharmacy sales error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to load sales',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Sales loaded successfully',
      data: sales || [],
    })
  } catch (error) {
    console.error('Get pharmacy sales server error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/* ============================================================
   GET SALE BY ID
   GET /api/sales/:saleId
============================================================ */

const getSaleById = async (req, res) => {
  try {
    const pharmacyId = req.pharmaUser?.pharmacy_id
    const saleId = Number(req.params.saleId)

    if (!pharmacyId) {
      return res.status(400).json({
        success: false,
        message: 'Pharmacy account is not assigned to a pharmacy',
      })
    }

    if (!isValidId(saleId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid sale ID is required',
      })
    }

    const { data: sale, error } = await supabaseAdmin
      .from('sales')
      .select(`
        sale_id,
        pharmacy_id,
        customer_id,
        reservation_id,
        processed_by,
        total_amount,
        payment_method,
        payment_status,
        status,
        sale_date,
        created_at,
        updated_at,
        users!fk_sales_customer (
          user_id,
          first_name,
          last_name,
          email,
          phone
        ),
        sale_items (
          sale_item_id,
          sale_id,
          medicine_id,
          quantity,
          unit_price,
          subtotal,
          medicines (
            medicine_id,
            generic_name,
            brand_name,
            dosage,
            dosage_form
          )
        )
      `)
      .eq('sale_id', saleId)
      .eq('pharmacy_id', Number(pharmacyId))
      .maybeSingle()

    if (error) {
      console.error('Get sale by ID error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to load sale',
      })
    }

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Sale loaded successfully',
      data: sale,
    })
  } catch (error) {
    console.error('Get sale by ID server error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/* ============================================================
   GET SALES SUMMARY
   GET /api/sales/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
   Returns aggregate counts and totals for the range.
============================================================ */

const getSalesSummary = async (req, res) => {
  try {
    const pharmacyId = req.pharmaUser?.pharmacy_id

    if (!pharmacyId) {
      return res.status(400).json({
        success: false,
        message: 'Pharmacy account is not assigned to a pharmacy',
      })
    }

    const { from, to } = req.query

    let query = supabaseAdmin
      .from('sales')
      .select('sale_id, total_amount, sale_date')
      .eq('pharmacy_id', Number(pharmacyId))
      .eq('status', 'COMPLETED')

    if (from) query = query.gte('sale_date', `${from}T00:00:00`)
    if (to) query = query.lte('sale_date', `${to}T23:59:59`)

    const { data: sales, error } = await query

    if (error) {
      console.error('Get sales summary error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to load sales summary',
      })
    }

    const list = sales || []
    const totalCount = list.length
    const totalRevenue = Number(
      list.reduce((sum, s) => sum + Number(s.total_amount || 0), 0).toFixed(2),
    )
    const averageSale =
      totalCount > 0
        ? Number((totalRevenue / totalCount).toFixed(2))
        : 0

    return res.status(200).json({
      success: true,
      message: 'Sales summary loaded',
      data: {
        total_count: totalCount,
        total_revenue: totalRevenue,
        average_sale: averageSale,
      },
    })
  } catch (error) {
    console.error('Get sales summary server error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

module.exports = {
  createSale,
  getPharmacySales,
  getSaleById,
  getSalesSummary,
}