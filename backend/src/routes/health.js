const express = require("express");
const { dbStatus } = require("../config/db");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "trust-prism-backend",
    db: dbStatus(),
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
