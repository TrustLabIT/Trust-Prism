const mongoose = require("mongoose");
const crypto = require("crypto");

const shareSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    to: { type: String, default: "specific people" },      // audience
    include: { type: String, default: "A collection" },     // what's shared
    collectionRef: { type: mongoose.Schema.Types.ObjectId, ref: "Collection", default: null }, // which album (null = whole portal)
    assets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Asset" }], // when sharing hand-picked assets
    token: { type: String, unique: true, index: true, default: () => crypto.randomBytes(7).toString("hex") }, // public link id
    perm: { type: String, enum: ["View only", "Download"], default: "View only" },
    exp: { type: String, default: "No expiry" },            // human label
    expiresAt: { type: Date, default: null },               // real expiry (null = never)
    password: { type: String, default: "" },                // optional link password
    wm: { type: Boolean, default: true },                   // watermark (display flag)
    views: { type: Number, default: 0 },
    dls: { type: Number, default: 0 },
    org: { type: String, default: "Internal" },             // owner org — access control
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

shareSchema.index({ org: 1 });

shareSchema.methods.toCard = function () {
  return {
    id: this._id,
    n: this.name,
    to: this.to,
    include: this.include,
    collection: this.collectionRef ? String(this.collectionRef) : null,
    assets: (this.assets || []).map(String),
    token: this.token,
    perm: this.perm,
    exp: this.exp,
    pw: !!this.password,   // whether it's password-protected (never expose the password)
    wm: this.wm,
    views: this.views,
    dls: this.dls,
  };
};

module.exports = mongoose.model("Share", shareSchema);
