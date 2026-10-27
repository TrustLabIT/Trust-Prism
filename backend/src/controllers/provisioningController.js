// PACE identity-hub provisioning. Lets PACE create / link / enable / disable one
// person's TrustMark login, matched across apps by match_uuid. Guarded by the
// X-Provisioning-Token shared secret (see middleware/provisioning.js), not JWT.
//
//   GET  /api/provisioning/ping
//   POST /api/provisioning/rotate-token    { token }
//   GET  /api/provisioning/users/lookup    ?email= | ?match_uuid=
//   POST /api/provisioning/users           { match_uuid, email, name, password?, phone? }
//   POST /api/provisioning/users/enable    { match_uuid? , email? }
//   POST /api/provisioning/users/disable   { match_uuid? , email? }
//
// Provisioned accounts get the least-privilege role "Viewer".
const User = require("../models/User");
const { writeToken } = require("../middleware/provisioning");
const { asyncHandler } = require("../middleware/error");

const APP = "trustmark";

// Minimal, stable view of a user for PACE.
function view(u) {
  if (!u) return null;
  return {
    match_uuid: u.matchUuid || null,
    id: u._id.toString(),
    name: u.name,
    email: u.email || null,
    status: u.status,
    active: u.status !== "Disabled",
  };
}

const cleanEmail = (e) => (typeof e === "string" ? e.trim().toLowerCase() : "");

// Find by match_uuid first (the stable key), then by email.
async function findUser({ match_uuid, email }) {
  if (match_uuid) {
    const u = await User.findOne({ matchUuid: String(match_uuid) });
    if (u) return u;
  }
  const e = cleanEmail(email);
  if (e) return User.findOne({ email: e });
  return null;
}

const ping = asyncHandler(async (_req, res) => {
  res.json({ ok: true, app: APP, time: new Date().toISOString() });
});

const rotateToken = asyncHandler(async (req, res) => {
  const token = req.body && req.body.token;
  if (!token || String(token).trim().length < 16) {
    return res.status(400).json({ error: "A new token of at least 16 characters is required." });
  }
  writeToken(token);
  res.json({ ok: true, app: APP });
});

const lookup = asyncHandler(async (req, res) => {
  const u = await findUser({ match_uuid: req.query.match_uuid, email: req.query.email });
  res.json({ found: Boolean(u), user: view(u) });
});

const store = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const email = cleanEmail(b.email);
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const matchUuid = b.match_uuid ? String(b.match_uuid) : null;
  if (!email) return res.status(400).json({ error: "email is required." });
  if (!name) return res.status(400).json({ error: "name is required." });

  // Link an existing account (by match_uuid or email) rather than duplicating.
  let user = await findUser({ match_uuid: matchUuid, email });
  if (user) {
    user.name = name;
    user.email = email;
    if (matchUuid) user.matchUuid = matchUuid;
    if (b.password) user.password = String(b.password); // pre('save') hook hashes it
    user.status = "Active"; // re-provisioning re-enables
    await user.save();
    return res.json({ user: view(user), created: false, password_set: Boolean(b.password) });
  }

  // New account. A password is required to be able to sign in.
  if (!b.password) return res.status(400).json({ error: "password is required when creating a new user." });
  try {
    user = await User.create({
      name,
      email,
      password: String(b.password), // pre('save') hook hashes it
      role: "Viewer",
      type: "Internal",
      org: "Internal",
      scope: "own",
      status: "Active",
      matchUuid,
    });
  } catch (e) {
    if (e && e.code === 11000) {
      const existing = await findUser({ match_uuid: matchUuid, email });
      if (existing) return res.json({ user: view(existing), created: false, password_set: false });
      return res.status(409).json({ error: "A TrustMark account with this email already exists." });
    }
    throw e;
  }
  res.status(201).json({ user: view(user), created: true, password_set: true });
});

const enable = asyncHandler(async (req, res) => {
  const u = await findUser(req.body || {});
  if (!u) return res.status(404).json({ error: "No matching user to enable." });
  u.status = "Active";
  await u.save();
  res.json({ user: view(u) });
});

const disable = asyncHandler(async (req, res) => {
  const u = await findUser(req.body || {});
  if (!u) return res.status(404).json({ error: "No matching user to disable." });
  u.status = "Disabled";
  await u.save();
  res.json({ user: view(u) });
});

module.exports = { ping, rotateToken, lookup, store, enable, disable };
