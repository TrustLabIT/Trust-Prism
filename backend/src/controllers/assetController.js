const Asset = require("../models/Asset");
const s3 = require("../services/s3");
const { asyncHandler } = require("../middleware/error");
const { parsePage, paginate } = require("../utils/paginate");
const tax = require("../services/taxonomy");   // live, editable taxonomy (DB-backed)

const APPROVER = ["Super Admin", "Brand Manager", "Reviewer"];
// Library shows active assets only. Draft/In review live in Approvals; anything past its
// expiry date is moved to the Expired section (by date — no record is ever deleted).
const LIBRARY_STATUSES = ["Approved", "Live"];
const todayStr = () => new Date().toISOString().slice(0, 10);
const notExpiredOr = (today) => ({ $or: [{ expiry: null }, { expiry: { $gte: today } }] });

// scope: "all" sees everything; otherwise only their org's work
function accessFilter(user) {
  return user.scope === "all" ? {} : { org: user.org };
}

// frontend shape (no S3 keys leaked)
function card(a) {
  return {
    id: String(a._id),
    name: a.name,
    domain: a.domain, sub: a.sub, type: a.type,
    channel: a.channel, status: a.status, dist: a.dist,
    audience: a.audience, campaign: a.campaign, service: a.service,
    geo: a.geo, lang: a.lang, spec: a.spec, version: a.version,
    date: a.date, expiry: a.expiry || null,
    by: a.by, org: a.org, owner: a.owner ? String(a.owner) : null,
    thumb: a.thumb || "",
    w: a.master ? a.master.w : 0,
    h: a.master ? a.master.h : 0,
    master: a.master ? {
      fname: a.master.fname, mime: a.master.mime, ext: a.master.ext,
      size: a.master.size, sha256: a.master.sha256, w: a.master.w, h: a.master.h,
    } : null,
    createdAt: a.createdAt,
  };
}

// attach a short-lived preview URL (image preview rendition, or the image master itself)
async function withUrls(a) {
  const c = card(a);
  const key = a.previewS3Key || (a.master && (a.master.mime || "").startsWith("image/") ? a.master.s3Key : null);
  c.preview = key ? await s3.presignDownload(key, 6 * 3600).catch(() => null) : null;
  return c;
}

const splitArr = (v) => (v ? String(v).split(",").filter(Boolean) : []);

// GET /api/assets  — filtered, paginated library
const list = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = accessFilter(req.user);
  if (q.domain && q.domain !== "all") filter.domain = q.domain;
  else filter.domain = { $in: await tax.domainIds() };   // exclude any legacy non-taxonomy records
  if (q.sub) filter.sub = q.sub;

  // never surface Draft / In review / Expired in the Library — those live in Approvals / the Expired section
  const statuses = splitArr(q.status).filter((s) => !["Draft", "In review", "Expired"].includes(s));
  filter.status = { $in: statuses.length ? statuses : LIBRARY_STATUSES };

  ["dist", "channel", "audience", "campaign", "service", "geo", "lang"].forEach((k) => {
    const vals = splitArr(q[k]);
    if (vals.length) filter[k] = { $in: vals };
  });

  if (q.from || q.to) {
    filter.date = {};
    if (q.from) filter.date.$gte = q.from;
    if (q.to) filter.date.$lte = q.to;
  }

  const and = [];
  if (q.q) {
    const rx = new RegExp(String(q.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    and.push({ $or: [{ name: rx }, { type: rx }, { campaign: rx }, { geo: rx }, { service: rx }, { audience: rx }] });
  }
  // default view hides anything past its expiry date (it lives in the Expired section)
  if (!statuses.length) and.push(notExpiredOr(todayStr()));
  if (and.length) filter.$and = and;

  const { page, limit } = parsePage(q);
  const r = await paginate(Asset, filter, { page, limit, sort: { date: -1 }, map: withUrls });
  res.json({ assets: r.items, total: r.total, page: r.page, limit: r.limit, hasMore: r.hasMore });
});

// GET /api/assets/counts  — sidebar + sub-module chip counts (non-archived), plus review count
const counts = asyncHandler(async (req, res) => {
  const base = accessFilter(req.user);
  const today = todayStr();
  const DOMAIN_IDS = await tax.domainIds();
  const all = await Asset.find(
    { ...base, status: { $in: LIBRARY_STATUSES }, domain: { $in: DOMAIN_IDS }, ...notExpiredOr(today) },
    { domain: 1, sub: 1 }
  ).lean();
  const byDomain = {}, bySub = {};
  all.forEach((a) => {
    byDomain[a.domain] = (byDomain[a.domain] || 0) + 1;
    const k = a.domain + "/" + a.sub;
    bySub[k] = (bySub[k] || 0) + 1;
  });
  const [inReview, expired] = await Promise.all([
    Asset.countDocuments({ ...base, status: "In review", domain: { $in: DOMAIN_IDS } }),
    Asset.countDocuments({ ...base, domain: { $in: DOMAIN_IDS }, status: { $ne: "Archived" }, expiry: { $ne: null, $lt: today } }),
  ]);
  res.json({ total: all.length, byDomain, bySub, inReview, expired });
});

// POST /api/assets  (multipart: file + fields) — store master byte-for-byte + a preview
const create = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No master file uploaded (field name must be 'file')" });
  const b = req.body;
  if (!b.name || !b.name.trim()) return res.status(400).json({ error: "Asset name is required" });
  if (!(await tax.validPath(b.domain, b.sub, b.type))) return res.status(400).json({ error: "Invalid domain / sub-module / type" });
  if (!(await tax.dists()).includes(b.dist)) return res.status(400).json({ error: "Distribution class is required" });

  const { originalname, mimetype, buffer } = req.file;
  const ext = (originalname.includes(".") ? originalname.split(".").pop() : "FILE").toUpperCase();
  const isImage = (mimetype || "").startsWith("image/");

  // 1) master — stored untouched
  const masterKey = s3.buildKey(originalname, { folder: "masters", ext: ext.toLowerCase() });
  await s3.putObject(masterKey, buffer, mimetype || "application/octet-stream");
  const sha = s3.sha256(buffer);

  // 2) preview — a separate rendition, images only
  let w = 0, h = 0, previewKey = null;
  if (isImage) {
    try {
      const p = await s3.makePreview(buffer);
      w = p.width; h = p.height;
      previewKey = s3.buildKey(originalname, { folder: "previews", ext: "webp" });
      await s3.putObject(previewKey, p.buffer, p.contentType);
    } catch (_) { /* preview is best-effort; master is what matters */ }
  }

  const asset = await Asset.create({
    name: b.name.trim(), domain: b.domain, sub: b.sub, type: b.type,
    channel: b.channel || "Digital", status: "In review", dist: b.dist,
    audience: b.audience || "Consumer", campaign: b.campaign || "Always-on",
    service: b.service || "General", geo: b.geo || "All centres",
    lang: b.lang || "English", spec: b.spec || "RGB",
    date: b.date || new Date().toISOString().slice(0, 10),
    expiry: b.expiry || null,
    master: { fname: originalname, mime: mimetype || "application/octet-stream", ext, size: buffer.length, sha256: sha, w, h, s3Key: masterKey },
    previewS3Key: previewKey,
    thumb: b.thumb || "",
    by: req.user.name, owner: req.user.id, org: req.user.org,
  });
  res.status(201).json({ asset: await withUrls(asset) });
});

// GET /api/assets/:id
const getOne = asyncHandler(async (req, res) => {
  const a = await Asset.findOne({ _id: req.params.id, ...accessFilter(req.user) });
  if (!a) return res.status(404).json({ error: "Asset not found" });
  res.json({ asset: await withUrls(a) });
});

// GET /api/assets/:id/url  — presigned download of the MASTER (exact bytes, original filename)
const downloadUrl = asyncHandler(async (req, res) => {
  const a = await Asset.findOne({ _id: req.params.id, ...accessFilter(req.user) });
  if (!a) return res.status(404).json({ error: "Asset not found" });
  if (!a.master) return res.status(404).json({ error: "No master file attached to this asset" });
  const url = await s3.presignDownload(a.master.s3Key, 900, { download: true, filename: a.master.fname });
  res.json({ url });
});

// PATCH /api/assets/:id/status  { action }  — lifecycle transitions
const TRANSITIONS = { submit: "In review", approve: "Approved", reject: "Draft", publish: "Live", archive: "Archived", renew: "In review" };
const updateStatus = asyncHandler(async (req, res) => {
  const a = await Asset.findOne({ _id: req.params.id, ...accessFilter(req.user) });
  if (!a) return res.status(404).json({ error: "Asset not found" });
  const action = req.body.action;
  const next = TRANSITIONS[action];
  if (!next) return res.status(400).json({ error: "Unknown action" });
  const isApprover = APPROVER.includes(req.user.role);
  const isOwner = String(a.owner) === String(req.user.id);
  if (["approve", "reject", "publish"].includes(action) && !isApprover)
    return res.status(403).json({ error: "Only a Reviewer, Brand Manager or Super Admin can do that" });
  if (!isApprover && !isOwner)
    return res.status(403).json({ error: "Not allowed to change this asset" });
  if (action === "publish" && a.domain !== "demand")
    return res.status(400).json({ error: "Only Demand Generation assets go Live — Approved is the terminal state here" });
  a.status = next;
  await a.save();
  res.json({ asset: await withUrls(a) });
});

// PATCH /api/assets/:id  — edit metadata / re-file
const update = asyncHandler(async (req, res) => {
  const a = await Asset.findOne({ _id: req.params.id, ...accessFilter(req.user) });
  if (!a) return res.status(404).json({ error: "Asset not found" });
  const isOwner = String(a.owner) === String(req.user.id);
  if (!isOwner && !["Super Admin", "Brand Manager"].includes(req.user.role))
    return res.status(403).json({ error: "Not allowed to edit this asset" });
  const b = req.body;
  ["name", "audience", "campaign", "service", "geo", "lang", "spec", "dist", "channel", "date"].forEach((k) => {
    if (b[k] !== undefined && b[k] !== "") a[k] = b[k];
  });
  if (b.expiry !== undefined) a.expiry = b.expiry || null;
  if (b.domain && b.sub && b.type && await tax.validPath(b.domain, b.sub, b.type)) {
    a.domain = b.domain; a.sub = b.sub; a.type = b.type;
  }
  // Renewing: if the new expiry is in the future (or cleared) and the record was marked
  // Expired, bring it back into service automatically.
  const today = todayStr();
  if (a.status === "Expired" && (!a.expiry || a.expiry >= today)) {
    a.status = a.domain === "demand" ? "Live" : "Approved";
  }
  await a.save();
  res.json({ asset: await withUrls(a) });
});

// GET /api/assets/approvals?from=&to=&q=&limit=  — everything the Approvals screen needs
const approvals = asyncHandler(async (req, res) => {
  const base = accessFilter(req.user);
  const { from, to, q } = req.query;
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 20)); // per-section cap
  const dateOk = (d) => (!from || d >= from) && (!to || d <= to);
  const rx = q ? new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
  const matchQ = (a) => !rx || rx.test([a.name, a.type, a.campaign, a.geo, a.service, a.audience].join(" "));
  const today = new Date().toISOString().slice(0, 10);
  const daysTo = (d) => Math.round((new Date(d + "T00:00:00") - new Date(today + "T00:00:00")) / 86400000);
  const DOMAIN_IDS = await tax.domainIds();

  const docs = await Asset.find({ ...base, domain: { $in: DOMAIN_IDS } }).sort({ date: -1 });
  const R = [], D = [], AP = [], F = [];   // raw docs (F carries flag meta)
  for (const a of docs) {
    if (!dateOk(a.date) || !matchQ(a)) continue;
    if (a.status === "In review") R.push(a);
    else if (a.status === "Draft") D.push(a);
    else if (a.status === "Approved" && a.domain === "demand") AP.push(a);

    if (a.expiry && a.status === "Live" && a.expiry < today)
      F.push({ a, sev: "bad", why: `Marked Live but expired ${a.expiry} — still in circulation.` });
    else if (a.expiry && ["Live", "Approved"].includes(a.status) && a.expiry >= today && daysTo(a.expiry) <= 60)
      F.push({ a, sev: "warn", why: `Expires in ${daysTo(a.expiry)} days (${a.expiry}) — plan the replacement.` });
    if (a.domain === "demand" && a.dist === "Internal only")
      F.push({ a, sev: "warn", why: "Demand Generation asset marked Internal only — audience-facing work is rarely internal. Likely a default, not a decision." });
  }

  // presign only the items we actually return (each section capped to `limit`)
  const cards = (list) => Promise.all(list.slice(0, limit).map(withUrls));
  const [review, drafts, approvedDemand] = await Promise.all([cards(R), cards(D), cards(AP)]);
  const flags = await Promise.all(F.slice(0, limit).map(async (f) => ({ ...(await withUrls(f.a)), sev: f.sev, why: f.why })));

  res.json({
    review, drafts, approvedDemand, flags,
    counts: { review: R.length, drafts: D.length, approvedDemand: AP.length, flags: F.length },
    limit,
    hasMore: R.length > limit || D.length > limit || AP.length > limit || F.length > limit,
  });
});

// GET /api/assets/expired?q=&domain=&page=&limit=  — assets past their expiry date (kept, never auto-deleted)
const expired = asyncHandler(async (req, res) => {
  const q = req.query;
  const base = accessFilter(req.user);
  const today = todayStr();
  const filter = {
    ...base,
    domain: q.domain && q.domain !== "all" ? q.domain : { $in: await tax.domainIds() },
    status: { $ne: "Archived" },
    expiry: { $ne: null, $lt: today },
  };
  if (q.q) {
    const rx = new RegExp(String(q.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { type: rx }, { campaign: rx }, { geo: rx }, { service: rx }];
  }
  const { page, limit } = parsePage(q);
  const r = await paginate(Asset, filter, { page, limit, sort: { expiry: -1 }, map: withUrls });
  res.json({ assets: r.items, total: r.total, page: r.page, limit: r.limit, hasMore: r.hasMore });
});

// DELETE /api/assets/:id
const remove = asyncHandler(async (req, res) => {
  const a = await Asset.findById(req.params.id);
  if (!a) return res.status(404).json({ error: "Asset not found" });
  const isOwner = String(a.owner) === String(req.user.id);
  if (!isOwner && req.user.role !== "Super Admin") return res.status(403).json({ error: "Not allowed to delete this asset" });
  try { if (a.master) await s3.deleteObject(a.master.s3Key); } catch (_) {}
  try { if (a.previewS3Key) await s3.deleteObject(a.previewS3Key); } catch (_) {}
  await a.deleteOne();
  res.json({ ok: true, id: req.params.id });
});

/* ---------- Direct browser → S3 upload (large masters; bytes never touch this server) ---------- */
const GB = 1024 * 1024 * 1024;
const SINGLE_MAX = 5 * GB;                 // S3 single-PUT limit
function partSizeFor(size) {
  const min = 64 * 1024 * 1024;            // 64 MB parts
  let ps = Math.max(min, Math.ceil(size / 9000)); // keep well under S3's 10,000-part cap
  return Math.ceil(ps / (1024 * 1024)) * (1024 * 1024);
}

// POST /api/assets/presign  { filename, contentType, size } → single PUT or multipart plan
const presign = asyncHandler(async (req, res) => {
  const { filename, contentType, size } = req.body;
  if (!filename) return res.status(400).json({ error: "filename is required" });
  const ext = (filename.includes(".") ? filename.split(".").pop() : "FILE").toLowerCase();
  const key = s3.buildKey(filename, { folder: "masters", ext });
  const ct = contentType || "application/octet-stream";
  const sz = Number(size) || 0;
  if (sz > SINGLE_MAX) {
    const uploadId = await s3.createMultipart(key, ct);
    return res.json({ mode: "multipart", key, uploadId, partSize: partSizeFor(sz) });
  }
  const url = await s3.presignUpload(key, ct);
  res.json({ mode: "single", key, url });
});

// POST /api/assets/presign-part  { key, uploadId, partNumber } → one presigned part URL
const signPart = asyncHandler(async (req, res) => {
  const { key, uploadId, partNumber } = req.body;
  if (!key || !uploadId || !partNumber) return res.status(400).json({ error: "key, uploadId and partNumber are required" });
  const url = await s3.signPart(key, uploadId, partNumber);
  res.json({ url });
});

// POST /api/assets/complete  { key, uploadId, parts:[{ETag,PartNumber}] }
const completeUpload = asyncHandler(async (req, res) => {
  const { key, uploadId, parts } = req.body;
  if (!key || !uploadId || !Array.isArray(parts) || !parts.length) return res.status(400).json({ error: "key, uploadId and parts are required" });
  await s3.completeMultipart(key, uploadId, parts);
  res.json({ ok: true, key });
});

// POST /api/assets/abort  { key, uploadId }
const abortUpload = asyncHandler(async (req, res) => {
  const { key, uploadId } = req.body;
  if (key && uploadId) await s3.abortMultipart(key, uploadId);
  res.json({ ok: true });
});

// POST /api/assets/presign-preview  → a presigned PUT for a client-generated preview (images)
const presignPreview = asyncHandler(async (req, res) => {
  const key = s3.buildKey(req.body.filename || "preview", { folder: "previews", ext: "webp" });
  const url = await s3.presignUpload(key, "image/webp");
  res.json({ key, url });
});

// POST /api/assets/confirm  — create the record after a direct upload finished
const confirm = asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.name || !b.name.trim()) return res.status(400).json({ error: "Asset name is required" });
  if (!(await tax.validPath(b.domain, b.sub, b.type))) return res.status(400).json({ error: "Invalid domain / sub-module / type" });
  if (!(await tax.dists()).includes(b.dist)) return res.status(400).json({ error: "Distribution class is required" });
  const m = b.master || {};
  const key = m.key || m.s3Key;
  if (!key) return res.status(400).json({ error: "Master key is required — upload the file first" });
  const asset = await Asset.create({
    name: b.name.trim(), domain: b.domain, sub: b.sub, type: b.type,
    channel: b.channel || "Digital", status: "In review", dist: b.dist,
    audience: b.audience || "Consumer", campaign: b.campaign || "Always-on",
    service: b.service || "General", geo: b.geo || "All centres",
    lang: b.lang || "English", spec: b.spec || "RGB",
    date: b.date || new Date().toISOString().slice(0, 10), expiry: b.expiry || null,
    master: {
      fname: m.fname, mime: m.mime || "application/octet-stream", ext: (m.ext || "FILE").toUpperCase(),
      size: Number(m.size) || 0, sha256: m.sha256 || "", w: Number(m.w) || 0, h: Number(m.h) || 0, s3Key: key,
    },
    previewS3Key: b.previewKey || null,
    thumb: b.thumb || "",
    by: req.user.name, owner: req.user.id, org: req.user.org,
  });
  res.status(201).json({ asset: await withUrls(asset) });
});

module.exports = {
  list, counts, create, getOne, downloadUrl, updateStatus, update, approvals, expired, remove,
  presign, signPart, completeUpload, abortUpload, presignPreview, confirm,
};
