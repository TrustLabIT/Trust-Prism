const crypto = require("crypto");
const Share = require("../models/Share");
const { asyncHandler } = require("../middleware/error");
const { parsePage, paginate } = require("../utils/paginate");

function accessFilter(user) {
  return user.scope === "all" ? {} : { org: user.org };
}

// turn "7 days" / "30 days" / "No expiry" into a real Date (or null)
function computeExpiry(exp) {
  const m = /(\d+)\s*day/i.exec(exp || "");
  if (!m) return null;
  return new Date(Date.now() + Number(m[1]) * 24 * 60 * 60 * 1000);
}

// GET /api/shares?page=&limit=&q=&perm=
const list = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = accessFilter(req.user);
  if (q.perm && q.perm !== "any") filter.perm = q.perm;
  if (q.q) {
    const rx = new RegExp(String(q.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { to: rx }];
  }
  const { page, limit } = parsePage(q);
  const r = await paginate(Share, filter, { page, limit, sort: { createdAt: -1 } });
  res.json({ shares: r.items, total: r.total, page: r.page, limit: r.limit, hasMore: r.hasMore });
});

// POST /api/shares
const create = asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.name || !b.name.trim()) return res.status(400).json({ error: "Share name is required" });
  const share = await Share.create({
    name: b.name.trim(),
    to: b.to || "specific people",
    include: ["Whole portal", "A category"].includes(b.include) ? b.include : "Specific assets",
    scopeDomain: b.include === "A category" ? (b.scopeDomain || "") : "",
    scopeSub: b.include === "A category" ? (b.scopeSub || "") : "",
    assets: b.include === "Specific assets" && Array.isArray(b.assets) ? b.assets : [],
    token: crypto.randomBytes(7).toString("hex"),
    perm: b.perm === "Download" ? "Download" : "View only",
    exp: b.exp || "No expiry",
    expiresAt: computeExpiry(b.exp),
    password: (b.password || "").trim(),
    wm: b.wm !== false,
    org: req.user.org,
    owner: req.user.id,
  });
  res.status(201).json({ share: share.toCard() });
});

// PATCH /api/shares/:id  — owner or Super Admin can update link settings (incl. password)
const update = asyncHandler(async (req, res) => {
  const share = await Share.findById(req.params.id);
  if (!share) return res.status(404).json({ error: "Share not found" });
  const isOwner = String(share.owner) === String(req.user.id);
  if (!isOwner && req.user.role !== "Super Admin") {
    return res.status(403).json({ error: "Not allowed to edit this share" });
  }
  const b = req.body;
  if (b.name !== undefined && b.name.trim()) share.name = b.name.trim();
  if (b.to !== undefined) share.to = b.to || "specific people";
  if (b.perm !== undefined) share.perm = b.perm === "Download" ? "Download" : "View only";
  if (b.exp !== undefined) { share.exp = b.exp || "No expiry"; share.expiresAt = computeExpiry(b.exp); }
  if (b.wm !== undefined) share.wm = !!b.wm;
  if (b.password !== undefined) share.password = (b.password || "").trim();
  await share.save();
  res.json({ share: share.toCard() });
});

// DELETE /api/shares/:id  — owner or Super Admin
const remove = asyncHandler(async (req, res) => {
  const share = await Share.findById(req.params.id);
  if (!share) return res.status(404).json({ error: "Share not found" });
  const isOwner = String(share.owner) === String(req.user.id);
  if (!isOwner && req.user.role !== "Super Admin") {
    return res.status(403).json({ error: "Not allowed to delete this share" });
  }
  await share.deleteOne();
  res.json({ ok: true, id: req.params.id });
});

module.exports = { list, create, update, remove };
