const Asset = require("../models/Asset");
const { asyncHandler } = require("../middleware/error");
const { parsePage, paginate } = require("../utils/paginate");
const s3 = require("../services/s3");

// Only show assets the current user is allowed to see
function accessFilter(user) {
  return user.scope === "all" ? {} : { org: user.org };
}

function humanSize(bytes) {
  if (!bytes) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${u[i]}`;
}

const VIEW_TTL = 6 * 3600; // 6-hour presigned view links for thumbnails/preview

// Serialize an asset to the frontend shape + a temporary viewable S3 URL
async function withUrl(a) {
  const card = a.toCard();
  try { card.url = await s3.presignDownload(a.s3Key, VIEW_TTL); } catch (_) { card.url = null; }
  return card;
}

function parseTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string" && tags.trim()) {
    try { const j = JSON.parse(tags); if (Array.isArray(j)) return j; } catch (_) {}
    return tags.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

// GET /api/assets?cat=&sub=&year=&search=&status=&page=&limit=
const list = asyncHandler(async (req, res) => {
  const { cat, sub, year, search, status } = req.query;
  const filter = accessFilter(req.user);
  if (cat && cat !== "all") filter.cat = cat;
  if (sub && sub !== "all") filter.sub = sub;
  if (year && year !== "all") filter.year = year;
  if (status === "pending") filter.status = { $in: ["draft", "review"] };
  else if (status && status !== "all") filter.status = status;
  if (req.query.collection) filter.collectionRef = req.query.collection;
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { tags: rx }, { sub: rx }, { cat: rx }];
  }
  const { page, limit } = parsePage(req.query);
  const r = await paginate(Asset, filter, { page, limit, map: withUrl });
  res.json({ assets: r.items, total: r.total, page: r.page, limit: r.limit, hasMore: r.hasMore });
});

// GET /api/assets/stats — cheap counts for the sidebar (no docs shipped)
const stats = asyncHandler(async (req, res) => {
  const base = accessFilter(req.user);
  const [total, pending] = await Promise.all([
    Asset.countDocuments(base),
    Asset.countDocuments({ ...base, status: { $in: ["draft", "review"] } }),
  ]);
  res.json({ total, pending });
});

// GET /api/assets/analytics — fully computed from live data (no hardcoded numbers)
const analytics = asyncHandler(async (req, res) => {
  const base = accessFilter(req.user);
  const now = Date.now();
  const d30 = new Date(now - 30 * 864e5);
  const d60 = new Date(now - 60 * 864e5);
  const d365 = new Date(now - 365 * 864e5);

  // Campaign outcomes — top assets by views/impressions across lodged outcomes
  const top = await Asset.aggregate([
    { $match: base },
    { $addFields: {
        totalViews: { $sum: { $map: { input: { $ifNull: ["$outcomes", []] }, as: "o",
          in: { $cond: [{ $gt: ["$$o.views", 0] }, "$$o.views", { $ifNull: ["$$o.impressions", 0] }] } } } },
        totalConv: { $sum: "$outcomes.conversions" },
    } },
    { $match: { totalViews: { $gt: 0 } } },
    { $sort: { totalViews: -1 } },
    { $limit: 6 },
    { $project: { _id: 0, n: "$name", views: "$totalViews", conv: "$totalConv" } },
  ]);

  // Per-asset rollups → org summary (downloads, staleness, tagging, approval time)
  const [summary] = await Asset.aggregate([
    { $match: base },
    { $project: {
        status: 1, createdAt: 1, updatedAt: 1,
        dl30: { $size: { $filter: { input: { $ifNull: ["$downloadLog", []] }, as: "d", cond: { $gte: ["$$d.date", d30] } } } },
        dlPrev: { $size: { $filter: { input: { $ifNull: ["$downloadLog", []] }, as: "d", cond: { $and: [{ $gte: ["$$d.date", d60] }, { $lt: ["$$d.date", d30] }] } } } },
        lastDl: { $max: "$downloadLog.date" },
        hasTags: { $gt: [{ $size: { $ifNull: ["$tags", []] } }, 0] },
    } },
    { $group: {
        _id: null,
        total: { $sum: 1 },
        downloads30d: { $sum: "$dl30" },
        downloadsPrev30d: { $sum: "$dlPrev" },
        tagged: { $sum: { $cond: ["$hasTags", 1, 0] } },
        pending: { $sum: { $cond: [{ $in: ["$status", ["draft", "review"]] }, 1, 0] } },
        stale: { $sum: { $cond: [{ $lt: [{ $ifNull: ["$lastDl", "$createdAt"] }, d365] }, 1, 0] } },
        approvalMsSum: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, { $subtract: ["$updatedAt", "$createdAt"] }, 0] } },
        approvedCount: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
    } },
  ]);

  // Most-downloaded assets (prefer last-30-day activity, fall back to all-time)
  const topDownloaded = await Asset.aggregate([
    { $match: base },
    { $project: { name: 1, dl: 1,
        dl30: { $size: { $filter: { input: { $ifNull: ["$downloadLog", []] }, as: "d", cond: { $gte: ["$$d.date", d30] } } } } } },
    { $addFields: { metric: { $cond: [{ $gt: ["$dl30", 0] }, "$dl30", "$dl"] } } },
    { $match: { metric: { $gt: 0 } } },
    { $sort: { metric: -1 } },
    { $limit: 6 },
    { $project: { _id: 0, n: "$name", v: "$metric" } },
  ]);

  // Distinct users active (downloaded or commented) in the last 30 days
  const [active] = await Asset.aggregate([
    { $match: base },
    { $project: { users: { $setUnion: [
        { $map: { input: { $filter: { input: { $ifNull: ["$downloadLog", []] }, as: "d", cond: { $gte: ["$$d.date", d30] } } }, as: "d", in: "$$d.userId" } },
        { $map: { input: { $filter: { input: { $ifNull: ["$comments", []] }, as: "c", cond: { $gte: ["$$c.date", d30] } } }, as: "c", in: "$$c.userId" } },
    ] } } },
    { $unwind: "$users" },
    { $match: { users: { $ne: null } } },
    { $group: { _id: "$users" } },
    { $count: "n" },
  ]);

  const s = summary || {};
  const total = s.total || 0;
  const downloads30d = s.downloads30d || 0;
  const downloadsPrev30d = s.downloadsPrev30d || 0;

  res.json({
    total,
    top,
    downloads30d,
    downloadsDeltaPct: downloadsPrev30d ? Math.round(((downloads30d - downloadsPrev30d) / downloadsPrev30d) * 100) : null,
    activeUsers: active?.n || 0,
    avgApprovalDays: s.approvedCount ? +(s.approvalMsSum / s.approvedCount / 864e5).toFixed(1) : null,
    topDownloaded,
    staleCount: s.stale || 0,
    taggedPct: total ? Math.round((s.tagged / total) * 100) : 0,
    pending: s.pending || 0,
  });
});

// GET /api/assets/:id
const getOne = asyncHandler(async (req, res) => {
  const a = await Asset.findOne({ _id: req.params.id, ...accessFilter(req.user) });
  if (!a) return res.status(404).json({ error: "Asset not found" });
  res.json({ asset: await withUrl(a) });
});

// POST /api/assets  (multipart form, field "file")  — images are compressed here
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded (field name must be 'file')" });
  const { originalname, mimetype, buffer } = req.file;
  const b = req.body;

  let key, contentType, bytes, dim = b.dim || "";
  const isImage = mimetype.startsWith("image/");

  if (isImage) {
    const c = await s3.compressImage(buffer);          // resize + WebP
    key = s3.buildKey(originalname, { ext: c.ext });
    await s3.putObject(key, c.buffer, c.contentType);
    contentType = c.contentType;
    bytes = c.compressedBytes;
    if (c.width && c.height) dim = `${c.width}×${c.height}`;
  } else {
    // non-image (small docs) stored as-is; large videos should use /presign instead
    key = s3.buildKey(originalname);
    await s3.putObject(key, buffer, mimetype);
    contentType = mimetype;
    bytes = buffer.length;
  }

  const asset = await Asset.create({
    name: b.name || originalname,
    type: b.type || (isImage ? "image" : "document"),
    cat: b.cat || "Electronic",
    sub: b.sub || (isImage ? "Images" : "Documents"),
    status: b.status || "review",
    tags: parseTags(b.tags),
    s3Key: key,
    mimeType: contentType,
    bytes,
    size: humanSize(bytes),
    dim,
    by: req.user.name,
    owner: req.user.id,
    org: req.user.org,
    date: b.date || new Date().toISOString().slice(0, 10),
    year: (b.date || new Date().toISOString().slice(0, 10)).slice(0, 4),
    collectionRef: b.collection || null,
  });

  // hand back the asset with a viewable URL immediately
  res.status(201).json({ asset: await withUrl(asset) });
});

// POST /api/assets/presign  { filename, contentType }  — for large files / video
const presign = asyncHandler(async (req, res) => {
  const { filename, contentType } = req.body;
  if (!filename || !contentType) return res.status(400).json({ error: "filename and contentType are required" });
  const key = s3.buildKey(filename);
  const uploadUrl = await s3.presignUpload(key, contentType);
  res.json({ key, uploadUrl });
});

// POST /api/assets/confirm  { key, name, type, cat, sub, tags, dim, bytes, mimeType, date }
const confirmUpload = asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.key) return res.status(400).json({ error: "key is required" });
  const asset = await Asset.create({
    name: b.name || "Untitled",
    type: b.type || "video",
    cat: b.cat || "Videos",
    sub: b.sub || "Social Video",
    status: b.status || "review",
    tags: parseTags(b.tags),
    s3Key: b.key,
    mimeType: b.mimeType || "",
    bytes: b.bytes || 0,
    size: humanSize(b.bytes || 0),
    dim: b.dim || "",
    by: req.user.name,
    owner: req.user.id,
    org: req.user.org,
    date: b.date || new Date().toISOString().slice(0, 10),
    year: (b.date || new Date().toISOString().slice(0, 10)).slice(0, 4),
    collectionRef: b.collection || null,
  });
  res.status(201).json({ asset: await withUrl(asset) });
});

// GET /api/assets/:id/url  — fresh presigned link that FORCES a download (counts a download)
const APPROVER_ROLES = ["Super Admin", "Brand Manager", "Reviewer"];
const downloadUrl = asyncHandler(async (req, res) => {
  const a = await Asset.findOne({ _id: req.params.id, ...accessFilter(req.user) });
  if (!a) return res.status(404).json({ error: "Asset not found" });
  // Only approved assets can be downloaded/shared — reviewers & the owner may still fetch to review
  const isApprover = APPROVER_ROLES.includes(req.user.role);
  const isOwner = String(a.owner) === String(req.user.id);
  if (a.status !== "approved" && !isApprover && !isOwner) {
    return res.status(403).json({ error: "This asset isn't approved yet — it can't be downloaded or shared until it's approved." });
  }
  const ext = (a.s3Key.match(/\.[^.]+$/) || [""])[0];
  const filename = `${a.name.replace(/[^\w.-]+/g, "_")}${ext}`;
  const url = await s3.presignDownload(a.s3Key, 900, { download: true, filename });
  // record the download (who, why, when) — capped to the last 50 entries
  const reason = (req.query.reason || req.body.reason || "").toString().slice(0, 100);
  await Asset.updateOne(
    { _id: a._id },
    {
      $inc: { dl: 1 },
      $push: { downloadLog: { $each: [{ by: req.user.name, userId: req.user.id, reason, date: new Date() }], $slice: -50 } },
    }
  );
  const fresh = await Asset.findById(a._id);
  res.json({ url, asset: await withUrl(fresh) });
});

// PATCH /api/assets/:id  — edit metadata (owner, Brand Manager or Super Admin)
const update = asyncHandler(async (req, res) => {
  const a = await Asset.findOne({ _id: req.params.id, ...accessFilter(req.user) });
  if (!a) return res.status(404).json({ error: "Asset not found" });
  const isOwner = String(a.owner) === String(req.user.id);
  if (!isOwner && !["Super Admin", "Brand Manager"].includes(req.user.role)) {
    return res.status(403).json({ error: "Not allowed to edit this asset" });
  }
  const b = req.body;
  if (b.name !== undefined && b.name.trim()) a.name = b.name.trim();
  if (b.cat !== undefined) a.cat = b.cat;
  if (b.sub !== undefined) a.sub = b.sub;
  if (b.tags !== undefined) {
    a.tags = Array.isArray(b.tags) ? b.tags : String(b.tags).split(",").map((t) => t.trim()).filter(Boolean);
  }
  if (b.collection !== undefined) a.collectionRef = b.collection || null;
  await a.save();
  res.json({ asset: await withUrl(a) });
});

// POST /api/assets/:id/file  — replace the underlying file (owner, Brand Manager or Super Admin)
// Images are re-compressed to WebP; the old S3 object is removed. A changed file on an
// already-approved asset is sent back to "review" so the new content gets re-approved.
const replaceFile = asyncHandler(async (req, res) => {
  const a = await Asset.findOne({ _id: req.params.id, ...accessFilter(req.user) });
  if (!a) return res.status(404).json({ error: "Asset not found" });
  const isOwner = String(a.owner) === String(req.user.id);
  if (!isOwner && !["Super Admin", "Brand Manager"].includes(req.user.role)) {
    return res.status(403).json({ error: "Not allowed to edit this asset" });
  }
  if (!req.file) return res.status(400).json({ error: "No file uploaded (field name must be 'file')" });

  const { originalname, mimetype, buffer } = req.file;
  const oldKey = a.s3Key;
  const isImage = mimetype.startsWith("image/");
  const isVideo = mimetype.startsWith("video/");

  let key, contentType, bytes, dim = a.dim;
  if (isImage) {
    const c = await s3.compressImage(buffer);            // resize + WebP
    key = s3.buildKey(originalname, { ext: c.ext });
    await s3.putObject(key, c.buffer, c.contentType);
    contentType = c.contentType;
    bytes = c.compressedBytes;
    if (c.width && c.height) dim = `${c.width}×${c.height}`;
  } else {
    key = s3.buildKey(originalname);
    await s3.putObject(key, buffer, mimetype);
    contentType = mimetype;
    bytes = buffer.length;
  }

  a.s3Key = key;
  a.mimeType = contentType;
  a.bytes = bytes;
  a.size = humanSize(bytes);
  a.dim = dim;
  a.type = isVideo ? "video" : isImage ? "image" : (a.type || "document");
  const wasApproved = a.status === "approved";
  if (wasApproved) a.status = "review";                  // new content must be re-approved
  await a.save();

  // best-effort remove the previous object now that the record points elsewhere
  if (oldKey && oldKey !== key) { try { await s3.deleteObject(oldKey); } catch (_) { /* ignore */ } }

  res.json({ asset: await withUrl(a), reapproval: wasApproved });
});

// PATCH /api/assets/:id/status  — move through the approval workflow
const APPROVERS = ["Super Admin", "Brand Manager", "Reviewer"];
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["draft", "review", "approved"].includes(status)) {
    return res.status(400).json({ error: "Status must be draft, review or approved" });
  }
  if (status === "approved" && !APPROVERS.includes(req.user.role)) {
    return res.status(403).json({ error: "You don't have permission to approve assets" });
  }
  const a = await Asset.findOne({ _id: req.params.id, ...accessFilter(req.user) });
  if (!a) return res.status(404).json({ error: "Asset not found" });
  a.status = status;
  await a.save();
  res.json({ asset: await withUrl(a) });
});

// POST /api/assets/:id/comments  — anyone with access can comment
const addComment = asyncHandler(async (req, res) => {
  const text = (req.body.text || "").trim();
  if (!text) return res.status(400).json({ error: "Comment can't be empty" });
  const a = await Asset.findOne({ _id: req.params.id, ...accessFilter(req.user) });
  if (!a) return res.status(404).json({ error: "Asset not found" });
  a.comments.push({ by: req.user.name, userId: req.user.id, text: text.slice(0, 1000), date: new Date() });
  await a.save();
  res.status(201).json({ asset: await withUrl(a) });
});

// POST /api/assets/:id/outcomes  — lodge a campaign outcome
const lodgeOutcome = asyncHandler(async (req, res) => {
  const a = await Asset.findOne({ _id: req.params.id, ...accessFilter(req.user) });
  if (!a) return res.status(404).json({ error: "Asset not found" });
  a.outcomes.push(req.body);
  await a.save();
  res.status(201).json({ asset: await withUrl(a) });
});

// DELETE /api/assets/:id/outcomes            — clear ALL lodged outcomes
// DELETE /api/assets/:id/outcomes/:index     — remove a single lodged outcome
const removeOutcome = asyncHandler(async (req, res) => {
  const a = await Asset.findOne({ _id: req.params.id, ...accessFilter(req.user) });
  if (!a) return res.status(404).json({ error: "Asset not found" });
  const { index } = req.params;
  if (index === undefined || index === "") {
    a.outcomes = [];
  } else {
    const i = parseInt(index, 10);
    if (Number.isNaN(i) || i < 0 || i >= a.outcomes.length) return res.status(400).json({ error: "Invalid outcome index" });
    a.outcomes.splice(i, 1);
  }
  await a.save();
  res.json({ asset: await withUrl(a) });
});

// DELETE /api/assets/:id  — owner or Super Admin
const remove = asyncHandler(async (req, res) => {
  const a = await Asset.findById(req.params.id);
  if (!a) return res.status(404).json({ error: "Asset not found" });
  const isOwner = String(a.owner) === String(req.user.id);
  if (!isOwner && req.user.role !== "Super Admin") {
    return res.status(403).json({ error: "Not allowed to delete this asset" });
  }
  try { await s3.deleteObject(a.s3Key); } catch (_) {}
  await a.deleteOne();
  res.json({ ok: true });
});

module.exports = { list, stats, analytics, getOne, uploadImage, presign, confirmUpload, downloadUrl, update, replaceFile, updateStatus, addComment, lodgeOutcome, removeOutcome, remove };
