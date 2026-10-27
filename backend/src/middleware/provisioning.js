// PACE identity-hub provisioning guard. Checks the X-Provisioning-Token shared
// secret (server-to-server from PACE; no JWT, no session).
//   503 when no token is configured on this server (feature off).
//   401 when the presented token is missing or wrong.
// The active token lives in a file at the backend root (provisioning_token) so it
// can be rotated from PACE without an env change or a restart; PROVISIONING_TOKEN
// in .env is the fallback. Compared in constant time.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TOKEN_FILE = path.resolve(__dirname, "..", "..", "provisioning_token"); // backend/provisioning_token

function currentToken() {
  try {
    const fromFile = fs.readFileSync(TOKEN_FILE, "utf8").trim();
    if (fromFile) return fromFile;
  } catch (_e) {
    /* no file yet: fall back to env */
  }
  return (process.env.PROVISIONING_TOKEN || "").trim();
}

function writeToken(token) {
  fs.writeFileSync(TOKEN_FILE, `${String(token).trim()}\n`, { mode: 0o600 });
}

function tokenMatches(presented) {
  const want = currentToken();
  const got = String(presented || "");
  if (!want || !got) return false;
  const a = Buffer.from(want);
  const b = Buffer.from(got);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function provisioningGuard(req, res, next) {
  if (!currentToken()) {
    return res.status(503).json({ error: "Provisioning is not configured on this server." });
  }
  const presented = req.headers["x-provisioning-token"];
  if (!tokenMatches(Array.isArray(presented) ? presented[0] : presented)) {
    return res.status(401).json({ error: "Invalid provisioning token." });
  }
  next();
}

module.exports = { provisioningGuard, currentToken, writeToken };
