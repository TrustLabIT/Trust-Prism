const Share = require("../models/Share");
const Asset = require("../models/Asset");
const s3 = require("../services/s3");
const { asyncHandler } = require("../middleware/error");

// A share serves only public-ready assets (Approved or Live), and only the chosen scope.
function assetFilter(share) {
  const f = { org: share.org, status: { $in: ["Approved", "Live"] } };
  if (share.include === "Whole portal") return f;               // every public-ready asset in the org
  if (share.include === "A category") {                         // a whole domain (optionally one sub-module)
    f.domain = share.scopeDomain || "__none__";
    if (share.scopeSub) f.sub = share.scopeSub;
    return f;
  }
  f._id = { $in: share.assets && share.assets.length ? share.assets : [null] }; // hand-picked (empty → nothing)
  return f;
}

function guard(share, res, pw) {
  if (!share) { res.status(404).json({ error: "This link doesn’t exist." }); return false; }
  if (share.expiresAt && share.expiresAt < new Date()) { res.status(410).json({ error: "This link has expired." }); return false; }
  if (share.password && (pw || "") !== share.password) {
    res.status(401).json({ error: "Password required", needsPassword: true, name: share.name });
    return false;
  }
  return true;
}

async function previewUrl(a) {
  const key = a.previewS3Key || (a.master && (a.master.mime || "").startsWith("image/") ? a.master.s3Key : null);
  if (!key) return null;
  try { return await s3.presignDownload(key, 3600); } catch (_) { return null; }
}

// GET /api/public/share/:token?pw=  — no auth
const getShare = asyncHandler(async (req, res) => {
  const share = await Share.findOne({ token: req.params.token });
  if (!guard(share, res, req.query.pw)) return;
  await Share.updateOne({ _id: share._id }, { $inc: { views: 1 } });

  const assets = await Asset.find(assetFilter(share)).sort({ createdAt: -1 }).limit(200);
  const items = await Promise.all(assets.map(async (a) => ({
    id: String(a._id), name: a.name, type: a.type, sub: a.sub,
    w: a.master ? a.master.w : 0, h: a.master ? a.master.h : 0,
    size: a.master ? a.master.size : 0, ext: a.master ? a.master.ext : "",
    url: await previewUrl(a),
  })));

  res.json({
    share: { name: share.name, to: share.to, perm: share.perm, wm: share.wm, include: share.include, count: items.length },
    assets: items,
  });
});

// GET /api/public/share/:token/asset/:aid/url?pw=  — no auth; returns the master
const downloadShareAsset = asyncHandler(async (req, res) => {
  const share = await Share.findOne({ token: req.params.token });
  if (!guard(share, res, req.query.pw)) return;
  if (share.perm !== "Download") return res.status(403).json({ error: "This link is view-only — downloads aren’t allowed." });
  const a = await Asset.findOne({ _id: req.params.aid, ...assetFilter(share) });
  if (!a || !a.master) return res.status(404).json({ error: "Asset not available in this link." });
  const url = await s3.presignDownload(a.master.s3Key, 900, { download: true, filename: a.master.fname });
  await Share.updateOne({ _id: share._id }, { $inc: { dls: 1 } });
  res.json({ url });
});

module.exports = { getShare, downloadShareAsset };
