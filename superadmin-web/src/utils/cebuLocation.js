// File: superadmin-web/src/utils/cebuLocation.js

/* ============================================================
   CEBU PROVINCE GEOGRAPHY

   The bounding box covers mainland Cebu plus Mactan, Bantayan,
   Camotes, Olango and the southern tip (Santander).

   A rectangle alone also overlaps parts of Bohol and Negros, so
   results are additionally checked against their administrative
   names (province / region) before they are accepted.
============================================================ */

export const CEBU_BOUNDS = {
  south: 9.35,
  west: 123.25,
  north: 11.35,
  east: 124.5,
}

// Leaflet format: [[south, west], [north, east]]
export const CEBU_LEAFLET_BOUNDS = [
  [CEBU_BOUNDS.south, CEBU_BOUNDS.west],
  [CEBU_BOUNDS.north, CEBU_BOUNDS.east],
]

// Cebu City — used only as the initial viewport / search bias.
export const CEBU_CENTER = [10.3157, 123.8854]

const NEIGHBOURING_PROVINCES = [
  'bohol',
  'negros',
  'siquijor',
  'leyte',
  'biliran',
  'masbate',
  'samar',
  'iloilo',
  'guimaras',
]

export function isWithinCebuBounds(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= CEBU_BOUNDS.south &&
    lat <= CEBU_BOUNDS.north &&
    lng >= CEBU_BOUNDS.west &&
    lng <= CEBU_BOUNDS.east
  )
}

/**
 * Returns the last few comma-separated parts of a full address.
 * In OpenStreetMap addresses these hold the city, province,
 * region, postcode and country, e.g.
 * "..., Cebu City, Cebu, Central Visayas, 6000, Philippines"
 */
export function getAdministrativeTail(displayName, count = 4) {
  return String(displayName || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(-count)
}

/**
 * True when none of the administrative names belong to a
 * neighbouring province that overlaps the Cebu bounding box.
 */
export function isCebuAddress(administrativeParts = []) {
  const text = administrativeParts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return !NEIGHBOURING_PROVINCES.some((province) =>
    text.includes(province)
  )
}

export function isInCebu(latitude, longitude, administrativeParts = []) {
  return (
    isWithinCebuBounds(latitude, longitude) &&
    isCebuAddress(administrativeParts)
  )
}
