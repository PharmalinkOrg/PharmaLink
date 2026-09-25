const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')

require('dotenv').config()

// ============================================================
// ROUTES
// ============================================================

const pharmacyRoutes = require('./routes/pharmacyRoutes')
const authRoutes = require('./routes/authRoutes')
const inventoryRoutes = require('./routes/inventoryRoutes')
const userRoutes = require('./routes/userRoutes')
const customerInventoryRoutes = require('./routes/customerInventoryRoutes')
const medicineRoutes = require('./routes/medicineRoutes')
const reservationRoutes = require('./routes/reservationRoutes')
const dashboardRoutes = require('./routes/dashboardRoutes')
const superadminRoutes = require('./routes/superadminRoutes')
const medicineCategoryRoutes = require('./routes/medicineCategoryRoutes')
const medicineRequestRoutes = require('./routes/medicineRequestRoutes')
const prescriptionRoutes = require('./routes/prescriptionRoutes')
const salesRoutes = require('./routes/salesRoutes')
const aiRoutes = require('./routes/aiRoutes')
const notificationRoutes = require('./routes/notificationRoutes')

const app = express()

// ============================================================
// ALLOWED FRONTEND ORIGINS
// ============================================================

const allowedOrigins = [
  // ----------------------------------------------------------
  // Local development
  // ----------------------------------------------------------

  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',

  // ----------------------------------------------------------
  // Production frontends
  // ----------------------------------------------------------

  process.env.SUPERADMIN_URL,
  process.env.PHARMACYADMIN_URL,
  process.env.CUSTOMER_URL,
].filter(Boolean)

// ============================================================
// CORS
// ============================================================

const corsOptions = {
  origin(origin, callback) {
    /*
     * Requests such as Postman, curl,
     * server-to-server requests, and some
     * same-origin requests may not include Origin.
     */
    if (!origin) {
      return callback(null, true)
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    console.warn(
      `CORS blocked origin: ${origin}`,
    )

    return callback(
      new Error(
        `Origin ${origin} is not allowed by CORS`,
      ),
    )
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
  ],
}

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PharmaLink API is running',
  })
})

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PharmaLink API is healthy',
  })
})

// ============================================================
// API ROUTES
// ============================================================

app.use(
  '/api/auth',
  authRoutes,
)

app.use(
  '/api/users',
  userRoutes,
)

app.use(
  '/api/medicines',
  medicineRoutes,
)

app.use(
  '/api/dashboard',
  dashboardRoutes,
)

app.use(
  '/api/superadmin',
  superadminRoutes,
)

app.use(
  '/api/reservations',
  reservationRoutes,
)

app.use(
  '/api/prescriptions',
  prescriptionRoutes,
)

app.use(
  '/api/medicine-requests',
  medicineRequestRoutes,
)

app.use(
  '/api/sales',
  salesRoutes,
)

app.use(
  '/api/ai',
  aiRoutes,
)

app.use(
  '/api/notifications',
  notificationRoutes,
)

app.use(
  '/api/medicine-categories',
  medicineCategoryRoutes,
)

// ============================================================
// PHARMACY ROUTES
// ============================================================

/*
 * IMPORTANT:
 *
 * Specific pharmacy sub-routes must be mounted BEFORE
 * pharmacyRoutes because pharmacyRoutes contains GET /:id.
 */

app.use(
  '/api/pharmacies',
  customerInventoryRoutes,
)

app.use(
  '/api/pharmacies',
  inventoryRoutes,
)

/*
 * Generic /:id pharmacy routes go last.
 */
app.use(
  '/api/pharmacies',
  pharmacyRoutes,
)

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message:
      `Route not found: ${req.method} ${req.originalUrl}`,
  })
})

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
  (error, req, res, next) => {
    console.error(
      'Unhandled server error:',
      error,
    )

    if (
      error.message?.includes(
        'is not allowed by CORS',
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Request origin is not allowed',
      })
    }

    return res.status(500).json({
      success: false,
      message:
        'Internal server error',
    })
  },
)

module.exports = app