const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { clientOrigin } = require("./config/env");
const { notFound, errorHandler } = require("./middleware/error");

const healthRouter = require("./routes/health");
const authRouter = require("./routes/auth");
const assetsRouter = require("./routes/assets");
const collectionsRouter = require("./routes/collections");
const usersRouter = require("./routes/users");
const sharesRouter = require("./routes/shares");
const templatesRouter = require("./routes/templates");
const brandKitRouter = require("./routes/brandkit");

const app = express();

app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Routes
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/assets", assetsRouter);
app.use("/api/collections", collectionsRouter);
app.use("/api/users", usersRouter);
app.use("/api/shares", sharesRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/brandkit", brandKitRouter);

app.get("/", (req, res) => {
  res.json({ service: "trust-prism-backend", status: "ok" });
});

// 404 + error handling (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
