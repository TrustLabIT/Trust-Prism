import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { previewMarkup } from "../utils/thumbs";
import { fmtDate, fmtBytes, stClass, fyNowYr, fyLabel, fyRange, fyMatch, daysAgo, todayISO } from "../utils/tm";

const EMPTY_FILTERS = { status: [], dist: [], channel: [], audience: [], campaign: [], service: [], geo: [], lang: [] };

export default function Library() {
  const { assets, assetsStatus, hasMore, page, total, counts, libDomain, libSub, setLibSub, search, openDrawer, downloadAsset, toast, fetchAssets, tax } = useApp();
  const { dom, subOf, FACETS } = tax;

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [range, setRange] = useState({ from: "", to: "" });
  const [pop, setPop] = useState(null);
  const [layout, setLayout] = useState("grid");
  const [debouncedQ, setDebouncedQ] = useState(search);
  const barRef = useRef(null);

  // debounce the topbar search
  useEffect(() => { const t = setTimeout(() => setDebouncedQ(search), 300); return () => clearTimeout(t); }, [search]);

  const params = {
    domain: libDomain, sub: libSub || "", q: debouncedQ,
    from: range.from, to: range.to, page: 1, limit: 24, ...filters,
  };
  const paramsKey = JSON.stringify(params);

  // (re)load page 1 whenever the query changes
  useEffect(() => {
    fetchAssets({ params: { ...params, page: 1 }, append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  // close an open filter dropdown on outside click
  useEffect(() => {
    const onDoc = (e) => { if (pop && !e.target.closest(".fpill")) setPop(null); };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [pop]);

  const D = libDomain === "all" ? null : dom(libDomain);
  const loadMore = () => fetchAssets({ params: { ...params, page: page + 1 }, append: true });

  const toggleFacet = (key, val) => setFilters((f) => {
    const arr = f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val];
    return { ...f, [key]: arr };
  });
  const clearAll = () => { setFilters(EMPTY_FILTERS); setRange({ from: "", to: "" }); setPop(null); };

  const dlRow = async (e, id) => { e.stopPropagation(); try { const { url } = await downloadAsset(id); window.open(url, "_blank", "noopener"); } catch (ex) { toast(ex.message); } };

  // ---- filter bar pieces ----
  const fySel = fyMatch(range);
  const rangeLabel = fySel != null ? fyLabel(fySel)
    : !range.from && !range.to ? "Date added"
    : range.from && range.to ? `${fmtDate(range.from)} – ${fmtDate(range.to)}`
    : range.from ? `From ${fmtDate(range.from)}` : `Up to ${fmtDate(range.to)}`;
  const fyYears = [fyNowYr(), fyNowYr() - 1, fyNowYr() - 2];
  const presets = [
    { k: "30", label: "Last 30 days", from: daysAgo(30), to: todayISO() },
    { k: "90", label: "Last 90 days", from: daysAgo(90), to: todayISO() },
    { k: "ytd", label: `${new Date().getFullYear()} to date`, from: `${new Date().getFullYear()}-01-01`, to: todayISO() },
  ];

  const active = [];
  FACETS.forEach(([k, label]) => filters[k].forEach((v) => active.push({ k, label, v })));
  const anyActive = active.length || range.from || range.to;

  return (
    <>
      <div className="crumb">Workspace / Asset Library / <b>{D ? D.name : "All domains"}</b></div>
      <h2 className="h1">{D ? D.name : "Asset Library"}</h2>
      <p className="sub">{D ? D.note : "Every approved image, video, banner, document and design — filed by the job it does, not by where it ends up. Pick a domain in the left-hand navigation to narrow it down."}</p>
      {D && <div className="testbar" style={{ "--c": D.color, background: D.tint }}><b>Sorting test</b>{D.test}</div>}

      {D && (
        <div className="chiprow">
          <button className={"subchip" + (!libSub ? " on" : "")} onClick={() => setLibSub(null)}>All sub-modules</button>
          {D.subs.map((s) => (
            <button key={s.id} className={"subchip" + (libSub === s.id ? " on" : "")} onClick={() => setLibSub(s.id)}>
              {s.name}<span className="n">{counts.bySub?.[`${D.id}/${s.id}`] || 0}</span>
            </button>
          ))}
        </div>
      )}

      <div className="fbar" ref={barRef}>
        <span className="fbl">Filter</span>
        {/* date pill */}
        <div className={"fpill" + (range.from || range.to ? " set" : "") + (pop === "date" ? " open" : "")}>
          <button className="fbtn" onClick={(e) => { e.stopPropagation(); setPop(pop === "date" ? null : "date"); }}>📅 {rangeLabel} <span className="cv">▾</span></button>
          {pop === "date" && (
            <div className="fpop" onClick={(e) => e.stopPropagation()}>
              <div className="fsel">
                <label>Financial year</label>
                <select value={fySel ?? ""} onChange={(e) => { setRange(e.target.value ? fyRange(+e.target.value) : { from: "", to: "" }); setPop(null); }}>
                  <option value="">Any / custom range</option>
                  {fyYears.map((y) => <option key={y} value={y}>{fyLabel(y)}{y === fyNowYr() ? " · current" : ""}</option>)}
                </select>
              </div>
              <div className="fdiv"><span>or an exact range</span></div>
              <div className="dates">
                <div className="dt"><span>From</span><input type="date" value={range.from} max={range.to || ""} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /></div>
                <div className="dt"><span>To</span><input type="date" value={range.to} min={range.from || ""} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></div>
              </div>
              <div className="presets">
                {presets.map((p) => <button key={p.k} className={range.from === p.from && range.to === p.to ? "on" : ""} onClick={() => { setRange({ from: p.from, to: p.to }); setPop(null); }}>{p.label}</button>)}
                {(range.from || range.to) && <button onClick={() => { setRange({ from: "", to: "" }); setPop(null); }}>Any date</button>}
              </div>
            </div>
          )}
        </div>
        {/* facet pills */}
        {FACETS.map(([key, label, values]) => {
          const sel = filters[key];
          return (
            <div key={key} className={"fpill" + (sel.length ? " set" : "") + (pop === key ? " open" : "")}>
              <button className="fbtn" onClick={(e) => { e.stopPropagation(); setPop(pop === key ? null : key); }}>
                {label}{sel.length ? <span className="cn">{sel.length}</span> : null} <span className="cv">▾</span>
              </button>
              {pop === key && (
                <div className="fpop" onClick={(e) => e.stopPropagation()}>
                  {values.map((v) => (
                    <label className="fopt" key={v}>
                      <input type="checkbox" checked={sel.includes(v)} onChange={() => toggleFacet(key, v)} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {anyActive && (
        <div className="achips">
          {(range.from || range.to) && <span className="achip" onClick={() => setRange({ from: "", to: "" })}>{rangeLabel}<b>×</b></span>}
          {active.map((x, i) => <span className="achip" key={i} onClick={() => toggleFacet(x.k, x.v)}><i>{x.label}:</i> {x.v}<b>×</b></span>)}
          <button className="aclear" onClick={clearAll}>Clear all</button>
        </div>
      )}

      <div className="gridhead">
        <span className="cnt"><b>{total}</b> asset{total === 1 ? "" : "s"}{debouncedQ ? ` matching “${debouncedQ}”` : ""}</span>
        <span className="sp">
          <span className="toggle">
            <button className={layout === "grid" ? "on" : ""} onClick={() => setLayout("grid")}>▦ Grid</button>
            <button className={layout === "list" ? "on" : ""} onClick={() => setLayout("list")}>☰ List</button>
          </span>
        </span>
      </div>

      {assetsStatus === "loading" && assets.length === 0 ? (
        <div className="empty">Loading…</div>
      ) : assets.length === 0 ? (
        <div className="empty"><b>Nothing here yet</b>Adjust the filters, or upload an asset with <b>New Asset</b>.</div>
      ) : layout === "grid" ? (
        <div className="grid">
          {assets.map((a) => (
            <button className="acard" key={a.id} onClick={() => openDrawer(a)}>
              <span className="thumb">
                <span style={{ position: "absolute", inset: 0 }} dangerouslySetInnerHTML={{ __html: previewMarkup(a) }} />
                <span className="tb tl">{subOf(a.domain, a.sub)?.name}</span>
                <span className={"tb tr " + stClass(a.status)}>{a.status}</span>
                <span className="tb bl">{a.dist}</span>
              </span>
              <span className="body">
                <span className="nm">{a.name}</span>
                <span className="mt">{a.type}{a.w ? ` · ${a.w}×${a.h}` : ""} · {fmtDate(a.date)}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <table className="lst">
          <thead><tr><th>Asset</th><th>Files under</th><th>Channel</th><th>Status</th><th>Distribution</th><th>Master</th><th></th></tr></thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} onClick={() => openDrawer(a)}>
                <td><div style={{ display: "flex", gap: 11, alignItems: "center" }}>
                  <span className="mini" dangerouslySetInnerHTML={{ __html: previewMarkup(a) }} />
                  <div><div style={{ fontWeight: 640 }}>{a.name}</div><div className="pathcell">{a.type}{a.w ? ` · ${a.w}×${a.h}` : ""}</div></div>
                </div></td>
                <td className="pathcell">{dom(a.domain)?.name} › {subOf(a.domain, a.sub)?.name}</td>
                <td>{a.channel}</td>
                <td><span className={stClass(a.status)}>{a.status}</span></td>
                <td>{a.dist}</td>
                <td className="pathcell">{a.master ? `${a.master.ext} · ${fmtBytes(a.master.size)}` : "—"}</td>
                <td><button className="btn sm" onClick={(e) => dlRow(e, a.id)}>↓ Original</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <button className="btn" onClick={loadMore} disabled={assetsStatus === "loading"}>{assetsStatus === "loading" ? "Loading…" : "Load more"}</button>
        </div>
      )}
    </>
  );
}
