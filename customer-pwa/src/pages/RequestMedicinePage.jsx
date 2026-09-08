import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/useAuth';
import { api } from '../lib/api';

// Icons
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const LoadingSpinner = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spinner">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a10 10 0 0 1 10 10" />
  </svg>
);

const RequestMedicinePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // State
  const [formData, setFormData] = useState({
    medicineName: '',
    medicineId: '',
    quantity: 1,
    dosage: '',
    dosageUnit: 'mg',
    pharmacyId: '',
    urgency: 'normal',
    notes: '',
  });
  const [medicines, setMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [showMedicineSuggestions, setShowMedicineSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [pharmacies, setPharmacies] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch medicines and pharmacies
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [medicinesData, pharmaciesData] = await Promise.all([
          api.getMedicines(),
          api.getPharmacies(),
        ]);
        setMedicines(medicinesData || []);
        setPharmacies(pharmaciesData || []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    };
    fetchData();
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: '/request-medicine' } });
    }
  }, [user, authLoading, navigate]);

  // Handle medicine name search
  const handleMedicineSearch = (value) => {
    setFormData((prev) => ({ ...prev, medicineName: value, medicineId: '' }));

    if (value.trim().length > 0) {
      setIsSearching(true);
      const filtered = medicines.filter((med) =>
        med.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredMedicines(filtered);
      setShowMedicineSuggestions(true);
      setIsSearching(false);
    } else {
      setShowMedicineSuggestions(false);
      setFilteredMedicines([]);
    }
  };

  const handleSelectMedicine = (medicine) => {
    setFormData((prev) => ({
      ...prev,
      medicineName: medicine.name,
      medicineId: medicine.id,
      dosage: medicine.defaultDosage || '',
    }));
    setShowMedicineSuggestions(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.medicineName.trim()) {
      setError('Please enter or select a medicine name.');
      return;
    }

    if (!formData.quantity || formData.quantity < 1) {
      setError('Please enter a valid quantity.');
      return;
    }

    if (!formData.dosage.trim()) {
      setError('Please enter the dosage.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const requestData = {
        user_id: user.id,
        medicine_name: formData.medicineName.trim(),
        medicine_id: formData.medicineId || null,
        quantity: parseInt(formData.quantity),
        dosage: formData.dosage.trim(),
        dosage_unit: formData.dosageUnit,
        pharmacy_id: formData.pharmacyId || null,
        urgency: formData.urgency,
        notes: formData.notes.trim() || null,
        status: 'pending',
      };

      const { data, error: submitError } = await api.createMedicineRequest(requestData);

      if (submitError) throw submitError;

      // Success!
      setSuccess(true);

      // Reset form after delay
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          medicineName: '',
          medicineId: '',
          quantity: 1,
          dosage: '',
          dosageUnit: 'mg',
          pharmacyId: '',
          urgency: 'normal',
          notes: '',
        });
      }, 3000);
    } catch (err) {
      console.error('Request error:', err);
      setError(err.message || 'Failed to submit medicine request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="request-page">
        <div className="request-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="request-page">
      <div className="request-container">
        {/* Header */}
        <header className="request-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1>Request Medicine</h1>
          <div className="header-spacer" />
        </header>

        {/* Page Description */}
        <p className="request-description">
          Can't find a medicine? Request it from nearby pharmacies and we'll notify you when it's available.
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
            <span>Medicine request submitted successfully! We'll notify you when it's available.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="request-form">
          {/* Form Fields */}
          <div className="form-fields">
            {/* Medicine Name - with search */}
            <div className="form-group">
              <label htmlFor="medicineName">Medicine Name *</label>
              <div className="medicine-search-wrapper">
                <div className="search-input-wrapper">
                  <SearchIcon />
                  <input
                    type="text"
                    id="medicineName"
                    name="medicineName"
                    value={formData.medicineName}
                    onChange={(e) => handleMedicineSearch(e.target.value)}
                    onFocus={() => {
                      if (formData.medicineName.trim().length > 0) {
                        setShowMedicineSuggestions(true);
                      }
                    }}
                    placeholder="Search and select a medicine"
                    disabled={isSubmitting}
                    autoComplete="off"
                  />
                </div>

                {/* Medicine suggestions dropdown */}
                {showMedicineSuggestions && filteredMedicines.length > 0 && (
                  <ul className="suggestions-list">
                    {filteredMedicines.map((medicine) => (
                      <li key={medicine.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectMedicine(medicine)}
                          className="suggestion-item"
                          disabled={isSubmitting}
                        >
                          <div className="suggestion-content">
                            <div className="suggestion-name">{medicine.name}</div>
                            {medicine.manufacturer && (
                              <div className="suggestion-meta">
                                {medicine.manufacturer}
                              </div>
                            )}
                          </div>
                          {formData.medicineId === medicine.id && (
                            <CheckIcon />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {showMedicineSuggestions && isSearching && (
                  <div className="suggestions-loading">
                    <LoadingSpinner /> Searching...
                  </div>
                )}

                {showMedicineSuggestions && !isSearching && formData.medicineName.trim().length > 0 && filteredMedicines.length === 0 && (
                  <div className="suggestions-empty">
                    No medicines found. You can still submit your request with this name.
                  </div>
                )}
              </div>
            </div>

            {/* Dosage */}
            <div className="form-group">
              <label htmlFor="dosage">Dosage *</label>
              <div className="dosage-input-group">
                <input
                  type="number"
                  id="dosage"
                  name="dosage"
                  value={formData.dosage}
                  onChange={handleInputChange}
                  placeholder="e.g., 500"
                  disabled={isSubmitting}
                  required
                  step="0.1"
                />
                <select
                  name="dosageUnit"
                  value={formData.dosageUnit}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                >
                  <option value="mg">mg</option>
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="mcg">mcg</option>
                  <option value="IU">IU</option>
                  <option value="units">units</option>
                </select>
              </div>
            </div>

            {/* Quantity */}
            <div className="form-group">
              <label htmlFor="quantity">Quantity *</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                placeholder="Number of units/packs"
                disabled={isSubmitting}
                required
                min="1"
              />
            </div>

            {/* Urgency */}
            <div className="form-group">
              <label htmlFor="urgency">Urgency Level</label>
              <select
                id="urgency"
                name="urgency"
                value={formData.urgency}
                onChange={handleInputChange}
                disabled={isSubmitting}
              >
                <option value="low">Low - Can wait a few days</option>
                <option value="normal">Normal - Needed soon</option>
                <option value="high">High - Needed ASAP</option>
              </select>
            </div>

            {/* Preferred Pharmacy */}
            <div className="form-group">
              <label htmlFor="pharmacyId">Preferred Pharmacy (Optional)</label>
              <select
                id="pharmacyId"
                name="pharmacyId"
                value={formData.pharmacyId}
                onChange={handleInputChange}
                disabled={isSubmitting}
              >
                <option value="">Any nearby pharmacy</option>
                {pharmacies.map((pharmacy) => (
                  <option key={pharmacy.id} value={pharmacy.id}>
                    {pharmacy.name} - {pharmacy.address}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label htmlFor="notes">Additional Notes (Optional)</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any special instructions or requirements"
                rows="3"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`submit-btn ${isSubmitting ? 'loading' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" />
                Submitting...
              </>
            ) : (
              <>
                <CheckIcon />
                Submit Request
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RequestMedicinePage;