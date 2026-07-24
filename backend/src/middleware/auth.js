const jwt = require("jsonwebtoken");
const { jwt: jwtCfg } = require("../config/env");
const User = require("../models/User");

// Verifies the Bearer token and attaches the live user document to req.user
async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const payload = jwt.verify(token, jwtCfg.secret);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: "User no longer exists" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Route guard: only Super Admins may pass
function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== "Super Admin") {
    return res.status(403).json({ error: "Super Admin access required" });
  }
  next();
}

module.exports = { protect, requireSuperAdmin };
