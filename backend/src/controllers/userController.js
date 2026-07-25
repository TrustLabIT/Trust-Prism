const crypto = require("crypto");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/error");
const { parsePage, paginate } = require("../utils/paginate");

// GET /api/users?page=&limit=  (Super Admin only)
const list = asyncHandler(async (req, res) => {
  const { page, limit } = parsePage(req.query);
  const r = await paginate(User, {}, { page, limit, sort: { createdAt: 1 }, map: (u) => u.toJSON() });
  res.json({ users: r.items, total: r.total, page: r.page, limit: r.limit, hasMore: r.hasMore });
});

// POST /api/users  — create/invite a user (Super Admin only)
const create = asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.name || !b.email) return res.status(400).json({ error: "Name and email are required" });
  const external = b.type === "External";
  if (external && !b.org) return res.status(400).json({ error: "Agency name is required for external users" });

  // No invite-email flow yet → generate a temp password and return it once
  const tempPassword = b.password || "Prism@" + crypto.randomBytes(3).toString("hex");
  const user = await User.create({
    name: b.name.trim(),
    email: b.email.trim().toLowerCase(),
    password: tempPassword,
    role: b.role || "Content Editor",
    type: external ? "External" : "Internal",
    org: external ? b.org.trim() : "Internal",
    scope: b.scope === "all" ? "all" : "own",
    status: "Invited",
  });
  res.status(201).json({ user: user.toJSON(), tempPassword: b.password ? undefined : tempPassword });
});

// PATCH /api/users/:id/scope  — grant/revoke "all work" (Super Admin only)
const toggleScope = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.role === "Super Admin") return res.status(400).json({ error: "Super Admin already sees all work" });
  const scope = user.scope === "all" ? "own" : "all";
  // findByIdAndUpdate avoids the pre-save hook re-validating the (unselected) password
  const updated = await User.findByIdAndUpdate(req.params.id, { scope }, { new: true });
  res.json({ user: updated.toJSON() });
});

// PATCH /api/users/:id  (Super Admin only) — edit a user's details
const update = asyncHandler(async (req, res) => {
  const b = req.body;
  const set = {};
  if (b.name !== undefined && b.name.trim()) set.name = b.name.trim();
  if (b.email !== undefined && b.email.trim()) set.email = b.email.trim().toLowerCase();
  if (b.role !== undefined && b.role !== "Super Admin") set.role = b.role;
  if (b.scope !== undefined) set.scope = b.scope === "all" ? "all" : "own";
  if (b.type !== undefined) {
    set.type = b.type === "External" ? "External" : "Internal";
    set.org = set.type === "External" ? (b.org || "").trim() : "Internal";
    if (set.type === "External" && !set.org) return res.status(400).json({ error: "Agency name is required for external users" });
  } else if (b.org !== undefined) {
    set.org = b.org;
  }
  const user = await User.findByIdAndUpdate(req.params.id, { $set: set }, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: user.toJSON() });
});

// PATCH /api/users/:id/password  (Super Admin only) — set/reset a user's password
const setPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  user.password = password;                       // pre-save hook hashes it
  if (user.status === "Invited") user.status = "Active"; // they can log in now
  await user.save();
  res.json({ user: user.toJSON() });
});

// DELETE /api/users/:id  (Super Admin only) — cannot delete yourself or another Super Admin
const remove = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (String(user._id) === String(req.user.id)) return res.status(400).json({ error: "You cannot delete your own account" });
  if (user.role === "Super Admin") return res.status(400).json({ error: "Cannot delete a Super Admin" });
  await user.deleteOne();
  res.json({ ok: true, id: req.params.id });
});

module.exports = { list, create, update, toggleScope, setPassword, remove };
