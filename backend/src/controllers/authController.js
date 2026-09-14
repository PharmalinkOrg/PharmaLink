const supabase = require('../config/supabase')
const supabaseAdmin = require('../config/supabaseAdmin')

const registerCustomer = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      phone,
      email,
      password,
    } = req.body

    if (!first_name || first_name.trim() === '' || !last_name || last_name.trim() === '') {
      return res.status(400).json({ success: false, message: 'First and last name are required' })
    }

    if (!email || email.trim() === '') {
      return res.status(400).json({ success: false, message: 'Email is required' })
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    })

    if (authError) {
      const isDuplicate = authError.message?.toLowerCase().includes('already')
      return res.status(400).json({
        success: false,
        message: isDuplicate
          ? 'An account with this email already exists. Please sign in instead.'
          : authError.message,
      })
    }

    const { data: customer, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        role: 'CUSTOMER',
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: normalizedEmail,
        password_hash: 'MANAGED_BY_SUPABASE_AUTH',
        phone: phone?.trim() || null,
        status: 'ACTIVE',
      })
      .select('user_id, role, email, status')
      .single()

    if (userError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return res.status(400).json({
        success: false,
        message: userError.code === '23505' ? 'An account with this email already exists' : 'Failed to create customer account',
      })
    }

    if (!customer || customer.role !== 'CUSTOMER' || customer.status !== 'ACTIVE') {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return res.status(500).json({
        success: false,
        message: 'Customer account could not be verified in the database',
      })
    }

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (loginError) {
      return res.status(201).json({
        success: true,
        message: 'Account created. Please sign in.',
        data: { user: authData.user, session: null },
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Customer account created successfully',
      data: { user: loginData.user, session: loginData.session },
    })
  } catch (error) {
    console.error('Customer registration error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      })
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Step 1: Verify the email/password through Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (error) {
      console.error('Supabase Auth error:', error)

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    // Step 2: Find the corresponding PharmaLink user
    const { data: pharmaUser, error: userError } = await supabaseAdmin
      .from('users')
      .select(
        'user_id, role, email, first_name, last_name, phone, status, pharmacy_id'
      )
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (userError) {
      console.error('Super Admin database lookup error:', userError)

      return res.status(500).json({
        success: false,
        message: 'Could not verify the user account',
      })
    }

    // Step 3: Make sure a PharmaLink profile exists
    if (!pharmaUser) {
      return res.status(403).json({
        success: false,
        message: 'This account is not authorized to access Super Admin',
      })
    }

    // Step 4: Make sure the account is actually a Super Admin
    if (pharmaUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'This account is not authorized to access Super Admin',
      })
    }

    // Step 5: Make sure the account is active
    if (pharmaUser.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'This Super Admin account is inactive',
      })
    }

    // Step 6: Everything is valid
    return res.status(200).json({
      success: true,
      message: 'Super Admin login successful',
      data: {
        user: data.user,
        pharmaUser,
        session: data.session,
      },
    })
  } catch (error) {
    console.error('Super Admin login server error:', error)

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

const customerLogin = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (error) {
      console.error('Customer Supabase login error:', error.message)
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from('users')
      .select('user_id, role, status')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (customerError) {
      console.error('Customer database lookup error:', customerError.message)
      return res.status(500).json({
        success: false,
        message: 'Could not verify the customer account',
      })
    }

    if (!customer) {
      return res.status(403).json({
        success: false,
        message: 'No customer profile exists for this login. Choose Create an account first.',
      })
    }

    if (customer.role !== 'CUSTOMER' || customer.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'This login belongs to a non-customer or inactive account',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: data.user,
        session: data.session,
      },
    })
  } catch (error) {
    console.error('Customer login server error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const getCurrentUser = (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.pharmaUser,
  })
}

module.exports = {
  login,
  customerLogin,
  registerCustomer,
  getCurrentUser,
}