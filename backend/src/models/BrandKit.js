const mongoose = require("mongoose");

const colorSchema = new mongoose.Schema(
  { name: { type: String, default: "" }, hex: { type: String, default: "#000000" } },
  { _id: false }
);
const logoSchema = new mongoose.Schema(
  { s3Key: String, label: { type: String, default: "" }, dark: { type: Boolean, default: false } },
  { _id: false }
);

const brandKitSchema = new mongoose.Schema(
  {
    org: { type: String, required: true, unique: true },  // one kit per organization
    colors: { type: [colorSchema], default: [] },
    fonts: {
      heading: { type: String, default: "" },
      body: { type: String, default: "" },
    },
    logos: { type: [logoSchema], default: [] },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BrandKit", brandKitSchema);
