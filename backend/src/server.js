const express = require('express')
const cors = require('cors')
require('dotenv').config()

const supabase = require('./config/supabase')
const pharmacyRoutes = require('./routes/pharmacyRoutes')
const authRoutes = require('./routes/authRoutes')
const inventoryRoutes = require('./routes/inventoryRoutes')
const userRoutes = require('./routes/userRoutes')
const authenticateUser = require('./middleware/authMiddleware')
const loadPharmaUser = require('./middleware/userMiddleware')
const requireRole = require('./middleware/roleMiddleware')


const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
app.use('/api/pharmacies', pharmacyRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/pharmacies', inventoryRoutes)

// Basic API test
app.get('/', (req, res) => {
  res.json({
    message: 'Pharmalink Backend API is running',
  })
})

// Supabase database connection test
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pharmacies')
      .select('pharmacy_id')
      .limit(1)

    if (error) {
      console.error('Supabase error:', error)

      return res.status(500).json({
        success: false,
        message: 'Database connection failed',
        error: error.message,
      })
    }

    res.json({
      success: true,
      message: 'Supabase database connection successful',
      data,
    })
  } catch (error) {
    console.error('Server error:', error)

    res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
})

// Authentication middleware test
app.get('/api/test-auth', authenticateUser, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication successful',
    user: {
      id: req.authUser.id,
      email: req.authUser.email,
    },
  })
})

app.listen(PORT, () => {
  console.log(`Pharmalink backend running on http://localhost:${PORT}`)
})

// PharmaLink user middleware test
app.get(
  '/api/test-user',
  authenticateUser,
  loadPharmaUser,
  (req, res) => {
    res.json({
      success: true,
      message: 'PharmaLink user loaded successfully',
      user: req.pharmaUser,
    })
  }
)
//API test for role-based authorization
app.get(
  '/api/test-role',
  authenticateUser,
  loadPharmaUser,
  requireRole('PHARMACY_ADMIN'),
  (req, res) => {
    res.json({
      success: true,
      message: 'Role authorization successful',
      role: req.pharmaUser.role,
      pharmacy_id: req.pharmaUser.pharmacy_id,
    })
  }
)