import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { previewMarkup } from "../utils/thumbs";
import { fmtDate } from "../utils/tm";

const publishedOn = (a) => (a.publishedAt ? fmtDate(String(a.publishedAt).slice(0, 10)) : fmtDate(a.date));

export default function Published() {
  const { published, fetchPublished, openDrawer, tax } = useApp();
  const { pathOf } = tax;
  const { items = [], status, total = 0, hasMore, page, facets = { owners: [] } } = published;

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [user, setUser] = useState("any");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");

  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    fetchPublished({ params: { from, to, user, q: dq, page: 1, limit: 24 } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, user, dq]);

  const loadMore = () => fetchPublished({ params: { from, to, user, q: dq, page: page + 1, limit: 24 }, append: true });

  return (
    <>
      <div className="crumb">Workspace / <b>Published</b></div>
      <h2 className="h1">Published</h2>
      <p className="sub">Everything that has gone live. Filter by the month it was published or by who published it.</p>

      <div className="fbar">
        <label className="dlab">From <input type="date" value={from} max={to || ""} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="dlab">To <input type="date" value={to} min={from || ""} onChange={(e) => setTo(e.target.value)} /></label>
        <select className="fbtn" value={user} onChange={(e) => setUser(e.target.value)}>
          <option value="any">All users</option>
          {facets.owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        {(from || to || user !== "any") && <button className="clr" style={{ marginLeft: 0 }} onClick={() => { setFrom(""); setTo(""); setUser("any"); }}>Clear filters</button>}
        <div className="search" style={{ maxWidth: 300, marginLeft: "auto" }}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search published…" />
        </div>
      </div>

      {status === "loading" && !items.length ? <div className="empty">Loading…</div>
        : !items.length ? <div className="empty"><b>Nothing published yet</b>Assets appear here once they’re published (made Live).</div>
        : (
          <>
            <div className="pubgrid">
              {items.map((a) => (
                <button className="pubcard" key={a.id} onClick={() => openDrawer(a)}>
                  <span className="pubthumb" dangerouslySetInnerHTML={{ __html: previewMarkup(a) }} />
                  <span className="pubmeta">
                    <span className="nm">{a.name}</span>
                    <span className="pth">{pathOf(a)}</span>
                    <span className="pubfoot">Published {publishedOn(a)} · {a.by || "—"}</span>
                  </span>
                </button>
              ))}
            </div>
            {hasMore && (
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <button className="btn" onClick={loadMore} disabled={status === "loading"}>{status === "loading" ? "Loading…" : "Load more"}</button>
              </div>
            )}
            <div className="pathcell" style={{ textAlign: "center", marginTop: 10 }}>{items.length} of {total} shown</div>
          </>
        )}
    </>
  );
}
