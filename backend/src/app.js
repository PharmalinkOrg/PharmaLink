const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
require('dotenv').config()

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

const app = express()

// --------------------------------------------------
// Allowed frontend origins
// --------------------------------------------------

const allowedOrigins = [
  // Local development
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',

  // Production
  process.env.SUPERADMIN_URL,
  process.env.PHARMACYADMIN_URL,
  process.env.CUSTOMER_URL,
].filter(Boolean)

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })
)

app.use(express.json())
app.use(cookieParser())

// --------------------------------------------------
// Health Check
// --------------------------------------------------

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

// --------------------------------------------------
// API Routes
// --------------------------------------------------

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/medicines', medicineRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/superadmin', superadminRoutes)
app.use('/api/reservations', reservationRoutes)
app.use('/api/prescriptions', prescriptionRoutes)
app.use('/api/pharmacies', pharmacyRoutes)
app.use('/api/medicine-requests', medicineRequestRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/ai', aiRoutes)

// --------------------------------------------------
// Inventory Routes
// --------------------------------------------------

app.use('/api/pharmacies', inventoryRoutes)
app.use('/api/pharmacies', customerInventoryRoutes)
app.use(
  '/api/medicine-categories',
  medicineCategoryRoutes
)

module.exports = app