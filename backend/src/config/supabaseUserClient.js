const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Creates a Supabase client scoped to one specific logged-in user's token,
// so Row Level Security policies (auth.uid()) are actually enforced.
function getUserSupabaseClient(accessToken) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  )
}

module.exports = getUserSupabaseClient