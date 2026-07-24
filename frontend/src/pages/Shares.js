import { useApp } from "../context/AppContext";

export default function Shares() {
  const { shares, openModal, toast } = useApp();

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <div className="crumbs">Workspace / <b>Shared Links</b></div>
          <h1>Shared Links &amp; Portals</h1><p>Track what you've shared externally and with partners.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal("share")}>＋ New share link / portal</button>
      </div>

      <div className="share-grid">
        {shares.map((s, i) => {
          const permC = s.perm === "Download" ? "tc-all" : "tc-own";
          const slug = s.n.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 16);
          return (
            <div className="share" key={s.n + i}>
              <h4>{s.n}</h4>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>Shared with {s.to}</div>
              <div className="link">trustprism.co/s/{slug}…</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "2px 0 4px" }}>
                <span className={"tagc " + permC}>{s.perm === "Download" ? "⬇ Download" : "👁 View only"}</span>
                {s.pw && <span className="tagc tc-int">🔒 Password</span>}
                {s.wm && <span className="tagc tc-int">💧 Watermark</span>}
                <span className="tagc tc-int" title="Smart link — always serves the current approved version">🔗 Smart link</span>
              </div>
              <div className="srow"><span>👁 {s.views.toLocaleString()} views</span><span>⬇ {s.dls.toLocaleString()} downloads</span></div>
              <div className="srow"><span>{s.exp}</span><button style={{ color: "var(--brand)", fontWeight: 700 }} onClick={() => toast("Link copied 🔗")}>Copy link</button></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
