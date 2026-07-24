const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    kind: { type: String, enum: ["Social", "Banner", "Print", "Email", "Presentation"], default: "Social" },
    ratio: { type: String, default: "" },
    // editor content so a saved template can be re-opened
    format: { type: String, default: "Instagram Post" },
    headline: { type: String, default: "" },
    subtext: { type: String, default: "" },
    cta: { type: String, default: "" },
    colorIdx: { type: Number, default: 0 },
    align: { type: String, default: "center" },
    org: { type: String, default: "Internal" },   // owner org — access control
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

templateSchema.index({ org: 1 });

templateSchema.methods.toCard = function () {
  return {
    id: this._id,
    n: this.name,
    k: this.kind,
    r: this.ratio,
    format: this.format,
    headline: this.headline,
    subtext: this.subtext,
    cta: this.cta,
    colorIdx: this.colorIdx,
    align: this.align,
  };
};

module.exports = mongoose.model("Template", templateSchema);
