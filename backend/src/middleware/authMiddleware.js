const supabase = require('../config/supabase')

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    // Check if Authorization header exists
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header is required',
      })
    }

    // Check Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization format',
      })
    }

    const token = authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
      })
    }

    // Verify the token with Supabase Auth
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

    // Make authenticated Supabase user available to controllers
    req.authUser = user

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