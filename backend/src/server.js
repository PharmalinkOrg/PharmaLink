const express = require('express')
const cors = require('cors')
require('dotenv').config()

const pharmacyRoutes = require('./routes/pharmacyRoutes')
const authRoutes = require('./routes/authRoutes')
const inventoryRoutes = require('./routes/inventoryRoutes')
const userRoutes = require('./routes/userRoutes')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

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