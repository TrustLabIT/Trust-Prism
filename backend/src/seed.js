/**
 * Seeds the initial Trust Prism users so you can log in.
 * Run with:  npm run seed
 * Every seeded user gets the same demo password below.
 */
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User");

const DEMO_PASSWORD = "Prism@123";

const seedUsers = [
  { name: "Venkata C.", email: "vscherukuri@gmail.com", role: "Super Admin", type: "Internal", org: "Internal", scope: "all", status: "Active" },
  { name: "Priya S.", email: "priya@company.com", role: "Brand Manager", type: "Internal", org: "Internal", scope: "all", status: "Active" },
  { name: "Marcus L.", email: "marcus@company.com", role: "Reviewer", type: "Internal", org: "Internal", scope: "all", status: "Active" },
  { name: "Ana R.", email: "ana@company.com", role: "Content Editor", type: "Internal", org: "Internal", scope: "own", status: "Active" },
  { name: "Liam B.", email: "liam@brightwave.co", role: "Agency Contributor", type: "External", org: "BrightWave Creative", scope: "own", status: "Active" },
  { name: "Zoe T.", email: "zoe@brightwave.co", role: "Agency Contributor", type: "External", org: "BrightWave Creative", scope: "own", status: "Invited" },
  { name: "Ravi K.", email: "ravi@pixelforge.io", role: "Agency Contributor", type: "External", org: "PixelForge Studio", scope: "own", status: "Active" },
  { name: "Nadia H.", email: "nadia@northstar.media", role: "Agency Contributor", type: "External", org: "NorthStar Media", scope: "own", status: "Active" },
];

(async () => {
  const connected = await connectDB();
  if (!connected) {
    console.error("✗ Cannot seed: set MONGO_URI in backend/.env first.");
    process.exit(1);
  }

  for (const u of seedUsers) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`• skip (exists): ${u.email}`);
      continue;
    }
    // create() triggers the pre-save hook so the password gets hashed
    await User.create({ ...u, password: DEMO_PASSWORD });
    console.log(`✓ created: ${u.email} (${u.role})`);
  }

  console.log(`\nAll seeded users share the password:  ${DEMO_PASSWORD}`);
  console.log("Super Admin login →  vscherukuri@gmail.com / Prism@123");
  await mongoose.connection.close();
  process.exit(0);
})();
