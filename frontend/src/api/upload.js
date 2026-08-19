// Direct browser → S3 upload. Large masters never pass through our backend.
import { api } from "./client";

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
