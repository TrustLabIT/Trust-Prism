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

module.exports = { login, me, signToken };
