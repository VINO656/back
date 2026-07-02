const auth = require('./auth');

/**
 * Role-Based Authorization Check
 * Verifies that the authenticated user holds the 'Admin' role.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ ok: false, message: 'Access denied. Admin privileges required.' });
  }
  next();
};

// Standard Express middleware composition array: runs JWT verification first, then checks role
module.exports = [auth, requireAdmin];
