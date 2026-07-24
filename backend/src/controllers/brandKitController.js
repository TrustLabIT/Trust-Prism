const BrandKit = require("../models/BrandKit");
const s3 = require("../services/s3");
const { asyncHandler } = require("../middleware/error");

const DEFAULT_COLORS = [
  { name: "Indigo", hex: "#4f46e5" }, { name: "Violet", hex: "#7c3aed" }, { name: "Ink", hex: "#12131a" },
  { name: "Sky", hex: "#0ea5e9" }, { name: "Amber", hex: "#f59e0b" }, { name: "Mist", hex: "#f6f7f9" },
];
const DEFAULT_FONTS = { heading: "Söhne", body: "Inter" };

const canEdit = (user) => ["Super Admin", "Brand Manager"].includes(user.role);

async function serialize(kit) {
  const logos = await Promise.all((kit.logos || []).map(async (l) => ({
    label: l.label, dark: l.dark, key: l.s3Key,
    url: await s3.presignDownload(l.s3Key, 6 * 3600).catch(() => null),
  })));
  return { colors: kit.colors, fonts: kit.fonts, logos };
}

// GET /api/brandkit — the org's kit (created with defaults on first access)
const get = asyncHandler(async (req, res) => {
  let kit = await BrandKit.findOne({ org: req.user.org });
  if (!kit) {
    kit = await BrandKit.create({
      org: req.user.org, owner: req.user.id,
      colors: DEFAULT_COLORS, fonts: DEFAULT_FONTS, logos: [],
    });
  }
  res.json({ brandKit: await serialize(kit), canEdit: canEdit(req.user) });
});

// PUT /api/brandkit — update colors + fonts (Brand Manager / Super Admin)
const update = asyncHandler(async (req, res) => {
  if (!canEdit(req.user)) return res.status(403).json({ error: "Only a Brand Manager or Super Admin can edit the Brand Kit" });
  const { colors, fonts } = req.body;
  const set = {};
  if (Array.isArray(colors)) set.colors = colors;
  if (fonts) set.fonts = fonts;
  const kit = await BrandKit.findOneAndUpdate({ org: req.user.org }, { $set: set }, { new: true, upsert: true });
  res.json({ brandKit: await serialize(kit) });
});

// POST /api/brandkit/logo — upload a logo file to S3 (kept as-is, no compression)
const uploadLogo = asyncHandler(async (req, res) => {
  if (!canEdit(req.user)) return res.status(403).json({ error: "Only a Brand Manager or Super Admin can edit the Brand Kit" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded (field name must be 'file')" });
  const key = s3.buildKey(req.file.originalname, { folder: "brand" });
  await s3.putObject(key, req.file.buffer, req.file.mimetype);
  const dark = req.body.dark === "true" || req.body.dark === true;
  const kit = await BrandKit.findOneAndUpdate(
    { org: req.user.org },
    { $push: { logos: { s3Key: key, label: req.body.label || req.file.originalname, dark } } },
    { new: true, upsert: true }
  );
  res.status(201).json({ brandKit: await serialize(kit) });
});

// DELETE /api/brandkit/logo?key=... — remove a logo (Brand Manager / Super Admin)
const removeLogo = asyncHandler(async (req, res) => {
  if (!canEdit(req.user)) return res.status(403).json({ error: "Only a Brand Manager or Super Admin can edit the Brand Kit" });
  const key = req.query.key || req.body.key;
  if (!key) return res.status(400).json({ error: "Logo key is required" });
  try { await s3.deleteObject(key); } catch (_) {}
  const kit = await BrandKit.findOneAndUpdate({ org: req.user.org }, { $pull: { logos: { s3Key: key } } }, { new: true });
  res.json({ brandKit: kit ? await serialize(kit) : { colors: [], fonts: {}, logos: [] } });
});

module.exports = { get, update, uploadLogo, removeLogo };
