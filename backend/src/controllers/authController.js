const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { jwt: jwtCfg } = require("../config/env");
const { asyncHandler } = require("../middleware/error");

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, scope: user.scope, org: user.org, type: user.type },
    jwtCfg.secret,
    { expiresIn: jwtCfg.expiresIn }
  );
}

// POST /api/auth/login  { email, password }
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  // password has select:false, so ask for it explicitly
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const token = signToken(user);
  res.json({ token, user: user.toJSON() });
});

// GET /api/auth/me   (protected)
const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toJSON() });
});

// POST /api/auth/bootstrap  { name, email, password }
// One-time setup: creates the first Super Admin. Refuses once any Super Admin exists,
// so it is safe to leave mounted (it self-disables after the first use).
const bootstrap = asyncHandler(async (req, res) => {
  const existing = await User.findOne({ role: "Super Admin" });
  if (existing) {
    return res.status(403).json({ error: "A Super Admin already exists. Bootstrap is disabled." });
  }
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role: "Super Admin",
    type: "Internal",
    org: "Internal",
    scope: "all",
    status: "Active",
  });
  const token = signToken(user);
  res.status(201).json({ token, user: user.toJSON() });
});

module.exports = { login, me, bootstrap, signToken };
