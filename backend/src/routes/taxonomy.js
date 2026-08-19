const express = require("express");
const { protect, requireSuperAdmin } = require("../middleware/auth");
const svc = require("../services/taxonomy");
const { asyncHandler } = require("../middleware/error");

const router = express.Router();

// GET /api/taxonomy — the live taxonomy the UI renders from (seeded on first read)
router.get("/", protect, asyncHandler(async (req, res) => {
  const t = await svc.load();
  res.json(svc.shape(t));
}));

// PUT /api/taxonomy — replace the editable taxonomy (Settings access = Super Admin)
const VOCAB = ["channels", "dists", "audiences", "campaigns", "services", "geos", "langs", "specs"];
const cleanList = (v) => Array.isArray(v) ? [...new Set(v.map((x) => String(x).trim()).filter(Boolean))] : undefined;

router.put("/", protect, requireSuperAdmin, asyncHandler(async (req, res) => {
  const b = req.body || {};
  const t = await svc.load(true);

  if (Array.isArray(b.domains)) {
    // normalise domains → subs → types; require ids + names
    t.domains = b.domains.map((d) => ({
      id: String(d.id || "").trim(), name: String(d.name || "").trim(),
      color: d.color || "#16624C", tint: d.tint || "#E4F2ED",
      note: d.note || "", test: d.test || "",
      subs: Array.isArray(d.subs) ? d.subs.map((s) => ({
        id: String(s.id || "").trim(), name: String(s.name || "").trim(),
        types: cleanList(s.types) || [],
      })).filter((s) => s.id && s.name) : [],
    })).filter((d) => d.id && d.name);
  }
  VOCAB.forEach((k) => { const c = cleanList(b[k]); if (c) t[k] = c; });

  t.markModified("domains");
  await t.save();
  svc.invalidate();
  res.json(svc.shape(await svc.load(true)));
}));

module.exports = router;
