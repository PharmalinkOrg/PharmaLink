const supabase = require('../config/supabase')
const supabaseAdmin = require('../config/supabaseAdmin')

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header is required',
      })
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization format',
      })
    }

    const token = authHeader.substring(7).trim()

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
      })
    }

    // 1. Verify the Supabase access token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.error('Supabase authentication error:', error)

      return res.status(401).json({
        success: false,
        message: 'Invalid or expired access token',
      })
    }

    // 2. Find the corresponding PharmaLink user
    const { data: pharmaUser, error: userError } = await supabaseAdmin
      .from('users')
      .select(
        'user_id, role, email, first_name, last_name, phone, status, pharmacy_id'
      )
      .eq('email', user.email)
      .maybeSingle()

    if (userError) {
      console.error('PharmaLink user lookup error:', userError)

      return res.status(500).json({
        success: false,
        message: 'Could not verify PharmaLink user',
      })
    }

    // 3. Make sure the user exists in the PharmaLink database
    if (!pharmaUser) {
      return res.status(401).json({
        success: false,
        message: 'PharmaLink user profile not found',
      })
    }

    // 4. Make sure the PharmaLink account is active
    if (pharmaUser.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'PharmaLink user account is inactive',
      })
    }

    // Store both authentication records on the request
    req.authUser = user
    req.pharmaUser = pharmaUser

    next()
  } catch (error) {
    console.error('Authentication middleware error:', error)

    return res.status(500).json({
      success: false,
      message: 'Authentication verification failed',
    })
  }
}

module.exports = authenticateUser