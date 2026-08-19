const Taxonomy = require("../models/Taxonomy");
const def = require("../config/taxonomy");   // hardcoded defaults (seed + fixed statuses)

let _cache = null, _exp = 0;
const TTL = 30 * 1000;

// Load the global taxonomy doc, seeding it from defaults the first time. Cached briefly.
async function load(force = false) {
  if (!force && _cache && Date.now() < _exp) return _cache;
  let t = await Taxonomy.findOne({ key: "global" });
  if (!t) {
    t = await Taxonomy.create({
      key: "global", domains: def.DOMAINS,
      channels: def.CHANNELS, dists: def.DISTS, audiences: def.AUDIENCES, campaigns: def.CAMPAIGNS,
      services: def.SERVICES, geos: def.GEOS, langs: def.LANGS, specs: def.SPECS,
    });
  }
  _cache = t; _exp = Date.now() + TTL;
  return t;
}
function invalidate() { _cache = null; _exp = 0; }

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
