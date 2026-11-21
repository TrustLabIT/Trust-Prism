require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,
  // one origin, or a comma-separated list → array (cors accepts either)
  clientOrigin: (process.env.CLIENT_ORIGIN || "http://localhost:3000")
    .split(",").map((o) => o.trim()).filter(Boolean),
  mongoUri: process.env.MONGO_URI || "",
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  // CMD Approval Hub — the one inbox where the CMD (the Super Admin here)
  // decides approvals from several TrustLab systems. See services/cmdhub.js.
  cmdHub: {
    apiKey: (process.env.CMD_HUB_API_KEY || "").trim(),         // the hub presents it to /api/cmdhub/*
    webhookUrl: (process.env.CMD_HUB_WEBHOOK_URL || "").trim(), // where we tell the hub something moved
    webhookKey: (process.env.CMD_HUB_WEBHOOK_KEY || "").trim(), // ...and the key we present there
    timeoutMs: (Number(process.env.CMD_HUB_TIMEOUT) || 10) * 1000,
  },
  aws: {
    // accept either naming convention
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "",
    bucket: process.env.S3_BUCKET || process.env.AWS_BUCKET || "",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
};
