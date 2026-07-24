const Share = require("../models/Share");
const { asyncHandler } = require("../middleware/error");
const { parsePage, paginate } = require("../utils/paginate");

function accessFilter(user) {
  return user.scope === "all" ? {} : { org: user.org };
}

// GET /api/shares?page=&limit=
const list = asyncHandler(async (req, res) => {
  const { page, limit } = parsePage(req.query);
  const r = await paginate(Share, accessFilter(req.user), { page, limit });
  res.json({ shares: r.items, total: r.total, page: r.page, limit: r.limit, hasMore: r.hasMore });
});

// POST /api/shares
const create = asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.name || !b.name.trim()) return res.status(400).json({ error: "Share name is required" });
  const share = await Share.create({
    name: b.name.trim(),
    to: b.to || "specific people",
    include: b.include || "A collection",
    perm: b.perm === "Download" ? "Download" : "View only",
    exp: b.exp || "No expiry",
    pw: !!b.pw,
    wm: b.wm !== false,
    org: req.user.org,
    owner: req.user.id,
  });
  res.status(201).json({ share: share.toCard() });
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

module.exports = { list, create, remove };
