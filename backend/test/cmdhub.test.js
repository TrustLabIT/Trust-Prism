// The CMD Approval Hub endpoints (/api/cmdhub/*) and the announcements.
// Real server, in-memory MongoDB, and no real storage: links are signed
// offline with made-up keys and the one zip is served from memory.
process.env.NODE_ENV = "test";
process.env.CMD_HUB_API_KEY = "hub-test-key";
process.env.AWS_REGION = "ap-south-1";
process.env.S3_BUCKET = "prism-test";
process.env.AWS_ACCESS_KEY_ID = "AKIATESTTESTTESTTEST";
process.env.AWS_SECRET_ACCESS_KEY = "test-secret-test-secret-test-secret-1234";

const http = require("node:http");
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../src/app");
const env = require("../src/config/env");
const s3 = require("../src/services/s3");
const Asset = require("../src/models/Asset");

const ZIP = Buffer.from("UEsDBBQAAAAIAK9idV0f0SQRJAAAAF0AAAAQAAAAYnJhbmQvcmVhZG1lLnR4dAstTlUoyUhVKCjKzE0sqlTIyU/PV8jPUyjPyCxJ1eMKpUgaAFBLAwQUAAAACACvYnVdxPeRkyoAAAApAAAADgAAAGJyYW5kL2xvZ28uc3ZnsykuS1eoyM3JK7ZVyigpKbDS1y8vL9crN9bLL0rXNzIwMNAHqlDStwMAUEsDBBQAAAAIAK9idV17nHe0CgAAAAgAAAAPAAAAYnJhbmQvc291cmNlLmFpY2BMysxLLKoEAFBLAQIUAxQAAAAIAK9idV0f0SQRJAAAAF0AAAAQAAAAAAAAAAAAAACAAQAAAABicmFuZC9yZWFkbWUudHh0UEsBAhQDFAAAAAgAr2J1XcT3kZMqAAAAKQAAAA4AAAAAAAAAAAAAAIABUgAAAGJyYW5kL2xvZ28uc3ZnUEsBAhQDFAAAAAgAr2J1XXucd7QKAAAACAAAAA8AAAAAAAAAAAAAAIABqAAAAGJyYW5kL3NvdXJjZS5haVBLBQYAAAAAAwADALcAAADfAAAAAAA=", "base64");

let mongo;
let server;
let base;
const hubCalls = [];
let fakeHub;

const call = async (method, path, { body, key = "hub-test-key" } = {}) => {
  const res = await fetch(base + "/api/cmdhub" + path, {
    method,
    headers: { "content-type": "application/json", ...(key ? { "x-api-key": key } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get("content-type") || "";
  return { status: res.status, headers: res.headers, json: type.includes("json") ? await res.json() : null, text: type.includes("json") ? null : await res.text() };
};
const settle = () => new Promise((r) => setTimeout(r, 150));

const file = (over = {}) => ({ fname: "hero.png", mime: "image/png", ext: "PNG", size: 1536000, sha256: "abc123", w: 1200, h: 800, s3Key: "masters/hero.png", ...over });
const asset = (over = {}) => {
  const master = over.master || file();
  return Asset.create({
    name: "Diwali hoarding", domain: "demand", sub: "ooh", type: "Hoarding", dist: "Public",
    status: "In review", by: "Asha", org: "Internal", date: "2026-11-20",
    master, previewS3Key: "previews/hero.webp",
    versions: [{ version: 1, revision: 1, ...master, by: "Asha", note: "first cut", at: new Date("2026-11-19T10:00:00Z") }],
    ...over,
  });
};

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  // the hub, as far as TrustMark can tell
  fakeHub = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      hubCalls.push({ key: req.headers["x-api-key"], body: JSON.parse(raw) });
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"ok":true}');
    });
  });
  await new Promise((r) => fakeHub.listen(0, "127.0.0.1", r));
  // the one zip in storage, read by range exactly as S3 serves it
  s3.getRange = async (key, range) => {
    assert.equal(key, "masters/kit.zip");
    const tail = /^bytes=-(\d+)$/.exec(range);
    const span = /^bytes=(\d+)-(\d+)$/.exec(range);
    const buffer = tail ? ZIP.subarray(Math.max(0, ZIP.length - Number(tail[1]))) : ZIP.subarray(Number(span[1]), Number(span[2]) + 1);
    return { buffer, total: ZIP.length };
  };
});

after(async () => {
  server.close();
  fakeHub.close();
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  env.cmdHub.webhookUrl = "";
  env.cmdHub.webhookKey = "";
  await Asset.deleteMany({});
  hubCalls.length = 0;
});

test("the endpoints are closed without the right key", async () => {
  assert.equal((await call("GET", "/pending", { key: null })).status, 401);
  assert.equal((await call("GET", "/pending", { key: "wrong" })).status, 401);
  assert.equal((await call("POST", "/items/x/approve", { key: "wrong" })).status, 401);

  env.cmdHub.apiKey = "";
  assert.equal((await call("GET", "/pending")).status, 503);
  env.cmdHub.apiKey = "hub-test-key";
});

test("pending lists the two tabs, as the Super Admin sees them", async () => {
  const review = await asset();
  await asset({ name: "Rate card 2026", status: "Approved", domain: "demand", sub: "trade", type: "Rate Card" });   // approved: published in TrustMark
  await asset({ name: "Logo lockup", status: "Draft", domain: "foundation", sub: "logo", type: "2D Primary", org: "Agency X" });
  await asset({ name: "Old poster", status: "Live" });       // already published: not the hub's
  await asset({ name: "Retired", status: "Archived" });

  const res = await call("GET", "/pending");
  assert.equal(res.status, 200);
  // the Version Tracker is shown but is not a decision waiting
  assert.deepEqual(res.json.pending, { draft: 1, review: 1, total: 1 });
  // the Version Tracker first, then what waits for approval
  assert.deepEqual(res.json.stages.map((s) => [s.key, s.name, s.count]), [
    ["draft", "Version Tracker", 1], ["review", "Approval", 1],
  ]);

  const item = res.json.stages[1].items[0];
  assert.equal(item.id, String(review._id));
  assert.equal(item.name, "Diwali hoarding");
  assert.equal(item.path, "Demand Generation / Out-of-Home / Hoarding");
  assert.deepEqual(item.file, { name: "hero.png", ext: "PNG", size: "1.5 MB", kind: "image" });
  assert.match(item.thumb, /^https:\/\/prism-test\.s3\..*previews\/hero\.webp/);
  // an agency's upload is the Super Admin's to see too
  assert.equal(res.json.stages[0].items[0].name, "Logo lockup");
});

test("one asset in full: details, the file ready to show, every revision, the feedback", async () => {
  const a = await asset({ status: "Draft", version: 2 });
  a.versions.push({ version: 2, revision: 1, ...file({ fname: "hero-v2.pdf", mime: "application/pdf", ext: "PDF", s3Key: "masters/hero-v2.pdf" }), by: "Ravi", note: "new headline", at: new Date("2026-11-20T10:00:00Z") });
  a.master = file({ fname: "hero-v2.pdf", mime: "application/pdf", ext: "PDF", s3Key: "masters/hero-v2.pdf" });
  a.comments.push({ version: 1, byName: "Meera", text: "Make the logo bigger", at: new Date("2026-11-19T12:00:00Z") });
  await a.save();

  const { json } = await call("GET", `/items/${a._id}`);
  const item = json.item;
  assert.equal(item.stage_name, "Version Tracker");
  assert.ok(item.facts.some((f) => f.label === "Distribution" && f.value === "Public"));
  // a PDF opens in place, straight from storage
  assert.equal(item.preview.kind, "pdf");
  assert.match(item.preview.url, /masters\/hero-v2\.pdf/);
  assert.equal(item.preview.url.includes("attachment"), false);
  // newest first; the current file is asked for as "master"
  assert.deepEqual(item.documents.map((d) => [d.id, d.name, d.kind, d.note]), [
    ["master", "hero-v2.pdf", "pdf", "new headline"],
    ["v1r1", "hero.png", "image", "first cut"],
  ]);
  assert.deepEqual(item.activity, [{ at: "2026-11-19T12:00:00.000Z", who: "Meera", msg: "v1 · Make the logo bigger" }]);

  assert.equal((await call("GET", "/items/000000000000000000000000")).status, 404);
  assert.equal((await call("GET", "/items/nonsense")).status, 404);
});

test("a file opens in place when it can, and is saved under its own name when it cannot", async () => {
  const a = await asset({ master: file({ fname: "Brand book.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "DOCX", s3Key: "masters/book.docx" }) });
  a.versions.push({ version: 1, revision: 2, ...file(), by: "Asha", at: new Date() });
  await a.save();

  // a Word file has no in-place viewer: it is downloaded, as in TrustMark
  const doc = (await call("GET", `/items/${a._id}/file-url?doc=master`)).json;
  assert.equal(doc.kind, "file");
  assert.equal(doc.download, true);
  assert.match(decodeURIComponent(doc.url), /attachment; filename="Brand book\.docx"/);

  const pic = (await call("GET", `/items/${a._id}/file-url?doc=v1r2`)).json;
  assert.equal(pic.kind, "image");
  assert.equal(pic.download, false);
  assert.equal(pic.url.includes("attachment"), false);
  // ...unless it is asked for as a download
  assert.match(decodeURIComponent((await call("GET", `/items/${a._id}/file-url?doc=v1r2&download=1`)).json.url), /attachment/);

  assert.equal((await call("GET", `/items/${a._id}/file-url?doc=v9r9`)).status, 404);
});

test("a zip is looked inside without downloading it, and one file opened from it", async () => {
  const a = await asset({ master: file({ fname: "kit.zip", mime: "application/zip", ext: "ZIP", s3Key: "masters/kit.zip" }) });

  assert.equal((await call("GET", `/items/${a._id}`)).json.item.preview.kind, "zip");

  const list = (await call("GET", `/items/${a._id}/zip?doc=master`)).json;
  assert.deepEqual(list.entries.map((e) => [e.name, e.opens]), [
    ["brand/readme.txt", "text"], ["brand/logo.svg", "image"], ["brand/source.ai", null],
  ]);

  const txt = await call("GET", `/items/${a._id}/zip-file?doc=master&path=${encodeURIComponent("brand/readme.txt")}`);
  assert.equal(txt.status, 200);
  assert.match(txt.headers.get("content-type"), /text\/plain/);
  assert.match(txt.headers.get("content-disposition"), /^inline/);
  assert.match(txt.text, /^Use the primary logo on white\./);

  assert.equal((await call("GET", `/items/${a._id}/zip-file?doc=master&path=nope.txt`)).status, 404);

  // not a zip
  const png = await asset({ name: "Plain picture" });
  assert.equal((await call("GET", `/items/${png._id}/zip?doc=master`)).status, 400);
});

test("approval: approve approves it, and it leaves the hub; a second tap does not act twice", async () => {
  const a = await asset();
  const ok = await call("POST", `/items/${a._id}/approve`, { body: { stage: "review", by: "Venkata" } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.verb, "Approved");
  assert.equal(ok.json.ref, "Diwali hoarding");
  assert.deepEqual(ok.json.from, { key: "review", name: "Approval" });
  assert.deepEqual(ok.json.pending, { draft: 0, review: 0, total: 0 });
  assert.equal((await Asset.findById(a._id)).status, "Approved");

  const again = await call("POST", `/items/${a._id}/approve`, { body: { stage: "review" } });
  assert.equal(again.status, 409);
  assert.equal(again.json.code, "moved");
  assert.equal((await Asset.findById(a._id)).status, "Approved");
});

test("approval: send back returns it to the Version Tracker with the reason as feedback", async () => {
  const a = await asset();
  const back = await call("POST", `/items/${a._id}/sendback`, { body: { stage: "review", reason: "Logo is too small.", by: "Venkata" } });
  assert.equal(back.status, 200);
  assert.equal(back.json.verb, "Sent back");
  const now = await Asset.findById(a._id);
  assert.equal(now.status, "Draft");
  assert.equal(now.comments[0].text, "Logo is too small.");
  assert.equal(now.comments[0].byName, "Venkata (CMD · Approval Hub)");
});

test("an approved asset is published in TrustMark, not from the hub", async () => {
  const a = await asset({ status: "Approved" });
  const res = await call("POST", `/items/${a._id}/approve`, { body: { stage: "review" } });
  assert.equal(res.status, 409);
  assert.equal(res.json.code, "moved");
  assert.equal((await Asset.findById(a._id)).status, "Approved");
  assert.equal((await call("GET", `/items/${a._id}`)).status, 409);
});

test("version tracker: feedback stays on the draft; approve sends it for approval", async () => {
  const a = await asset({ status: "Draft" });

  const empty = await call("POST", `/items/${a._id}/reject`, { body: { stage: "draft" } });
  assert.equal(empty.status, 400);
  assert.equal(empty.json.code, "reason_required");

  const said = await call("POST", `/items/${a._id}/reject`, { body: { stage: "draft", reason: "Use the new tagline.", by: "Venkata" } });
  assert.equal(said.json.verb, "Commented");
  let now = await Asset.findById(a._id);
  assert.equal(now.status, "Draft");
  assert.equal(now.comments.length, 1);

  const sent = await call("POST", `/items/${a._id}/approve`, { body: { stage: "draft" } });
  assert.equal(sent.json.verb, "Sent for approval");
  now = await Asset.findById(a._id);
  assert.equal(now.status, "In review");

  // an action that tab does not have
  const odd = await call("POST", `/items/${a._id}/reject`, { body: { stage: "review" } });
  assert.equal(odd.status, 400);
  assert.match(odd.json.error, /approve, sendback/);
});

test("the hub is told when an asset is sent for approval, and quietly when work only moves", async () => {
  env.cmdHub.webhookUrl = `http://127.0.0.1:${fakeHub.address().port}/api/hooks/prism/changed`;
  env.cmdHub.webhookKey = "hook-key";

  // an upload lands in the Version Tracker: the hub refreshes, nobody is rung
  const a = await asset({ status: "Draft" });
  await settle();
  assert.equal(hubCalls.length, 1);
  assert.equal(hubCalls[0].key, "hook-key");
  assert.equal(hubCalls[0].body.software, "prism");
  assert.deepEqual(hubCalls[0].body.changes, [{ ref: "Diwali hoarding", party: "Hoarding", amount_text: "", from: null, to: "draft", silent: true }]);

  // sent for approval: the moment the CMD is wanted
  hubCalls.length = 0;
  a.status = "In review";
  await a.save();
  await settle();
  assert.deepEqual(hubCalls[0].body.changes, [{ ref: "Diwali hoarding", party: "Hoarding", amount_text: "", from: null, to: "review" }]);
  assert.equal(hubCalls[0].body.pending.review, 1);

  // approved by the CMD: it leaves the hub, and nobody is rung
  hubCalls.length = 0;
  await call("POST", `/items/${a._id}/approve`, { body: { stage: "review" } });
  await settle();
  assert.deepEqual([hubCalls[0].body.changes[0].from, hubCalls[0].body.changes[0].to, hubCalls[0].body.changes[0].silent], ["review", null, true]);

  // a save that changes nothing about where it stands says nothing
  hubCalls.length = 0;
  const same = await Asset.findById(a._id);
  same.campaign = "Diwali 2026";
  await same.save();
  await settle();
  assert.equal(hubCalls.length, 0);
});

test("a hub that is down never gets in the way", async () => {
  env.cmdHub.webhookUrl = "http://127.0.0.1:1/nowhere";
  env.cmdHub.webhookKey = "hook-key";
  const a = await asset();
  const ok = await call("POST", `/items/${a._id}/approve`, { body: { stage: "review" } });
  assert.equal(ok.status, 200);
  await settle();
  assert.equal((await Asset.findById(a._id)).status, "Approved");
});
