const express = require('express')

const {
  getMedicineById,
} = require('../controllers/medicineController')

const router = express.Router()

router.get('/:medicineId', getMedicineById)

module.exports = router