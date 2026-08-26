import { useState } from 'react'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')
const MAX_SIZE = 3 * 1024 * 1024 // 3MB

export default function AvatarUploader({ accessToken, avatarUrl, onUploaded }) {
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setError('')

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('Image must be smaller than 3MB')
      return
    }

    setPreview(URL.createObjectURL(file))
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch(`${API_URL}/account/me/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.message || 'Upload failed')
      }

      onUploaded(payload.data)
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const displayImage = preview || avatarUrl

  return (
    <div style={{ marginBottom: 16 }}>
      {displayImage ? (
        <img src={displayImage} alt="Avatar" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#ddd' }} />
      )}
      <div style={{ marginTop: 8 }}>
        <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
        {uploading && <div>Uploading...</div>}
        {error && <div style={{ color: '#c0392b' }}>{error}</div>}
      </div>
    </div>
  )
}