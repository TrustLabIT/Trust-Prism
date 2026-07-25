// Create (or update) the Super Admin account.
// Usage on the server:  node src/scripts/createSuperAdmin.js
// Values can be overridden with env vars: SA_NAME, SA_EMAIL, SA_PASSWORD
require("dotenv").config();
const connectDB = require("../config/db");
const User = require("../models/User");

const NAME = process.env.SA_NAME || "venkata Suman";
const EMAIL = (process.env.SA_EMAIL || "venkata@mytrustlab.com").toLowerCase();
const PASSWORD = process.env.SA_PASSWORD || "UBMWjYp74zaW";

(async () => {
  await connectDB();

  let user = await User.findOne({ email: EMAIL }).select("+password");
  if (user) {
    user.name = NAME;
    user.role = "Super Admin";
    user.type = "Internal";
    user.org = "Internal";
    user.scope = "all";
    user.status = "Active";
    user.password = PASSWORD; // re-hashed by the pre-save hook
    await user.save();
    console.log(`↻ Updated existing Super Admin: ${NAME} <${EMAIL}>`);
  } else {
    user = await User.create({
      name: NAME, email: EMAIL, password: PASSWORD,
      role: "Super Admin", type: "Internal", org: "Internal", scope: "all", status: "Active",
    });
    console.log(`✓ Created Super Admin: ${NAME} <${EMAIL}>`);
  }
  console.log("  Login with the email + password above.");
  process.exit(0);
})().catch((e) => { console.error("✗ Failed:", e.message); process.exit(1); });
