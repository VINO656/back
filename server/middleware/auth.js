const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware
 * Verifies JWT token from Authorization: Bearer <token> header.
 * Attaches decoded payload ({ id, role, unitId }) to req.user.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: 'Authentication required. No JWT token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ ok: false, message: 'Authentication token has expired. Please log in again.' });
    }
    return res.status(401).json({ ok: false, message: 'Invalid authentication token.' });
  }
};

module.exports = authMiddleware;
