// Direct browser → S3 upload. Large masters never pass through our backend.
import { api } from "./client";
import * as XLSX from "xlsx";

// SHA-256 of the file (skipped above a memory-safe cap; integrity is best-effort for huge files)
export async function sha256OfFile(file, cap = 512 * 1024 * 1024) {
  try {
    if (file.size > cap || !crypto?.subtle) return "";
    const buf = await file.arrayBuffer();
    const d = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (_) { return ""; }
}

export function imageDims(file) {
  return new Promise((res) => {
    if (!file.type.startsWith("image/")) return res({ w: 0, h: 0 });
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { res({ w: im.naturalWidth, h: im.naturalHeight }); URL.revokeObjectURL(url); };
    im.onerror = () => { res({ w: 0, h: 0 }); URL.revokeObjectURL(url); };
    im.src = url;
  });
}

// Downscaled WebP preview (client-side) so even multi-GB image masters get a browsing rendition.
export async function makeImagePreview(file, max = 1200) {
  if (!file.type.startsWith("image/")) return null;
  try {
    const url = URL.createObjectURL(file);
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.max(1, Math.round(im.naturalWidth * scale));
    const h = Math.max(1, Math.round(im.naturalHeight * scale));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d").drawImage(im, 0, 0, w, h);
    URL.revokeObjectURL(url);
    return await new Promise((res) => c.toBlob(res, "image/webp", 0.72));
  } catch (_) { return null; }
}

// A poster frame grabbed from a video (client-side, best-effort — some codecs won't decode in-browser).
function makeVideoPreview(file, max = 1200) {
  return new Promise((resolve) => {
    let done = false, url;
    const finish = (blob) => { if (!done) { done = true; try { URL.revokeObjectURL(url); } catch (_) {} resolve(blob); } };
    const grab = (v) => {
      try {
        const vw = v.videoWidth || 1, vh = v.videoHeight || 1;
        const scale = Math.min(1, max / Math.max(vw, vh));
        const w = Math.max(1, Math.round(vw * scale)), h = Math.max(1, Math.round(vh * scale));
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(v, 0, 0, w, h);
        c.toBlob((b) => finish(b), "image/webp", 0.72);
      } catch (_) { finish(null); }
    };
    try {
      url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.muted = true; v.playsInline = true; v.preload = "auto";
      v.onloadeddata = () => {
        const dur = isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
        const target = dur ? Math.min(dur * 0.1, 1) : 0;   // ~10% in (max 1s), avoids a black first frame
        if (target > 0) { try { v.currentTime = target; } catch (_) { grab(v); } }
        else grab(v);                                       // duration unknown → just grab the current frame
      };
      v.onseeked = () => grab(v);
      v.onerror = () => finish(null);
      setTimeout(() => { if (!done) { if (v.readyState >= 2) grab(v); else finish(null); } }, 12000);
      v.src = url;
    } catch (_) { finish(null); }
  });
}

// A snapshot of a spreadsheet's first sheet rendered as a small table image (xlsx / xls / csv).
async function makeSheetPreview(file) {
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return null;
    const maxRows = 16, maxCols = 7;
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" })
      .slice(0, maxRows).map((r) => r.slice(0, maxCols));
    if (!grid.length) return null;
    const cols = Math.max(1, ...grid.map((r) => r.length));
    const cellW = 118, cellH = 26, padX = 8;
    const w = cols * cellW, h = grid.length * cellH;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
    ctx.textBaseline = "middle";
    grid.forEach((row, ri) => {
      const y = ri * cellH;
      if (ri === 0) { ctx.fillStyle = "#16624C"; ctx.fillRect(0, y, w, cellH); }
      else if (ri % 2 === 0) { ctx.fillStyle = "#F4F7F6"; ctx.fillRect(0, y, w, cellH); }
      for (let ci = 0; ci < cols; ci++) {
        const x = ci * cellW;
        ctx.strokeStyle = "#E2EAE7"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, cellW, cellH);
        const raw = row[ci] != null ? String(row[ci]) : "";
        const text = raw.length > 16 ? raw.slice(0, 15) + "…" : raw;
        ctx.fillStyle = ri === 0 ? "#ffffff" : "#10231D";
        ctx.font = (ri === 0 ? "600 " : "") + "13px system-ui, Segoe UI, Arial";
        ctx.fillText(text, x + padX, y + cellH / 2);
      }
    });
    return await new Promise((res) => c.toBlob(res, "image/webp", 0.85));
  } catch (_) { return null; }
}

// One entry point: build the best preview we can for whatever type the file is.
// Images → downscale, videos → poster frame, spreadsheets → table snapshot, else null.
export async function makePreview(file, max = 1200) {
  const t = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  if (t.startsWith("image/")) return makeImagePreview(file, max);
  if (t.startsWith("video/")) return makeVideoPreview(file, max);
  if (t.includes("spreadsheet") || t.includes("excel") || t === "text/csv" || /\.(xlsx|xlsm|xls|csv)$/.test(name)) return makeSheetPreview(file);
  return null;
}

function putXHR(url, body, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.getResponseHeader("ETag")) : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(body);
  });
}

// Upload the master; returns its S3 key. onProgress(percent 0–100).
export async function uploadMaster(file, onProgress) {
  const contentType = file.type || "application/octet-stream";
  const plan = await api.post("/assets/presign", { filename: file.name, contentType, size: file.size });

  if (plan.mode === "single") {
    await putXHR(plan.url, file, contentType, (loaded, total) => onProgress && onProgress(Math.round((loaded / total) * 100)));
    return plan.key;
  }

  // multipart — upload each part directly to S3
  const partSize = plan.partSize;
  const total = file.size;
  const nParts = Math.ceil(total / partSize);
  const parts = [];
  let base = 0;
  try {
    for (let i = 0; i < nParts; i++) {
      const start = i * partSize;
      const blob = file.slice(start, Math.min(start + partSize, total));
      const { url } = await api.post("/assets/presign-part", { key: plan.key, uploadId: plan.uploadId, partNumber: i + 1 });
      const partBase = base; // capture per-iteration (const → safe inside the progress closure)
      const etag = await putXHR(url, blob, null, (loaded) => {
        if (onProgress) onProgress(Math.min(100, Math.round(((partBase + loaded) / total) * 100)));
      });
      base += blob.size;
      parts.push({ ETag: etag, PartNumber: i + 1 });
    }
    await api.post("/assets/complete", { key: plan.key, uploadId: plan.uploadId, parts });
    return plan.key;
  } catch (e) {
    api.post("/assets/abort", { key: plan.key, uploadId: plan.uploadId }).catch(() => {});
    throw e;
  }
}

export async function uploadPreview(blob, filename) {
  if (!blob) return null;
  const { key, url } = await api.post("/assets/presign-preview", { filename: filename || "preview.webp" });
  await putXHR(url, blob, "image/webp");
  return key;
}

// Upload a file end-to-end (master + optional image preview) and return the
// payload shape the /confirm and /:id/version endpoints expect.
export async function uploadFullFile(file, onProgress) {
  const key = await uploadMaster(file, onProgress);
  const [{ w, h }, sha256, previewBlob] = await Promise.all([
    imageDims(file), sha256OfFile(file), makePreview(file),
  ]);
  const previewKey = previewBlob ? await uploadPreview(previewBlob, file.name) : null;
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "FILE";
  return {
    master: { key, fname: file.name, mime: file.type || "application/octet-stream", ext, size: file.size, sha256, w, h },
    previewKey,
  };
}
