import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/auth/useAuth'
import { supabase } from '../lib/supabaseClient'
import { api } from '../lib/api'

const UploadIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

const CloseIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const CheckIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const UploadPrescriptionPage = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const fileInputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [formData, setFormData] = useState({
    patientName: '',
    doctorName: '',
    prescriptionDate: '',
    pharmacyId: '',
    notes: '',
  })

  const [pharmacies, setPharmacies] = useState([])
  const [loadingPharmacies, setLoadingPharmacies] = useState(true)

  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  /*
   * =========================================
   * Load pharmacies
   * =========================================
   */

  useEffect(() => {
    const fetchPharmacies = async () => {
      try {
        setLoadingPharmacies(true)

        const data = await api.getPharmacies()

        /*
         * Some API helpers return the array directly.
         * Others return { data: [...] }.
         * Support both so the dropdown is reliable.
         */
        const pharmacyList = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : []

        setPharmacies(pharmacyList)
      } catch (err) {
        console.error(
          'Failed to fetch pharmacies:',
          err
        )

        setPharmacies([])

        setError(
          'Unable to load pharmacies. Please refresh the page and try again.'
        )
      } finally {
        setLoadingPharmacies(false)
      }
    }

    fetchPharmacies()
  }, [])

  /*
   * =========================================
   * Authentication
   * =========================================
   */

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', {
        state: {
          from: '/upload-prescription',
        },
      })
    }
  }, [user, authLoading, navigate])

  /*
   * =========================================
   * File validation
   * =========================================
   */

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return

    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ]

    if (!validTypes.includes(selectedFile.type)) {
      setError(
        'Please upload a JPEG, PNG, WEBP, or PDF file.'
      )
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError(
        'File size must be less than 10MB.'
      )
      return
    }

    setError(null)
    setFile(selectedFile)

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()

      reader.onload = (event) => {
        setPreview(event.target.result)
      }

      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }

  /*
   * =========================================
   * Drag and drop
   * =========================================
   */

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()

    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]

    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  /*
   * =========================================
   * Form input
   * =========================================
   */

  const handleInputChange = (e) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    /*
     * Clear old validation errors while
     * the user is correcting the form.
     */
    if (error) {
      setError(null)
    }
  }

  /*
   * =========================================
   * Date validation
   * =========================================
   *
   * Expected format:
   * YYYY-MM-DD
   *
   * Example:
   * 2026-09-15
   */

  const validatePrescriptionDate = (dateString) => {
    if (!dateString.trim()) {
      return 'Please enter the prescription date.'
    }

    const datePattern =
      /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

    if (!datePattern.test(dateString)) {
      return 'Please enter the date using YYYY-MM-DD format.'
    }

    const [year, month, day] =
      dateString.split('-').map(Number)

    const date = new Date(
      year,
      month - 1,
      day
    )

    /*
     * Prevent invalid dates such as:
     * 2026-02-31
     */
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return 'Please enter a valid calendar date.'
    }

    /*
     * Prevent future prescription dates.
     */
    const today = new Date()

    today.setHours(0, 0, 0, 0)

    if (date > today) {
      return 'Prescription date cannot be in the future.'
    }

    return null
  }

  /*
   * =========================================
   * Remove file
   * =========================================
   */

  const handleRemoveFile = () => {
    setFile(null)
    setPreview(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  /*
   * =========================================
   * Form validation
   * =========================================
   */

  const validateForm = () => {
    if (!file) {
      return 'Please select a prescription file to upload.'
    }

    if (!formData.patientName.trim()) {
      return 'Please enter the patient name.'
    }

    if (!formData.doctorName.trim()) {
      return 'Please enter the doctor name.'
    }

    const dateError = validatePrescriptionDate(
      formData.prescriptionDate
    )

    if (dateError) {
      return dateError
    }

    if (!formData.pharmacyId) {
      return 'Please select a pharmacy.'
    }

    return null
  }

  /*
   * =========================================
   * Upload prescription
   * =========================================
   */

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isUploading) {
      return
    }

    setError(null)

    const validationError = validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    if (!user?.id) {
      setError(
        'Your session has expired. Please log in again.'
      )

      navigate('/login', {
        state: {
          from: '/upload-prescription',
        },
      })

      return
    }

    setIsUploading(true)
    setUploadProgress(10)

    /*
     * Keep track of the uploaded Storage path.
     *
     * If the Storage upload succeeds but the database
     * insert fails, we will remove the file so we do
     * not leave an orphaned prescription file.
     */
    let uploadedFilePath = null

    try {
      /*
       * -----------------------------------------
       * 1. Determine file extension
       * -----------------------------------------
       */

      const fileExtension = file.name
        .split('.')
        .pop()
        ?.toLowerCase()

      if (!fileExtension) {
        throw new Error(
          'Could not determine the file type.'
        )
      }

      /*
       * -----------------------------------------
       * 2. Create a unique private Storage path
       * -----------------------------------------
       *
       * The Storage policy requires the first
       * folder to be the authenticated user's
       * Supabase Auth UUID.
       *
       * Example:
       *
       * <auth-user-uuid>/<filename>
       */

      const randomId =
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2)

      const fileName = `${Date.now()}-${randomId}.${fileExtension}`

      const filePath = `${user.id}/${fileName}`

      const bucketName = 'prescriptions'

      /*
       * -----------------------------------------
       * 3. Upload file to private Storage
       * -----------------------------------------
       */

      const {
        error: uploadError,
      } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) {
        throw new Error(
          uploadError.message ||
            'Failed to upload prescription file.'
        )
      }

      /*
       * Save the path so we can remove the file
       * if the database operation fails.
       */
      uploadedFilePath = filePath

      setUploadProgress(55)

      /*
       * -----------------------------------------
       * 4. Create prescription database record
       * -----------------------------------------
       *
       * IMPORTANT:
       *
       * We do NOT call getPublicUrl().
       *
       * The bucket is private.
       *
       * We store the Storage PATH in image_url.
       *
       * customer_id is NOT sent from the frontend.
       * The backend gets it securely from the
       * authenticated PharmaLink user.
       *
       * status is NOT sent either.
       * PostgreSQL applies the default:
       *
       * PENDING
       */

      const prescriptionData = {
        image_url: filePath,
        prescription_date:
          formData.prescriptionDate,
        pharmacy_id: Number(formData.pharmacyId),
        notes: formData.notes.trim() || null,
      }

      setUploadProgress(70)

      const result =
        await api.createPrescription(
          prescriptionData
        )

      /*
       * api.createPrescription() returns the
       * prescription data when successful.
       *
       * If it returns null/undefined, treat that
       * as a failed request.
       */

      if (!result) {
        throw new Error(
          'No response was received from the server.'
        )
      }

      setUploadProgress(100)
      setSuccess(true)

      /*
       * -----------------------------------------
       * 5. Reset after successful upload
       * -----------------------------------------
       */

      setTimeout(() => {
        setSuccess(false)
        setFile(null)
        setPreview(null)

        setFormData({
          patientName: '',
          doctorName: '',
          prescriptionDate: '',
          pharmacyId: '',
          notes: '',
        })

        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }

        setUploadProgress(0)
      }, 3000)
    } catch (err) {
      console.error(
        'Upload prescription error:',
        err
      )

      /*
       * -----------------------------------------
       * 6. Clean up Storage if database insert
       *    failed after upload
       * -----------------------------------------
       */

      if (uploadedFilePath) {
        const {
          error: cleanupError,
        } = await supabase.storage
          .from('prescriptions')
          .remove([uploadedFilePath])

        if (cleanupError) {
          console.error(
            'Prescription file cleanup error:',
            cleanupError
          )
        }
      }

      setUploadProgress(0)

      setError(
        err?.message ||
          'Failed to upload prescription. Please try again.'
      )
    } finally {
      setIsUploading(false)
    }
  }

  /*
   * =========================================
   * Loading state
   * =========================================
   */

  if (authLoading) {
    return (
      <div className="upload-page">
        <div className="upload-container">
          <div className="loading-spinner">
            Loading...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="upload-page">
      <div className="upload-container">
        {/* Header */}

        <header className="upload-header">
          <button
            type="button"
            className="back-btn"
            onClick={() => navigate(-1)}
            disabled={isUploading}
          >
            ← Back
          </button>

          <h1>Upload Prescription</h1>

          <div className="header-spacer" />
        </header>

        {/* Description */}

        <p className="upload-description">
          Upload a photo or PDF of your prescription.
          We'll send it to the selected pharmacy for
          verification.
        </p>

        {/* Error */}

        {error && (
          <div
            className="alert alert-error"
            role="alert"
          >
            <span className="alert-icon">
              ⚠️
            </span>

            <span>{error}</span>

            <button
              type="button"
              className="alert-close"
              onClick={() => setError(null)}
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        )}

        {/* Success */}

        {success && (
          <div
            className="alert alert-success"
            role="status"
          >
            <span className="alert-icon">
              ✅
            </span>

            <span>
              Prescription uploaded successfully!
              The selected pharmacy can now review
              it.
            </span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="upload-form"
          noValidate
        >
          {/* File Upload */}

          <div
            className={`drop-zone ${
              isDragging ? 'dragging' : ''
            } ${file ? 'has-file' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() =>
              !isUploading &&
              fileInputRef.current?.click()
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                if (e.target.files[0]) {
                  handleFileSelect(
                    e.target.files[0]
                  )
                }
              }}
              className="file-input"
              disabled={isUploading}
            />

            {file ? (
              <div className="file-preview">
                {preview ? (
                  <img
                    src={preview}
                    alt="Prescription preview"
                    className="preview-image"
                  />
                ) : (
                  <div className="pdf-preview">
                    <span className="pdf-icon">
                      📄
                    </span>

                    <span className="pdf-name">
                      {file.name}
                    </span>

                    <span className="pdf-size">
                      {(
                        file.size /
                        1024 /
                        1024
                      ).toFixed(2)}{' '}
                      MB
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  className="remove-file-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveFile()
                  }}
                  disabled={isUploading}
                  aria-label="Remove prescription file"
                >
                  <CloseIcon />
                </button>
              </div>
            ) : (
              <div className="drop-zone-content">
                <div className="drop-zone-icon">
                  <UploadIcon />
                </div>

                <p className="drop-zone-text">
                  <strong>
                    Click to upload
                  </strong>{' '}
                  or drag and drop
                </p>

                <p className="drop-zone-subtext">
                  JPEG, PNG, WEBP or PDF
                  (max 10MB)
                </p>
              </div>
            )}
          </div>

          {/* Progress */}

          {isUploading && (
            <div className="progress-container">
              <div
                className="progress-bar"
                style={{
                  width: `${uploadProgress}%`,
                }}
              />

              <span className="progress-text">
                {uploadProgress}%
              </span>
            </div>
          )}

          {/* Form Fields */}

          <div className="form-fields">
            {/* Patient */}

            <div className="form-group">
              <label htmlFor="patientName">
                Patient Name *
              </label>

              <input
                type="text"
                id="patientName"
                name="patientName"
                value={formData.patientName}
                onChange={handleInputChange}
                placeholder="Full name of the patient"
                disabled={isUploading}
                autoComplete="name"
              />
            </div>

            {/* Doctor */}

            <div className="form-group">
              <label htmlFor="doctorName">
                Doctor Name *
              </label>

              <input
                type="text"
                id="doctorName"
                name="doctorName"
                value={formData.doctorName}
                onChange={handleInputChange}
                placeholder="Doctor's full name"
                disabled={isUploading}
              />
            </div>

            {/* Prescription Date */}

            <div className="form-group">
              <label htmlFor="prescriptionDate">
                Prescription Date *
              </label>

              <input
                type="text"
                id="prescriptionDate"
                name="prescriptionDate"
                value={
                  formData.prescriptionDate
                }
                onChange={handleInputChange}
                placeholder="YYYY-MM-DD"
                inputMode="numeric"
                maxLength={10}
                disabled={isUploading}
                aria-describedby="prescription-date-help"
              />

              <p
                id="prescription-date-help"
                className="field-help"
              >
                Enter the date written on the
                prescription. Example:
                2026-09-15
              </p>
            </div>

            {/* Pharmacy */}

            <div className="form-group">
              <label htmlFor="pharmacyId">
                Select Pharmacy *
              </label>

              <select
                id="pharmacyId"
                name="pharmacyId"
                value={formData.pharmacyId}
                onChange={handleInputChange}
                disabled={
                  isUploading ||
                  loadingPharmacies
                }
              >
                <option value="">
                  {loadingPharmacies
                    ? 'Loading pharmacies...'
                    : pharmacies.length === 0
                      ? 'No pharmacies available'
                      : 'Select a pharmacy'}
                </option>

                {pharmacies.map((pharmacy) => {
                  const pharmacyId =
                    pharmacy.pharmacy_id ??
                    pharmacy.id

                  return (
                    <option
                      key={pharmacyId}
                      value={pharmacyId}
                    >
                      {pharmacy.name}
                      {pharmacy.address
                        ? ` — ${pharmacy.address}`
                        : ''}
                    </option>
                  )
                })}
              </select>

              {!loadingPharmacies &&
                pharmacies.length > 0 && (
                  <p className="field-help">
                    Select the pharmacy where
                    you want your prescription
                    reviewed.
                  </p>
                )}
            </div>

            {/* Notes */}

            <div className="form-group">
              <label htmlFor="notes">
                Additional Notes (Optional)
              </label>

              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any special instructions or notes"
                rows="3"
                disabled={isUploading}
              />
            </div>
          </div>

          {/* Submit */}

          <button
            type="submit"
            className={`submit-btn ${
              isUploading ? 'loading' : ''
            }`}
            disabled={
              isUploading ||
              !file ||
              loadingPharmacies ||
              pharmacies.length === 0
            }
          >
            {isUploading ? (
              <>
                <span className="spinner" />
                Uploading...
              </>
            ) : (
              <>
                <CheckIcon />
                Upload Prescription
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default UploadPrescriptionPage