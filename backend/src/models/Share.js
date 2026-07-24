const mongoose = require("mongoose");

const shareSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    to: { type: String, default: "specific people" },      // audience
    include: { type: String, default: "A collection" },     // what's shared
    perm: { type: String, enum: ["View only", "Download"], default: "View only" },
    exp: { type: String, default: "No expiry" },
    pw: { type: Boolean, default: false },                  // password protected
    wm: { type: Boolean, default: true },                   // watermark
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
    perm: this.perm,
    exp: this.exp,
    pw: this.pw,
    wm: this.wm,
    views: this.views,
    dls: this.dls,
  };
};

module.exports = mongoose.model("Share", shareSchema);
