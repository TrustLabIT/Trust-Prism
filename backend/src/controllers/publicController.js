const Share = require("../models/Share");
const Asset = require("../models/Asset");
const Collection = require("../models/Collection");
const s3 = require("../services/s3");
const { asyncHandler } = require("../middleware/error");

// Which assets a share exposes: approved only, and ONLY the exact scope that was chosen.
// A share never "falls through" to the whole library — if nothing was chosen, it shows nothing.
function assetFilter(share) {
  const f = { org: share.org, status: "approved" };
  if (share.include === "Specific assets") {
    // exactly the hand-picked assets (empty pick → match nothing)
    f._id = { $in: share.assets && share.assets.length ? share.assets : [null] };
  } else if (share.include === "Whole brand portal") {
    // intentional: every approved asset in the org — no extra scope needed
  } else {
    // "A collection": require a collection; if none was set, serve nothing (never everything)
    f.collectionRef = share.collectionRef || null;
    if (!share.collectionRef) f._id = { $in: [null] };
  }
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

// GET /api/public/share/:token?pw=  — no auth
const getShare = asyncHandler(async (req, res) => {
  const share = await Share.findOne({ token: req.params.token });
  if (!guard(share, res, req.query.pw)) return;
  await Share.updateOne({ _id: share._id }, { $inc: { views: 1 } });

  const assets = await Asset.find(assetFilter(share)).sort({ createdAt: -1 }).limit(200);
  let collectionName = null;
  if (share.collectionRef) { const c = await Collection.findById(share.collectionRef); collectionName = c?.name || null; }
  const items = await Promise.all(assets.map(async (a) => {
    let url = null;
    try { url = await s3.presignDownload(a.s3Key, 3600); } catch (_) {}
    return { id: String(a._id), n: a.name, t: a.type, sub: a.sub, dim: a.dim, size: a.size, url };
  }));

  res.json({
    share: { name: share.name, to: share.to, perm: share.perm, wm: share.wm, collection: collectionName, count: items.length },
    assets: items,
  });
});

// GET /api/public/share/:token/asset/:aid/url?pw=  — no auth
const downloadShareAsset = asyncHandler(async (req, res) => {
  const share = await Share.findOne({ token: req.params.token });
  if (!guard(share, res, req.query.pw)) return;
  if (share.perm !== "Download") return res.status(403).json({ error: "This link is view-only — downloads aren’t allowed." });
  const a = await Asset.findOne({ _id: req.params.aid, ...assetFilter(share) });
  if (!a) return res.status(404).json({ error: "Asset not available in this link." });
  const ext = (a.s3Key.match(/\.[^.]+$/) || [""])[0];
  const url = await s3.presignDownload(a.s3Key, 900, { download: true, filename: `${a.name.replace(/[^\w.-]+/g, "_")}${ext}` });
  await Share.updateOne({ _id: share._id }, { $inc: { dls: 1 } });
  res.json({ url });
});

module.exports = { getShare, downloadShareAsset };
