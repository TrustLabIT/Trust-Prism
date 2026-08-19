const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { clientOrigin } = require("./config/env");
const { notFound, errorHandler } = require("./middleware/error");

const healthRouter = require("./routes/health");
const authRouter = require("./routes/auth");
const assetsRouter = require("./routes/assets");
const usersRouter = require("./routes/users");
const taxonomyRouter = require("./routes/taxonomy");
const sharesRouter = require("./routes/shares");
const publicRouter = require("./routes/public");
// TrustMark scope: Collections, Templates and Brand Kit are not mounted (dormant on disk).
// Shared Links (+ its public portal) are kept and adapted to the new asset model.

const app = express();

// Allow the configured origin(s) plus any localhost/127.0.0.1 port (dev convenience).
// A browser can't forge the Origin header, so permitting localhost is safe for a prod API.
const allowed = new Set(Array.isArray(clientOrigin) ? clientOrigin : [clientOrigin]);
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);                       // curl / same-origin / server-to-server
    if (allowed.has(origin)) return cb(null, true);           // explicitly configured
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true); // any localhost port
    return cb(new Error(`Origin not allowed by CORS: ${origin}`));
  },
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Routes
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/assets", assetsRouter);
app.use("/api/users", usersRouter);
app.use("/api/taxonomy", taxonomyRouter);
app.use("/api/shares", sharesRouter);
app.use("/api/public", publicRouter); // no auth — public share portal

app.get("/", (req, res) => {
  res.json({ service: "trustmark-backend", status: "ok" });
});

// 404 + error handling (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
