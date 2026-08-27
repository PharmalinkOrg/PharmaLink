const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
require('dotenv').config()

const pharmacyRoutes = require('./routes/pharmacyRoutes')
const authRoutes = require('./routes/authRoutes')
const inventoryRoutes = require('./routes/inventoryRoutes')
const userRoutes = require('./routes/userRoutes')

const app = express()
const PORT = process.env.PORT || 5000

const allowedOrigins = [
  process.env.SUPERADMIN_URL,
  process.env.PHARMACYADMIN_URL,
  process.env.CUSTOMER_URL
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true)
    else callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

app.use('/api/pharmacies', pharmacyRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/pharmacies', inventoryRoutes)

app.get('/', (req, res) => {
  res.json({
    message: 'Pharmalink Backend API is running',
  })
})

app.listen(PORT, () => {
  console.log(`Pharmalink backend running on http://localhost:${PORT}`)
})