// File: superadmin-web/src/components/pharmacy/PharmacyLocationPicker.jsx

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
  Store,
  X,
} from 'lucide-react'

import L from 'leaflet'

import {
  CEBU_BOUNDS,
  CEBU_CENTER,
  CEBU_LEAFLET_BOUNDS,
  getAdministrativeTail,
  isCebuAddress,
  isInCebu,
  isWithinCebuBounds,
} from '../../utils/cebuLocation'

import 'leaflet/dist/leaflet.css'
import './PharmacyLocationPicker.css'

/* ============================================================
   LEAFLET MARKER ICON FIX
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
   CONSTANTS
============================================================ */

const DEFAULT_ZOOM = 13
const SELECTED_ZOOM = 17
const MIN_ZOOM = 9
const MIN_QUERY_LENGTH = 3
const MAX_RESULTS = 8

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'
const PHOTON_URL = 'https://photon.komoot.io/api/'

const PHOTON_OSM_TYPES = { N: 'node', W: 'way', R: 'relation' }

/* ============================================================
   HELPERS
============================================================ */

const hasCoordinate = (value) =>
  value !== '' &&
  value !== null &&
  value !== undefined &&
  Number.isFinite(Number(value))

const normalizeText = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const uniqueParts = (parts) => {
  const seen = new Set()

  return parts
    .map((part) => String(part || '').trim())
    .filter((part) => {
      const key = part.toLowerCase()

      if (!part || seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
}

const isPharmacyType = (value) =>
  ['pharmacy', 'chemist', 'drugstore'].includes(
    String(value || '').toLowerCase()
  )

/**
 * Ranks results so the closest textual match appears first.
 * Words matched in the place name count more than words matched
 * only somewhere in the address.
 */
function scoreResult(result, query) {
  const normalizedQuery = normalizeText(query)
  const tokens = normalizedQuery
    .split(' ')
    .filter((token) => token.length > 1)

  const title = normalizeText(result.title)
  const full = normalizeText(`${result.title} ${result.address}`)

  let score = 0

  tokens.forEach((token) => {
    if (title.includes(token)) {
      score += 3
    } else if (full.includes(token)) {
      score += 1
    }
  })

  if (title === normalizedQuery) {
    score += 6
  } else if (title.startsWith(normalizedQuery)) {
    score += 3
  }

  if (result.isPharmacy) {
    score += 2
  }

  return score
}

/* ============================================================
   GEOCODERS

   Two OpenStreetMap geocoders are queried together:
     - Nominatim: strong on full street addresses
     - Photon:    strong on business / pharmacy names and
                  partial or misspelled input

   Both are restricted to the Cebu bounding box, then every
   result is checked again so neighbouring provinces that fall
   inside the box (Bohol, Negros) are dropped.
============================================================ */

function normalizeNominatimResult(result) {
  const latitude = Number(result.lat)
  const longitude = Number(result.lon)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  const address = result.address || {}

  const administrativeParts = [
    address.province,
    address.state,
    address.county,
    address.region,
    ...getAdministrativeTail(result.display_name),
  ]

  if (!isInCebu(latitude, longitude, administrativeParts)) {
    return null
  }

  return {
    id: `${result.osm_type}-${result.osm_id}`,
    title:
      result.name ||
      String(result.display_name || '').split(',')[0] ||
      'Location',
    address: result.display_name || '',
    latitude,
    longitude,
    isPharmacy: isPharmacyType(result.type),
  }
}

function normalizePhotonFeature(feature) {
  const [longitude, latitude] = feature?.geometry?.coordinates || []
  const properties = feature?.properties || {}

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  const administrativeParts = [
    properties.county,
    properties.state,
    properties.city,
    properties.district,
  ]

  if (!isInCebu(latitude, longitude, administrativeParts)) {
    return null
  }

  const street = [properties.housenumber, properties.street]
    .filter(Boolean)
    .join(' ')

  const title =
    properties.name || street || properties.city || 'Location'

  const address = uniqueParts([
    properties.name,
    street,
    properties.locality,
    properties.district,
    properties.city,
    properties.county,
    properties.state,
    properties.postcode,
    properties.country,
  ]).join(', ')

  return {
    id: `${PHOTON_OSM_TYPES[properties.osm_type] || properties.osm_type}-${properties.osm_id}`,
    title,
    address,
    latitude,
    longitude,
    isPharmacy: isPharmacyType(properties.osm_value),
  }
}

async function searchNominatim(query, signal) {
  const { west, north, east, south } = CEBU_BOUNDS

  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(MAX_RESULTS),
    countrycodes: 'ph',
    viewbox: `${west},${north},${east},${south}`,
    bounded: '1',
    dedupe: '1',
    'accept-language': 'en',
  })

  const response = await fetch(
    `${NOMINATIM_URL}/search?${params.toString()}`,
    { headers: { Accept: 'application/json' }, signal }
  )

  if (!response.ok) {
    throw new Error('Nominatim search failed.')
  }

  const data = await response.json()

  return Array.isArray(data)
    ? data.map(normalizeNominatimResult).filter(Boolean)
    : []
}

async function searchPhoton(query, signal) {
  const { west, south, east, north } = CEBU_BOUNDS

  const params = new URLSearchParams({
    q: query,
    limit: String(MAX_RESULTS),
    lang: 'en',
    bbox: `${west},${south},${east},${north}`,
    lat: String(CEBU_CENTER[0]),
    lon: String(CEBU_CENTER[1]),
  })

  const response = await fetch(`${PHOTON_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    throw new Error('Photon search failed.')
  }

  const data = await response.json()

  return Array.isArray(data?.features)
    ? data.features.map(normalizePhotonFeature).filter(Boolean)
    : []
}

/**
 * Merges results from both geocoders, removes duplicates
 * (same OSM object, or same name within ~10 m) and sorts by
 * relevance to the query.
 */
function mergeResults(results, query) {
  const seenIds = new Set()
  const seenPlaces = new Set()
  const merged = []

  results.forEach((result, index) => {
    const placeKey = `${normalizeText(result.title)}|${result.latitude.toFixed(4)}|${result.longitude.toFixed(4)}`

    if (seenIds.has(result.id) || seenPlaces.has(placeKey)) {
      return
    }

    seenIds.add(result.id)
    seenPlaces.add(placeKey)

    merged.push({
      ...result,
      score: scoreResult(result, query),
      order: index,
    })
  })

  return merged
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, MAX_RESULTS)
}

/* ============================================================
   MAP HELPERS
============================================================ */

// Flies only when a search result is chosen — not on every
// click or re-render.
function MapFlyTo({ target }) {
  const map = useMap()

  useEffect(() => {
    if (!target) {
      return
    }

    map.flyTo([target.latitude, target.longitude], SELECTED_ZOOM, {
      duration: 0.8,
    })
  }, [map, target])

  return null
}

// Leaflet measures its container on mount; inside a modal that
// can happen before layout settles, leaving grey tiles.
function MapSizeFix() {
  const map = useMap()

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 150)
    return () => clearTimeout(timer)
  }, [map])

  return null
}

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(event) {
      onLocationSelect(event.latlng.lat, event.latlng.lng)
    },
  })

  return null
}

function DraggablePharmacyMarker({ position, onLocationSelect }) {
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

      const { lat, lng } = marker.getLatLng()
      onLocationSelect(lat, lng)
    },
  }

  return (
    <Marker
      draggable
      position={[position.latitude, position.longitude]}
      eventHandlers={eventHandlers}
      ref={markerRef}
    />
  )
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function PharmacyLocationPicker({ value, onChange }) {
  const [searchQuery, setSearchQuery] = useState(value?.address || '')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [resolvingLocation, setResolvingLocation] = useState(false)
  const [error, setError] = useState('')
  const [flyTarget, setFlyTarget] = useState(null)

  const searchAbortRef = useRef(null)
  const reverseRequestRef = useRef(0)

  useEffect(() => () => searchAbortRef.current?.abort(), [])

  const selectedPosition =
    hasCoordinate(value?.latitude) && hasCoordinate(value?.longitude)
      ? {
          latitude: Number(value.latitude),
          longitude: Number(value.longitude),
        }
      : null

  const hasAddress = Boolean(String(value?.address || '').trim())

  /* ==========================================================
     SEARCH
  ========================================================== */

  const runSearch = async () => {
    const query = searchQuery.trim()

    if (query.length < MIN_QUERY_LENGTH) {
      setError(
        'Enter at least 3 characters to search for a pharmacy or address.'
      )
      setSearchResults([])
      return
    }

    searchAbortRef.current?.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller

    setSearching(true)
    setError('')
    setHasSearched(true)

    try {
      const settled = await Promise.allSettled([
        searchNominatim(query, controller.signal),
        searchPhoton(query, controller.signal),
      ])

      if (controller.signal.aborted) {
        return
      }

      const succeeded = settled.filter(
        (result) => result.status === 'fulfilled'
      )

      if (succeeded.length === 0) {
        throw new Error(
          'Location search is temporarily unavailable. Try again, or click the map to place the pin.'
        )
      }

      setSearchResults(
        mergeResults(
          succeeded.flatMap((result) => result.value),
          query
        )
      )
    } catch (searchError) {
      if (searchError.name === 'AbortError') {
        return
      }

      console.error('Location search failed:', searchError)
      setSearchResults([])
      setError(searchError.message || 'Unable to search for this location.')
    } finally {
      if (searchAbortRef.current === controller) {
        setSearching(false)
      }
    }
  }

  const handleSearchKeyDown = (event) => {
    // The picker sits inside the pharmacy form. Enter must search,
    // not submit the whole form.
    if (event.key === 'Enter') {
      event.preventDefault()
      runSearch()
    }

    if (event.key === 'Escape' && searchResults.length > 0) {
      event.stopPropagation()
      setSearchResults([])
    }
  }

  const selectSearchResult = (result) => {
    reverseRequestRef.current += 1
    setResolvingLocation(false)

    onChange({
      address: result.address || result.title,
      latitude: result.latitude,
      longitude: result.longitude,
    })

    setFlyTarget({
      latitude: result.latitude,
      longitude: result.longitude,
    })

    setSearchQuery(result.title)
    setSearchResults([])
    setHasSearched(false)
    setError('')
  }

  /* ==========================================================
     MAP CLICK / MARKER DRAG → REVERSE GEOCODE
  ========================================================== */

  const handleMapLocationSelect = async (latitude, longitude) => {
    if (!isWithinCebuBounds(latitude, longitude)) {
      setError('Pharmacies can only be placed within Cebu province.')
      return
    }

    const previousValue = {
      address: value?.address || '',
      latitude: value?.latitude ?? '',
      longitude: value?.longitude ?? '',
    }

    const requestId = ++reverseRequestRef.current

    // Move the pin immediately; the address follows.
    onChange({ address: '', latitude, longitude })

    setResolvingLocation(true)
    setSearchResults([])
    setError('')

    try {
      const params = new URLSearchParams({
        lat: String(latitude),
        lon: String(longitude),
        format: 'jsonv2',
        addressdetails: '1',
        zoom: '18',
        'accept-language': 'en',
      })

      const response = await fetch(
        `${NOMINATIM_URL}/reverse?${params.toString()}`,
        { headers: { Accept: 'application/json' } }
      )

      if (!response.ok) {
        throw new Error('Reverse geocoding failed.')
      }

      const result = await response.json()

      if (requestId !== reverseRequestRef.current) {
        return
      }

      const address = result.address || {}

      const administrativeParts = [
        address.province,
        address.state,
        address.county,
        address.region,
        ...getAdministrativeTail(result.display_name),
      ]

      if (!isCebuAddress(administrativeParts)) {
        onChange(previousValue)
        setError(
          'That point is outside Cebu province. Choose a location within Cebu.'
        )
        return
      }

      const resolvedAddress =
        result.display_name ||
        `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`

      onChange({ address: resolvedAddress, latitude, longitude })
    } catch (reverseError) {
      if (requestId !== reverseRequestRef.current) {
        return
      }

      console.error('Reverse geocoding failed:', reverseError)

      // Keep the pin; the admin can type the address below.
      setError(
        'The pin is placed, but its address could not be looked up. Type the address below to continue.'
      )
    } finally {
      if (requestId === reverseRequestRef.current) {
        setResolvingLocation(false)
      }
    }
  }

  /* ==========================================================
     MANUAL ADDRESS / CLEAR
  ========================================================== */

  const handleAddressChange = (event) => {
    onChange({
      address: event.target.value,
      latitude: value?.latitude ?? '',
      longitude: value?.longitude ?? '',
    })
  }

  const clearLocation = () => {
    reverseRequestRef.current += 1
    setResolvingLocation(false)
    onChange({ address: '', latitude: '', longitude: '' })
    setSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
    setError('')
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="pharmacy-location-picker">
      {/* SEARCH */}

      <div className="location-picker-search">
        <label htmlFor="pharmacy-location-search">
          Search Pharmacy or Address
          <span>*</span>
        </label>

        <div className="location-picker-search-row">
          <div className="location-picker-search-input">
            <Search size={17} />

            <input
              id="pharmacy-location-search"
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setError('')
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="e.g. Rose Pharmacy Colon, or 55 Osmeña Blvd, Cebu City"
              autoComplete="off"
            />

            {searchQuery && (
              <button
                type="button"
                className="location-search-clear"
                onClick={() => {
                  setSearchQuery('')
                  setSearchResults([])
                  setHasSearched(false)
                }}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="location-search-button"
            onClick={runSearch}
            disabled={searching}
          >
            {searching ? (
              <>
                <Loader2 size={16} className="spin" />
                Searching
              </>
            ) : (
              <>
                <Search size={16} />
                Search
              </>
            )}
          </button>
        </div>

        <small>
          Results are limited to Cebu province. Add the barangay or city
          for better matches.
        </small>
      </div>

      {/* RESULTS */}

      {searchResults.length > 0 && (
        <div className="location-search-results" role="listbox">
          {searchResults.map((result) => (
            <button
              type="button"
              key={result.id}
              className="location-search-result"
              onClick={() => selectSearchResult(result)}
              role="option"
              aria-selected="false"
            >
              {result.isPharmacy ? <Store size={17} /> : <MapPin size={17} />}

              <div>
                <strong>
                  {result.title}
                  {result.isPharmacy && (
                    <em className="location-result-tag">Pharmacy</em>
                  )}
                </strong>

                <span>{result.address}</span>
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
            No matches found in Cebu. Try adding the barangay or city, or
            click the map to place the pin manually.
          </div>
        )}

      {/* ERROR */}

      {error && (
        <div className="location-picker-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* MAP */}

      <div className="location-map-wrapper">
        <MapContainer
          center={
            selectedPosition
              ? [selectedPosition.latitude, selectedPosition.longitude]
              : CEBU_CENTER
          }
          zoom={selectedPosition ? SELECTED_ZOOM : DEFAULT_ZOOM}
          minZoom={MIN_ZOOM}
          maxBounds={CEBU_LEAFLET_BOUNDS}
          maxBoundsViscosity={1}
          scrollWheelZoom
          className="pharmacy-location-map"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            bounds={CEBU_LEAFLET_BOUNDS}
            noWrap
          />

          <MapSizeFix />
          <MapClickHandler onLocationSelect={handleMapLocationSelect} />
          <MapFlyTo target={flyTarget} />
          <DraggablePharmacyMarker
            position={selectedPosition}
            onLocationSelect={handleMapLocationSelect}
          />
        </MapContainer>

        {resolvingLocation && (
          <div className="map-resolving-overlay">
            <Loader2 size={18} className="spin" />
            Finding address...
          </div>
        )}

        <div className="map-region-badge">
          <MapPin size={12} />
          Cebu only
        </div>
      </div>

      <p className="map-instructions">
        Click the map to place the pharmacy pin, or drag the marker to
        correct its exact position.
      </p>

      {/* ADDRESS (EDITABLE) */}

      {selectedPosition && (
        <div className="location-address-field">
          <label htmlFor="pharmacy-address-detail">
            Address shown to customers
            <span>*</span>
          </label>

          <textarea
            id="pharmacy-address-detail"
            rows={2}
            value={value?.address || ''}
            onChange={handleAddressChange}
            placeholder="e.g. 55 Osmeña Blvd, Brgy. Sambag II, Cebu City"
          />

          <small>
            Refine the street, building or landmark if the map lookup is
            incomplete. The pin position stays the same.
          </small>
        </div>
      )}

      {/* STATUS CARD */}

      {hasAddress && selectedPosition ? (
        <div className="confirmed-location-card">
          <CheckCircle2 size={19} />

          <div>
            <span>Confirmed Location</span>
            <strong>{value.address}</strong>
            <small>
              Latitude: {selectedPosition.latitude.toFixed(6)}
              {' • '}
              Longitude: {selectedPosition.longitude.toFixed(6)}
            </small>
          </div>

          <button
            type="button"
            className="location-clear-button"
            onClick={clearLocation}
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="unconfirmed-location-card">
          <MapPin size={18} />

          <div>
            <span>Pharmacy Location</span>
            <p>
              {selectedPosition
                ? 'Pin placed. Add the address above to confirm.'
                : "Search for an address or click the map to set the pharmacy's physical location."}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
