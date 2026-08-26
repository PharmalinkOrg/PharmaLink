const getUserSupabaseClient = require('../config/supabaseUserClient')

// GET /api/account/me
const getMyAccount = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1]
    const supabase = getUserSupabaseClient(token)

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.authUser.id)
      .maybeSingle()

    if (error) {
      return res.status(400).json({ success: false, message: error.message })
    }

    res.json({
      success: true,
      data: data || null, // null means the user has no profile yet (empty state)
      email: req.authUser.email,
    })
  } catch (error) {
    console.error('getMyAccount error:', error)
    res.status(500).json({ success: false, message: 'Failed to load account' })
  }
}

// PATCH /api/account/me
const updateMyAccount = async (req, res) => {
  try {
    const { full_name, course_section, bio } = req.body

    if (!full_name || full_name.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Full name must be at least 3 characters' })
    }
    if (!course_section || course_section.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Course and section is required' })
    }
    if (bio && bio.length > 300) {
      return res.status(400).json({ success: false, message: 'Bio must be 300 characters or fewer' })
    }

    const token = req.headers.authorization.split(' ')[1]
    const supabase = getUserSupabaseClient(token)

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: req.authUser.id,
        full_name: full_name.trim(),
        course_section: course_section.trim(),
        bio: bio ? bio.trim() : null,
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ success: false, message: error.message })
    }

    res.json({ success: true, data })
  } catch (error) {
    console.error('updateMyAccount error:', error)
    res.status(500).json({ success: false, message: 'Failed to update account' })
  }
}

// POST /api/account/me/avatar
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file was uploaded' })
    }
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ success: false, message: 'Only image files are allowed' })
    }
    if (req.file.size > 3 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Image must be smaller than 3MB' })
    }

    const token = req.headers.authorization.split(' ')[1]
    const supabase = getUserSupabaseClient(token)

    const fileExt = req.file.originalname.split('.').pop()
    const filePath = `${req.authUser.id}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      })

    if (uploadError) {
      return res.status(400).json({ success: false, message: uploadError.message })
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}` // cache-bust so new image shows immediately

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: req.authUser.id, avatar_url: avatarUrl })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ success: false, message: error.message })
    }

    res.json({ success: true, data })
  } catch (error) {
    console.error('uploadAvatar error:', error)
    res.status(500).json({ success: false, message: 'Failed to upload avatar' })
  }
}

module.exports = { getMyAccount, updateMyAccount, uploadAvatar }