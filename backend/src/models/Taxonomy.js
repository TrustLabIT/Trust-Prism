const mongoose = require("mongoose");

// One global taxonomy document. Editable from Settings; drives the whole app.
const taxonomySchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    // domains: [{ id, name, color, tint, note, test, subs:[{ id, name, types:[String] }] }]
    domains: { type: Array, default: [] },
    channels: { type: [String], default: [] },
    dists: { type: [String], default: [] },
    audiences: { type: [String], default: [] },
    campaigns: { type: [String], default: [] },
    services: { type: [String], default: [] },
    geos: { type: [String], default: [] },
    langs: { type: [String], default: [] },
    specs: { type: [String], default: [] },
  },
  { timestamps: true, minimize: false }
);

module.exports = mongoose.model("Taxonomy", taxonomySchema);
