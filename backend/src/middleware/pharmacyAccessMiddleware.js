const pharmacyAccess = (req, res, next) => {
  // userMiddleware must run first
  if (!req.pharmaUser) {
    return res.status(401).json({
      success: false,
      message: 'PharmaLink user not authenticated',
    })
  }

  const userRole = req.pharmaUser.role

  // Super Admin can access any pharmacy
  if (userRole === 'SUPER_ADMIN') {
    return next()
  }

  // Pharmacy Admin must have an assigned pharmacy
  if (!req.pharmaUser.pharmacy_id) {
    return res.status(403).json({
      success: false,
      message: 'User is not assigned to a pharmacy',
    })
  }

  const requestedPharmacyId = Number(req.params.pharmacyId)
  const userPharmacyId = Number(req.pharmaUser.pharmacy_id)

  // Check that the requested pharmacy belongs to the logged-in user
  if (
    !requestedPharmacyId ||
    requestedPharmacyId !== userPharmacyId
  ) {
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this pharmacy',
    })
  }

  next()
}

module.exports = pharmacyAccess