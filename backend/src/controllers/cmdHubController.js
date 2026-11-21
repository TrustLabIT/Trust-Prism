// The CMD Approval Hub's window onto TrustMark.
//
// The hub's server calls these with the shared key in X-Api-Key (see
// middleware/cmdHub.js); there is no session and no TrustMark login behind
// them. The hub's user is the CMD, who is the Super Admin here, so they show
// what the Super Admin sees in the Version Tracker and waiting for approval,
// and decide what the Super Admin decides.
//
//   GET  /api/cmdhub/pending                      the two tabs, each with its assets
//   GET  /api/cmdhub/items/:id                    one asset in full: its details, the file
//                                                 ready to show, every revision, the feedback
//   GET  /api/cmdhub/items/:id/file-url?doc=      a short-lived link to one file
//          &download=1                            ...that saves it instead of showing it
//   GET  /api/cmdhub/items/:id/zip?doc=           what is inside a zip, without downloading it
//   GET  /api/cmdhub/items/:id/zip-file?doc=&path=   one file out of that zip
//   POST /api/cmdhub/items/:id/:action            { stage, reason?, by }
//
// `doc` names a file of the asset: "master" (the current one) or "v2r3"
// (version 2, revision 3). What an action does depends on the tab the asset
// is in — `stage` says which one the hub believes that is, and an asset that
// has moved on since is refused (409, code "moved") so a second tap on a
// stale list never acts twice:
//
//   draft    approve    -> In review (sent for approval)
//            reject     -> stays a Draft; the reason is left as feedback
//   review   approve    -> Approved            sendback -> Draft (Version Tracker)
//
// An approved asset is published (made Live) in TrustMark itself: it is no
// longer in either tab, and the hub is told there is nothing left to decide.
//
// Nothing about deciding is re-implemented: each of these runs the very
// handler the TrustMark screens call (assetController.updateStatus /
// addComment), as a Super Admin. The only difference is the name feedback is
// recorded under: "<the hub user's name> (CMD · Approval Hub)".
//
// Every answer is { ok: true, ... } or { ok: false, error: "<message a person
// can read>", code? }.
const mongoose = require("mongoose");
const Asset = require("../models/Asset");
const assets = require("./assetController");
const hub = require("../services/cmdhub");
const s3 = require("../services/s3");
const zip = require("../services/zip");
const { asyncHandler } = require("../middleware/error");

const fail = (res, status, error, code) => res.status(status).json({ ok: false, error, ...(code ? { code } : {}) });

// The asset the hub asked for, while it is still in one of the hub's tabs.
// Answers the refusal itself (and returns null) when it is not.
async function find(req, res) {
  const id = req.params.id;
  const a = mongoose.isValidObjectId(id) ? await Asset.findById(id) : null;
  if (!a) { fail(res, 404, "That asset no longer exists."); return null; }
  if (!hub.stageOfStatus(a.status)) {
    fail(res, 409, `${a.name} is now ${a.status} — there is nothing left to decide.`, "moved");
    return null;
  }
  return a;
}

// GET /api/cmdhub/pending
const pending = asyncHandler(async (req, res) => {
  // The taxonomy first, on its own: it seeds itself the first time it is read,
  // and three readers at once would each try to
  const pathOf = await hub.pathNames();
  const [byStage, counts] = await Promise.all([hub.waiting(), hub.pendingCounts()]);
  const stages = await Promise.all(hub.STAGES.map(async (s) => ({
    key: s.key,
    name: s.name,
    count: counts[s.key],
    items: await Promise.all(byStage[s.key].slice(0, hub.LIST_LIMIT).map((a) => hub.card(a, pathOf))),
  })));
  res.json({ ok: true, pending: counts, stages });
});

// GET /api/cmdhub/items/:id
const show = asyncHandler(async (req, res) => {
  const a = await find(req, res);
  if (!a) return;
  res.json({ ok: true, item: await hub.detail(a, await hub.pathNames()) });
});

// GET /api/cmdhub/items/:id/file-url?doc=&download=1
// A link straight to storage, good for 15 minutes. Files that open in place
// (a picture, a PDF, a film, a recording) are served to be shown; `download`
// or any other kind of file is served to be saved under its own name.
const fileUrl = asyncHandler(async (req, res) => {
  const a = await find(req, res);
  if (!a) return;
  const f = hub.fileOf(a, req.query.doc);
  if (!f) return fail(res, 404, "That file is not part of this asset.");
  const kind = hub.kindOf(f);
  const save = req.query.download === "1" || !hub.OPENS_IN_PLACE.includes(kind);
  const url = await s3.presignDownload(f.s3Key, 900, save ? { download: true, filename: f.fname } : {});
  res.json({ ok: true, url, kind, name: f.fname, download: save });
});

// The zip the hub named, or null after answering why not
async function zipTarget(req, res) {
  const a = await find(req, res);
  if (!a) return null;
  const f = hub.fileOf(a, req.query.doc);
  if (!f) { fail(res, 404, "That file is not part of this asset."); return null; }
  if (!hub.isZip(f)) { fail(res, 400, "This file isn't a zip archive."); return null; }
  return f;
}

const ZIP_IMG = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", bmp: "image/bmp", avif: "image/avif", svg: "image/svg+xml" };
const ZIP_TEXT = ["txt", "md", "csv", "tsv", "json", "xml", "html", "htm", "css", "js", "ts", "log", "yml", "yaml", "ini", "rtf"];
const extOf = (name) => { const base = String(name).split("/").pop(); return base.includes(".") ? base.split(".").pop().toLowerCase() : ""; };
// What the apps can open from inside a zip, as the TrustMark zip browser does
const openable = (name) => { const e = extOf(name); return ZIP_IMG[e] ? "image" : e === "pdf" ? "pdf" : ZIP_TEXT.includes(e) ? "text" : null; };

// GET /api/cmdhub/items/:id/zip?doc=  — the archive's file listing
const zipList = asyncHandler(async (req, res) => {
  const f = await zipTarget(req, res);
  if (!f) return;
  try {
    const r = await zip.list(f.s3Key);
    res.json({
      ok: true,
      entries: r.entries.filter((e) => !e.dir).map((e) => ({
        name: e.name, size: e.size, size_text: hub.sizeText(e.size), encrypted: !!e.encrypted,
        opens: e.encrypted ? null : openable(e.name),
      })),
      count: r.count, truncated: r.truncated,
    });
  } catch (err) {
    if (err && err.status) return fail(res, err.status, err.message);
    throw err;
  }
});

// GET /api/cmdhub/items/:id/zip-file?doc=&path=  — one file out of the archive
const zipFile = asyncHandler(async (req, res) => {
  const f = await zipTarget(req, res);
  if (!f) return;
  let buf, entry;
  try {
    const { entries } = await zip.list(f.s3Key);
    entry = entries.find((e) => !e.dir && e.name === req.query.path);
    if (!entry) return fail(res, 404, "That file isn't in this zip.");
    buf = await zip.readEntry(f.s3Key, entry);
  } catch (err) {
    if (err && err.status) return fail(res, err.status, err.message);
    throw err;
  }
  const base = entry.name.split("/").pop() || "file";
  const ext = extOf(entry.name);
  // text-ish files (incl. HTML/JS) are always served as plain text so nothing in a zip can execute
  const type = ZIP_IMG[ext] || (ext === "pdf" ? "application/pdf" : ZIP_TEXT.includes(ext) ? "text/plain; charset=utf-8" : "application/octet-stream");
  res.set({
    "Content-Type": type,
    // shown in place where it can be; anything else is saved
    "Content-Disposition": `${openable(entry.name) ? "inline" : "attachment"}; filename="${base.replace(/[^\w.\- ]+/g, "_")}"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  res.send(buf);
});

/* ---------------- deciding ---------------- */

// Runs one of the TrustMark handlers as a Super Admin and hands back what it
// answered: { status, body }. The hub's user has no login here, so a stand-in
// carrying their name is put in for this one call — never saved, no id.
async function runAs(handler, by, id, body) {
  const name = String(by || "").trim().slice(0, 100) || "CMD";
  const out = { status: 200, body: null };
  const res = {
    status(code) { out.status = code; return this; },
    json(payload) { out.body = payload; return this; },
  };
  const req = {
    params: { id }, query: {}, body,
    user: { id: null, name: `${name} (CMD · Approval Hub)`, role: "Super Admin", type: "Internal", org: "Internal", scope: "all" },
  };
  await new Promise((resolve, reject) => {
    Promise.resolve(handler(req, res, (err) => (err ? reject(err) : resolve()))).then(resolve, reject);
  });
  return out;
}

// What each action is in each tab: the lifecycle step it runs, how the hub's
// history words it, and where the asset is afterwards
const STEPS = {
  draft: {
    approve: { action: "submit", verb: "Sent for approval", to: "Approval" },
    reject: { comment: true, verb: "Commented", to: "Version Tracker" },
  },
  review: {
    approve: { action: "approve", verb: "Approved", to: "Approved" },
    sendback: { action: "reject", verb: "Sent back", to: "Version Tracker" },
  },
};

// POST /api/cmdhub/items/:id/:action   { stage, reason?, by }
const act = asyncHandler(async (req, res) => {
  const a = await find(req, res);
  if (!a) return;
  const body = req.body || {};
  const stage = hub.stageOfStatus(a.status);
  // The hub's list is stale: the asset has moved to another tab since
  if (body.stage && String(body.stage) !== stage.key) {
    return fail(res, 409, `${a.name} has moved to ${stage.name}. Refresh the list.`, "moved");
  }
  const step = (STEPS[stage.key] || {})[req.params.action];
  if (!step) {
    return fail(res, 400, `In ${stage.name}, use one of: ${Object.keys(STEPS[stage.key]).join(", ")}.`);
  }
  const reason = String(body.reason || "").trim().slice(0, 500);
  if (step.comment && !reason) return fail(res, 400, "Write the feedback first.", "reason_required");

  const id = String(a._id);
  // Why it was sent back is left on the asset as feedback, where whoever has
  // to change it will read it
  if (reason && (step.comment || req.params.action === "sendback")) {
    const said = await runAs(assets.addComment, body.by, id, { text: reason });
    if (said.status >= 400) return fail(res, said.status, (said.body && said.body.error) || "TrustMark could not save that.");
  }
  if (step.action) {
    const said = await runAs(assets.updateStatus, body.by, id, { action: step.action });
    if (said.status >= 400) return fail(res, said.status, (said.body && said.body.error) || "TrustMark could not complete that.");
  }

  res.json({
    ok: true,
    ref: a.name,
    party: a.type || "",
    amount_text: "",
    verb: step.verb,
    from: { key: stage.key, name: stage.name },
    to: { key: "", name: step.to },
    message: `${step.verb}: ${a.name}.`,
    pending: await hub.pendingCounts(),
  });
});

module.exports = { pending, show, fileUrl, zipList, zipFile, act };
