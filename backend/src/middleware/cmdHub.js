// CMD Approval Hub guard. Checks the X-Api-Key shared secret (server-to-server
// from the hub; no JWT, no session).
//   503 when no key is configured on this server (the hub is off here).
//   401 when the presented key is missing or wrong.
// Compared in constant time. The key is sent by the hub's own server, never by
// a browser or a phone.
const crypto = require("crypto");
const { cmdHub } = require("../config/env");

function keyMatches(presented) {
  const want = Buffer.from(String(cmdHub.apiKey || ""));
  const got = Buffer.from(String(presented || ""));
  if (!want.length || want.length !== got.length) return false;
  return crypto.timingSafeEqual(want, got);
}

function cmdHubGuard(req, res, next) {
  if (!cmdHub.apiKey) {
    return res.status(503).json({ ok: false, error: "The Approval Hub API is not configured here (set CMD_HUB_API_KEY in Trust Prism)." });
  }
  const presented = req.headers["x-api-key"];
  if (!keyMatches(Array.isArray(presented) ? presented[0] : presented)) {
    return res.status(401).json({ ok: false, error: "Invalid API key." });
  }
  next();
}

module.exports = { cmdHubGuard };
