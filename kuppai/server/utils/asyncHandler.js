/**
 * Async Handler Wrapper
 * Wraps asynchronous route/controller functions to automatically catch
 * unhandled exceptions and forward them to the global error middleware via next(err).
 *
 * @param {Function} fn - Async controller function (req, res, next)
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
