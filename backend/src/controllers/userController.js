const supabase = require('../config/supabase')
const supabaseAdmin = require('../config/supabaseAdmin')
const fetchAll = require('../utils/fetchAll')
const { logActivity } = require('../services/auditLogService')

const getCurrentUserProfile = (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.pharmaUser,
  })
}

const updateCurrentUserProfile = async (req, res) => {
  try {
    // Accept snake_case or camelCase field names.
    const body = req.body || {}
    const first_name = body.first_name ?? body.firstName
    const last_name = body.last_name ?? body.lastName
    const phone = body.phone ?? body.phoneNumber ?? body.phone_number
    const avatar_url = body.avatar_url ?? body.avatarUrl

    if (phone !== undefined && phone !== null && typeof phone !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be text',
      })
    }

    if (typeof first_name !== 'string' || first_name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'First name is required',
      })
    }

    if (typeof last_name !== 'string' || last_name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Last name is required',
      })
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone?.trim() || null,
        ...(avatar_url !== undefined ? { avatar_url } : {}),
      })
      .eq('user_id', req.pharmaUser.user_id)

    if (error) {
      console.error('PharmaLink profile update error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId: req.pharmaUser.user_id,
      })

      return res.status(500).json({
        success: false,
        message: `Failed to update profile: ${error.message}`,
      })
    }

    const { data: user, error: readError } = await supabaseAdmin
      .from('users')
      .select(
        'user_id, pharmacy_id, role, first_name, last_name, email, phone, avatar_url, status, created_at, updated_at, last_login_at'
      )
      .eq('user_id', req.pharmaUser.user_id)
      .single()

    if (readError || !user) {
      console.error('PharmaLink profile read-back error:', readError)

      return res.status(500).json({
        success: false,
        message: 'Profile was saved but could not be reloaded',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    })
  } catch (error) {
    console.error('Update profile error:', error)

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

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
    const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
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
      await supabaseAdmin.auth.admin.createUser({
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
    const { data: user, error: userError } = await supabaseAdmin
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
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)

      return res.status(500).json({
        success: false,
        message: 'Failed to create PharmaLink user',
        error: userError.message,
      })
    }

    await logActivity(req, {
      action: 'PHARMACY_ADMIN_CREATED',
      entityType: 'user',
      entityId: user.user_id,
      pharmacyId: user.pharmacy_id,
      description: `Created pharmacy admin "${user.first_name} ${user.last_name}" (${user.email}) for ${pharmacy.name}`,
    })

    return res.status(201).json({
      success: true,
      message: 'Pharmacy admin created successfully',
      data: user,
    })
  } catch (error) {
    console.error('Create pharmacy admin error:', error)

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

/* ============================================================
   GET USERS FOR SUPER ADMIN
   GET /api/users/superadmin
     ?role=PHARMACY_ADMIN|CUSTOMER   optional
     ?page=1&limit=100              optional (max 500)

   Without page/limit every matching user is returned, as before.
============================================================ */

const SUPERADMIN_USER_ROLES = ['PHARMACY_ADMIN', 'CUSTOMER']

const SUPERADMIN_USER_COLUMNS =
  'user_id, pharmacy_id, role, first_name, last_name, email, phone, status, created_at, updated_at, last_login_at'

const getSuperAdminUsers = async (req, res) => {
  try {
    const role = String(req.query.role || '').trim().toUpperCase()
    const paginate = req.query.page !== undefined || req.query.limit !== undefined

    const buildQuery = () => {
      let query = supabaseAdmin.from('users').select(SUPERADMIN_USER_COLUMNS)

      query = SUPERADMIN_USER_ROLES.includes(role)
        ? query.eq('role', role)
        : query.in('role', SUPERADMIN_USER_ROLES)

      return query
        .order('created_at', { ascending: false })
        .order('user_id', { ascending: false })
    }

    if (!paginate) {
      const users = await fetchAll(buildQuery)

      return res.status(200).json({ success: true, data: users })
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500)
    const from = (page - 1) * limit

    const { data: users, error } = await buildQuery().range(from, from + limit - 1)

    if (error) {
      throw error
    }

    return res.status(200).json({
      success: true,
      data: users || [],
      pagination: { page, limit, returned: (users || []).length },
    })
  } catch (error) {
    console.error('Get Super Admin users error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
    })
  }
}

module.exports = {
  getCurrentUserProfile,
  createPharmacyAdmin,
  updateCurrentUserProfile,
  getSuperAdminUsers,
}