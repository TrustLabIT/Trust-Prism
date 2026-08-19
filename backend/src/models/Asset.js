const mongoose = require("mongoose");
const { STATUSES } = require("../config/taxonomy");

// The uploaded master file — stored byte-for-byte, never re-encoded.
const masterSchema = new mongoose.Schema(
  {
    fname: String,                       // original filename (returned on download)
    mime: { type: String, default: "application/octet-stream" },
    ext: { type: String, default: "FILE" },
    size: { type: Number, default: 0 },  // bytes
    sha256: { type: String, default: "" },
    w: { type: Number, default: 0 },
    h: { type: Number, default: 0 },
    s3Key: { type: String, required: true },
  },
  { _id: false }
);

const assetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // taxonomy — the JOB the asset does (validated against config/taxonomy on write)
    domain: { type: String, required: true },   // foundation | demand | collateral | compliance
    sub: { type: String, required: true },      // sub-module id
    type: { type: String, required: true },     // asset type

    channel: { type: String, default: "Digital" },                    // validated against the live taxonomy
    status: { type: String, enum: STATUSES, default: "In review" },   // lifecycle is fixed
    dist: { type: String, default: "Internal only" },                 // distribution class (mandatory at upload)

    // filter facets
    audience: { type: String, default: "Consumer" },
    campaign: { type: String, default: "Always-on" },
    service: { type: String, default: "General" },
    geo: { type: String, default: "All centres" },
    lang: { type: String, default: "English" },
    spec: { type: String, default: "RGB" },
    version: { type: String, default: "v1" },

    date: { type: String, default: () => new Date().toISOString().slice(0, 10) }, // asset date (YYYY-MM-DD)
    expiry: { type: String, default: null },   // YYYY-MM-DD or null (evergreen)

    // storage
    master: { type: masterSchema, default: null },
    previewS3Key: { type: String, default: null }, // small browsing rendition (images only)
    thumb: { type: String, default: "" },          // procedural SVG name for non-image fallback

    by: { type: String, default: "" },             // uploader display name
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    org: { type: String, default: "Internal" },    // drives access control
  },
  { timestamps: true }
);

assetSchema.index({ org: 1, domain: 1, sub: 1 });
assetSchema.index({ status: 1 });
assetSchema.index({ name: "text" });

module.exports = mongoose.model("Asset", assetSchema);
