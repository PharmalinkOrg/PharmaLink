const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // userMiddleware must run first
    if (!req.pharmaUser) {
      return res.status(401).json({
        success: false,
        message: 'PharmaLink user not authenticated',
      })
    }

    const userRole = req.pharmaUser.role

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      })
    }

    next()
  }
}

module.exports = requireRole