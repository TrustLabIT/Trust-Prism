const Collection = require("../models/Collection");
const Asset = require("../models/Asset");
const { asyncHandler } = require("../middleware/error");
const { parsePage } = require("../utils/paginate");

function accessFilter(user) {
  return user.scope === "all" ? {} : { org: user.org };
}

// GET /api/collections?page=&limit=  (with live asset counts)
const list = asyncHandler(async (req, res) => {
  const { page, limit } = parsePage(req.query);
  const filter = accessFilter(req.user);
  const [cols, total] = await Promise.all([
    Collection.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Collection.countDocuments(filter),
  ]);
  // count assets per collection (respecting the same access scope)
  const agg = await Asset.aggregate([
    { $match: { ...filter, collectionRef: { $ne: null } } },
    { $group: { _id: "$collectionRef", n: { $sum: 1 } } },
  ]);
  const countMap = {};
  agg.forEach((x) => { if (x._id) countMap[String(x._id)] = x.n; });
  const items = cols.map((c) => ({ ...c.toCard(), c: countMap[String(c._id)] || 0 }));
  res.json({ collections: items, total, page, limit, hasMore: (page - 1) * limit + cols.length < total });
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
