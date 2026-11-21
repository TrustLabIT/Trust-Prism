// Trust Prism's side of the CMD Approval Hub.
//
// The hub is one inbox where approvals from several TrustLab systems are
// decided. Its user is the CMD, who is the Super Admin here, so from Trust
// Prism it shows what the Super Admin works through on "Approvals &
// governance" and in the Version Tracker:
//
//   review   Needs review      assets "In review": approve, or send back
//   publish  Ready to publish  assets "Approved": publish (make Live), or send
//                              back to the Version Tracker for changes
//   draft    Version Tracker   assets still "Draft": read the revisions, leave
//                              feedback, send for approval
//
// What the hub can do with them is in controllers/cmdHubController.js. This
// file holds what both directions share — which assets are waiting, and how
// one reads in the hub — and the other direction: the moment an asset is sent
// for approval (or moves on), the hub is told, so the phone rings at once
// instead of the hub having to keep asking. It is told after the save, off the
// request, and a hub that is down, slow or not set up never gets in the way
// of the person using Trust Prism: every failure is logged and dropped. The
// hub re-reads the queues whenever it is opened, so a missed message costs a
// late notification, never a wrong list.
const Asset = require("../models/Asset");
const s3 = require("./s3");
const tax = require("./taxonomy");
const { cmdHub } = require("../config/env");

// The hub's tabs, by the key it knows each by, and the status behind each
const STAGES = [
  { key: "review", name: "Needs review", status: "In review" },
  { key: "publish", name: "Ready to publish", status: "Approved" },
  { key: "draft", name: "Version Tracker", status: "Draft" },
];
const stageOfStatus = (status) => STAGES.find((s) => s.status === status) || null;

// How many items one call lists per tab. The counts are always the true totals.
const LIST_LIMIT = 200;

const todayStr = () => new Date().toISOString().slice(0, 10);
const daysTo = (d) => Math.round((new Date(d + "T00:00:00") - new Date(todayStr() + "T00:00:00")) / 86400000);

// "1.4 MB" — as the Trust Prism screens print a size
function sizeText(bytes) {
  const n = Number(bytes) || 0;
  if (n <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / Math.pow(1024, i);
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

const isZip = (f) => !!f && (
  String(f.ext || "").toLowerCase() === "zip" ||
  /\.zip$/i.test(f.fname || "") ||
  ["application/zip", "application/x-zip-compressed"].includes(f.mime)
);

// What a file is, for whoever shows it: the same split the Trust Prism drawer
// makes. Images, PDFs, video and audio open in place; a zip is looked inside;
// anything else (Word, Excel, PowerPoint, design files…) is downloaded.
function kindOf(f) {
  const mime = (f && f.mime) || "";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (isZip(f)) return "zip";
  return "file";
}
const OPENS_IN_PLACE = ["image", "pdf", "video", "audio"];

const cycleOf = (a) => (typeof a.version === "number" ? a.version : (parseInt(String(a.version).replace(/\D/g, ""), 10) || 1));

// "Brand Foundation / Logo System / 2D Primary", from the live taxonomy
async function pathNames() {
  const t = await tax.load();
  const domains = new Map();
  (t.domains || []).forEach((d) => {
    domains.set(d.id, { name: d.name, subs: new Map((d.subs || []).map((s) => [s.id, s.name])) });
  });
  return (a) => {
    const d = domains.get(a.domain);
    return [d ? d.name : a.domain, d && d.subs.get(a.sub) ? d.subs.get(a.sub) : a.sub, a.type].filter(Boolean).join(" / ");
  };
}

// The governance flags of one asset, in the words the Approvals page uses
function flagsOf(a) {
  const today = todayStr();
  const out = [];
  if (a.expiry && a.status === "Live" && a.expiry < today) {
    out.push(`Marked Live but expired ${a.expiry} — still in circulation.`);
  } else if (a.expiry && ["Live", "Approved"].includes(a.status) && a.expiry >= today && daysTo(a.expiry) <= 60) {
    out.push(`Expires in ${daysTo(a.expiry)} days (${a.expiry}) — plan the replacement.`);
  }
  if (a.domain === "demand" && a.dist === "Internal only") {
    out.push("Demand Generation asset marked Internal only — audience-facing work is rarely internal. Likely a default, not a decision.");
  }
  return out;
}

/* ---------------- what is waiting ---------------- */

// Everything in the three tabs, as the Super Admin sees it (every organisation)
async function waiting() {
  const domain = { $in: await tax.domainIds() };
  const docs = await Asset.find({ domain, status: { $in: STAGES.map((s) => s.status) } }).sort({ updatedAt: -1 });
  const byStage = Object.fromEntries(STAGES.map((s) => [s.key, []]));
  docs.forEach((a) => byStage[stageOfStatus(a.status).key].push(a));
  return byStage;
}

async function pendingCounts() {
  const domain = { $in: await tax.domainIds() };
  const out = {};
  await Promise.all(STAGES.map(async (s) => {
    out[s.key] = await Asset.countDocuments({ domain, status: s.status });
  }));
  // The reminder is about decisions waiting: the Version Tracker is work in
  // progress, shown in the hub but not counted as waiting on the CMD
  out.total = out.review + out.publish;
  return out;
}

/* ---------------- how one asset reads in the hub ---------------- */

async function card(a, pathOf) {
  const m = a.master || {};
  const stage = stageOfStatus(a.status);
  const kind = kindOf(m);
  const previewKey = a.previewS3Key || (kind === "image" ? m.s3Key : null);
  return {
    id: String(a._id),
    stage: stage ? stage.key : "",
    name: a.name,
    path: pathOf(a),
    type: a.type,
    dist: a.dist,
    status: a.status,
    version: cycleOf(a),
    revisions: (a.versions || []).length,
    comments: (a.comments || []).length,
    by: a.by || "",
    date: a.date || "",
    expiry: a.expiry || null,
    file: { name: m.fname || "", ext: String(m.ext || "").toUpperCase(), size: sizeText(m.size), kind },
    flags: flagsOf(a),
    // a small picture of it, where there is one (short-lived link, as in Trust Prism)
    thumb: previewKey ? await s3.presignDownload(previewKey, 6 * 3600).catch(() => null) : null,
  };
}

// The files of an asset, newest first: the current master, then every earlier
// revision. `id` is what the hub asks for a file by.
function filesOf(a) {
  const cycle = cycleOf(a);
  const history = (a.versions || []).slice().sort((x, y) => ((y.version || 1) - (x.version || 1)) || ((y.revision || 1) - (x.revision || 1)));
  const current = history[0];
  const row = (f, id, group) => ({
    id,
    name: f.fname || "file",
    group,
    size: sizeText(f.size),
    kind: kindOf(f),
    by: f.by || "",
    at: f.at || null,
    note: f.note || "",
  });
  if (!history.length) return a.master ? [row(a.master, "master", `Current file · version ${cycle}`)] : [];
  return history.map((v, i) => row(
    v,
    i === 0 ? "master" : `v${v.version || 1}r${v.revision || 1}`,
    `${i === 0 ? "Current file · " : ""}version ${v.version || 1}, revision ${v.revision || 1}`,
  )).map((r, i) => (i === 0 && current ? { ...r, by: current.by || a.by || "" } : r));
}

// The stored file behind a document id, or null
function fileOf(a, doc) {
  if (!doc || doc === "master") return a.master || null;
  const m = /^v(\d+)r(\d+)$/.exec(String(doc));
  if (!m) return null;
  return (a.versions || []).find((v) => (v.version || 1) === Number(m[1]) && (v.revision || 1) === Number(m[2])) || null;
}

async function detail(a, pathOf) {
  const m = a.master || {};
  const kind = kindOf(m);
  const facts = [
    ["Asset", a.name],
    ["Filed under", pathOf(a)],
    ["Status", a.status],
    ["Version", `v${cycleOf(a)} · ${(a.versions || []).length} ${(a.versions || []).length === 1 ? "file" : "files"} in its history`],
    ["Distribution", a.dist],
    ["Channel", a.channel],
    ["Audience", a.audience],
    ["Campaign", a.campaign],
    ["Service", a.service],
    ["Geography", a.geo],
    ["Language", a.lang],
    ["Specification", a.spec],
    ["Asset date", a.date],
    ["Expires", a.expiry || "Evergreen"],
    ["Uploaded by", a.by],
    ["Organisation", a.org],
    ["Current file", [m.fname, String(m.ext || "").toUpperCase(), sizeText(m.size), m.w ? `${m.w} × ${m.h} px` : ""].filter(Boolean).join(" · ")],
    ["Checksum (SHA-256)", m.sha256],
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([label, value]) => ({ label, value: String(value) }));

  // The current file, ready to show in place: the link plays, pages or
  // displays it directly from storage, exactly as the Trust Prism drawer does
  let preview = null;
  if (a.master && OPENS_IN_PLACE.includes(kind)) {
    preview = {
      kind,
      url: await s3.presignDownload(m.s3Key, 6 * 3600).catch(() => null),
      poster: a.previewS3Key ? await s3.presignDownload(a.previewS3Key, 6 * 3600).catch(() => null) : null,
    };
  } else if (a.master) {
    preview = { kind, url: null, poster: null };
  }

  return {
    ...(await card(a, pathOf)),
    stage_name: (stageOfStatus(a.status) || {}).name || a.status,
    facts,
    preview,
    documents: filesOf(a),
    // the feedback thread, newest first
    activity: (a.comments || []).slice().sort((x, y) => new Date(y.at) - new Date(x.at)).map((c) => ({
      at: c.at, who: c.byName || "Someone", msg: `v${c.version || 1} · ${c.text}`,
    })),
  };
}

/* ---------------- telling the hub ---------------- */

// Both the address to tell and the key to tell it with are needed
const announces = () => !!(cmdHub.webhookUrl && cmdHub.webhookKey);

// Called by the Asset model for every save that changes where an asset stands
// (`was` = the status before, null for a new one) and when one is deleted
// (`now` = null).
function statusChanged(asset, was, now = asset.status) {
  if (!announces()) return;
  const from = stageOfStatus(was);
  const to = stageOfStatus(now);
  if ((from && from.key) === (to && to.key)) return;
  const change = { ref: asset.name, party: asset.type || "", amount_text: "" };
  if (to && to.key === "review") {
    // Sent for approval: this is the moment the CMD is wanted, so it is told
    // as an arrival (the hub rings) wherever it came from
    change.from = null;
    change.to = "review";
  } else {
    change.from = from ? from.key : null;
    change.to = to ? to.key : null;
    // An upload landing in the Version Tracker is work in progress, not a
    // decision waiting: the hub refreshes its list but nobody is rung
    change.silent = true;
  }
  // off the request: a slow hub must not hold up the save that caused this
  setImmediate(() => send([change]).catch(() => {}));
}

async function send(changes) {
  try {
    const res = await fetch(cmdHub.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-Api-Key": cmdHub.webhookKey },
      body: JSON.stringify({ software: "prism", sent_at: new Date().toISOString(), pending: await pendingCounts(), changes }),
      signal: AbortSignal.timeout(cmdHub.timeoutMs),
    });
    if (!res.ok) console.warn(`[cmd-hub] the hub did not accept a change: ${res.status}`);
    return res.ok;
  } catch (err) {
    console.warn(`[cmd-hub] could not tell the hub about a change: ${err.message}`);
    return false;
  }
}

module.exports = {
  STAGES, LIST_LIMIT, OPENS_IN_PLACE,
  stageOfStatus, kindOf, isZip, sizeText, pathNames, flagsOf, fileOf,
  waiting, pendingCounts, card, detail,
  announces, statusChanged, send,
};
