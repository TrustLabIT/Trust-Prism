import { palettes, channels } from "../data/prismData";

// ---------- Placeholder visual generator (no external images) ----------
export function grad(i) {
  const p = palettes[i % palettes.length];
  return `linear-gradient(135deg,${p[0]},${p[1]})`;
}

export function artSVG(i, label) {
  const p = palettes[i % palettes.length];
  const shapes = [
    `<circle cx="60" cy="55" r="34" fill="rgba(255,255,255,.22)"/><circle cx="150" cy="95" r="22" fill="rgba(255,255,255,.16)"/>`,
    `<rect x="30" y="30" width="60" height="60" rx="12" fill="rgba(255,255,255,.2)"/><rect x="110" y="60" width="70" height="40" rx="10" fill="rgba(255,255,255,.14)"/>`,
    `<polygon points="100,20 150,110 50,110" fill="rgba(255,255,255,.2)"/>`,
    `<path d="M20 90 Q70 20 110 80 T200 60" stroke="rgba(255,255,255,.35)" stroke-width="8" fill="none"/>`,
  ];
  return `<svg width="100%" height="100%" viewBox="0 0 210 150" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0">
    <defs><linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient></defs>
    <rect width="210" height="150" fill="url(#g${i})"/>${shapes[i % shapes.length]}
    <text x="16" y="135" fill="rgba(255,255,255,.9)" font-size="11" font-weight="700" font-family="sans-serif">${label || ""}</text></svg>`;
}

// Stable small integer from an id string — for picking gradient/art variety
// (replaces array-index, so it works regardless of pagination/list order).
export const idIndex = (id) => {
  const s = String(id || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

// ---------- Formatting ----------
export const initials = (n) => n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
export const avColor = (n) => palettes[n.length % palettes.length][0];

export const nf = (n) => {
  n = +n || 0;
  return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M"
    : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K"
    : "" + Math.round(n);
};
export const money = (n) => "$" + nf(n);

export const yearOf = (iso) => (iso || "").slice(0, 4);
export const fmtDate = (iso) => {
  const d = iso.split("-");
  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${M[+d[1] - 1]} ${+d[2]}, ${d[0]}`;
};

// ---------- Status ----------
export const statusClass = (s) => (s === "approved" ? "st-approved" : s === "review" ? "st-review" : "st-draft");
export const statusLabel = (s) => (s === "approved" ? "Approved" : s === "review" ? "In review" : "Draft");

// ---------- Campaign performance ----------
export const chMeta = (n) => channels.find((c) => c.n === n) || { n, c: "#6b7280", i: "•" };

export function perfTotals(a) {
  const t = { impressions: 0, views: 0, clicks: 0, engagements: 0, conversions: 0, spend: 0, revenue: 0 };
  (a.outcomes || []).forEach((o) => { for (const k in t) t[k] += +o[k] || 0; });
  const base = t.impressions || t.views;
  t.ctr = base ? (t.clicks / base * 100) : 0;
  t.roas = t.spend ? (t.revenue / t.spend) : 0;
  t.roi = t.spend ? ((t.revenue - t.spend) / t.spend * 100) : 0;
  t.cpa = t.conversions ? (t.spend / t.conversions) : 0;
  t.cpc = t.clicks ? (t.spend / t.clicks) : 0;
  return t;
}

export const assetViews = (a) => (a.outcomes || []).reduce((s, o) => s + (+o.views || +o.impressions || 0), 0);
