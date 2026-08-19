// TrustMark helpers — dates, Indian financial year, formatting.
export const TODAY = () => new Date();
export const ISO = (d) => d.toISOString().slice(0, 10);
export const todayISO = () => ISO(new Date());

export const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return ISO(d); };
export const inRange = (date, r) => (!r.from || date >= r.from) && (!r.to || date <= r.to);

export const fmtBytes = (n) => {
  n = +n || 0;
  return n < 1024 ? n + " B"
    : n < 1048576 ? (n / 1024).toFixed(1) + " KB"
    : n < 1073741824 ? (n / 1048576).toFixed(1) + " MB"
    : (n / 1073741824).toFixed(2) + " GB";
};
export const fmtDate = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const daysTo = (d) => Math.round((new Date(d + "T00:00:00") - new Date(todayISO() + "T00:00:00")) / 86400000);

// status → CSS class suffix (e.g. "In review" → "Inreview")
export const stClass = (s) => "st " + String(s).replace(/\s/g, "");
export const initials = (n) => String(n || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

/* Indian financial year — 1 April to 31 March */
export const fyStart = (iso) => { const y = +iso.slice(0, 4), m = +iso.slice(5, 7); return m >= 4 ? y : y - 1; };
export const fyLabel = (y) => `FY ${y}–${String((y + 1) % 100).padStart(2, "0")}`;
export const fyRange = (y) => ({ from: `${y}-04-01`, to: `${y + 1}-03-31` });
export const fyNowYr = () => fyStart(todayISO());
export const fyList = (dates = []) => {
  const s = new Set(dates.map((d) => fyStart(d)));
  s.add(fyNowYr());
  return [...s].sort((a, b) => b - a);
};
export const fyMatch = (r) => {
  if (!r.from || !r.to) return null;
  const y = fyStart(r.from), R = fyRange(y);
  return (R.from === r.from && R.to === r.to) ? y : null;
};
