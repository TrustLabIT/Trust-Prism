const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["Campaign", "Region", "Team", "Portal"], default: "Campaign" },
    visibility: { type: String, enum: ["Organization", "Team", "Private"], default: "Organization" },
    year: { type: String, default: () => String(new Date().getFullYear()) },
    grad: { type: String, default: "" },       // cover gradient
    count: { type: Number, default: 0 },        // asset count (maintained later)
    org: { type: String, default: "Internal" }, // owner org — drives access control
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

collectionSchema.index({ org: 1, year: 1 });

collectionSchema.methods.toCard = function () {
  return {
    id: this._id,
    n: this.name,
    c: this.count,
    y: this.year,
    org: this.org,
    grad: this.grad,
    type: this.type,
    visibility: this.visibility,
  };
};

module.exports = mongoose.model("Collection", collectionSchema);
