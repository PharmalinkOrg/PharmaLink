import { useEffect, useRef, useState } from 'react'

function MedicineDropdown({
  medicines = [],
  value,
  onChange,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const dropdownRef = useRef(null)
  const searchRef = useRef(null)

  const selectedMedicine = medicines.find(
    (medicine) =>
      String(medicine.medicine_id) === String(value),
  )

  const filteredMedicines = medicines.filter((medicine) => {
    const searchText = search.trim().toLowerCase()

    if (!searchText) return true

    return [
      medicine.brand_name,
      medicine.generic_name,
      medicine.dosage,
      medicine.dosage_form,
    ]
      .filter(Boolean)
      .some((field) =>
        String(field)
          .toLowerCase()
          .includes(searchText),
      )
  })

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handleOutsideClick,
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick,
      )
    }
  }, [])

  useEffect(() => {
    if (open) {
      searchRef.current?.focus()
    }
  }, [open])

  const getMedicineName = (medicine) =>
    medicine.brand_name ||
    medicine.generic_name ||
    'Unnamed medicine'

  const getPrescriptionLabel = (medicine) =>
    medicine.requires_prescription
      ? 'Prescription'
      : 'Non-prescription'

  const handleSelect = (medicine) => {
    onChange(String(medicine.medicine_id))
    setOpen(false)
    setSearch('')
  }

  return (
    <div
      className="medicine-dropdown"
      ref={dropdownRef}
    >
      {/* Trigger */}

      <button
        type="button"
        className={`medicine-dropdown-trigger ${
          open ? 'is-open' : ''
        } ${selectedMedicine ? 'has-value' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selectedMedicine ? (
          <div className="medicine-selected">
            <div className="medicine-icon">
              <span>+</span>
            </div>

            <div className="medicine-selected-info">
              <span className="medicine-selected-name">
                {getMedicineName(selectedMedicine)}
              </span>

              <span className="medicine-selected-meta">
                {selectedMedicine.dosage || ''}
                {selectedMedicine.dosage_form
                  ? ` · ${selectedMedicine.dosage_form}`
                  : ''}
              </span>
            </div>
          </div>
        ) : (
          <span className="medicine-placeholder">
            Select a medicine
          </span>
        )}

        <span className="medicine-chevron">
          {open ? '⌃' : '⌄'}
        </span>
      </button>

      {/* Dropdown menu */}

      {open && (
        <div className="medicine-dropdown-menu">

          {/* Search */}

          <div className="medicine-dropdown-search">
            <span className="medicine-search-icon">
              ⌕
            </span>

            <input
              ref={searchRef}
              type="text"
              className="medicine-search-input"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search medicine..."
            />
          </div>

          {/* Options */}

          <div
            className="medicine-dropdown-options"
            role="listbox"
          >
            {filteredMedicines.length === 0 ? (
              <div className="medicine-no-results">
                <strong>
                  No medicines found
                </strong>

                <span>
                  Try another medicine name.
                </span>
              </div>
            ) : (
              filteredMedicines.map((medicine) => {
                const isSelected =
                  String(medicine.medicine_id) ===
                  String(value)

                return (
                  <button
                    key={medicine.medicine_id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`medicine-option ${
                      isSelected
                        ? 'is-selected'
                        : ''
                    }`}
                    onClick={() =>
                      handleSelect(medicine)
                    }
                  >
                    <div className="medicine-option-icon">
                      +
                    </div>

                    <div className="medicine-option-content">

                      <div className="medicine-option-top">
                        <strong>
                          {getMedicineName(medicine)}
                        </strong>

                        {isSelected && (
                          <span className="medicine-check">
                            ✓
                          </span>
                        )}
                      </div>

                      <div className="medicine-option-details">

                        {medicine.generic_name &&
                          medicine.generic_name !==
                            medicine.brand_name && (
                            <span>
                              {medicine.generic_name}
                            </span>
                          )}

                        {medicine.dosage && (
                          <span>
                            {medicine.dosage}
                          </span>
                        )}

                        {medicine.dosage_form && (
                          <span>
                            {medicine.dosage_form}
                          </span>
                        )}

                      </div>

                      <span
                        className={`medicine-prescription-badge ${
                          medicine.requires_prescription
                            ? 'prescription'
                            : 'non-prescription'
                        }`}
                      >
                        {getPrescriptionLabel(
                          medicine,
                        )}
                      </span>

                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MedicineDropdown