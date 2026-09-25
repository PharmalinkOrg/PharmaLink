import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Building2,
  Check,
  ChevronLeft,
  FileText,
  Search,
  Upload,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { supabase } from '../lib/supabaseClient'

// ============================================================
// CONSTANTS
// ============================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]

const PHARMACY_SUGGESTION_LIMIT = 5

const MONTH_NAMES = {
  january: 1,
  jan: 1,

  february: 2,
  feb: 2,

  march: 3,
  mar: 3,

  april: 4,
  apr: 4,

  may: 5,

  june: 6,
  jun: 6,

  july: 7,
  jul: 7,

  august: 8,
  aug: 8,

  september: 9,
  sep: 9,
  sept: 9,

  october: 10,
  oct: 10,

  november: 11,
  nov: 11,

  december: 12,
  dec: 12,
}

// ============================================================
// GENERAL HELPERS
// ============================================================

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function getLocalToday() {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function isValidCalendarDate(year, month, day) {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false
  }

  if (
    year < 1900 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false
  }

  const date = new Date(year, month - 1, day)

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

function createDateResult(year, month, day) {
  if (!isValidCalendarDate(year, month, day)) {
    return null
  }

  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')

  return {
    display: `${mm}-${dd}-${year}`,
    api: `${year}-${mm}-${dd}`,
  }
}

// ============================================================
// PRESCRIPTION DATE PARSING
// ============================================================

/**
 * Supported examples:
 *
 * September 29 2026
 * September 29, 2026
 * Sep 29 2026
 *
 * 09-29-2026
 * 09/29/2026
 * 09 29 2026
 *
 * 2026-09-29
 *
 * Per the requested input behavior:
 * 2026 29 09
 * means YEAR DAY MONTH
 * and becomes 09-29-2026.
 *
 * Ambiguous purely numeric input is intentionally handled
 * conservatively instead of guessing arbitrary dates.
 */
function parsePrescriptionDate(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') {
    return null
  }

  const cleaned = rawValue
    .trim()
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')

  if (!cleaned) {
    return null
  }

  // ----------------------------------------------------------
  // Month-name format
  // September 29 2026
  // Sep 29 2026
  // ----------------------------------------------------------

  const monthNameMatch = cleaned.match(
    /^([a-z]+)\s+(\d{1,2})\s+(\d{4})$/,
  )

  if (monthNameMatch) {
    const month =
      MONTH_NAMES[monthNameMatch[1]]

    const day = Number(monthNameMatch[2])
    const year = Number(monthNameMatch[3])

    if (!month) {
      return null
    }

    return createDateResult(
      year,
      month,
      day,
    )
  }

  // ----------------------------------------------------------
  // Numeric formats
  // ----------------------------------------------------------

  const numericParts = cleaned
    .replace(/[./-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (numericParts.length !== 3) {
    return null
  }

  if (
    !numericParts.every((part) =>
      /^\d+$/.test(part),
    )
  ) {
    return null
  }

  const first = Number(numericParts[0])
  const second = Number(numericParts[1])
  const third = Number(numericParts[2])

  // ----------------------------------------------------------
  // YYYY-MM-DD
  //
  // Hyphen/slash forms use the conventional year-month-day.
  //
  // Example:
  // 2026-09-29
  // ----------------------------------------------------------

  if (
    numericParts[0].length === 4 &&
    /[-/.]/.test(cleaned)
  ) {
    return createDateResult(
      first,
      second,
      third,
    )
  }

  // ----------------------------------------------------------
  // YYYY DD MM
  //
  // Requested free-space format:
  // 2026 29 09 -> 09-29-2026
  // ----------------------------------------------------------

  if (numericParts[0].length === 4) {
    return createDateResult(
      first,
      third,
      second,
    )
  }

  // ----------------------------------------------------------
  // MM-DD-YYYY
  // MM/DD/YYYY
  // MM DD YYYY
  // ----------------------------------------------------------

  if (numericParts[2].length === 4) {
    return createDateResult(
      third,
      first,
      second,
    )
  }

  return null
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) {
    return ''
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`
}

// ============================================================
// PAGE
// ============================================================

function UploadPrescriptionPage() {
  const navigate = useNavigate()

  const fileInputRef = useRef(null)
  const pharmacySearchRef = useRef(null)

  // ==========================================================
  // FILE
  // ==========================================================

  const [selectedFile, setSelectedFile] =
    useState(null)

  const [dragActive, setDragActive] =
    useState(false)

  // ==========================================================
  // FORM
  // ==========================================================

  const [formData, setFormData] = useState({
    patientName: '',
    doctorName: '',
    prescriptionDate: '',
    pharmacyId: '',
    notes: '',
  })

  /*
   * Separate display value from API value.
   *
   * Display:
   * 09-29-2026
   *
   * API:
   * 2026-09-29
   */
  const [
    prescriptionDateDisplay,
    setPrescriptionDateDisplay,
  ] = useState('')

  const [
    prescriptionDateError,
    setPrescriptionDateError,
  ] = useState('')

  // ==========================================================
  // PHARMACIES
  // ==========================================================

  const [pharmacies, setPharmacies] =
    useState([])

  const [
    pharmaciesLoading,
    setPharmaciesLoading,
  ] = useState(true)

  const [
    pharmacySearch,
    setPharmacySearch,
  ] = useState('')

  const [
    selectedPharmacy,
    setSelectedPharmacy,
  ] = useState(null)

  const [
    showPharmacySuggestions,
    setShowPharmacySuggestions,
  ] = useState(false)

  const [
    pharmacySearchError,
    setPharmacySearchError,
  ] = useState('')

  // ==========================================================
  // SUBMISSION
  // ==========================================================

  const [submitting, setSubmitting] =
    useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // ==========================================================
  // LOAD PARTNER PHARMACIES
  // ==========================================================

  useEffect(() => {
    let mounted = true

    async function loadPharmacies() {
      try {
        setPharmaciesLoading(true)

        const response =
          await api.getPharmacies()

        if (!mounted) {
          return
        }

        const rows = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : []

        /*
         * Only active PharmaLink partner pharmacies
         * should be selectable.
         */
        const activePharmacies = rows
          .filter((pharmacy) => {
            if (!pharmacy) {
              return false
            }

            /*
             * If the endpoint doesn't return status,
             * preserve the row rather than incorrectly
             * removing all pharmacies.
             */
            if (!pharmacy.status) {
              return true
            }

            return (
              String(pharmacy.status)
                .toUpperCase() === 'ACTIVE'
            )
          })
          .sort((a, b) =>
            String(a?.name || '').localeCompare(
              String(b?.name || ''),
            ),
          )

        setPharmacies(activePharmacies)
      } catch (loadError) {
        console.error(
          'Load pharmacies error:',
          loadError,
        )

        if (mounted) {
          setPharmacies([])

          setError(
            loadError?.message ||
              'Unable to load partner pharmacies.',
          )
        }
      } finally {
        if (mounted) {
          setPharmaciesLoading(false)
        }
      }
    }

    loadPharmacies()

    return () => {
      mounted = false
    }
  }, [])

  // ==========================================================
  // PHARMACY SEARCH
  // ==========================================================

  const pharmacySuggestions = useMemo(() => {
    const query = normalizeText(pharmacySearch)

    /*
     * Do not dump the full pharmacy list.
     *
     * Suggestions only start after 2 characters.
     */
    if (query.length < 2) {
      return []
    }

    return pharmacies
      .filter((pharmacy) => {
        const name = normalizeText(
          pharmacy?.name,
        )

        const address = normalizeText(
          pharmacy?.address,
        )

        return (
          name.includes(query) ||
          address.includes(query)
        )
      })
      .slice(
        0,
        PHARMACY_SUGGESTION_LIMIT,
      )
  }, [
    pharmacies,
    pharmacySearch,
  ])

  const shouldShowNoPharmacyMatch =
    !pharmaciesLoading &&
    !selectedPharmacy &&
    normalizeText(pharmacySearch).length >= 2 &&
    pharmacySuggestions.length === 0

  const handlePharmacySearchChange = (
    event,
  ) => {
    const value = event.target.value

    setPharmacySearch(value)
    setPharmacySearchError('')
    setError('')
    setSuccess('')

    /*
     * If the user edits the field after selecting a
     * pharmacy, clear the stored pharmacy ID.
     *
     * This prevents submitting an old pharmacy ID with
     * a newly typed pharmacy name.
     */
    if (selectedPharmacy) {
      setSelectedPharmacy(null)

      setFormData((current) => ({
        ...current,
        pharmacyId: '',
      }))
    }

    setShowPharmacySuggestions(
      value.trim().length >= 2,
    )
  }

  const handleSelectPharmacy = (
    pharmacy,
  ) => {
    const pharmacyId =
      Number(pharmacy?.pharmacy_id)

    if (
      !Number.isInteger(pharmacyId) ||
      pharmacyId <= 0
    ) {
      setPharmacySearchError(
        'This pharmacy could not be selected. Please choose another partner pharmacy.',
      )

      return
    }

    setSelectedPharmacy(pharmacy)

    setPharmacySearch(
      pharmacy.name || '',
    )

    setFormData((current) => ({
      ...current,
      pharmacyId: String(pharmacyId),
    }))

    setShowPharmacySuggestions(false)
    setPharmacySearchError('')
    setError('')
  }

  const clearSelectedPharmacy = () => {
    setSelectedPharmacy(null)
    setPharmacySearch('')
    setPharmacySearchError('')

    setFormData((current) => ({
      ...current,
      pharmacyId: '',
    }))

    window.setTimeout(() => {
      pharmacySearchRef.current?.focus()
    }, 0)
  }

  // ==========================================================
  // PRESCRIPTION DATE
  // ==========================================================

  const handlePrescriptionDateChange = (
    event,
  ) => {
    const value = event.target.value

    setPrescriptionDateDisplay(value)
    setPrescriptionDateError('')
    setError('')
    setSuccess('')

    /*
     * Clear the stored API date until the new text
     * has been parsed successfully.
     */
    setFormData((current) => ({
      ...current,
      prescriptionDate: '',
    }))
  }

  const normalizePrescriptionDate = () => {
    const rawValue =
      prescriptionDateDisplay.trim()

    if (!rawValue) {
      setPrescriptionDateError('')
      return null
    }

    const parsed =
      parsePrescriptionDate(rawValue)

    if (!parsed) {
      setPrescriptionDateError(
        'Enter a valid date, for example: September 29 2026, 09-29-2026, or 2026 29 09.',
      )

      return null
    }

    /*
     * A prescription cannot be dated in the future.
     *
     * YYYY-MM-DD is lexicographically sortable.
     */
    if (parsed.api > getLocalToday()) {
      setPrescriptionDateError(
        'Prescription date cannot be in the future.',
      )

      return null
    }

    setPrescriptionDateDisplay(
      parsed.display,
    )

    setFormData((current) => ({
      ...current,
      prescriptionDate: parsed.api,
    }))

    setPrescriptionDateError('')

    return parsed
  }

  const handlePrescriptionDateBlur = () => {
    normalizePrescriptionDate()
  }

  // ==========================================================
  // NORMAL FORM FIELDS
  // ==========================================================

  const handleInputChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))

    setError('')
    setSuccess('')
  }

  // ==========================================================
  // FILE VALIDATION
  // ==========================================================

  const validateFile = (file) => {
    if (!file) {
      return 'Please choose a prescription file.'
    }

    if (
      !ALLOWED_FILE_TYPES.includes(
        file.type,
      )
    ) {
      return 'Only JPEG, PNG, WEBP, and PDF files are allowed.'
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'The prescription file must be 10 MB or smaller.'
    }

    return ''
  }

  const chooseFile = (file) => {
    const validationError =
      validateFile(file)

    if (validationError) {
      setSelectedFile(null)
      setError(validationError)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      return
    }

    setSelectedFile(file)
    setError('')
    setSuccess('')
  }

  const handleFileChange = (event) => {
    const file =
      event.target.files?.[0]

    if (file) {
      chooseFile(file)
    }
  }

  const handleDragEnter = (event) => {
    event.preventDefault()
    event.stopPropagation()

    setDragActive(true)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    event.stopPropagation()

    setDragActive(true)
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    event.stopPropagation()

    setDragActive(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    event.stopPropagation()

    setDragActive(false)

    const file =
      event.dataTransfer.files?.[0]

    if (file) {
      chooseFile(file)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setError('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // ==========================================================
  // UPLOAD FILE TO SUPABASE STORAGE
  // ==========================================================

  const uploadPrescriptionFile =
    async (file) => {
      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error(
          'Your session has expired. Please log in again.',
        )
      }

      const extension =
        file.name
          .split('.')
          .pop()
          ?.toLowerCase() || 'file'

      const safeUserId =
        String(user.id).replace(
          /[^a-zA-Z0-9_-]/g,
          '',
        )

      const uniqueName =
        `${Date.now()}-${crypto.randomUUID()}.${extension}`

      const storagePath =
        `${safeUserId}/${uniqueName}`

      const {
        data: uploadData,
        error: uploadError,
      } = await supabase.storage
        .from('prescriptions')
        .upload(
          storagePath,
          file,
          {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          },
        )

      if (uploadError) {
        throw new Error(
          uploadError.message ||
            'Unable to upload prescription file.',
        )
      }

      /*
       * Preserve the existing PharmaLink behavior of
       * storing the Storage URL with the prescription.
       */
      const {
        data: publicUrlData,
      } = supabase.storage
        .from('prescriptions')
        .getPublicUrl(
          uploadData.path,
        )

      const imageUrl =
        publicUrlData?.publicUrl

      if (!imageUrl) {
        throw new Error(
          'Prescription file was uploaded, but its URL could not be generated.',
        )
      }

      return {
        imageUrl,
        storagePath:
          uploadData.path,
      }
    }

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (submitting) {
      return
    }

    setError('')
    setSuccess('')

    // --------------------------------------------------------
    // File
    // --------------------------------------------------------

    const fileError =
      validateFile(selectedFile)

    if (fileError) {
      setError(fileError)
      return
    }

    // --------------------------------------------------------
    // Patient
    // --------------------------------------------------------

    const patientName =
      formData.patientName.trim()

    if (!patientName) {
      setError(
        'Please enter the patient name.',
      )
      return
    }

    // --------------------------------------------------------
    // Doctor
    // --------------------------------------------------------

    const doctorName =
      formData.doctorName.trim()

    if (!doctorName) {
      setError(
        'Please enter the doctor name.',
      )
      return
    }

    // --------------------------------------------------------
    // Prescription date
    // --------------------------------------------------------

    const parsedDate =
      normalizePrescriptionDate()

    if (!parsedDate) {
      setError(
        'Please enter a valid prescription date.',
      )
      return
    }

    // --------------------------------------------------------
    // Pharmacy
    // --------------------------------------------------------

    const pharmacyId =
      Number(formData.pharmacyId)

    if (
      !selectedPharmacy ||
      !Number.isInteger(pharmacyId) ||
      pharmacyId <= 0
    ) {
      setPharmacySearchError(
        'Please select a current PharmaLink partner from the suggestions.',
      )

      setError(
        'Please select a valid partner pharmacy.',
      )

      return
    }

    // --------------------------------------------------------
    // Notes
    // --------------------------------------------------------

    const notes =
      formData.notes.trim()

    if (notes.length > 500) {
      setError(
        'Additional notes cannot exceed 500 characters.',
      )
      return
    }

    // --------------------------------------------------------
    // Upload + create prescription
    // --------------------------------------------------------

    try {
      setSubmitting(true)

      const {
        imageUrl,
      } =
        await uploadPrescriptionFile(
          selectedFile,
        )

      /*
       * Keep the existing backend contract:
       *
       * UI date:
       * 09-29-2026
       *
       * Backend date:
       * 2026-09-29
       */
      const response =
        await api.createPrescription({
          pharmacy_id: pharmacyId,
          image_url: imageUrl,

          patient_name:
            patientName,

          doctor_name:
            doctorName,

          prescription_date:
            parsedDate.api,

          notes:
            notes || null,
        })

      if (!response?.success) {
        throw new Error(
          response?.message ||
            'Unable to submit prescription.',
        )
      }

      setSuccess(
        'Prescription uploaded successfully. The selected pharmacy can now review it.',
      )

      setSelectedFile(null)

      setFormData({
        patientName: '',
        doctorName: '',
        prescriptionDate: '',
        pharmacyId: '',
        notes: '',
      })

      setPrescriptionDateDisplay('')
      setPrescriptionDateError('')

      setSelectedPharmacy(null)
      setPharmacySearch('')
      setPharmacySearchError('')

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (submitError) {
      console.error(
        'Upload prescription error:',
        submitError,
      )

      setError(
        submitError?.message ||
          'Unable to upload your prescription. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <section className="upload-page">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="upload-page-header">

        <button
          type="button"
          className="upload-back-button"
          onClick={() => navigate(-1)}
          disabled={submitting}
        >
          <ChevronLeft size={17} />
          Back
        </button>

        <div className="upload-page-heading">

          <p className="upload-page-eyebrow">
            Prescription
          </p>

          <h1>
            Upload Prescription
          </h1>

          <p>
            Upload a photo or PDF of your prescription.
            We&apos;ll send it to your selected PharmaLink
            partner pharmacy for verification.
          </p>

        </div>
      </div>

      {/* ====================================================
          FORM
      ==================================================== */}

      <form
        className="upload-prescription-form"
        onSubmit={handleSubmit}
        noValidate
      >

        {/* ==================================================
            FILE UPLOAD
        ================================================== */}

        <div
          className={[
            'upload-dropzone',
            dragActive
              ? 'upload-dropzone-active'
              : '',
            selectedFile
              ? 'upload-dropzone-has-file'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >

          <input
            ref={fileInputRef}
            id="prescription-file"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
            disabled={submitting}
            className="upload-file-input"
          />

          {!selectedFile ? (
            <label
              htmlFor="prescription-file"
              className="upload-dropzone-label"
            >

              <div className="upload-dropzone-icon">
                <Upload size={38} />
              </div>

              <p className="upload-dropzone-title">
                <strong>
                  Click to upload
                </strong>{' '}
                or drag and drop
              </p>

              <p className="upload-dropzone-help">
                JPEG, PNG, WEBP or PDF
                (max 10MB)
              </p>

            </label>
          ) : (
            <div className="upload-selected-file">

              <div className="upload-selected-file-icon">
                <FileText size={26} />
              </div>

              <div className="upload-selected-file-info">

                <p className="upload-selected-file-name">
                  {selectedFile.name}
                </p>

                <p className="upload-selected-file-size">
                  {formatFileSize(
                    selectedFile.size,
                  )}
                </p>

              </div>

              <button
                type="button"
                className="upload-remove-file"
                onClick={removeFile}
                disabled={submitting}
                aria-label="Remove selected prescription"
              >
                <X size={18} />
              </button>

            </div>
          )}

        </div>

        {/* ==================================================
            FORM FIELDS
        ================================================== */}

        <div className="form-fields">

          {/* Patient */}
          <div className="form-group">

            <label htmlFor="patient-name">
              Patient Name *
            </label>

            <input
              id="patient-name"
              name="patientName"
              type="text"
              value={formData.patientName}
              onChange={handleInputChange}
              placeholder="Full name of the patient"
              autoComplete="name"
              maxLength={120}
              disabled={submitting}
              required
            />

          </div>

          {/* Doctor */}
          <div className="form-group">

            <label htmlFor="doctor-name">
              Doctor Name *
            </label>

            <input
              id="doctor-name"
              name="doctorName"
              type="text"
              value={formData.doctorName}
              onChange={handleInputChange}
              placeholder="Doctor's full name"
              maxLength={120}
              disabled={submitting}
              required
            />

          </div>

          {/* ================================================
              PRESCRIPTION DATE
          ================================================ */}

          <div className="form-group">

            <label htmlFor="prescription-date">
              Prescription Date *
            </label>

            <input
              id="prescription-date"
              type="text"
              inputMode="text"
              value={
                prescriptionDateDisplay
              }
              onChange={
                handlePrescriptionDateChange
              }
              onBlur={
                handlePrescriptionDateBlur
              }
              placeholder="MM-DD-YYYY"
              autoComplete="off"
              disabled={submitting}
              aria-invalid={
                prescriptionDateError
                  ? 'true'
                  : 'false'
              }
              aria-describedby="prescription-date-help"
              required
            />

            <p
              id="prescription-date-help"
              className="field-help"
            >
              You can type a date such as
              &quot;September 29 2026&quot;,
              &quot;09-29-2026&quot;, or
              &quot;2026 29 09&quot;. We&apos;ll
              format it automatically.
            </p>

            {prescriptionDateError && (
              <p className="upload-field-error">
                {prescriptionDateError}
              </p>
            )}

          </div>

          {/* ================================================
              SEARCHABLE PHARMACY
          ================================================ */}

          <div className="form-group upload-pharmacy-group">

            <label htmlFor="pharmacy-search">
              Select Pharmacy *
            </label>

            <div className="upload-pharmacy-search">

              <div
                className={[
                  'upload-pharmacy-input-wrapper',
                  selectedPharmacy
                    ? 'upload-pharmacy-input-selected'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >

                {selectedPharmacy ? (
                  <Building2
                    size={18}
                    className="upload-pharmacy-leading-icon"
                  />
                ) : (
                  <Search
                    size={18}
                    className="upload-pharmacy-leading-icon"
                  />
                )}

                <input
                  ref={pharmacySearchRef}
                  id="pharmacy-search"
                  type="text"
                  value={pharmacySearch}
                  onChange={
                    handlePharmacySearchChange
                  }
                  onFocus={() => {
                    if (
                      pharmacySearch
                        .trim()
                        .length >= 2 &&
                      !selectedPharmacy
                    ) {
                      setShowPharmacySuggestions(
                        true,
                      )
                    }
                  }}
                  placeholder={
                    pharmaciesLoading
                      ? 'Loading partner pharmacies...'
                      : 'Type a pharmacy name'
                  }
                  autoComplete="off"
                  disabled={
                    submitting ||
                    pharmaciesLoading
                  }
                  aria-autocomplete="list"
                  aria-expanded={
                    showPharmacySuggestions
                  }
                  aria-controls="pharmacy-suggestions"
                  required
                />

                {selectedPharmacy && (
                  <button
                    type="button"
                    className="upload-pharmacy-clear"
                    onClick={
                      clearSelectedPharmacy
                    }
                    disabled={submitting}
                    aria-label="Clear selected pharmacy"
                  >
                    <X size={17} />
                  </button>
                )}

              </div>

              {/* Suggestions */}
              {showPharmacySuggestions &&
                !selectedPharmacy &&
                pharmacySuggestions.length >
                  0 && (
                  <div
                    id="pharmacy-suggestions"
                    className="upload-pharmacy-suggestions"
                    role="listbox"
                  >

                    {pharmacySuggestions.map(
                      (pharmacy) => (
                        <button
                          key={
                            pharmacy.pharmacy_id
                          }
                          type="button"
                          className="upload-pharmacy-suggestion"
                          onMouseDown={(
                            event,
                          ) => {
                            /*
                             * Prevent input blur before
                             * the click can select the
                             * suggestion.
                             */
                            event.preventDefault()
                          }}
                          onClick={() =>
                            handleSelectPharmacy(
                              pharmacy,
                            )
                          }
                          role="option"
                          aria-selected="false"
                        >

                          <div className="upload-pharmacy-suggestion-icon">
                            <Building2
                              size={17}
                            />
                          </div>

                          <div className="upload-pharmacy-suggestion-copy">

                            <span className="upload-pharmacy-suggestion-name">
                              {
                                pharmacy.name
                              }
                            </span>

                            {pharmacy.address && (
                              <span className="upload-pharmacy-suggestion-address">
                                {
                                  pharmacy.address
                                }
                              </span>
                            )}

                          </div>

                        </button>
                      ),
                    )}

                  </div>
                )}

              {/* No partner */}
              {shouldShowNoPharmacyMatch && (
                <div className="upload-pharmacy-no-match">

                  <Building2 size={19} />

                  <div>

                    <strong>
                      No partner pharmacy found
                    </strong>

                    <p>
                      Sorry, that pharmacy is
                      not currently a PharmaLink
                      partner. Please search for
                      another pharmacy.
                    </p>

                  </div>

                </div>
              )}

            </div>

            {selectedPharmacy ? (
              <div className="upload-selected-pharmacy">

                <div className="upload-selected-pharmacy-check">
                  <Check size={15} />
                </div>

                <div>

                  <p>
                    {
                      selectedPharmacy.name
                    }
                  </p>

                  {selectedPharmacy.address && (
                    <span>
                      {
                        selectedPharmacy.address
                      }
                    </span>
                  )}

                </div>

              </div>
            ) : (
              <p className="field-help">
                Start typing the name or
                location of a PharmaLink partner
                pharmacy. Suggestions appear
                after 2 characters.
              </p>
            )}

            {pharmacySearchError && (
              <p className="upload-field-error">
                {pharmacySearchError}
              </p>
            )}

          </div>

          {/* Notes */}
          <div className="form-group">

            <label htmlFor="additional-notes">
              Additional Notes (Optional)
            </label>

            <textarea
              id="additional-notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Any special instructions or notes"
              rows={4}
              maxLength={500}
              disabled={submitting}
            />

            <p className="upload-notes-count">
              {formData.notes.length}/500
            </p>

          </div>

        </div>

        {/* ==================================================
            MESSAGES
        ================================================== */}

        {error && (
          <div
            className="upload-alert upload-alert-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="upload-alert upload-alert-success"
            role="status"
          >
            {success}
          </div>
        )}

        {/* ==================================================
            SUBMIT
        ================================================== */}

        <button
          type="submit"
          className="submit-btn"
          disabled={
            submitting ||
            pharmaciesLoading
          }
        >

          <Check size={18} />

          <span>
            {submitting
              ? 'Uploading Prescription...'
              : 'Upload Prescription'}
          </span>

        </button>

      </form>

    </section>
  )
}

export default UploadPrescriptionPage