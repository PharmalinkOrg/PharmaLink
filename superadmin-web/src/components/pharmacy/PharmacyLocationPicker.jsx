import { useEffect, useRef, useState } from 'react'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
} from 'lucide-react'

import L from 'leaflet'

import 'leaflet/dist/leaflet.css'
import './PharmacyLocationPicker.css'

/* ============================================================
   LEAFLET MARKER ICON FIX

   Vite may not automatically resolve Leaflet's default marker
   images correctly, so we explicitly configure them here.
============================================================ */

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',

  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',

  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

/* ============================================================
   DEFAULT MAP VIEW

   This is ONLY the initial map viewport.

   It is NOT treated as the user's current location and is NOT
   saved as the pharmacy location unless the Super Admin selects
   a location.
============================================================ */

const DEFAULT_CENTER = [10.3157, 123.8854]
const DEFAULT_ZOOM = 13

/* ============================================================
   NOMINATIM
============================================================ */

const NOMINATIM_URL =
  'https://nominatim.openstreetmap.org'

/* ============================================================
   MAP VIEW CONTROLLER

   Moves the map whenever a search result is selected.
============================================================ */

function MapViewController({ position }) {
  const map = useMap()

  useEffect(() => {
    if (!position) {
      return
    }

    map.flyTo(
      [position.latitude, position.longitude],
      17,
      {
        duration: 0.8,
      }
    )
  }, [map, position])

  return null
}

/* ============================================================
   CLICKABLE MAP

   Clicking anywhere on the map selects a new location.
============================================================ */

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(event) {
      onLocationSelect(
        event.latlng.lat,
        event.latlng.lng
      )
    },
  })

  return null
}

/* ============================================================
   DRAGGABLE MARKER
============================================================ */

function DraggablePharmacyMarker({
  position,
  onLocationSelect,
}) {
  const markerRef = useRef(null)

  if (!position) {
    return null
  }

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current

      if (!marker) {
        return
      }

      const markerPosition = marker.getLatLng()

      onLocationSelect(
        markerPosition.lat,
        markerPosition.lng
      )
    },
  }

  return (
    <Marker
      draggable
      position={[
        position.latitude,
        position.longitude,
      ]}
      eventHandlers={eventHandlers}
      ref={markerRef}
    />
  )
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function PharmacyLocationPicker({
  value,
  onChange,
}) {
  const [searchQuery, setSearchQuery] =
    useState(value?.address || '')

  const [searchResults, setSearchResults] =
    useState([])

  const [searching, setSearching] =
    useState(false)

  const [resolvingLocation, setResolvingLocation] =
    useState(false)

  const [error, setError] =
    useState('')

  const [hasSearched, setHasSearched] =
    useState(false)

  /* ============================================================
     CURRENT SELECTED LOCATION
  ============================================================ */

  const selectedPosition =
    value?.latitude !== '' &&
    value?.latitude !== null &&
    value?.latitude !== undefined &&
    value?.longitude !== '' &&
    value?.longitude !== null &&
    value?.longitude !== undefined
      ? {
          latitude: Number(value.latitude),
          longitude: Number(value.longitude),
        }
      : null

  /* ============================================================
     SEARCH ADDRESS / PHARMACY
  ============================================================ */

  const searchLocation = async (event) => {
    event?.preventDefault()

    const query = searchQuery.trim()

    if (query.length < 3) {
      setError(
        'Enter at least 3 characters to search for a pharmacy or address.'
      )

      setSearchResults([])
      return
    }

    try {
      setSearching(true)
      setError('')
      setHasSearched(true)

      /*
       * Philippines is included to make searches more relevant
       * to the current PharmaLink deployment.
       *
       * countrycodes=ph further limits results to the Philippines.
       */

      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'ph',
      })

      const response = await fetch(
        `${NOMINATIM_URL}/search?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(
          'Location search is temporarily unavailable.'
        )
      }

      const results = await response.json()

      setSearchResults(
        Array.isArray(results)
          ? results
          : []
      )
    } catch (error) {
      console.error(
        'Location search failed:',
        error
      )

      setSearchResults([])

      setError(
        error.message ||
          'Unable to search for this location.'
      )
    } finally {
      setSearching(false)
    }
  }

  /* ============================================================
     SELECT SEARCH RESULT
  ============================================================ */

  const selectSearchResult = (result) => {
    const latitude =
      Number(result.lat)

    const longitude =
      Number(result.lon)

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      setError(
        'The selected location does not contain valid coordinates.'
      )

      return
    }

    const address =
      result.display_name || searchQuery.trim()

    onChange({
      address,
      latitude,
      longitude,
    })

    setSearchQuery(address)
    setSearchResults([])
    setError('')
  }

  /* ============================================================
     REVERSE GEOCODE

     Used when the Super Admin:
       - clicks the map
       - drags the marker

     Coordinates -> formatted address
  ============================================================ */

  const reverseGeocode = async (
    latitude,
    longitude
  ) => {
    try {
      setResolvingLocation(true)
      setError('')

      const params =
        new URLSearchParams({
          lat: String(latitude),
          lon: String(longitude),
          format: 'jsonv2',
          addressdetails: '1',
        })

      const response = await fetch(
        `${NOMINATIM_URL}/reverse?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(
          'Unable to determine the address for this map location.'
        )
      }

      const result =
        await response.json()

      const address =
        result.display_name ||
        `${latitude.toFixed(
          6
        )}, ${longitude.toFixed(6)}`

      onChange({
        address,
        latitude,
        longitude,
      })

      setSearchQuery(address)
      setSearchResults([])
    } catch (error) {
      console.error(
        'Reverse geocoding failed:',
        error
      )

      /*
       * Keep the coordinates even if the address lookup fails.
       * However, address is intentionally empty so the form
       * will not allow final creation until a proper address
       * has been established.
       */

      onChange({
        address: '',
        latitude,
        longitude,
      })

      setError(
        error.message ||
          'Unable to determine the address for this location.'
      )
    } finally {
      setResolvingLocation(false)
    }
  }

  /* ============================================================
     MAP LOCATION CHANGE
  ============================================================ */

  const handleMapLocationSelect = (
    latitude,
    longitude
  ) => {
    reverseGeocode(
      latitude,
      longitude
    )
  }

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="pharmacy-location-picker">
      {/* ======================================================
          SEARCH
      ====================================================== */}

      <div className="location-picker-search">
        <label htmlFor="pharmacy-location-search">
          Search Pharmacy or Address

          <span>*</span>
        </label>

        <form
          className="location-picker-search-row"
          onSubmit={searchLocation}
        >
          <div className="location-picker-search-input">
            <Search size={17} />

            <input
              id="pharmacy-location-search"
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(
                  event.target.value
                )

                setError('')
              }}
              placeholder="Search pharmacy name, street, barangay, or address"
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            className="location-search-button"
            disabled={searching}
          >
            {searching ? (
              <>
                <Loader2
                  size={16}
                  className="spin"
                />

                Searching
              </>
            ) : (
              <>
                <Search size={16} />

                Search
              </>
            )}
          </button>
        </form>

        <small>
          Search for the pharmacy or its physical
          address, then select the correct result.
        </small>
      </div>

      {/* ======================================================
          SEARCH RESULTS
      ====================================================== */}

      {searchResults.length > 0 && (
        <div className="location-search-results">
          {searchResults.map((result) => (
            <button
              type="button"
              key={result.place_id}
              className="location-search-result"
              onClick={() =>
                selectSearchResult(result)
              }
            >
              <MapPin size={17} />

              <div>
                <strong>
                  {result.name ||
                    result.display_name
                      ?.split(',')[0] ||
                    'Location'}
                </strong>

                <span>
                  {result.display_name}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {hasSearched &&
        !searching &&
        searchResults.length === 0 &&
        !error && (
          <div className="location-no-results">
            No matching locations found. Try a
            more complete address.
          </div>
        )}

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="location-picker-error">
          <AlertCircle size={16} />

          <span>
            {error}
          </span>
        </div>
      )}

      {/* ======================================================
          MAP
      ====================================================== */}

      <div className="location-map-wrapper">
        <MapContainer
          center={
            selectedPosition
              ? [
                  selectedPosition.latitude,
                  selectedPosition.longitude,
                ]
              : DEFAULT_CENTER
          }
          zoom={
            selectedPosition
              ? 17
              : DEFAULT_ZOOM
          }
          scrollWheelZoom
          className="pharmacy-location-map"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler
            onLocationSelect={
              handleMapLocationSelect
            }
          />

          <MapViewController
            position={
              selectedPosition
            }
          />

          <DraggablePharmacyMarker
            position={
              selectedPosition
            }
            onLocationSelect={
              handleMapLocationSelect
            }
          />
        </MapContainer>

        {resolvingLocation && (
          <div className="map-resolving-overlay">
            <Loader2
              size={18}
              className="spin"
            />

            Finding address...
          </div>
        )}
      </div>

      <p className="map-instructions">
        Click the map to place the pharmacy pin.
        You can also drag the marker to correct its
        exact position.
      </p>

      {/* ======================================================
          CONFIRMED LOCATION
      ====================================================== */}

      {value?.address &&
      selectedPosition ? (
        <div className="confirmed-location-card">
          <CheckCircle2 size={19} />

          <div>
            <span>
              Confirmed Location
            </span>

            <strong>
              {value.address}
            </strong>

            <small>
              Latitude:{' '}
              {selectedPosition.latitude.toFixed(
                6
              )}
              {' • '}
              Longitude:{' '}
              {selectedPosition.longitude.toFixed(
                6
              )}
            </small>
          </div>
        </div>
      ) : (
        <div className="unconfirmed-location-card">
          <MapPin size={18} />

          <div>
            <span>
              Pharmacy Location
            </span>

            <p>
              Search for an address or click the
              map to establish the pharmacy's
              physical location.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}