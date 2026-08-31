// Centralized error handler. Controllers/services should throw errors
// (optionally with a `.status`) and let this catch them via next(err) —
// see asyncHandler in projectController.js for the wiring.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);

  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  const details = process.env.NODE_ENV === 'production' ? undefined : err.message;

  res.status(status).json({ error: message, ...(details ? { details } : {}) });
}

module.exports = errorHandler;
