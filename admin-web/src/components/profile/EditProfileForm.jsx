import { useState } from 'react'
import { apiRequest } from '../../lib/api'

const BIO_LIMIT = 300

export default function EditProfileForm({ accessToken, initialProfile, onCancel, onSaved }) {
  const [fullName, setFullName] = useState(initialProfile?.full_name || '')
  const [courseSection, setCourseSection] = useState(initialProfile?.course_section || '')
  const [bio, setBio] = useState(initialProfile?.bio || '')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [serverError, setServerError] = useState('')

  const validate = () => {
    const next = {}
    if (!fullName.trim() || fullName.trim().length < 3) {
      next.fullName = 'Full name must be at least 3 characters'
    }
    if (!courseSection.trim()) {
      next.courseSection = 'Course and section is required'
    }
    if (bio.length > BIO_LIMIT) {
      next.bio = `Bio must be ${BIO_LIMIT} characters or fewer`
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    setSuccess('')
    if (!validate()) return

    setSaving(true)
    try {
      const res = await apiRequest('/account/me', {
        method: 'PATCH',
        token: accessToken,
        body: {
          full_name: fullName.trim(),
          course_section: courseSection.trim(),
          bio: bio.trim(),
        },
      })
      setSuccess('Profile updated successfully')
      onSaved(res.data)
    } catch (err) {
      setServerError(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {serverError && <div style={{ color: '#c0392b', marginBottom: 8 }}>{serverError}</div>}
      {success && <div style={{ color: '#1e7e34', marginBottom: 8 }}>{success}</div>}

      <div style={{ marginBottom: 12 }}>
        <label>Full name</label><br />
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        {errors.fullName && <div style={{ color: '#c0392b', fontSize: 13 }}>{errors.fullName}</div>}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Course and section</label><br />
        <input value={courseSection} onChange={(e) => setCourseSection(e.target.value)} />
        {errors.courseSection && <div style={{ color: '#c0392b', fontSize: 13 }}>{errors.courseSection}</div>}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Short biography</label><br />
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={BIO_LIMIT}
          rows={4}
        />
        <div style={{ fontSize: 12, color: '#666' }}>{bio.length}/{BIO_LIMIT}</div>
        {errors.bio && <div style={{ color: '#c0392b', fontSize: 13 }}>{errors.bio}</div>}
      </div>

      <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>{' '}
      <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
    </form>
  )
}