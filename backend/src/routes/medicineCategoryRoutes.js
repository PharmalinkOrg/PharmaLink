const express = require('express')
const { getMedicineCategories } = require('../controllers/medicineCategoryController')

const router = express.Router()

router.get('/', getMedicineCategories)

module.exports = router