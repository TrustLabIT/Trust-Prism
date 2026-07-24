const Template = require("../models/Template");
const { asyncHandler } = require("../middleware/error");
const { parsePage, paginate } = require("../utils/paginate");

function accessFilter(user) {
  return user.scope === "all" ? {} : { org: user.org };
}

// GET /api/templates?page=&limit=
const list = asyncHandler(async (req, res) => {
  const { page, limit } = parsePage(req.query);
  const r = await paginate(Template, accessFilter(req.user), { page, limit });
  res.json({ templates: r.items, total: r.total, page: r.page, limit: r.limit, hasMore: r.hasMore });
});

// POST /api/templates
const create = asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.name || !b.name.trim()) return res.status(400).json({ error: "Template name is required" });
  const tpl = await Template.create({
    name: b.name.trim(),
    kind: b.kind || "Social",
    ratio: b.ratio || "",
    format: b.format || "Instagram Post",
    headline: b.headline || "",
    subtext: b.subtext || "",
    cta: b.cta || "",
    colorIdx: b.colorIdx || 0,
    align: b.align || "center",
    org: req.user.org,
    owner: req.user.id,
  });
  res.status(201).json({ template: tpl.toCard() });
});

// DELETE /api/templates/:id  — owner or Super Admin
const remove = asyncHandler(async (req, res) => {
  const tpl = await Template.findById(req.params.id);
  if (!tpl) return res.status(404).json({ error: "Template not found" });
  const isOwner = String(tpl.owner) === String(req.user.id);
  if (!isOwner && req.user.role !== "Super Admin") {
    return res.status(403).json({ error: "Not allowed to delete this template" });
  }
  await tpl.deleteOne();
  res.json({ ok: true, id: req.params.id });
});

module.exports = { list, create, remove };
