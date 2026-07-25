// One-off: give any share that predates the token field a unique token.
require("dotenv").config();
const crypto = require("crypto");
const connectDB = require("../config/db");
const Share = require("../models/Share");

(async () => {
  await connectDB();
  const missing = await Share.find({ $or: [{ token: { $exists: false } }, { token: null }, { token: "" }] });
  console.log(`Shares missing a token: ${missing.length}`);
  for (const s of missing) {
    s.token = crypto.randomBytes(7).toString("hex");
    await s.save();
    console.log(`  ${s.name} -> ${s.token}`);
  }
  console.log("Done.");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
