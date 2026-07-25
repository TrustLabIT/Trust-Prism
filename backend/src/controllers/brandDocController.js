const BrandDoc = require("../models/BrandDoc");
const s3 = require("../services/s3");
const { asyncHandler } = require("../middleware/error");
const { parsePage, paginate } = require("../utils/paginate");

const canEdit = (user) => ["Super Admin", "Brand Manager"].includes(user.role);

// Attach a short-lived presigned view URL to a doc card.
async function withUrl(d) {
  const card = d.toCard();
  card.url = await s3.presignDownload(d.s3Key, 6 * 3600).catch(() => null);
  return card;
}

// GET /api/brandkit/docs?page=&limit=  — paginated list for the caller's org
const list = asyncHandler(async (req, res) => {
  const { page, limit } = parsePage(req.query);
  const r = await paginate(BrandDoc, { org: req.user.org }, { page, limit, map: withUrl });
  res.json({
    docs: r.items, total: r.total, page: r.page, limit: r.limit,
    hasMore: r.hasMore, pages: r.pages, canEdit: canEdit(req.user),
  });
});

// POST /api/brandkit/docs  (multipart: file, name?) — compress + store in S3
const create = asyncHandler(async (req, res) => {
  if (!canEdit(req.user)) return res.status(403).json({ error: "Only a Brand Manager or Super Admin can add brand documents" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded (field name must be 'file')" });

  const original = req.file.buffer;
  const mimeType = req.file.mimetype || "application/octet-stream";
  const ext = (req.file.originalname.match(/\.[^.]+$/)?.[0] || ".pdf").replace(".", "");
  const key = s3.buildKey(req.file.originalname, { folder: "brand-docs", ext });

  // Smart compression: gzip, but only keep it if it meaningfully shrinks the file
  // (already-compressed PDFs won't benefit, so those store as-is with no risk).
  let storeBuf = original, gzipped = false;
  try {
    const gz = await s3.gzipBuffer(original);
    if (gz.length < original.length * 0.95) { storeBuf = gz; gzipped = true; }
  } catch (_) { /* fall back to storing the original */ }

  await s3.putObject(key, storeBuf, mimeType, gzipped ? { contentEncoding: "gzip" } : {});

  const doc = await BrandDoc.create({
    org: req.user.org,
    name: (req.body.name || req.file.originalname).trim(),
    s3Key: key, mimeType,
    originalBytes: original.length, storedBytes: storeBuf.length, gzipped,
    uploadedBy: req.user.name, owner: req.user.id,
  });
  res.status(201).json({ doc: await withUrl(doc) });
});

// PATCH /api/brandkit/docs/:id  { name } — rename
const rename = asyncHandler(async (req, res) => {
  if (!canEdit(req.user)) return res.status(403).json({ error: "Only a Brand Manager or Super Admin can edit brand documents" });
  const name = (req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Name is required" });
  const doc = await BrandDoc.findOne({ _id: req.params.id, org: req.user.org });
  if (!doc) return res.status(404).json({ error: "Document not found" });
  doc.name = name;
  await doc.save();
  res.json({ doc: await withUrl(doc) });
});

// GET /api/brandkit/docs/:id/url?download=1 — fresh view/download link
const url = asyncHandler(async (req, res) => {
  const doc = await BrandDoc.findOne({ _id: req.params.id, org: req.user.org });
  if (!doc) return res.status(404).json({ error: "Document not found" });
  const download = req.query.download === "1" || req.query.download === "true";
  const ext = (doc.s3Key.match(/\.[^.]+$/) || [""])[0];
  const opts = download ? { download: true, filename: `${doc.name.replace(/[^\w.-]+/g, "_")}${ext}` } : {};
  const link = await s3.presignDownload(doc.s3Key, 900, opts);
  res.json({ url: link });
});

// DELETE /api/brandkit/docs/:id — remove from S3 + DB
const remove = asyncHandler(async (req, res) => {
  if (!canEdit(req.user)) return res.status(403).json({ error: "Only a Brand Manager or Super Admin can delete brand documents" });
  const doc = await BrandDoc.findOne({ _id: req.params.id, org: req.user.org });
  if (!doc) return res.status(404).json({ error: "Document not found" });
  try { await s3.deleteObject(doc.s3Key); } catch (_) { /* ignore S3 miss */ }
  await doc.deleteOne();
  res.json({ ok: true, id: req.params.id });
});

module.exports = { list, create, rename, url, remove };
