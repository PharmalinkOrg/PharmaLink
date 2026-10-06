const supabaseAdmin = require('../config/supabaseAdmin')

const ALLOWED_NOTIFICATION_TYPES = [
  'PRESCRIPTION',
  'RESERVATION',
  'MEDICINE_REQUEST',
  'SYSTEM',
]

const ALLOWED_REFERENCE_TYPES = [
  'reservation',
  'medicine_request',
  'prescription',
]

// =========================================================
// NORMALIZERS
// =========================================================

/**
 * Normalize and validate a notification type.
 */
const normalizeType = (type) => {
  const normalized =
    typeof type === 'string'
      ? type.trim().toUpperCase()
      : ''

  return ALLOWED_NOTIFICATION_TYPES.includes(normalized)
    ? normalized
    : 'SYSTEM'
}

/**
 * Returns a valid { reference_type, reference_id } pair,
 * or nulls if either part is missing/invalid.
 */
const normalizeReference = (referenceType, referenceId) => {
  const type =
    typeof referenceType === 'string'
      ? referenceType.trim().toLowerCase()
      : ''

  const id = Number(referenceId)

  if (
    !ALLOWED_REFERENCE_TYPES.includes(type) ||
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return {
      reference_type: null,
      reference_id: null,
    }
  }

  return {
    reference_type: type,
    reference_id: id,
  }
}

const normalizeMetadata = (metadata) =>
  metadata &&
  typeof metadata === 'object' &&
  !Array.isArray(metadata)
    ? metadata
    : {}

const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim() !== ''

const buildRow = (
  userId,
  {
    title,
    message,
    type,
    referenceType,
    referenceId,
    metadata,
  },
) => ({
  user_id: userId,
  title: title.trim(),
  message: message.trim(),
  type: normalizeType(type),
  is_read: false,
  read_at: null,
  ...normalizeReference(referenceType, referenceId),
  metadata: normalizeMetadata(metadata),
})

// =========================================================
// CORE: CREATE NOTIFICATIONS
// (same signatures as before + optional reference/metadata)
// =========================================================

/**
 * Create one notification.
 *
 * Notification failures should normally not cause the
 * business operation that triggered them to fail.
 */
const createNotification = async ({
  userId,
  title,
  message,
  type = 'SYSTEM',
  referenceType = null,
  referenceId = null,
  metadata = null,
}) => {
  try {
    const parsedUserId = Number(userId)

    if (
      !Number.isInteger(parsedUserId) ||
      parsedUserId <= 0
    ) {
      console.error(
        'Notification creation skipped: invalid user ID',
        userId,
      )

      return null
    }

    if (!isNonEmptyString(title)) {
      console.error(
        'Notification creation skipped: title is required',
      )

      return null
    }

    if (!isNonEmptyString(message)) {
      console.error(
        'Notification creation skipped: message is required',
      )

      return null
    }

    const { data, error } =
      await supabaseAdmin
        .from('notifications')
        .insert(
          buildRow(parsedUserId, {
            title,
            message,
            type,
            referenceType,
            referenceId,
            metadata,
          }),
        )
        .select('*')
        .single()

    if (error) {
      console.error(
        'Create notification error:',
        error,
      )

      return null
    }

    return data
  } catch (error) {
    console.error(
      'Create notification service error:',
      error,
    )

    return null
  }
}

/**
 * Create notifications for multiple users.
 *
 * Duplicate user IDs are automatically removed.
 */
const createNotifications = async ({
  userIds,
  title,
  message,
  type = 'SYSTEM',
  referenceType = null,
  referenceId = null,
  metadata = null,
}) => {
  try {
    if (!Array.isArray(userIds)) {
      return []
    }

    const uniqueUserIds = [
      ...new Set(
        userIds
          .map(Number)
          .filter(
            (userId) =>
              Number.isInteger(userId) &&
              userId > 0,
          ),
      ),
    ]

    if (uniqueUserIds.length === 0) {
      return []
    }

    if (
      !isNonEmptyString(title) ||
      !isNonEmptyString(message)
    ) {
      console.error(
        'Bulk notification creation skipped: title and message are required',
      )

      return []
    }

    const rows = uniqueUserIds.map((userId) =>
      buildRow(userId, {
        title,
        message,
        type,
        referenceType,
        referenceId,
        metadata,
      }),
    )

    const { data, error } =
      await supabaseAdmin
        .from('notifications')
        .insert(rows)
        .select('*')

    if (error) {
      console.error(
        'Create notifications error:',
        error,
      )

      return []
    }

    return data || []
  } catch (error) {
    console.error(
      'Create notifications service error:',
      error,
    )

    return []
  }
}

// =========================================================
// HELPERS FOR MESSAGES
// =========================================================

const formatPickupDate = (date) => {
  if (!date) return ''

  const parsed = new Date(`${date}T00:00:00+08:00`)

  if (Number.isNaN(parsed.getTime())) return ''

  return parsed.toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatPickupTime = (time) => {
  if (!time) return ''

  const [hours, minutes] = String(time)
    .split(':')
    .map(Number)

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return ''
  }

  const suffix = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12

  return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`
}

const formatPeso = (amount) => {
  if (
    amount === null ||
    amount === undefined ||
    amount === ''
  ) {
    return ''
  }

  return `₱${Number(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const getRequestItemName = (item) => {
  if (!item) return 'Your requested medicine'

  const generic =
    item.medicine_name ||
    item.medicines?.generic_name ||
    ''

  const brand =
    item.brand_name ||
    item.medicines?.brand_name ||
    ''

  if (brand && generic) return `${brand} (${generic})`

  return brand || generic || 'Your requested medicine'
}

/**
 * Looks up a pharmacy's name. Returns a fallback on any error
 * so a missing name never blocks a notification.
 */
const getPharmacyName = async (
  pharmacyId,
  fallback = 'The pharmacy',
) => {
  const id = Number(pharmacyId)

  if (!Number.isInteger(id) || id <= 0) {
    return fallback
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('pharmacies')
      .select('name')
      .eq('pharmacy_id', id)
      .maybeSingle()

    if (error) throw error

    return data?.name || fallback
  } catch (error) {
    console.error(
      'Notification pharmacy lookup error:',
      error,
    )

    return fallback
  }
}

// =========================================================
// RESERVATIONS → CUSTOMER
// =========================================================

/**
 * Call after a pharmacy changes a reservation's status.
 *
 * @param {object} reservation  the UPDATED reservation row
 *   needs: reservation_id, customer_id, pharmacy_id, status
 *   optional: pickup_date, pickup_time, pharmacies { name }
 * @param {object} options
 *   saleTotal  total amount, used when status is COMPLETED
 */
const notifyReservationStatusChange = async (
  reservation,
  { saleTotal = null } = {},
) => {
  try {
    if (!reservation?.customer_id) return null

    const id = reservation.reservation_id
    const status = String(
      reservation.status || '',
    ).toUpperCase()

    const pharmacy =
      reservation.pharmacies?.name ||
      (await getPharmacyName(reservation.pharmacy_id))

    const pickupWhen = [
      formatPickupDate(reservation.pickup_date),
      formatPickupTime(reservation.pickup_time),
    ]
      .filter(Boolean)
      .join(' at ')

    const templates = {
      CONFIRMED: {
        title: 'Reservation confirmed',
        message: pickupWhen
          ? `${pharmacy} confirmed reservation #${id}. Please pick up your medicine on ${pickupWhen}.`
          : `${pharmacy} confirmed reservation #${id}. You can now pick up your medicine.`,
      },
      CANCELLED: {
        title: 'Reservation cancelled',
        message: `${pharmacy} cancelled reservation #${id}. You can search for the medicine at another partner pharmacy.`,
      },
      COMPLETED: {
        title: 'Pickup completed',
        message: saleTotal
          ? `Reservation #${id} was picked up at ${pharmacy}. Total paid: ${formatPeso(saleTotal)}. Thank you!`
          : `Reservation #${id} was picked up at ${pharmacy}. Thank you!`,
      },
      EXPIRED: {
        title: 'Reservation expired',
        message: `Reservation #${id} at ${pharmacy} expired because it was not picked up. You can make a new reservation anytime.`,
      },
    }

    const template = templates[status]

    if (!template) return null

    return createNotification({
      userId: reservation.customer_id,
      type: 'RESERVATION',
      title: template.title,
      message: template.message,
      referenceType: 'reservation',
      referenceId: id,
      metadata: {
        status,
        pharmacy_id: reservation.pharmacy_id ?? null,
        pharmacy_name: pharmacy,
        pickup_date: reservation.pickup_date ?? null,
        pickup_time: reservation.pickup_time ?? null,
      },
    })
  } catch (error) {
    console.error(
      'Notify reservation status error:',
      error,
    )

    return null
  }
}

// =========================================================
// MEDICINE REQUESTS → CUSTOMER
// =========================================================

/**
 * Call after a pharmacy submits OR updates its response.
 *
 * @param {object} args
 *   requestId  medicine_request_id (the request is loaded here)
 *   response   the saved medicine_request_responses row
 *              (needs status, pharmacy_id, available_quantity,
 *              optional unit_price, notes)
 *   isUpdate   true if the pharmacy edited an earlier response
 */
const notifyMedicineRequestResponse = async ({
  requestId,
  response,
  isUpdate = false,
}) => {
  try {
    if (!requestId || !response) return null

    const { data: request, error } =
      await supabaseAdmin
        .from('medicine_requests')
        .select(
          '*, medicine_request_items(*, medicines(generic_name, brand_name))',
        )
        .eq('medicine_request_id', requestId)
        .maybeSingle()

    if (error) throw error

    // Supports either column name for the customer.
    const customerId =
      request?.customer_id ?? request?.user_id

    if (!customerId) {
      console.error(
        'Medicine request notification skipped: customer not found',
        requestId,
      )

      return null
    }

    const status = String(
      response.status || '',
    ).toUpperCase()

    const pharmacy = await getPharmacyName(
      response.pharmacy_id,
      'A partner pharmacy',
    )

    const item = request.medicine_request_items?.[0]
    const medicine = getRequestItemName(item)
    const requestedQty = item?.requested_quantity
    const price = formatPeso(response.unit_price)
    const priceText = price ? ` at ${price} each` : ''

    let title
    let message

    if (status === 'AVAILABLE') {
      title = `${medicine} is available`
      message = `${pharmacy} has ${response.available_quantity} available${priceText} for your request #${requestId}.`
    } else if (status === 'PARTIALLY_AVAILABLE') {
      title = `${medicine} is partially available`
      message = `${pharmacy} can supply ${response.available_quantity}${
        requestedQty ? ` of the ${requestedQty}` : ''
      } you requested${priceText}.`
    } else if (status === 'UNAVAILABLE') {
      title = `${medicine} is unavailable`
      message = `${pharmacy} does not have this medicine right now. Other pharmacies may still respond to request #${requestId}.`
    } else {
      return null
    }

    if (isUpdate) {
      title = `Updated: ${title}`
    }

    return createNotification({
      userId: customerId,
      type: 'MEDICINE_REQUEST',
      title,
      message,
      referenceType: 'medicine_request',
      referenceId: requestId,
      metadata: {
        status,
        pharmacy_id: response.pharmacy_id ?? null,
        pharmacy_name: pharmacy,
        available_quantity:
          response.available_quantity ?? null,
        unit_price: response.unit_price ?? null,
        notes: response.notes ?? null,
        is_update: Boolean(isUpdate),
      },
    })
  } catch (error) {
    console.error(
      'Notify medicine request response error:',
      error,
    )

    return null
  }
}

// =========================================================
// PRESCRIPTIONS → CUSTOMER
// =========================================================

/**
 * Call after a pharmacy verifies or rejects a prescription.
 *
 * @param {object} prescription  the UPDATED prescription row
 *   needs: prescription_id, customer_id (or user_id),
 *   pharmacy_id, status
 * @param {object} options
 *   reason  rejection reason shown to the customer
 */
const notifyPrescriptionStatus = async (
  prescription,
  { reason = null } = {},
) => {
  try {
    const customerId =
      prescription?.customer_id ??
      prescription?.user_id

    if (!customerId) return null

    const status = String(
      prescription.status || '',
    ).toUpperCase()

    const pharmacy = await getPharmacyName(
      prescription.pharmacy_id,
    )

    let title
    let message

    if (status === 'VERIFIED') {
      title = 'Prescription verified'
      message = `${pharmacy} verified your prescription. You can now reserve the prescribed medicine.`
    } else if (status === 'REJECTED') {
      title = 'Prescription rejected'
      message = reason
        ? `${pharmacy} could not accept your prescription: ${reason}`
        : `${pharmacy} could not accept your prescription. Please upload a clearer or valid copy.`
    } else {
      return null
    }

    return createNotification({
      userId: customerId,
      type: 'PRESCRIPTION',
      title,
      message,
      referenceType: 'prescription',
      referenceId: prescription.prescription_id,
      metadata: {
        status,
        pharmacy_id: prescription.pharmacy_id ?? null,
        pharmacy_name: pharmacy,
        reason: reason || null,
      },
    })
  } catch (error) {
    console.error(
      'Notify prescription status error:',
      error,
    )

    return null
  }
}

// =========================================================
// PHARMACY STAFF (e.g. new reservation)
// =========================================================

/**
 * Sends one notification to every user linked to a pharmacy.
 *
 * ASSUMPTION: pharmacy admins have users.pharmacy_id set.
 * If admins are linked through another table (for example
 * pharmacy_admins), change the query below.
 */
const notifyPharmacyStaff = async (
  pharmacyId,
  payload,
) => {
  try {
    const id = Number(pharmacyId)

    if (!Number.isInteger(id) || id <= 0) {
      return []
    }

    const { data: staff, error } =
      await supabaseAdmin
        .from('users')
        .select('user_id')
        .eq('pharmacy_id', id)

    if (error) throw error

    return createNotifications({
      ...payload,
      userIds: (staff || []).map(
        (member) => member.user_id,
      ),
    })
  } catch (error) {
    console.error(
      'Notify pharmacy staff error:',
      error,
    )

    return []
  }
}

module.exports = {
  ALLOWED_NOTIFICATION_TYPES,
  createNotification,
  createNotifications,
  notifyReservationStatusChange,
  notifyMedicineRequestResponse,
  notifyPrescriptionStatus,
  notifyPharmacyStaff,
}