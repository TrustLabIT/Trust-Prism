const mongoose = require("mongoose");

// A brand-guideline document (PDF etc.), stored in S3 — one row per file.
const brandDocSchema = new mongoose.Schema(
  {
    org: { type: String, required: true, index: true },   // owning organization
    name: { type: String, required: true, trim: true },
    s3Key: { type: String, required: true },
    mimeType: { type: String, default: "application/pdf" },
    originalBytes: { type: Number, default: 0 },           // size before compression
    storedBytes: { type: Number, default: 0 },             // size actually stored in S3
    gzipped: { type: Boolean, default: false },            // stored with Content-Encoding: gzip
    uploadedBy: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

function fmtBytes(b) {
  b = +b || 0;
  return b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : b >= 1024 ? (b / 1024).toFixed(0) + " KB" : b + " B";
}

brandDocSchema.methods.toCard = function () {
  const saved = this.originalBytes && this.storedBytes && this.storedBytes < this.originalBytes
    ? Math.round((1 - this.storedBytes / this.originalBytes) * 100)
    : 0;
  return {
    id: this._id,
    name: this.name,
    mimeType: this.mimeType,
    size: fmtBytes(this.originalBytes || this.storedBytes),
    storedSize: fmtBytes(this.storedBytes),
    saved,                                                 // % saved by compression (0 = none)
    by: this.uploadedBy,
    date: this.createdAt ? this.createdAt.toISOString().slice(0, 10) : "",
  };
};

module.exports = mongoose.model("BrandDoc", brandDocSchema);
