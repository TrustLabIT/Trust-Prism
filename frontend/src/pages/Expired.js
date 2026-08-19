import { useEffect, useState, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { previewMarkup } from "../utils/thumbs";
import { fmtDate, daysTo } from "../utils/tm";
import { confirmDialog } from "../components/Dialogs";

const plusOneYear = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); };

export default function Expired() {
  const { updateAsset, deleteAsset, openDrawer, fetchCounts, toast, tax } = useApp();
  const { pathOf } = tax;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState({});
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [domain, setDomain] = useState("all");

  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);

  const load = useCallback(async (pg, append) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(pg), limit: "24" });
      if (dq.trim()) qs.set("q", dq.trim());
      if (domain !== "all") qs.set("domain", domain);
      const r = await api.get("/assets/expired?" + qs.toString());
      setRows((prev) => append ? [...prev, ...(r.assets || [])] : (r.assets || []));
      setTotal(r.total || 0); setHasMore(!!r.hasMore); setPage(r.page || pg);
      setDates((prev) => { const d = { ...prev }; (r.assets || []).forEach((a) => { if (!d[a.id]) d[a.id] = plusOneYear(); }); return d; });
    } catch (e) { toast(e.message || "Could not load"); }
    finally { setLoading(false); }
  }, [dq, domain, toast]);

  useEffect(() => { load(1, false); }, [load]);
  const loadMore = () => load(page + 1, true);

  const renew = async (a) => {
    const newDate = dates[a.id];
    if (!newDate || newDate <= new Date().toISOString().slice(0, 10)) return toast("Pick a future expiry date");
    try {
      await updateAsset(a.id, { expiry: newDate });
      toast(`${a.name} renewed until ${fmtDate(newDate)}`);
      fetchCounts(); load(1, false);
    } catch (e) { toast(e.message || "Could not renew"); }
  };
  const del = async (a) => {
    const ok = await confirmDialog({ title: "Delete asset", message: `Delete “${a.name}”? This removes the master from S3 and can't be undone.`, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try { await deleteAsset(a.id); toast("Asset deleted"); fetchCounts(); load(1, false); }
    catch (e) { toast(e.message || "Could not delete"); }
  };

  return (
    <>
      <div className="crumb">Governance / <b>Expired</b></div>
      <h2 className="h1">Expired assets</h2>
      <p className="sub">Assets past their expiry date. Nothing is ever deleted automatically — <b>renew</b> one by setting a new date (it returns to the Library), leave it here, or delete it for good.</p>

      <div className="fbar">
        <div className="search" style={{ maxWidth: 320 }}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search expired assets…" />
        </div>
        <select className="fbtn" value={domain} onChange={(e) => setDomain(e.target.value)}>
          <option value="all">All domains</option>
          {tax.domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <span className="fbl" style={{ marginLeft: "auto" }}>{total} expired</span>
      </div>

      {loading && rows.length === 0 ? <div className="empty">Loading…</div>
        : rows.length === 0 ? <div className="empty"><b>Nothing expired</b>Every dated asset is still within its window.</div>
        : rows.map((a) => {
          const ago = Math.abs(daysTo(a.expiry));
          return (
            <div className="qrow" key={a.id}>
              <span className="mini" dangerouslySetInnerHTML={{ __html: previewMarkup(a) }} />
              <div style={{ minWidth: 0 }}>
                <div className="nm">{a.name}</div>
                <div className="pth">{pathOf(a)}</div>
                <div className="pth" style={{ color: "var(--red)", fontWeight: 600 }}>Expired {fmtDate(a.expiry)} · {ago} day{ago === 1 ? "" : "s"} ago</div>
              </div>
              <div className="acts">
                <input type="date" value={dates[a.id] || ""} min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDates((d) => ({ ...d, [a.id]: e.target.value }))}
                  style={{ padding: "6px 9px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }} />
                <button className="btn sm p" onClick={() => renew(a)}>Renew</button>
                <button className="btn sm" onClick={() => openDrawer(a)}>Open</button>
                <button className="btn sm dgr" onClick={() => del(a)}>Delete</button>
              </div>
            </div>
          );
        })}

      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button className="btn" onClick={loadMore} disabled={loading}>{loading ? "Loading…" : `Load more (${total - rows.length} more)`}</button>
        </div>
      )}
    </>
  );
}
