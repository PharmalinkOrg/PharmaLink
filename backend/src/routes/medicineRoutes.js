const express = require('express')

const {
  getMedicines,
  getMedicineById,
} = require('../controllers/medicineController')

const router = express.Router()

router.get('/', getMedicines)
router.get('/:medicineId', getMedicineById)

module.exports = router