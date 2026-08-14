const supabase = require('../config/supabase')

// GET all pharmacies
const getPharmacies = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
      .order('pharmacy_id', { ascending: true })

    if (error) {
      console.error('Get pharmacies error:', error)

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve pharmacies',
        error: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Server error:', error)

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

// CREATE a pharmacy
const createPharmacy = async (req, res) => {
  try {
    const {
      name,
      address,
      contact_number,
      email,
    } = req.body

    // Validate required fields
if (!name || !name.trim()) {
  return res.status(400).json({
    success: false,
    message: 'Pharmacy name is required',
  })
}

if (!address || !address.trim()) {
  return res.status(400).json({
    success: false,
    message: 'Pharmacy address is required',
  })
}

// Validate email if provided
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  return res.status(400).json({
    success: false,
    message: 'Please provide a valid email address',
  })
}

    const { data, error } = await supabase
      .from('pharmacies')
      .insert([
        {
          name,
          address,
          contact_number: contact_number || null,
          email: email || null,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Create pharmacy error:', error)

      return res.status(500).json({
        success: false,
        message: 'Failed to create pharmacy',
        error: error.message,
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Pharmacy created successfully',
      data,
    })
  } catch (error) {
    console.error('Server error:', error)

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

// GET a single pharmacy by ID
const getPharmacyById = async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('pharmacy_id', id)
      .single()

    if (error) {
      console.error('Get pharmacy error:', error)

      return res.status(404).json({
        success: false,
        message: 'Pharmacy not found',
        error: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Server error:', error)

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

// UPDATE a pharmacy
const updatePharmacy = async (req, res) => {
  try {
    const { id } = req.params

    const {
      name,
      address,
      contact_number,
      email,
      status,
    } = req.body

    // Validate provided fields
if (name !== undefined && !name.trim()) {
  return res.status(400).json({
    success: false,
    message: 'Pharmacy name cannot be empty',
  })
}

if (address !== undefined && !address.trim()) {
  return res.status(400).json({
    success: false,
    message: 'Pharmacy address cannot be empty',
  })
}

// Validate email if provided
if (
  email !== undefined &&
  email !== null &&
  email !== '' &&
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
) {
  return res.status(400).json({
    success: false,
    message: 'Please provide a valid email address',
  })
}

// Validate status if provided
if (
  status !== undefined &&
  !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)
) {
  return res.status(400).json({
    success: false,
    message: 'Invalid pharmacy status',
  })
}

    // Make sure the pharmacy exists
    const { data: existingPharmacy, error: findError } = await supabase
      .from('pharmacies')
      .select('pharmacy_id')
      .eq('pharmacy_id', id)
      .single()

    if (findError || !existingPharmacy) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacy not found',
      })
    }

    // Build the update object using only provided fields
    const updates = {}

    if (name !== undefined) updates.name = name
    if (address !== undefined) updates.address = address
    if (contact_number !== undefined) {
      updates.contact_number = contact_number
    }
    if (email !== undefined) updates.email = email
    if (status !== undefined) updates.status = status

    // Prevent an empty update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields provided for update',
      })
    }

    const { data, error } = await supabase
      .from('pharmacies')
      .update(updates)
      .eq('pharmacy_id', id)
      .select()
      .single()

    if (error) {
      console.error('Update pharmacy error:', error)

      return res.status(500).json({
        success: false,
        message: 'Failed to update pharmacy',
        error: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Pharmacy updated successfully',
      data,
    })
  } catch (error) {
    console.error('Server error:', error)

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

module.exports = {
  getPharmacies,
  getPharmacyById,
  createPharmacy,
  updatePharmacy,
}   