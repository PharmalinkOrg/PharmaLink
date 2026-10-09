  const { createClient } = require('@supabase/supabase-js')
  const supabaseAdmin = require('../config/supabaseAdmin')
  const { logActivity } = require('../services/auditLogService')

  /*
   * A fresh client for each sign-in.
   *
   * Signing in on the shared client in config/supabase.js stores
   * that user's session on it, so every later query made with the
   * shared client would run as whoever signed in last.
   */
  const createAuthClient = () =>
    createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })

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

      const { data: loginData, error: loginError } = await createAuthClient().auth.signInWithPassword({
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
    const {
      email,
      password,
      login_scope,
    } = req.body

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

    if (!login_scope) {
      return res.status(400).json({
        success: false,
        message: 'Login scope is required',
      })
    }

    const allowedScopes = [
      'SUPER_ADMIN',
      'PHARMACY_ADMIN',
    ]

    if (!allowedScopes.includes(login_scope)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid login scope',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // --------------------------------------------------
    // Step 1: Verify email/password through Supabase Auth
    // --------------------------------------------------

    const {
      data,
      error,
    } = await createAuthClient().auth.signInWithPassword({
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

    // --------------------------------------------------
    // Step 2: Find the corresponding PharmaLink user
    // --------------------------------------------------

    const {
      data: pharmaUser,
      error: userError,
    } = await supabaseAdmin
      .from('users')
      .select(
        'user_id, role, email, first_name, last_name, phone, status, pharmacy_id'
      )
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (userError) {
      console.error(
        'PharmaLink database lookup error:',
        userError
      )

      return res.status(500).json({
        success: false,
        message: 'Could not verify the user account',
      })
    }

    // --------------------------------------------------
    // Step 3: Make sure PharmaLink profile exists
    // --------------------------------------------------

    if (!pharmaUser) {
      return res.status(403).json({
        success: false,
        message: 'No PharmaLink profile exists for this account',
      })
    }

    // --------------------------------------------------
    // Step 4: Make sure account is active
    // --------------------------------------------------

    if (pharmaUser.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'This account is inactive',
      })
    }

    // --------------------------------------------------
    // Step 5: Check login scope
    // --------------------------------------------------

    if (login_scope === 'SUPER_ADMIN') {
      if (pharmaUser.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'This account is not authorized to access Super Admin',
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Super Admin login successful',
        data: {
          user: data.user,
          pharmaUser,
          session: data.session,
        },
      })
    }

    // --------------------------------------------------
    // Step 6: Pharmacy Admin / Pharmacy Staff login
    // --------------------------------------------------

    if (login_scope === 'PHARMACY_ADMIN') {
      if (
        pharmaUser.role !== 'PHARMACY_ADMIN' &&
        pharmaUser.role !== 'PHARMACY_STAFF'
      ) {
        return res.status(403).json({
          success: false,
          message: 'This account is not authorized to access Pharmacy Admin',
        })
      }

      if (!pharmaUser.pharmacy_id) {
        return res.status(403).json({
          success: false,
          message: 'This pharmacy account is not assigned to a pharmacy',
        })
      }

      // The pharmacy itself must be active (approved and not
      // deactivated by the Super Admin).
      const {
        data: pharmacy,
        error: pharmacyError,
      } = await supabaseAdmin
        .from('pharmacies')
        .select('pharmacy_id, name, status')
        .eq('pharmacy_id', pharmaUser.pharmacy_id)
        .maybeSingle()

      if (pharmacyError) {
        console.error('Pharmacy status lookup error:', pharmacyError)

        return res.status(500).json({
          success: false,
          message: 'Could not verify the pharmacy account',
        })
      }

      if (!pharmacy || pharmacy.status !== 'ACTIVE') {
        const pharmacyStatus = String(pharmacy?.status || '').toUpperCase()

        return res.status(403).json({
          success: false,
          message:
            pharmacyStatus === 'PENDING'
              ? 'Your pharmacy is still waiting for approval by PharmaLink.'
              : 'Your pharmacy is not active on PharmaLink. Please contact the PharmaLink team.',
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Pharmacy Admin login successful',
        data: {
          user: data.user,
          pharmaUser,
          session: data.session,
        },
      })
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid login scope',
    })
  } catch (error) {
    console.error('Login server error:', error)

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

      const { data, error } = await createAuthClient().auth.signInWithPassword({
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

  /* ============================================================
     CHANGE PASSWORD (any signed-in PharmaLink user)
     POST /api/auth/change-password
     body: { currentPassword, newPassword }
  ============================================================ */

  const PASSWORD_RULES = [
    { test: (value) => value.length >= 8, message: 'at least 8 characters' },
    { test: (value) => /[a-z]/.test(value) && /[A-Z]/.test(value), message: 'upper and lowercase letters' },
    { test: (value) => /\d/.test(value), message: 'a number' },
    { test: (value) => /[^A-Za-z0-9]/.test(value), message: 'a symbol' },
  ]

  const changePassword = async (req, res) => {
    try {
      const currentPassword = req.body?.currentPassword ?? req.body?.current_password
      const newPassword = req.body?.newPassword ?? req.body?.new_password

      if (typeof currentPassword !== 'string' || !currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required' })
      }

      if (typeof newPassword !== 'string' || !newPassword) {
        return res.status(400).json({ success: false, message: 'New password is required' })
      }

      if (newPassword.length > 72) {
        return res.status(400).json({ success: false, message: 'New password cannot exceed 72 characters' })
      }

      const unmet = PASSWORD_RULES.filter((rule) => !rule.test(newPassword))

      if (unmet.length > 0) {
        return res.status(400).json({
          success: false,
          message: `New password needs ${unmet.map((rule) => rule.message).join(', ')}.`,
        })
      }

      if (newPassword === currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'The new password must be different from the current one.',
        })
      }

      const email = req.pharmaUser?.email
      const authUserId = req.authUser?.id

      if (!email || !authUserId) {
        return res.status(401).json({ success: false, message: 'Authenticated user not found' })
      }

      /* Verify the current password */

      const { error: verifyError } = await createAuthClient().auth.signInWithPassword({
        email,
        password: currentPassword,
      })

      if (verifyError) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' })
      }

      /* Update in Supabase Auth */

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: newPassword,
      })

      if (updateError) {
        console.error('Change password error:', updateError)

        return res.status(400).json({
          success: false,
          message: updateError.message || 'Failed to change password',
        })
      }

      await logActivity(req, {
        action: 'PASSWORD_CHANGED',
        entityType: 'user',
        entityId: req.pharmaUser.user_id,
        pharmacyId: req.pharmaUser.pharmacy_id ?? null,
        description: 'Changed account password',
      })

      return res.status(200).json({ success: true, message: 'Password changed successfully' })
    } catch (error) {
      console.error('Change password server error:', error)
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
    changePassword,
  }