// src/pages/UploadPrescriptionPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/useAuth';
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';

// Icons (using inline SVG or you can use a library like lucide-react)
const UploadIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const UploadPrescriptionPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef(null);

  // State
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    patientName: '',
    doctorName: '',
    prescriptionDate: new Date().toISOString().split('T')[0],
    pharmacyId: '',
    notes: '',
  });
  const [pharmacies, setPharmacies] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Fetch pharmacies for dropdown
  useEffect(() => {
    const fetchPharmacies = async () => {
      try {
        const data = await api.getPharmacies();
        setPharmacies(data || []);
      } catch (err) {
        console.error('Failed to fetch pharmacies:', err);
        // Non-critical, so we don't show error to user
      }
    };
    fetchPharmacies();
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: '/upload-prescription' } });
    }
  }, [user, authLoading, navigate]);

  // Handle file selection
  const handleFileSelect = (selectedFile) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a JPEG, PNG, WEBP, or PDF file.');
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }

    setError(null);
    setFile(selectedFile);

    // Generate preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else {
      // For PDFs, show a PDF icon preview
      setPreview(null);
    }
  };

  // Handle drag events
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a prescription file to upload.');
      return;
    }

    if (!formData.patientName.trim()) {
      setError('Please enter the patient name.');
      return;
    }

    if (!formData.doctorName.trim()) {
      setError('Please enter the doctor name.');
      return;
    }

    if (!formData.prescriptionDate) {
      setError('Please select the prescription date.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const bucketName = 'prescriptions';

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      const fileUrl = urlData.publicUrl;

      // 2. Create prescription record in database
      const prescriptionData = {
        user_id: user.id,
        file_url: fileUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        patient_name: formData.patientName.trim(),
        doctor_name: formData.doctorName.trim(),
        prescription_date: formData.prescriptionDate,
        pharmacy_id: formData.pharmacyId || null,
        notes: formData.notes.trim() || null,
        status: 'pending',
      };

      const { data: prescription, error: dbError } = await api.createPrescription(prescriptionData);

      if (dbError) throw dbError;

      // Success!
      setSuccess(true);
      setUploadProgress(100);

      // Reset form after delay
      setTimeout(() => {
        setSuccess(false);
        setFile(null);
        setPreview(null);
        setFormData({
          patientName: '',
          doctorName: '',
          prescriptionDate: new Date().toISOString().split('T')[0],
          pharmacyId: '',
          notes: '',
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setUploadProgress(0);
      }, 3000);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload prescription. Please try again.');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="upload-page">
        <div className="upload-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-page">
      <div className="upload-container">
        {/* Header */}
        <header className="upload-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1>Upload Prescription</h1>
          <div className="header-spacer" />
        </header>

        {/* Page Description */}
        <p className="upload-description">
          Upload a photo or PDF of your prescription. We'll process it and notify you when your medication is ready.
        </p>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
            <button className="alert-close" onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="alert alert-success">
            <span className="alert-icon">✅</span>
            <span>Prescription uploaded successfully! We'll process it shortly.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="upload-form">
          {/* File Upload Area */}
          <div
            className={`drop-zone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                if (e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="file-input"
              disabled={isUploading}
            />

            {file ? (
              <div className="file-preview">
                {preview ? (
                  <img src={preview} alt="Prescription preview" className="preview-image" />
                ) : (
                  <div className="pdf-preview">
                    <span className="pdf-icon">📄</span>
                    <span className="pdf-name">{file.name}</span>
                    <span className="pdf-size">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  className="remove-file-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  disabled={isUploading}
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
                  <strong>Click to upload</strong> or drag and drop
                </p>
                <p className="drop-zone-subtext">
                  JPEG, PNG, WEBP or PDF (max 10MB)
                </p>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
              <span className="progress-text">{uploadProgress}%</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="form-fields">
            <div className="form-group">
              <label htmlFor="patientName">Patient Name *</label>
              <input
                type="text"
                id="patientName"
                name="patientName"
                value={formData.patientName}
                onChange={handleInputChange}
                placeholder="Full name of the patient"
                disabled={isUploading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="doctorName">Doctor Name *</label>
              <input
                type="text"
                id="doctorName"
                name="doctorName"
                value={formData.doctorName}
                onChange={handleInputChange}
                placeholder="Doctor's full name"
                disabled={isUploading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="prescriptionDate">Prescription Date *</label>
              <input
                type="date"
                id="prescriptionDate"
                name="prescriptionDate"
                value={formData.prescriptionDate}
                onChange={handleInputChange}
                disabled={isUploading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="pharmacyId">Preferred Pharmacy (Optional)</label>
              <select
                id="pharmacyId"
                name="pharmacyId"
                value={formData.pharmacyId}
                onChange={handleInputChange}
                disabled={isUploading}
              >
                <option value="">Select a pharmacy</option>
                {pharmacies.map((pharmacy) => (
                  <option key={pharmacy.id} value={pharmacy.id}>
                    {pharmacy.name} - {pharmacy.address}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Additional Notes (Optional)</label>
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

          {/* Submit Button */}
          <button
            type="submit"
            className={`submit-btn ${isUploading ? 'loading' : ''}`}
            disabled={isUploading || !file}
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
  );
};

export default UploadPrescriptionPage;