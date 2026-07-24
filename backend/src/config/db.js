const dns = require("dns");
const mongoose = require("mongoose");
const { mongoUri } = require("./env");

// Some networks' default DNS resolver refuses SRV lookups (querySrv ECONNREFUSED),
// which breaks mongodb+srv://. Force public resolvers (Google + Cloudflare) first.
try {
  const current = dns.getServers ? dns.getServers() : [];
  dns.setServers(["8.8.8.8", "1.1.1.1", ...current]);
} catch (_) { /* ignore */ }

let lastError = null;

mongoose.connection.on("connected", () => { lastError = null; console.log("✓ MongoDB connected"); });
mongoose.connection.on("error", (err) => { lastError = err.message; console.error("✗ MongoDB error:", err.message); });
mongoose.connection.on("disconnected", () => console.warn("…  MongoDB disconnected"));

async function connectDB() {
  if (!mongoUri) {
    lastError = "MONGO_URI not set";
    console.warn("⚠  MONGO_URI not set — starting without a database connection.");
    return false;
  }
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    return true;
  } catch (err) {
    lastError = err.message;
    throw err;
  }
}

function dbStatus() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return { state: states[mongoose.connection.readyState] || "unknown", error: lastError };
}

module.exports = connectDB;
module.exports.dbStatus = dbStatus;
