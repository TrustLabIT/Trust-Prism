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

// One uploaded file in an asset's history. A "version" is an approved release
// cycle (v1, v2…); a "revision" is a file change made within that cycle in the
// Version Tracker before approval. Every file is kept — nothing is overwritten.
const versionSchema = new mongoose.Schema(
  {
    version: { type: Number, default: 1 },           // release cycle this file belongs to
    revision: { type: Number, default: 1 },          // change number within that version
    fname: String,
    mime: { type: String, default: "application/octet-stream" },
    ext: { type: String, default: "FILE" },
    size: { type: Number, default: 0 },
    sha256: { type: String, default: "" },
    w: { type: Number, default: 0 },
    h: { type: Number, default: 0 },
    s3Key: { type: String, required: true },
    previewS3Key: { type: String, default: null },
    by: { type: String, default: "" },               // who uploaded this version
    note: { type: String, default: "" },             // optional note for the revision
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

// A feedback comment on an asset while it's being revised in the Versions tracker.
const commentSchema = new mongoose.Schema(
  {
    version: { type: Number, default: 1 },   // which version cycle this comment belongs to
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    byName: { type: String, default: "" },
    text: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: true }
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
    version: { type: Number, default: 1 },   // current release cycle (v1, v2, v3…)

    date: { type: String, default: () => new Date().toISOString().slice(0, 10) }, // asset date (YYYY-MM-DD)
    expiry: { type: String, default: null },   // YYYY-MM-DD or null (evergreen)
    publishedAt: { type: Date, default: null }, // when it went Live (drives the Published page)

    // storage
    master: { type: masterSchema, default: null }, // the CURRENT (latest) version's file
    previewS3Key: { type: String, default: null }, // small browsing rendition (images only)
    thumb: { type: String, default: "" },          // procedural SVG name for non-image fallback

    versions: { type: [versionSchema], default: [] },  // full file history (v1 → latest)
    comments: { type: [commentSchema], default: [] },  // feedback thread during revision

    by: { type: String, default: "" },             // uploader display name
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    org: { type: String, default: "Internal" },    // drives access control
  },
  { timestamps: true }
);

// Every save that changes where an asset stands in its lifecycle passes
// through here, whichever screen or script made it, so the CMD Approval Hub
// hears of an asset the moment it is sent for approval and again when it
// moves on. See services/cmdhub.js (required late: it requires this model).
assetSchema.pre("save", async function () {
  this.$locals.hubTell = false;
  if (this.isNew) {
    this.$locals.hubTell = true;
    this.$locals.hubWas = null;
  } else if (this.isModified("status")) {
    const before = await this.constructor.findById(this._id).select("status").lean();
    this.$locals.hubTell = true;
    this.$locals.hubWas = before ? before.status : null;
  }
});
assetSchema.post("save", function (doc) {
  if (doc.$locals.hubTell) require("../services/cmdhub").statusChanged(doc, doc.$locals.hubWas);
});
assetSchema.post("deleteOne", { document: true, query: false }, function (doc) {
  require("../services/cmdhub").statusChanged(doc, doc.status, null);
});

assetSchema.index({ org: 1, domain: 1, sub: 1 });
assetSchema.index({ status: 1 });
assetSchema.index({ name: "text" });

module.exports = mongoose.model("Asset", assetSchema);
