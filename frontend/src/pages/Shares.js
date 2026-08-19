import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { confirmDialog } from "../components/Dialogs";
import ShareModal from "../components/ShareModal";

export default function Shares() {
  const { shares, sharesPage, sharesHasMore, sharesTotal, sharesStatus, fetchShares, removeShare, updateShare, toast, tax } = useApp();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [revealed, setRevealed] = useState({});
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [perm, setPerm] = useState("any");

  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);

  const params = { q: dq, perm, page: 1, limit: 24 };
  const paramsKey = JSON.stringify(params);
  useEffect(() => {
    fetchShares({ params: { ...params, page: 1 }, append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);
  const loadMore = () => fetchShares({ params: { ...params, page: sharesPage + 1 }, append: true });

  const linkFor = (s) => (s.token ? `${window.location.origin}/s/${s.token}` : "Link not ready");
  const copy = async (s) => {
    if (!s.token) return toast("Link not ready — reopen the share");
    try { await navigator.clipboard.writeText(linkFor(s)); toast("Link copied to clipboard"); }
    catch { toast("Could not copy link"); }
  };
  const del = async (s) => {
    const ok = await confirmDialog({ title: "Delete share link", message: `Delete “${s.n}”? The link stops working immediately.`, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try { await removeShare(s.id); toast("Share link deleted"); }
    catch (e) { toast(e.message || "Could not delete"); }
  };

  const scopeLabel = (s) => {
    if (s.include === "Whole portal") return "Whole portal";
    if (s.include === "A category") {
      const d = tax.dom(s.scopeDomain);
      const sub = s.scopeSub ? tax.subOf(s.scopeDomain, s.scopeSub) : null;
      return `${d?.name || s.scopeDomain}${sub ? ` › ${sub.name}` : ""}`;
    }
    return `${(s.assets || []).length} asset${(s.assets || []).length === 1 ? "" : "s"}`;
  };

  return (
    <>
      <div className="crumb">Workspace / <b>Shared Links</b></div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 className="h1">Shared Links &amp; Portals</h2>
          <p className="sub">Share a whole category, hand-picked assets, or the entire public library with a secure link. Only <b>Approved</b> and <b>Live</b> assets are ever served.</p>
        </div>
        <button className="btn p" onClick={() => setModal(true)}>+ New share link</button>
      </div>

      <div className="fbar">
        <div className="search" style={{ maxWidth: 320 }}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or audience…" />
        </div>
        <select className="fbtn" value={perm} onChange={(e) => setPerm(e.target.value)}><option value="any">Any permission</option><option value="View only">View only</option><option value="Download">Download</option></select>
        <span className="fbl" style={{ marginLeft: "auto" }}>{sharesTotal} link{sharesTotal === 1 ? "" : "s"}</span>
      </div>

      {shares.length === 0 ? (
        <div className="empty"><b>{sharesStatus === "loading" ? "Loading…" : "No share links"}</b>{sharesStatus === "loading" ? "" : "Create one to share assets externally."}</div>
      ) : (
        <div className="share-grid">
          {shares.map((s) => (
            <div className="share" key={s.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h4 style={{ flex: 1 }}>{s.n}</h4>
                <button className="linkbtn" onClick={() => setEditing(s)}>Edit</button>
                <button className="linkbtn" style={{ color: "var(--red)" }} onClick={() => del(s)}>Delete</button>
              </div>
              <div className="to">Shared with {s.to}</div>
              <div className="link" title={linkFor(s)}>{linkFor(s)}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "2px 0 4px" }}>
                <span className={"tagc " + (s.perm === "Download" ? "tc-dl" : "tc-v")}>{s.perm === "Download" ? "↓ Download" : "View only"}</span>
                {s.pw && <span className="tagc tc-i">🔒 Password</span>}
                {s.wm && <span className="tagc tc-i">Watermark</span>}
                <span className="tagc tc-i">{scopeLabel(s)}</span>
              </div>
              {s.pw && (
                <div className="srow" style={{ alignItems: "center" }}>
                  <span>Password: <b style={{ fontFamily: "ui-monospace,monospace", color: "var(--ink)" }}>{revealed[s.id] ? s.password : "••••••"}</b></span>
                  <button className="linkbtn" onClick={() => setRevealed((r) => ({ ...r, [s.id]: !r[s.id] }))}>{revealed[s.id] ? "Hide" : "Show"}</button>
                </div>
              )}
              <div className="srow"><span>👁 {(s.views || 0).toLocaleString()} views · ↓ {(s.dls || 0).toLocaleString()} downloads</span></div>
              <div className="srow"><span>{s.exp}</span><button className="linkbtn" disabled={!s.token} onClick={() => copy(s)}>Copy link</button></div>
            </div>
          ))}
        </div>
      )}

      {sharesHasMore && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button className="btn" onClick={loadMore} disabled={sharesStatus === "loading"}>{sharesStatus === "loading" ? "Loading…" : `Load more (${sharesTotal - shares.length} more)`}</button>
        </div>
      )}

      {modal && <ShareModal onClose={() => setModal(false)} />}
      {editing && <EditShareModal share={editing} onClose={() => setEditing(null)} updateShare={updateShare} toast={toast} />}
    </>
  );
}

function EditShareModal({ share, onClose, updateShare, toast }) {
  const [name, setName] = useState(share.n || "");
  const [perm, setPerm] = useState(share.perm || "View only");
  const expOpt = /(\d+)\s*day/i.exec(share.exp || "");
  const [exp, setExp] = useState(expOpt ? `${expOpt[1]} days` : "No expiry");
  const [pw, setPw] = useState(!!share.pw);
  const [password, setPassword] = useState(share.password || "");
  const [wm, setWm] = useState(!!share.wm);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast("Name is required");
    if (pw && password.trim().length < 4) return toast("Password must be at least 4 characters");
    setBusy(true);
    try {
      await updateShare(share.id, {
        name: name.trim(), perm, exp: exp === "No expiry" ? "No expiry" : `Expires in ${exp}`,
        wm, password: pw ? password.trim() : "",
      });
      toast("Share updated");
      onClose();
    } catch (e) { toast(e.message || "Could not update"); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-scrim open" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>Edit share link</h2><button className="x" onClick={onClose} style={{ fontSize: 22, color: "var(--muted)" }}>×</button></div>
        <div className="modal-body">
          <div className="field"><label>Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="two">
            <div className="field"><label>Permission</label>
              <select value={perm} onChange={(e) => setPerm(e.target.value)}><option>View only</option><option>Download</option></select></div>
            <div className="field"><label>Link expiry</label>
              <select value={exp} onChange={(e) => setExp(e.target.value)}><option>No expiry</option><option>7 days</option><option>30 days</option><option>90 days</option></select></div>
          </div>
          <div className="field"><label>Password protect</label>
            <label className="check"><input type="checkbox" checked={pw} onChange={(e) => setPw(e.target.checked)} /> Require a password</label>
            {pw && <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="recipients must enter this" style={{ marginTop: 8 }} />}
          </div>
          <div className="field"><label>Watermark</label>
            <label className="check"><input type="checkbox" checked={wm} onChange={(e) => setWm(e.target.checked)} /> Show watermark badge</label>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn p" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}
