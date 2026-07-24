import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import AssetCard from "../components/AssetCard";
import { catLabel, mediaTax } from "../data/prismData";

const CATS = [
  ["all", "All media"], ["Videos", "🎬 Videos"],
  ["Electronic", "💻 Electronic media"], ["Print", "🖨️ Print media"],
];
const PAGE = 24;

export default function Library() {
  const { assets, assetsStatus, hasMore, assetPage, searchTerm, fetchAssets } = useApp();
  const [cat, setCat] = useState("all");
  const [sub, setSub] = useState("all");
  const [year, setYear] = useState("all");
  const [view, setView] = useState("grid");
  const sentinel = useRef(null);

  const loading = assetsStatus === "loading";

  // (Re)load page 1 whenever filters/search change — debounced (server-side filtering)
  useEffect(() => {
    const t = setTimeout(() => {
      fetchAssets({ cat, sub, year, search: searchTerm, page: 1, limit: PAGE });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, sub, year, searchTerm]);

  // Infinite scroll — load the next page as the sentinel scrolls into view
  useEffect(() => {
    if (!sentinel.current || !hasMore || loading) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchAssets({ cat, sub, year, search: searchTerm, page: assetPage + 1, limit: PAGE, append: true });
      }
    }, { rootMargin: "400px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, assetPage, cat, sub, year, searchTerm]);

  const years = [...new Set(assets.map((a) => a.year))].sort((x, y) => y - x);
  const Grid = ({ items }) => (
    <div className="grid">{items.map((a) => <AssetCard key={a.id} asset={a} />)}</div>
  );

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <div className="crumbs">Workspace / <b>Asset Library</b></div>
          <h1>Asset Library</h1>
          <p>Every approved image, video, banner, pamphlet and design — searchable in one place.</p>
        </div>
      </div>

      <div className="filters">
        {CATS.map(([c, label]) => (
          <button key={c} className={"chip cat" + (cat === c ? " active" : "")}
            onClick={() => { setCat(c); setSub("all"); }}>{label}</button>
        ))}
        <div className="spacer"></div>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>📅 Year</label>
        <select className="yearsel" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="all">All years</option><option value="2026">2026</option>
          <option value="2025">2025</option><option value="2024">2024</option>
        </select>
        <div className="viewtoggle">
          <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}>▦</button>
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>≣</button>
        </div>
      </div>

      {cat !== "all" && (
        <div className="subbar">
          <span className="sublabel">{catLabel[cat]} —</span>
          <button className={"chip sub" + (sub === "all" ? " active" : "")} onClick={() => setSub("all")}>
            All {cat === "Print" ? "print" : cat === "Videos" ? "video" : "electronic"}
          </button>
          {(mediaTax[cat] || []).map((s) => (
            <button key={s} className={"chip sub" + (sub === s ? " active" : "")} onClick={() => setSub(s)}>{s}</button>
          ))}
        </div>
      )}

      {assets.length === 0 && !loading && (
        <div className="empty">No assets match. Upload one with <b>New Asset</b>, or adjust your filters.</div>
      )}

      {year !== "all"
        ? <Grid items={assets} />
        : years.map((y) => {
            const items = assets.filter((a) => a.year === y);
            return (
              <div className="year-sec" key={y}>
                <div className="year-head">
                  <span className="yr">{y}</span>
                  <span className="yc">{items.length} asset{items.length > 1 ? "s" : ""}{hasMore ? "+" : ""}</span>
                  <span className="yl"></span>
                </div>
                <Grid items={items} />
              </div>
            );
          })}

      {loading && <div className="empty" style={{ padding: "24px" }}>Loading…</div>}
      <div ref={sentinel} style={{ height: 1 }}></div>
    </section>
  );
}
