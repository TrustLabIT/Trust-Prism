// One-time migration: normalise legacy asset version data to the new
// number-based version/revision model. Safe — updates only, no deletes.
//   Usage:  node src/scripts/migrateVersions.js
require("dotenv").config();
const m = require("mongoose");

const toNum = (v, fallback = 1) => (typeof v === "number" ? v : (parseInt(String(v ?? "").replace(/\D/g, ""), 10) || fallback));

(async () => {
  await m.connect(process.env.MONGO_URI);
  const col = m.connection.collection("assets");
  const all = await col.find({}).toArray();
  let changed = 0;

  for (const a of all) {
    const patch = {};

    // 1) top-level version string ("v1") → number (1)
    if (typeof a.version !== "number") patch.version = toNum(a.version, 1);

    // 2) version-history entries: old { n, label } → { version, revision }
    if (Array.isArray(a.versions) && a.versions.some((v) => v && (v.n !== undefined || v.label !== undefined || typeof v.version !== "number"))) {
      patch.versions = a.versions.map((v, i) => ({
        version: typeof v.version === "number" ? v.version : 1,
        revision: typeof v.revision === "number" ? v.revision : (typeof v.n === "number" ? v.n : i + 1),
        fname: v.fname, mime: v.mime, ext: v.ext, size: v.size, sha256: v.sha256,
        w: v.w, h: v.h, s3Key: v.s3Key, previewS3Key: v.previewS3Key || null,
        by: v.by || "", note: v.note || "", at: v.at || new Date(),
      }));
    }

    // 3) comments without a version → tag with version 1
    if (Array.isArray(a.comments) && a.comments.some((c) => typeof c.version !== "number")) {
      patch.comments = a.comments.map((c) => ({ ...c, version: typeof c.version === "number" ? c.version : 1 }));
    }

    if (Object.keys(patch).length) { await col.updateOne({ _id: a._id }, { $set: patch }); changed++; }
  }

  console.log(`✓ migrated ${changed} of ${all.length} assets`);
  process.exit(0);
})().catch((e) => { console.error("✗ Failed:", e.message); process.exit(1); });
