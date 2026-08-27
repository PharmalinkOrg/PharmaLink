const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)

module.exports = supabaseAdmin