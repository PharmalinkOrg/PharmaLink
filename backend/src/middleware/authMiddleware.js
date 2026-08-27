const supabase = require('../config/supabase')

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    // --------------------------------------------------
    // Validate authorization header
    // --------------------------------------------------

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

    // --------------------------------------------------
    // Extract access token
    // --------------------------------------------------

    const token = authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
      })
    }

    // --------------------------------------------------
    // Verify Supabase access token
    // --------------------------------------------------

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired access token',
      })
    }

    // --------------------------------------------------
    // Store authenticated Supabase user
    // --------------------------------------------------

    req.authUser = user

    next()
  } catch (error) {
    console.error(
      'Authentication middleware error:',
      error
    )

    return res.status(500).json({
      success: false,
      message: 'Authentication verification failed',
    })
  }
}

module.exports = authenticateUser
