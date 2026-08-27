const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

console.log('Connected to:', process.env.SUPABASE_URL)

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

module.exports = supabaseAdmin