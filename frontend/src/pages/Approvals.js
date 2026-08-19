import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { previewMarkup } from "../utils/thumbs";
import { fyNowYr, fyLabel, fyRange, fyMatch } from "../utils/tm";

export default function Approvals() {
  const { approvals, approvalsStatus, fetchApprovals, fetchCounts, updateStatus, openDrawer, toast, perms, tax } = useApp();
  const { pathOf } = tax;
  const [range, setRange] = useState({ from: "", to: "" });
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [limit, setLimit] = useState(20);

  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);

  const reload = (lim = limit) => fetchApprovals({ ...range, q: dq, limit: lim });
  useEffect(() => {
    setLimit(20);
    fetchApprovals({ ...range, q: dq, limit: 20 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to, dq]);

  const act = async (id, action, label) => {
    try { await updateStatus(id, action); toast(label); reload(); fetchCounts(); }
    catch (e) { toast(e.message || "Could not update"); }
  };
  const loadMore = () => { const n = limit + 20; setLimit(n); reload(n); };

  const { review = [], drafts = [], approvedDemand = [], flags = [], counts = {}, hasMore = false } = approvals;
  const fySel = fyMatch(range);
  const fyYears = [fyNowYr(), fyNowYr() - 1, fyNowYr() - 2];

  const Row = ({ a, children }) => (
    <div className="qrow">
      <span className="mini" dangerouslySetInnerHTML={{ __html: previewMarkup(a) }} />
      <div><div className="nm">{a.name}</div><div className="pth">{pathOf(a)} · {a.dist}</div></div>
      <div className="acts">{children}</div>
    </div>
  );

  return (
    <>
      <div className="crumb">Workspace / <b>Approvals</b></div>
      <h2 className="h1">Approvals &amp; governance</h2>
      <p className="sub">Lifecycle moves one way: Draft → In review → Approved → Live → Expired → Archived. Nothing reaches Live without a distribution class set deliberately.</p>

      <div className="rangebar">
        <b>Date added</b>
        <label>FY <select value={fySel ?? ""} onChange={(e) => setRange(e.target.value ? fyRange(+e.target.value) : { from: "", to: "" })}>
          <option value="">Any / custom</option>
          {fyYears.map((y) => <option key={y} value={y}>{fyLabel(y)}{y === fyNowYr() ? " · current" : ""}</option>)}
        </select></label>
        <label>From <input type="date" value={range.from} max={range.to || ""} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /></label>
        <label>To <input type="date" value={range.to} min={range.from || ""} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></label>
        {(range.from || range.to) && <button className="clr" onClick={() => setRange({ from: "", to: "" })}>Clear date range</button>}
        <div className="search" style={{ maxWidth: 260, marginLeft: (range.from || range.to) ? 0 : "auto" }}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the queue…" />
        </div>
      </div>

      <div className="sect">
        <h3>Needs review — {counts.review ?? review.length}</h3>
        {approvalsStatus === "loading" ? <div className="empty">Loading…</div>
          : review.length ? review.map((a) => (
            <Row a={a} key={a.id}>
              {perms.isApprover && <button className="btn sm p" onClick={() => act(a.id, "approve", "Approved")}>Approve</button>}
              {perms.isApprover && <button className="btn sm dgr" onClick={() => act(a.id, "reject", "Sent back to draft")}>Send back</button>}
              <button className="btn sm" onClick={() => openDrawer(a)}>Open</button>
            </Row>
          )) : <div className="empty"><b>Queue is clear</b>Nothing is waiting on you.</div>}
      </div>

      <div className="sect">
        <h3>Approved campaign work — ready to publish ({counts.approvedDemand ?? approvedDemand.length})</h3>
        <p className="sub" style={{ margin: "-6px 0 12px", fontSize: 13.5 }}>Only Demand Generation assets go “Live”. In the other domains, <b>Approved</b> is the terminal state — in service, not in market.</p>
        {approvedDemand.length ? approvedDemand.map((a) => (
          <Row a={a} key={a.id}>
            {perms.isApprover && <button className="btn sm gold" onClick={() => act(a.id, "publish", "Published — now Live")}>Publish</button>}
            <button className="btn sm" onClick={() => openDrawer(a)}>Open</button>
          </Row>
        )) : <div className="empty">Nothing approved and unpublished.</div>}
      </div>

      <div className="sect">
        <h3>Drafts — {counts.drafts ?? drafts.length}</h3>
        {drafts.length ? drafts.map((a) => (
          <Row a={a} key={a.id}>
            <button className="btn sm" onClick={() => act(a.id, "submit", "Submitted for review")}>Submit for review</button>
            <button className="btn sm" onClick={() => openDrawer(a)}>Open</button>
          </Row>
        )) : <div className="empty">No drafts.</div>}
      </div>

      <div className="sect">
        <h3>Governance flags — {counts.flags ?? flags.length}</h3>
        {flags.length ? flags.map((f, i) => (
          <div className={"flag" + (f.sev === "warn" ? " warn" : "")} key={f.id + i}>
            <span className="mini" dangerouslySetInnerHTML={{ __html: previewMarkup(f) }} />
            <div><div className="nm">{f.name}</div><div className="why">{f.why}</div></div>
            <div className="acts"><button className="btn sm" onClick={() => openDrawer(f)}>Open</button></div>
          </div>
        )) : <div className="empty"><b>Nothing flagged</b>No expired-but-live assets and no mis-set distribution classes.</div>}
      </div>

      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 4 }}>
          <button className="btn" onClick={loadMore} disabled={approvalsStatus === "loading"}>{approvalsStatus === "loading" ? "Loading…" : "Load more"}</button>
        </div>
      )}
    </>
  );
}
