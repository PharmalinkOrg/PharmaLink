const supabaseAdmin = require('../config/supabaseAdmin')

const isValidId = (value) => {
  return Number.isInteger(Number(value)) && Number(value) > 0
}

const getPharmacyDashboard = async (req, res) => {
  try {
    const pharmacyId = Number(req.params.pharmacyId)

    if (!isValidId(pharmacyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pharmacy ID',
      })
    }

    // Get inventory records for this pharmacy
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('inventory')
      .select('inventory_id, medicine_id, quantity, status')
      .eq('pharmacy_id', pharmacyId)

    if (inventoryError) {
      console.error('Dashboard inventory error:', inventoryError)

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard inventory data',
      })
    }

    // Get reservations for this pharmacy
    const { data: reservations, error: reservationError } =
      await supabaseAdmin
        .from('reservations')
        .select('reservation_id, status')
        .eq('pharmacy_id', pharmacyId)

    if (reservationError) {
      console.error(
        'Dashboard reservation error:',
        reservationError,
      )

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard reservation data',
      })
    }

    const inventoryData = inventory || []
    const reservationData = reservations || []

    const totalInventory = inventoryData.length

    const totalMedicines = new Set(
      inventoryData.map((item) => item.medicine_id),
    ).size

    const lowStock = inventoryData.filter(
      (item) => item.status === 'LOW_STOCK',
    ).length

    const outOfStock = inventoryData.filter(
      (item) => item.status === 'OUT_OF_STOCK',
    ).length

    const pendingReservations = reservationData.filter(
      (reservation) => reservation.status === 'PENDING',
    ).length

    const confirmedReservations = reservationData.filter(
      (reservation) => reservation.status === 'CONFIRMED',
    ).length

    const completedReservations = reservationData.filter(
      (reservation) => reservation.status === 'COMPLETED',
    ).length

    return res.status(200).json({
      success: true,
      data: {
        totalMedicines,
        totalInventory,
        lowStock,
        outOfStock,
        pendingReservations,
        confirmedReservations,
        completedReservations,
      },
    })
  } catch (error) {
    console.error('Get pharmacy dashboard server error:', error)

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

module.exports = {
  getPharmacyDashboard,
}