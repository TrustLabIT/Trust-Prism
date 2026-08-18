import { useState, useEffect, useRef } from "react";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import MovieOutlinedIcon from "@mui/icons-material/MovieOutlined";
import DevicesOtherOutlinedIcon from "@mui/icons-material/DevicesOtherOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import { useApp } from "../context/AppContext";
import AssetCard from "../components/AssetCard";
import AssetRow from "../components/AssetRow";
import SkeletonGrid from "../components/SkeletonCard";
import { catLabel, mediaTax } from "../data/prismData";

const ci = { fontSize: 15 };
const CATS = [
  ["all", <><PhotoLibraryOutlinedIcon sx={ci} />All media</>],
  ["Videos", <><MovieOutlinedIcon sx={ci} />Videos</>],
  ["Electronic", <><DevicesOtherOutlinedIcon sx={ci} />Electronic media</>],
  ["Print", <><PrintOutlinedIcon sx={ci} />Print media</>],
];
const PAGE = 24;

export default function Library() {
  const { assets, assetsStatus, hasMore, assetPage, searchTerm, fetchAssets, assetsKey } = useApp();
  const [cat, setCat] = useState("all");
  const [sub, setSub] = useState("all");
  const [year, setYear] = useState("all");
  const [view, setView] = useState("grid");
  const sentinel = useRef(null);

  const loading = assetsStatus === "loading";
  const currentKey = [cat, sub, year, searchTerm, ""].join("|");
  // data in the store belongs to THIS view only when its key matches — until then
  // we show a loading state (never the previous view's stale cards)
  const ready = assetsKey === currentKey;

  // (Re)load page 1 when the view changes — but SKIP if this exact view is already
  // loaded (so returning to the screen or reselecting a filter uses the cache, no refetch).
  useEffect(() => {
    if (currentKey === assetsKey) return;
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
  const View = ({ items }) => (
    view === "list"
      ? <div className="asset-list">
          <div className="asset-row head"><div></div><div>Name</div><div>Type</div><div>Size</div><div>Date</div><div>Owner</div><div>Status</div></div>
          {items.map((a) => <AssetRow key={a.id} asset={a} />)}
        </div>
      : <div className="grid">{items.map((a) => <AssetCard key={a.id} asset={a} />)}</div>
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
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <CalendarMonthOutlinedIcon sx={{ fontSize: 15 }} /> Year
        </label>
        <select className="yearsel" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="all">All years</option><option value="2026">2026</option>
          <option value="2025">2025</option><option value="2024">2024</option>
        </select>
        <div className="viewtoggle">
          <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}><GridViewOutlinedIcon sx={{ fontSize: 16 }} /></button>
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><ViewListOutlinedIcon sx={{ fontSize: 18 }} /></button>
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

      {!ready ? (
        <SkeletonGrid count={8} />
      ) : assets.length === 0 ? (
        <div className="empty">No assets match. Upload one with <b>New Asset</b>, or adjust your filters.</div>
      ) : (
        <>
          {loading && <div className="lib-bar" />}
          {year !== "all"
            ? <View items={assets} />
            : years.map((y) => {
                const items = assets.filter((a) => a.year === y);
                return (
                  <div className="year-sec" key={y}>
                    <div className="year-head">
                      <span className="yr">{y}</span>
                      <span className="yc">{items.length} asset{items.length > 1 ? "s" : ""}{hasMore ? "+" : ""}</span>
                      <span className="yl"></span>
                    </div>
                    <View items={items} />
                  </div>
                );
              })}
          <div ref={sentinel} style={{ height: 1 }}></div>
        </>
      )}
    </section>
  );
}
