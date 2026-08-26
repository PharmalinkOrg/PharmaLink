import { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/authContext'
import { apiRequest } from '../lib/api'
import EditProfileForm from '../components/profile/EditProfileForm'
import AvatarUploader from '../components/profile/AvatarUploader'

export default function ProfilePage() {
  const { accessToken, user, signOut } = useContext(AuthContext)
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const loadProfile = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiRequest('/account/me', { token: accessToken })
      setProfile(res.data)
      setEmail(res.email)
    } catch (err) {
      setError(err.message || 'Failed to load your profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = () => {
    signOut()
    navigate('/login')
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading your profile...</div>
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <h1>My Account</h1>

      {error && (
        <div style={{ background: '#fde8e8', color: '#c0392b', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <AvatarUploader
        accessToken={accessToken}
        avatarUrl={profile?.avatar_url}
        onUploaded={(updated) => setProfile(updated)}
      />

      {!profile && !isEditing && (
        <div style={{ background: '#eef6ff', padding: 12, borderRadius: 8, margin: '16px 0' }}>
          Your profile is incomplete. Select "Edit Profile" to add your information.
        </div>
      )}

      {isEditing ? (
        <EditProfileForm
          accessToken={accessToken}
          initialProfile={profile}
          onCancel={() => setIsEditing(false)}
          onSaved={(updated) => {
            setProfile(updated)
            setIsEditing(false)
          }}
        />
      ) : (
        <div>
          <p><strong>Full name:</strong> {profile?.full_name || '—'}</p>
          <p><strong>Email:</strong> {email}</p>
          <p><strong>Course & section:</strong> {profile?.course_section || '—'}</p>
          <p><strong>Bio:</strong> {profile?.bio || '—'}</p>
          <p><strong>Created:</strong> {profile?.created_at ? new Date(profile.created_at).toLocaleString() : '—'}</p>
          <p><strong>Last updated:</strong> {profile?.updated_at ? new Date(profile.updated_at).toLocaleString() : '—'}</p>

          <button onClick={() => setIsEditing(true)}>Edit Profile</button>{' '}
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </div>
  )
}