const supabase = require('../config/supabase')

const createPharmacyAdmin = async (req, res) => {
  try {
    const {
      pharmacy_id,
      first_name,
      last_name,
      email,
      phone,
      password,
    } = req.body

    // Validate required fields
    if (!pharmacy_id) {
      return res.status(400).json({
        success: false,
        message: 'Pharmacy ID is required',
      })
    }

    if (!first_name || first_name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'First name is required',
      })
    }

    if (!last_name || last_name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Last name is required',
      })
    }

    if (!email || email.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      })
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
      })
    }

    // Verify pharmacy exists
    const { data: pharmacy, error: pharmacyError } = await supabase
      .from('pharmacies')
      .select('pharmacy_id, name, status')
      .eq('pharmacy_id', pharmacy_id)
      .single()

    if (pharmacyError || !pharmacy) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacy not found',
      })
    }

    if (pharmacy.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Cannot create an admin for an inactive pharmacy',
      })
    }

    // Create account in Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
      })

    if (authError) {
      console.error('Supabase Auth error:', authError)

      return res.status(400).json({
        success: false,
        message: authError.message,
      })
    }

    // Create corresponding PharmaLink user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        pharmacy_id,
        role: 'PHARMACY_ADMIN',
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: 'MANAGED_BY_SUPABASE_AUTH',
        phone: phone || null,
        status: 'ACTIVE',
      })
      .select(
        'user_id, pharmacy_id, role, first_name, last_name, email, phone, status, created_at, updated_at'
      )
      .single()

    if (userError) {
      console.error('PharmaLink user creation error:', userError)

      // Roll back the Supabase Auth user if public.users fails
      await supabase.auth.admin.deleteUser(authData.user.id)

      return res.status(500).json({
        success: false,
        message: 'Failed to create PharmaLink user',
        error: userError.message,
      })
    }

    res.status(201).json({
      success: true,
      message: 'Pharmacy admin created successfully',
      data: user,
    })
  } catch (error) {
    console.error('Create pharmacy admin error:', error)

    res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

module.exports = {
  createPharmacyAdmin,
}