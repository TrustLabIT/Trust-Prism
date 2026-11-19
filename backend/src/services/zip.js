// Browse a .zip that lives in S3 WITHOUT downloading it.
// A zip keeps its table of contents (the "central directory") at the END of the file,
// so we fetch just the tail with an HTTP Range request, parse the listing, and — when a
// single file is opened — fetch only that entry's bytes and inflate them.
// Supports stored + deflate entries and Zip64 (archives / entries over 4 GB).
const zlib = require("zlib");
const { promisify } = require("util");
const s3 = require("./s3");

const inflateRaw = promisify(zlib.inflateRaw);

const SIG_EOCD = 0x06054b50;      // end of central directory
const SIG_Z64_LOC = 0x07064b50;   // zip64 EOCD locator
const SIG_Z64_EOCD = 0x06064b50;  // zip64 EOCD record
const SIG_CEN = 0x02014b50;       // central directory entry
const SIG_LOC = 0x04034b50;       // local file header

const TAIL_BYTES = 22 + 65535 + 20;        // EOCD + max comment + zip64 locator
const MAX_DIR_BYTES = 32 * 1024 * 1024;    // refuse absurdly large listings
const MAX_ENTRIES = 5000;                  // rows returned to the UI
const MAX_PREVIEW_BYTES = 50 * 1024 * 1024; // largest single file we'll extract in memory

function fail(msg, status = 422) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

const u64 = (buf, off) => Number(buf.readBigUInt64LE(off));

// Read [start, end] from the object, reusing the already-fetched tail when it covers the range.
async function readRange(key, start, end, tail) {
  if (tail && start >= tail.start && end <= tail.start + tail.buf.length - 1) {
    return tail.buf.subarray(start - tail.start, end - tail.start + 1);
  }
  const r = await s3.getRange(key, `bytes=${start}-${end}`);
  return r.buffer;
}

// → { entries:[{ name, dir, size, csize, method, offset, encrypted }], count, truncated }
async function list(key) {
  const t = await s3.getRange(key, `bytes=-${TAIL_BYTES}`);
  const tail = { buf: t.buffer, start: t.total - t.buffer.length };
  const b = tail.buf;

  // find the EOCD record, scanning backwards (it sits before an optional comment)
  let p = -1;
  for (let i = b.length - 22; i >= 0; i--) {
    if (b.readUInt32LE(i) === SIG_EOCD) { p = i; break; }
  }
  if (p < 0) throw fail("This file isn't a readable zip archive.");

  let count = b.readUInt16LE(p + 10);
  let dirSize = b.readUInt32LE(p + 12);
  let dirOffset = b.readUInt32LE(p + 16);

  // Zip64: the real numbers live in a separate record pointed to by a locator
  if (count === 0xffff || dirSize === 0xffffffff || dirOffset === 0xffffffff) {
    const lp = p - 20;
    if (lp < 0 || b.readUInt32LE(lp) !== SIG_Z64_LOC) throw fail("This zip archive is damaged (missing Zip64 locator).");
    const recOffset = u64(b, lp + 8);
    const rec = await readRange(key, recOffset, recOffset + 55, tail);
    if (rec.readUInt32LE(0) !== SIG_Z64_EOCD) throw fail("This zip archive is damaged (bad Zip64 record).");
    count = u64(rec, 32);
    dirSize = u64(rec, 40);
    dirOffset = u64(rec, 48);
  }

  if (dirSize > MAX_DIR_BYTES) throw fail("This zip has too many files to list here — download it to inspect.", 413);
  if (!dirSize) return { entries: [], count: 0, truncated: false };

  const dir = await readRange(key, dirOffset, dirOffset + dirSize - 1, tail);
  const entries = [];
  let o = 0;
  while (o + 46 <= dir.length && dir.readUInt32LE(o) === SIG_CEN && entries.length < MAX_ENTRIES) {
    const flags = dir.readUInt16LE(o + 8);
    const method = dir.readUInt16LE(o + 10);
    let csize = dir.readUInt32LE(o + 20);
    let size = dir.readUInt32LE(o + 24);
    const nameLen = dir.readUInt16LE(o + 28);
    const extraLen = dir.readUInt16LE(o + 30);
    const commentLen = dir.readUInt16LE(o + 32);
    let offset = dir.readUInt32LE(o + 42);
    const name = dir.toString(flags & 0x800 ? "utf8" : "latin1", o + 46, o + 46 + nameLen);

    // Zip64 extra field (id 0x0001) carries whichever values overflowed 32 bits, in this order
    let x = o + 46 + nameLen;
    const xEnd = x + extraLen;
    while (x + 4 <= xEnd) {
      const id = dir.readUInt16LE(x), len = dir.readUInt16LE(x + 2);
      if (id === 0x0001) {
        let q = x + 4;
        if (size === 0xffffffff && q + 8 <= xEnd) { size = u64(dir, q); q += 8; }
        if (csize === 0xffffffff && q + 8 <= xEnd) { csize = u64(dir, q); q += 8; }
        if (offset === 0xffffffff && q + 8 <= xEnd) { offset = u64(dir, q); }
        break;
      }
      x += 4 + len;
    }

    // skip macOS resource-fork clutter — it's noise, not content
    if (!name.startsWith("__MACOSX/") && !/(^|\/)\.DS_Store$/.test(name)) {
      entries.push({ name, dir: name.endsWith("/"), size, csize, method, offset, encrypted: !!(flags & 1) });
    }
    o += 46 + nameLen + extraLen + commentLen;
  }

  return { entries, count, truncated: entries.length >= MAX_ENTRIES };
}

// Extract ONE file from the archive → Buffer (only that entry's bytes are fetched from S3).
async function readEntry(key, entry) {
  if (entry.dir) throw fail("That's a folder, not a file.", 400);
  if (entry.encrypted) throw fail("This file is password-protected inside the zip — download the zip to open it.");
  if (entry.method !== 0 && entry.method !== 8) throw fail("This file uses a compression method that can't be opened here — download the zip.");
  if (entry.size > MAX_PREVIEW_BYTES || entry.csize > MAX_PREVIEW_BYTES) {
    throw fail("This file is too large to open here — download the zip instead.", 413);
  }
  if (!entry.size) return Buffer.alloc(0);

  // the local header repeats name/extra with its OWN lengths — read them to find where data starts
  const head = (await s3.getRange(key, `bytes=${entry.offset}-${entry.offset + 29}`)).buffer;
  if (head.length < 30 || head.readUInt32LE(0) !== SIG_LOC) throw fail("This zip archive is damaged (bad file header).");
  const dataStart = entry.offset + 30 + head.readUInt16LE(26) + head.readUInt16LE(28);
  if (!entry.csize) return Buffer.alloc(0);

  const raw = (await s3.getRange(key, `bytes=${dataStart}-${dataStart + entry.csize - 1}`)).buffer;
  if (entry.method === 0) return raw;
  try {
    return await inflateRaw(raw, { maxOutputLength: MAX_PREVIEW_BYTES });
  } catch (_) {
    throw fail("Couldn't unpack this file — the zip may be damaged.");
  }
}

module.exports = { list, readEntry };
