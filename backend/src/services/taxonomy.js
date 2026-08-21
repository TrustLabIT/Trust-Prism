const Taxonomy = require("../models/Taxonomy");
const def = require("../config/taxonomy");   // hardcoded defaults (seed + fixed statuses)

// Load the global taxonomy doc, seeding it from defaults the first time.
// No in-process cache: under pm2 cluster mode a per-process cache lets one
// worker serve a stale copy after another worker saved an edit (the classic
// "saved but not showing" bug). The doc is tiny and read rarely, so we always
// read it fresh from the DB — consistent across every worker, nothing lost.
async function load(/* force */) {
  let t = await Taxonomy.findOne({ key: "global" });
  if (!t) {
    t = await Taxonomy.create({
      key: "global", domains: def.DOMAINS,
      channels: def.CHANNELS, dists: def.DISTS, audiences: def.AUDIENCES, campaigns: def.CAMPAIGNS,
      services: def.SERVICES, geos: def.GEOS, langs: def.LANGS, specs: def.SPECS,
    });
  }
  return t;
}
// Kept for callers that still invoke it; a no-op now that reads are uncached.
function invalidate() {}

// The client-facing shape (statuses stay fixed — the lifecycle depends on them).
function shape(t) {
  return {
    domains: t.domains || [],
    statuses: def.STATUSES,
    channels: t.channels || [], dists: t.dists || [], audiences: t.audiences || [],
    campaigns: t.campaigns || [], services: t.services || [], geos: t.geos || [],
    langs: t.langs || [], specs: t.specs || [],
  };
}

async function domainIds() {
  const t = await load();
  return (t.domains || []).map((d) => d.id);
}
async function validPath(domain, sub, type) {
  const t = await load();
  const d = (t.domains || []).find((x) => x.id === domain);
  const s = d && (d.subs || []).find((x) => x.id === sub);
  return !!(s && (s.types || []).includes(type));
}
async function dists() {
  const t = await load();
  return t.dists || [];
}

module.exports = { load, invalidate, shape, domainIds, validPath, dists };
