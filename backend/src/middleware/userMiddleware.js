const supabaseAdmin = require('../config/supabaseAdmin')

const loadPharmaUser = async (req, res, next) => {
  try {
    // --------------------------------------------------
    // Verify authenticated user
    // --------------------------------------------------

    if (!req.authUser) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user not found',
      })
    }

    // --------------------------------------------------
    // Get authenticated user's email
    // --------------------------------------------------

    const email = req.authUser.email

    if (!email) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user email not found',
      })
    }

    // --------------------------------------------------
    // Find PharmaLink user account
    // --------------------------------------------------

    const {
      data: pharmaUser,
      error,
    } = await supabaseAdmin
      .from('users')
      .select(`
        user_id,
        pharmacy_id,
        role,
        first_name,
        last_name,
        email,
        phone,
        avatar_url,
        status,
        created_at,
        updated_at,
        last_login_at
      `)
      .eq('email', email)
      .maybeSingle()

    // --------------------------------------------------
    // Handle database error
    // --------------------------------------------------

    if (error) {
      console.error(
        'PharmaLink user lookup error:',
        error
      )

      return res.status(500).json({
        success: false,
        message: 'Failed to load PharmaLink user',
      })
    }

    // --------------------------------------------------
    // Handle missing PharmaLink user
    // --------------------------------------------------

    if (!pharmaUser) {
      return res.status(404).json({
        success: false,
        message: 'PharmaLink user account not found',
      })
    }

    // --------------------------------------------------
    // Verify PharmaLink account status
    // --------------------------------------------------

    if (pharmaUser.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'PharmaLink user account is not active',
      })
    }

    // --------------------------------------------------
    // Attach PharmaLink user to request
    // --------------------------------------------------

    req.pharmaUser = pharmaUser

    next()
  } catch (error) {
    console.error(
      'PharmaLink user middleware error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Failed to load user account',
    })
  }
}

module.exports = loadPharmaUser
