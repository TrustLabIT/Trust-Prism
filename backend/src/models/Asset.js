const mongoose = require("mongoose");

const outcomeSchema = new mongoose.Schema(
  {
    channel: String,
    date: String,
    impressions: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    engagements: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    spend: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    auto: { type: Boolean, default: false },
  },
  { _id: false }
);

const assetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["image", "video", "banner", "pamphlet", "design", "document"], default: "image" },
    cat: { type: String, enum: ["Videos", "Electronic", "Print"], default: "Electronic" },
    sub: { type: String, default: "Images" },
    status: { type: String, enum: ["approved", "review", "draft"], default: "review" },
    tags: { type: [String], default: [] },

    // storage
    s3Key: { type: String, required: true },
    mimeType: { type: String, default: "" },
    bytes: { type: Number, default: 0 },
    size: { type: String, default: "" },  // human-readable, e.g. "4.2 MB"
    dim: { type: String, default: "" },   // e.g. "4000×2667"

    // ownership / filing
    by: { type: String, default: "" },                 // uploader display name
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    org: { type: String, default: "Internal" },        // drives access control
    date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    year: { type: String, default: () => String(new Date().getFullYear()) },

    dl: { type: Number, default: 0 },
    outcomes: { type: [outcomeSchema], default: [] },
  },
  { timestamps: true }
);

assetSchema.index({ org: 1, year: 1 });
assetSchema.index({ name: "text", tags: "text" });

// Serialize to the exact shape the frontend already expects (n, t, st …)
assetSchema.methods.toCard = function () {
  return {
    id: this._id,
    n: this.name,
    t: this.type,
    st: this.status,
    cat: this.cat,
    sub: this.sub,
    tags: this.tags,
    size: this.size,
    dim: this.dim,
    by: this.by,
    org: this.org,
    date: this.date,
    year: this.year,
    dl: this.dl,
    outcomes: this.outcomes,
  };
};

module.exports = mongoose.model("Asset", assetSchema);
