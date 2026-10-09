// File: backend/utils/cebu.js
//
// Cebu province bounding box (mainland + Mactan, Bantayan,
// Camotes, Olango, Santander). Must match the Super Admin
// frontend (src/utils/cebuLocation.js).

const CEBU_BOUNDS = {
  south: 9.35,
  west: 123.25,
  north: 11.35,
  east: 124.5,
}

const isWithinCebu = (latitude, longitude) => {
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

module.exports = {
  CEBU_BOUNDS,
  isWithinCebu,
}
