/**
 * Centralized Global Error Handling Middleware for MERN Backend API.
 * Captures Mongoose errors, JWT issues, and general server exceptions,
 * converting them into structured, predictable JSON responses.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Log error in server console for debugging
  if (statusCode === 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
  }

  // 1. Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: format is invalid`;
  }

  // 2. Mongoose Schema Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map(el => el.message);
    message = `Validation failed: ${errors.join(', ')}`;
  }

  // 3. Mongoose Duplicate Key Error (MongoDB Code 11000)
  if (err.code === 11000) {
    statusCode = 409; // Conflict
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    message = `Duplicate value for ${field} '${value}'. Record already exists.`;
  }

  // 4. JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please log in again.';
  }

  res.status(statusCode).json({
    ok: false,
    status: statusCode,
    message
  });
};

module.exports = errorHandler;
