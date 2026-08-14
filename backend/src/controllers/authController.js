const supabase = require('../config/supabase')

const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      })
    }

    // Validate password
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      })
    }

    // Sign in using Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Supabase Auth error:', error)

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
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
    console.error('Login server error:', error)

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

module.exports = {
  login,
}