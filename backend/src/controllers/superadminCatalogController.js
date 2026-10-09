// File: backend/controllers/superadminCatalogController.js
//
// Global medicine catalog for the Super Admin.
//
// How it fits the existing schema:
//   medicines.pharmacy_id IS NULL      -> global catalog medicine
//                                         (created here by the Super Admin)
//   medicines.pharmacy_id = <pharmacy> -> medicine a pharmacy added itself
//
// Archive = medicines.status 'INACTIVE' (same as the existing
// soft delete in medicineController).
//
// Routes (mounted in superadminRoutes):
//   GET    /api/superadmin/medicines?include_archived=true&scope=all|catalog|pharmacy
//   POST   /api/superadmin/medicines
//   PATCH  /api/superadmin/medicines/:id
//   PATCH  /api/superadmin/medicines/:id/archive   { archived, reason }
//   GET    /api/superadmin/medicine-categories
//   POST   /api/superadmin/medicine-categories
//   PATCH  /api/superadmin/medicine-categories/:id
//   DELETE /api/superadmin/medicine-categories/:id

const supabaseAdmin = require('../config/supabaseAdmin')
const fetchAll = require('../utils/fetchAll')
const { logActivity } = require('../services/auditLogService')

/* ============================================================
   CONSTANTS + HELPERS
============================================================ */

const MEDICINE_COLUMNS = `
  medicine_id,
  pharmacy_id,
  category_id,
  generic_name,
  brand_name,
  dosage,
  dosage_form,
  description,
  requires_prescription,
  status,
  created_at,
  updated_at
`

const INVENTORY_TABLE = 'inventory'

const MAX_NAME_LENGTH = 120
const MAX_DOSAGE_LENGTH = 60
const MAX_FORM_LENGTH = 40
const MAX_DESCRIPTION_LENGTH = 1000
const MAX_CATEGORY_NAME_LENGTH = 80
const MAX_CATEGORY_DESCRIPTION_LENGTH = 300

const isValidId = (value) => {
  const number = Number(value)
  return Number.isInteger(number) && number > 0
}

const normalize = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

const medicineLabel = (medicine) =>
  [medicine.brand_name || medicine.generic_name, medicine.dosage].filter(Boolean).join(' ')

// Escape % and _ for an exact ILIKE match.
const escapeLike = (value) => String(value).replace(/[\\%_]/g, (char) => `\\${char}`)

const normalizeCategory = (row) => ({
  ...row,
  category_id: row.category_id ?? row.id,
  name: row.name ?? row.category_name ?? '',
  description: row.description ?? null,
})

/* ============================================================
   VALIDATION
============================================================ */

/**
 * Validates a medicine body. With partial = true only the fields
 * that are present are checked (PATCH).
 *
 * Returns { values } or { error }.
 */
async function validateMedicineBody(body = {}, { partial = false } = {}) {
  const values = {}

  const readText = (key, label, maxLength, required) => {
    const raw = body[key]

    if (raw === undefined) {
      return required && !partial ? `${label} is required` : null
    }

    if (raw === null || (typeof raw === 'string' && !raw.trim())) {
      if (required) {
        return `${label} is required`
      }

      values[key] = null
      return null
    }

    if (typeof raw !== 'string') {
      return `${label} must be text`
    }

    if (raw.trim().length > maxLength) {
      return `${label} cannot exceed ${maxLength} characters`
    }

    values[key] = raw.trim()
    return null
  }

  // Accept "form" as an alias of "dosage_form".
  if (body.dosage_form === undefined && body.form !== undefined) {
    body = { ...body, dosage_form: body.form }
  }

  const textError =
    readText('generic_name', 'Generic name', MAX_NAME_LENGTH, true) ||
    readText('brand_name', 'Brand name', MAX_NAME_LENGTH, false) ||
    readText('dosage', 'Dosage', MAX_DOSAGE_LENGTH, true) ||
    readText('dosage_form', 'Dosage form', MAX_FORM_LENGTH, true) ||
    readText('description', 'Description', MAX_DESCRIPTION_LENGTH, false)

  if (textError) {
    return { error: textError }
  }

  if (body.requires_prescription !== undefined) {
    if (typeof body.requires_prescription !== 'boolean') {
      return { error: 'requires_prescription must be true or false' }
    }

    values.requires_prescription = body.requires_prescription
  } else if (!partial) {
    values.requires_prescription = false
  }

  if (body.category_id !== undefined || !partial) {
    if (!isValidId(body.category_id)) {
      return { error: 'Please select a valid category' }
    }

    const { data: category, error } = await supabaseAdmin
      .from('medicine_categories')
      .select('*')
      .eq('category_id', Number(body.category_id))
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!category) {
      return { error: 'The selected category does not exist' }
    }

    values.category_id = Number(body.category_id)
  }

  return { values }
}

/**
 * Finds a catalog medicine (pharmacy_id IS NULL) with the same
 * generic name, brand, dosage and form.
 */
async function findCatalogDuplicate(candidate, excludeId = null) {
  const { data, error } = await supabaseAdmin
    .from('medicines')
    .select('medicine_id, generic_name, brand_name, dosage, dosage_form, status')
    .is('pharmacy_id', null)
    .ilike('generic_name', escapeLike(candidate.generic_name))

  if (error) {
    throw error
  }

  return (data || []).find(
    (row) =>
      row.medicine_id !== excludeId &&
      normalize(row.brand_name) === normalize(candidate.brand_name) &&
      normalize(row.dosage) === normalize(candidate.dosage) &&
      normalize(row.dosage_form) === normalize(candidate.dosage_form)
  )
}

const duplicateMessage = (duplicate) =>
  `${medicineLabel(duplicate)} (${duplicate.dosage_form}) is already in the catalog${
    duplicate.status === 'INACTIVE' ? ' as an archived medicine. Restore it instead.' : '.'
  }`

/* ============================================================
   ENRICHMENT (category names, pharmacy names, pharmacy counts)
============================================================ */

/**
 * Number of distinct pharmacies stocking each medicine.
 * Returns null if inventory can't be read.
 */
async function getPharmacyCounts() {
  try {
    const rows = await fetchAll(() =>
      supabaseAdmin.from(INVENTORY_TABLE).select('medicine_id, pharmacy_id')
    )

    const pharmaciesByMedicine = new Map()

    rows.forEach((row) => {
      if (!pharmaciesByMedicine.has(row.medicine_id)) {
        pharmaciesByMedicine.set(row.medicine_id, new Set())
      }

      pharmaciesByMedicine.get(row.medicine_id).add(row.pharmacy_id)
    })

    return new Map(
      [...pharmaciesByMedicine].map(([medicineId, pharmacies]) => [medicineId, pharmacies.size])
    )
  } catch (error) {
    console.warn('Inventory count failed:', error.message)
    return null
  }
}

async function enrichMedicines(medicines) {
  const pharmacyIds = [
    ...new Set(medicines.map((medicine) => medicine.pharmacy_id).filter(Boolean)),
  ]

  const [categories, pharmacies, pharmacyCounts] = await Promise.all([
    fetchAll(() => supabaseAdmin.from('medicine_categories').select('*')),
    pharmacyIds.length
      ? supabaseAdmin.from('pharmacies').select('pharmacy_id, name').in('pharmacy_id', pharmacyIds)
      : Promise.resolve({ data: [] }),
    getPharmacyCounts(),
  ])

  const categoryNames = new Map(
    categories.map(normalizeCategory).map((category) => [category.category_id, category.name])
  )

  const pharmacyNames = new Map(
    (pharmacies.data || []).map((pharmacy) => [pharmacy.pharmacy_id, pharmacy.name])
  )

  return medicines.map((medicine) => ({
    ...medicine,
    category_name: categoryNames.get(medicine.category_id) || null,
    pharmacy_name: medicine.pharmacy_id ? pharmacyNames.get(medicine.pharmacy_id) || null : null,
    is_catalog: medicine.pharmacy_id === null,
    is_archived: medicine.status === 'INACTIVE',
    pharmacy_count: pharmacyCounts ? pharmacyCounts.get(medicine.medicine_id) || 0 : null,
  }))
}

/* ============================================================
   MEDICINES
============================================================ */

/**
 * GET /api/superadmin/medicines
 *   include_archived=true  include INACTIVE medicines
 *   scope=catalog|pharmacy|all (default all)
 */
const getCatalogMedicines = async (req, res) => {
  try {
    const includeArchived = String(req.query.include_archived) === 'true'
    const scope = String(req.query.scope || 'all').toLowerCase()

    const medicines = await fetchAll(() => {
      let query = supabaseAdmin
        .from('medicines')
        .select(MEDICINE_COLUMNS)
        .order('generic_name', { ascending: true })
        .order('medicine_id', { ascending: true })

      if (!includeArchived) {
        query = query.eq('status', 'ACTIVE')
      }

      if (scope === 'catalog') {
        query = query.is('pharmacy_id', null)
      } else if (scope === 'pharmacy') {
        query = query.not('pharmacy_id', 'is', null)
      }

      return query
    })

    return res.status(200).json({
      success: true,
      data: await enrichMedicines(medicines),
    })
  } catch (error) {
    console.error('Get catalog medicines error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load medicines' })
  }
}

/**
 * POST /api/superadmin/medicines
 * Creates a global catalog medicine (pharmacy_id = NULL).
 */
const createCatalogMedicine = async (req, res) => {
  try {
    const { values, error: validationError } = await validateMedicineBody(req.body)

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError })
    }

    const duplicate = await findCatalogDuplicate(values)

    if (duplicate) {
      return res.status(409).json({ success: false, message: duplicateMessage(duplicate) })
    }

    const { data: medicine, error } = await supabaseAdmin
      .from('medicines')
      .insert({ ...values, pharmacy_id: null, status: 'ACTIVE' })
      .select(MEDICINE_COLUMNS)
      .single()

    if (error) {
      console.error('Create catalog medicine error:', error)

      if (error.code === '23502') {
        return res.status(500).json({
          success: false,
          message:
            'The database still requires a pharmacy for every medicine. Run sql/001_superadmin_features.sql in Supabase.',
        })
      }

      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'This medicine is already in the catalog.',
        })
      }

      return res.status(500).json({ success: false, message: 'Failed to create medicine' })
    }

    await logActivity(req, {
      action: 'MEDICINE_CREATED',
      entityType: 'medicine',
      entityId: medicine.medicine_id,
      description: `Added ${medicineLabel(medicine)} (${medicine.dosage_form}) to the medicine catalog`,
      metadata: { medicine: values },
    })

    const [enriched] = await enrichMedicines([medicine])

    return res.status(201).json({
      success: true,
      message: 'Medicine added to the catalog',
      data: enriched,
    })
  } catch (error) {
    console.error('Create catalog medicine server error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * PATCH /api/superadmin/medicines/:id
 * Super Admin may edit any medicine (catalog or pharmacy-added).
 */
const updateCatalogMedicine = async (req, res) => {
  try {
    const medicineId = Number(req.params.id)

    if (!isValidId(medicineId)) {
      return res.status(400).json({ success: false, message: 'Invalid medicine ID' })
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from('medicines')
      .select(MEDICINE_COLUMNS)
      .eq('medicine_id', medicineId)
      .maybeSingle()

    if (findError) {
      throw findError
    }

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Medicine not found' })
    }

    const { values, error: validationError } = await validateMedicineBody(req.body, {
      partial: true,
    })

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError })
    }

    // Only record fields that actually change.
    const changes = Object.fromEntries(
      Object.entries(values).filter(([key, value]) => existing[key] !== value)
    )

    if (Object.keys(changes).length === 0) {
      const [enriched] = await enrichMedicines([existing])
      return res.status(200).json({ success: true, message: 'No changes', data: enriched })
    }

    if (existing.pharmacy_id === null) {
      const duplicate = await findCatalogDuplicate({ ...existing, ...changes }, medicineId)

      if (duplicate) {
        return res.status(409).json({ success: false, message: duplicateMessage(duplicate) })
      }
    }

    const { data: medicine, error } = await supabaseAdmin
      .from('medicines')
      .update(changes)
      .eq('medicine_id', medicineId)
      .select(MEDICINE_COLUMNS)
      .single()

    if (error) {
      console.error('Update catalog medicine error:', error)

      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'Another catalog medicine already has these details.',
        })
      }

      return res.status(500).json({ success: false, message: 'Failed to update medicine' })
    }

    await logActivity(req, {
      action: 'MEDICINE_UPDATED',
      entityType: 'medicine',
      entityId: medicineId,
      pharmacyId: existing.pharmacy_id,
      description: `Updated ${medicineLabel(existing)} (${Object.keys(changes).join(', ')})`,
      metadata: {
        before: Object.fromEntries(Object.keys(changes).map((key) => [key, existing[key]])),
        after: changes,
      },
    })

    const [enriched] = await enrichMedicines([medicine])

    return res.status(200).json({ success: true, message: 'Medicine updated', data: enriched })
  } catch (error) {
    console.error('Update catalog medicine server error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * PATCH /api/superadmin/medicines/:id/archive
 * body: { archived: boolean, reason }
 */
const setMedicineArchived = async (req, res) => {
  try {
    const medicineId = Number(req.params.id)

    if (!isValidId(medicineId)) {
      return res.status(400).json({ success: false, message: 'Invalid medicine ID' })
    }

    if (typeof req.body?.archived !== 'boolean') {
      return res.status(400).json({ success: false, message: 'archived must be true or false' })
    }

    const archived = req.body.archived
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 500) : ''

    const { data: existing, error: findError } = await supabaseAdmin
      .from('medicines')
      .select(MEDICINE_COLUMNS)
      .eq('medicine_id', medicineId)
      .maybeSingle()

    if (findError) {
      throw findError
    }

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Medicine not found' })
    }

    const nextStatus = archived ? 'INACTIVE' : 'ACTIVE'

    if (existing.status === nextStatus) {
      return res.status(409).json({
        success: false,
        message: `This medicine is already ${archived ? 'archived' : 'active'}.`,
      })
    }

    // Restoring a catalog medicine must not create an active duplicate.
    if (!archived && existing.pharmacy_id === null) {
      const duplicate = await findCatalogDuplicate(existing, medicineId)

      if (duplicate && duplicate.status === 'ACTIVE') {
        return res.status(409).json({
          success: false,
          message: `An active copy of ${medicineLabel(existing)} already exists in the catalog.`,
        })
      }
    }

    const { data: medicine, error } = await supabaseAdmin
      .from('medicines')
      .update({ status: nextStatus })
      .eq('medicine_id', medicineId)
      .select(MEDICINE_COLUMNS)
      .single()

    if (error) {
      console.error('Archive medicine error:', error)
      return res.status(500).json({ success: false, message: 'Failed to update medicine' })
    }

    await logActivity(req, {
      action: archived ? 'MEDICINE_ARCHIVED' : 'MEDICINE_RESTORED',
      entityType: 'medicine',
      entityId: medicineId,
      pharmacyId: existing.pharmacy_id,
      description: `${archived ? 'Archived' : 'Restored'} ${medicineLabel(existing)}${reason ? `. Reason: ${reason}` : ''}`,
      metadata: { reason: reason || null },
    })

    const [enriched] = await enrichMedicines([medicine])

    return res.status(200).json({
      success: true,
      message: archived ? 'Medicine archived' : 'Medicine restored',
      data: enriched,
    })
  } catch (error) {
    console.error('Archive medicine server error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/* ============================================================
   CATEGORIES
============================================================ */

async function loadCategories() {
  return (await fetchAll(() => supabaseAdmin.from('medicine_categories').select('*'))).map(
    normalizeCategory
  )
}

function readCategoryBody(body = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''

  if (!name) {
    return { error: 'Category name is required' }
  }

  if (name.length > MAX_CATEGORY_NAME_LENGTH) {
    return { error: `Category name cannot exceed ${MAX_CATEGORY_NAME_LENGTH} characters` }
  }

  if (description.length > MAX_CATEGORY_DESCRIPTION_LENGTH) {
    return {
      error: `Category description cannot exceed ${MAX_CATEGORY_DESCRIPTION_LENGTH} characters`,
    }
  }

  return { values: { name, description: description || null } }
}

/**
 * Insert/update a category. If the table has no description
 * column yet (PGRST204), retry with the name only.
 */
async function writeCategory(values, categoryId = null) {
  const run = (payload) =>
    categoryId
      ? supabaseAdmin
          .from('medicine_categories')
          .update(payload)
          .eq('category_id', categoryId)
          .select('*')
          .single()
      : supabaseAdmin.from('medicine_categories').insert(payload).select('*').single()

  let result = await run(values)

  if (result.error?.code === 'PGRST204') {
    result = await run({ name: values.name })
  }

  return result
}

/** GET /api/superadmin/medicine-categories */
const getCategories = async (req, res) => {
  try {
    const [categories, medicines] = await Promise.all([
      loadCategories(),
      fetchAll(() => supabaseAdmin.from('medicines').select('category_id')),
    ])

    const counts = new Map()

    medicines.forEach((medicine) => {
      counts.set(medicine.category_id, (counts.get(medicine.category_id) || 0) + 1)
    })

    return res.status(200).json({
      success: true,
      data: categories
        .map((category) => ({
          ...category,
          medicine_count: counts.get(category.category_id) || 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    })
  } catch (error) {
    console.error('Get medicine categories error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load categories' })
  }
}

/** POST /api/superadmin/medicine-categories */
const createCategory = async (req, res) => {
  try {
    const { values, error: validationError } = readCategoryBody(req.body)

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError })
    }

    const categories = await loadCategories()

    if (categories.some((category) => normalize(category.name) === normalize(values.name))) {
      return res.status(409).json({ success: false, message: 'A category with this name already exists.' })
    }

    const { data, error } = await writeCategory(values)

    if (error) {
      console.error('Create category error:', error)
      return res.status(error.code === '23505' ? 409 : 500).json({
        success: false,
        message:
          error.code === '23505' ? 'A category with this name already exists.' : 'Failed to create category',
      })
    }

    const category = normalizeCategory(data)

    await logActivity(req, {
      action: 'CATEGORY_CREATED',
      entityType: 'medicine_category',
      entityId: category.category_id,
      description: `Created medicine category "${category.name}"`,
    })

    return res.status(201).json({
      success: true,
      message: 'Category created',
      data: { ...category, medicine_count: 0 },
    })
  } catch (error) {
    console.error('Create category server error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/** PATCH /api/superadmin/medicine-categories/:id */
const updateCategory = async (req, res) => {
  try {
    const categoryId = Number(req.params.id)

    if (!isValidId(categoryId)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' })
    }

    const { values, error: validationError } = readCategoryBody(req.body)

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError })
    }

    const categories = await loadCategories()
    const existing = categories.find((category) => category.category_id === categoryId)

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found' })
    }

    if (
      categories.some(
        (category) =>
          category.category_id !== categoryId && normalize(category.name) === normalize(values.name)
      )
    ) {
      return res.status(409).json({ success: false, message: 'A category with this name already exists.' })
    }

    const { data, error } = await writeCategory(values, categoryId)

    if (error) {
      console.error('Update category error:', error)
      return res.status(500).json({ success: false, message: 'Failed to update category' })
    }

    const category = normalizeCategory(data)

    await logActivity(req, {
      action: 'CATEGORY_UPDATED',
      entityType: 'medicine_category',
      entityId: categoryId,
      description:
        existing.name === category.name
          ? `Updated medicine category "${category.name}"`
          : `Renamed medicine category "${existing.name}" to "${category.name}"`,
    })

    return res.status(200).json({ success: true, message: 'Category updated', data: category })
  } catch (error) {
    console.error('Update category server error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/** DELETE /api/superadmin/medicine-categories/:id */
const deleteCategory = async (req, res) => {
  try {
    const categoryId = Number(req.params.id)

    if (!isValidId(categoryId)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' })
    }

    const { count, error: countError } = await supabaseAdmin
      .from('medicines')
      .select('medicine_id', { count: 'exact', head: true })
      .eq('category_id', categoryId)

    if (countError) {
      throw countError
    }

    if (count > 0) {
      return res.status(409).json({
        success: false,
        message: `This category is used by ${count} ${count === 1 ? 'medicine' : 'medicines'}. Move or archive them first.`,
      })
    }

    const { data, error } = await supabaseAdmin
      .from('medicine_categories')
      .delete()
      .eq('category_id', categoryId)
      .select('*')

    if (error) {
      console.error('Delete category error:', error)

      if (error.code === '23503') {
        return res.status(409).json({
          success: false,
          message: 'This category is still referenced by other records.',
        })
      }

      return res.status(500).json({ success: false, message: 'Failed to delete category' })
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' })
    }

    await logActivity(req, {
      action: 'CATEGORY_DELETED',
      entityType: 'medicine_category',
      entityId: categoryId,
      description: `Deleted medicine category "${normalizeCategory(data[0]).name}"`,
    })

    return res.status(200).json({ success: true, message: 'Category deleted' })
  } catch (error) {
    console.error('Delete category server error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  getCatalogMedicines,
  createCatalogMedicine,
  updateCatalogMedicine,
  setMedicineArchived,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
}
