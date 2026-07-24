const Collection = require("../models/Collection");
const { asyncHandler } = require("../middleware/error");
const { parsePage, paginate } = require("../utils/paginate");

function accessFilter(user) {
  return user.scope === "all" ? {} : { org: user.org };
}

// GET /api/collections?page=&limit=
const list = asyncHandler(async (req, res) => {
  const { page, limit } = parsePage(req.query);
  const r = await paginate(Collection, accessFilter(req.user), { page, limit });
  res.json({ collections: r.items, total: r.total, page: r.page, limit: r.limit, hasMore: r.hasMore });
});

// POST /api/collections
const create = asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.name || !b.name.trim()) return res.status(400).json({ error: "Collection name is required" });
  const col = await Collection.create({
    name: b.name.trim(),
    type: b.type || "Campaign",
    visibility: b.visibility || "Organization",
    year: b.year || String(new Date().getFullYear()),
    grad: b.grad || "",
    org: req.user.org,
    owner: req.user.id,
  });
  res.status(201).json({ collection: col.toCard() });
});

// DELETE /api/collections/:id  — owner or Super Admin
const remove = asyncHandler(async (req, res) => {
  const col = await Collection.findById(req.params.id);
  if (!col) return res.status(404).json({ error: "Collection not found" });
  const isOwner = String(col.owner) === String(req.user.id);
  if (!isOwner && req.user.role !== "Super Admin") {
    return res.status(403).json({ error: "Not allowed to delete this collection" });
  }
  await col.deleteOne();
  res.json({ ok: true });
});

module.exports = { list, create, remove };
