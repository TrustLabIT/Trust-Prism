const crypto = require("crypto");
const zlib = require("zlib");
const { promisify } = require("util");
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const sharp = require("sharp");
const { aws } = require("../config/env");

const gzipAsync = promisify(zlib.gzip);

const s3Configured = !!(aws.region && aws.bucket && aws.accessKeyId && aws.secretAccessKey);

const client = s3Configured
  ? new S3Client({
      region: aws.region,
      credentials: { accessKeyId: aws.accessKeyId, secretAccessKey: aws.secretAccessKey },
    })
  : null;

function assertConfigured() {
  if (!s3Configured) {
    const e = new Error("S3 is not configured. Set AWS_REGION, S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY in backend/.env");
    e.status = 503;
    throw e;
  }
}

// Build a safe, unique object key like: assets/2026/ab12cd34-hero-shot.webp
function buildKey(originalName, { folder = "assets", ext } = {}) {
  const id = crypto.randomUUID();
  const base = (originalName || "file")
    .replace(/\.[^.]+$/, "")            // drop extension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "file";
  const year = new Date().getFullYear();
  const extension = ext || (originalName.match(/\.[^.]+$/)?.[0] || "").replace(".", "") || "bin";
  return `${folder}/${year}/${id}-${base}.${extension}`;
}

// Compress + normalize an image buffer with sharp.
// Big images are resized down and re-encoded to WebP (great quality/size ratio).
async function compressImage(buffer) {
  const image = sharp(buffer, { failOn: "none" }).rotate(); // auto-orient from EXIF
  const meta = await image.metadata();
  const out = await image
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  return {
    buffer: out,
    contentType: "image/webp",
    ext: "webp",
    width: meta.width,
    height: meta.height,
    originalBytes: buffer.length,
    compressedBytes: out.length,
  };
}

// Gzip a buffer (max level). Used to compress documents before storing in S3.
async function gzipBuffer(buffer) {
  return gzipAsync(buffer, { level: 9 });
}

// opts.contentEncoding → sets S3 Content-Encoding (e.g. "gzip"); browsers/curl(--compressed)
// transparently decompress on GET, so the stored object is smaller but downloads intact.
async function putObject(key, buffer, contentType, opts = {}) {
  assertConfigured();
  const params = {
    Bucket: aws.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  };
  if (opts.contentEncoding) params.ContentEncoding = opts.contentEncoding;
  await client.send(new PutObjectCommand(params));
  return key;
}

async function deleteObject(key) {
  assertConfigured();
  await client.send(new DeleteObjectCommand({ Bucket: aws.bucket, Key: key }));
}

// Temporary link the browser can PUT a file to directly (for large/video uploads)
async function presignUpload(key, contentType, expiresIn = 900) {
  assertConfigured();
  const cmd = new PutObjectCommand({ Bucket: aws.bucket, Key: key, ContentType: contentType });
  return getSignedUrl(client, cmd, { expiresIn });
}

// Temporary link to view/download a private object.
// opts.download=true + opts.filename → forces a file download (Content-Disposition: attachment).
async function presignDownload(key, expiresIn = 900, opts = {}) {
  assertConfigured();
  const params = { Bucket: aws.bucket, Key: key };
  if (opts.download) {
    const safe = String(opts.filename || "download").replace(/["\r\n]/g, "");
    params.ResponseContentDisposition = `attachment; filename="${safe}"`;
  }
  const cmd = new GetObjectCommand(params);
  return getSignedUrl(client, cmd, { expiresIn });
}

module.exports = {
  s3Configured,
  buildKey,
  compressImage,
  gzipBuffer,
  putObject,
  deleteObject,
  presignUpload,
  presignDownload,
};
