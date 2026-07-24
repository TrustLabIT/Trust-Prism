// Wraps async route handlers so thrown errors reach the error middleware
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function notFound(req, res) {
  res.status(404).json({ error: "Not found" });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);
  // Mongo duplicate key
  if (err.code === 11000) {
    return res.status(409).json({ error: "That value is already in use", fields: err.keyValue });
  }
  // Mongoose validation
  if (err.name === "ValidationError") {
    return res.status(400).json({ error: err.message });
  }
  res.status(err.status || 500).json({ error: err.message || "Server error" });
}

module.exports = { asyncHandler, notFound, errorHandler };
