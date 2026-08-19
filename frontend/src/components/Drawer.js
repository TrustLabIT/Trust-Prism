import { useState } from "react";
import { useApp } from "../context/AppContext";
import { previewMarkup } from "../utils/thumbs";
import { fmtDate, fmtBytes, daysTo, stClass } from "../utils/tm";
import { confirmDialog } from "./Dialogs";
import ShareModal from "./ShareModal";

export default function Drawer() {
  const { drawer, closeDrawer, openDrawer, updateStatus, downloadAsset, deleteAsset, toast, user, perms, tax } = useApp();
  const a = drawer.asset;
  const [shareOpen, setShareOpen] = useState(false);

  const act = async (action, label) => {
    try {
      const updated = await updateStatus(a.id, action);
      openDrawer(updated);          // keep the drawer fresh
      toast(`${a.name} · ${label}`);
    } catch (e) { toast(e.message || "Could not update"); }
  };
  const dl = async () => {
    try { const { url } = await downloadAsset(a.id); window.open(url, "_blank", "noopener"); toast("Downloading original"); }
    catch (e) { toast(e.message || "Download failed"); }
  };
  const del = async () => {
    const ok = await confirmDialog({ title: "Delete asset", message: `Delete “${a.name}”? This removes the master from S3 and can't be undone.`, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try { await deleteAsset(a.id); closeDrawer(); toast("Asset deleted"); }
    catch (e) { toast(e.message || "Could not delete"); }
  };

  if (!a) return (<><div className="scrim" onClick={closeDrawer} /><aside className="drawer" /></>);

  const expChip = a.expiry
    ? (daysTo(a.expiry) < 0
      ? <span className="chip r">Expired {fmtDate(a.expiry)}</span>
      : <span className="chip y">Expires {fmtDate(a.expiry)}</span>)
    : null;

  const isOwner = user.id && a.owner && String(user.id) === String(a.owner);
  const canDelete = perms.isSuperAdmin || isOwner;
  const canModerate = perms.isApprover || isOwner;   // any lifecycle action at all
  const approver = perms.isApprover;                  // approve / reject / publish are approver-only

  // lifecycle actions per status (role-gated; backend enforces too)
  let acts = null;
  if (!canModerate) acts = null;
  else if (a.status === "Draft") acts = <button className="btn p" onClick={() => act("submit", "Submitted for review")}>Submit for review</button>;
  else if (a.status === "In review") acts = approver
    ? <><button className="btn" onClick={() => act("approve", "Approved")}>Approve</button><button className="btn dgr" onClick={() => act("reject", "Sent back to draft")}>Send back</button></>
    : <span style={{ fontSize: 13, color: "var(--muted)", alignSelf: "center" }}>Awaiting a reviewer.</span>;
  else if (a.status === "Approved") acts = a.domain === "demand"
    ? <>{approver && <button className="btn gold" onClick={() => act("publish", "Published — now Live")}>Publish · make Live</button>}<button className="btn" onClick={() => act("archive", "Archived")}>Archive</button></>
    : <><span style={{ fontSize: 13, color: "var(--muted)", alignSelf: "center" }}>Approved is terminal here — in service, not in market.</span><button className="btn" onClick={() => act("archive", "Archived")}>Archive</button></>;
  else if (a.status === "Live") acts = <button className="btn" onClick={() => act("archive", "Archived")}>Archive</button>;
  else if (a.status === "Expired") acts = <><button className="btn p" onClick={() => act("renew", "Back in review")}>Renew for review</button><button className="btn" onClick={() => act("archive", "Archived")}>Archive</button></>;
  else acts = <button className="btn" onClick={() => act("renew", "Back in review")}>Restore to review</button>;

  return (
    <>
      <div className="scrim on" onClick={closeDrawer} />
      <aside className="drawer on">
        <div className="dhead">
          <div>
            <h2>{a.name}</h2>
            <div style={{ marginTop: 6 }}><span className={stClass(a.status)}>{a.status}</span></div>
          </div>
          <button className="x" onClick={closeDrawer}>×</button>
        </div>

        <div className="dbody">
          <div className="dprev" dangerouslySetInnerHTML={{ __html: previewMarkup(a) }} />

          {a.master ? (
            <div className="dl">
              <h5>Master rendition</h5>
              <div className="fn">{a.master.fname}</div>
              <div className="sp">{a.master.mime} · {fmtBytes(a.master.size)}{a.master.w ? ` · ${a.master.w} × ${a.master.h} px` : ""}</div>
              {a.master.sha256 && <div className="hash">SHA-256 {a.master.sha256}</div>}
              <div className="ok">✓ Downloads return these exact bytes — same format, same quality</div>
            </div>
          ) : (
            <div className="dl ghost">
              <h5>Master rendition</h5>
              <div className="fn">Not attached</div>
              <div className="sp">No master file on this record.</div>
            </div>
          )}

          <div className="pathbar"><span>Files under</span><br />{tax.pathOf(a)}</div>

          <div className="chips">
            <span className="chip g">{a.dist}</span>
            <span className="chip b">{a.channel}</span>
            <span className="chip">{a.audience}</span>
            {a.campaign !== "Always-on" && <span className="chip y">{a.campaign}</span>}
            {a.service !== "General" && <span className="chip">{a.service}</span>}
            <span className="chip">{a.geo}</span>
            <span className="chip">{a.lang}</span>
            <span className="chip">{a.spec}</span>
            {expChip}
          </div>

          <dl className="meta">
            <dt>Domain</dt><dd>{tax.dom(a.domain)?.name || a.domain}</dd>
            <dt>Sub-module</dt><dd>{tax.subOf(a.domain, a.sub)?.name || a.sub}</dd>
            <dt>Asset type</dt><dd>{a.type}</dd>
            <dt>Dimensions</dt><dd>{a.w ? `${a.w} × ${a.h} px` : "—"}</dd>
            <dt>Added</dt><dd>{fmtDate(a.date)}</dd>
            <dt>Version</dt><dd>{a.version}</dd>
            <dt>Owner</dt><dd>{a.by}</dd>
            <dt>Expiry</dt><dd>{a.expiry ? fmtDate(a.expiry) : "Evergreen"}</dd>
          </dl>

          {canDelete && <button className="btn dgr sm" onClick={del}>Delete asset</button>}
        </div>

        <div className="dact">
          <button className="btn p" onClick={dl} disabled={!a.master}>↓ Download {a.master ? "original" : ""}</button>
          {(a.status === "Approved" || a.status === "Live") && <button className="btn" onClick={() => setShareOpen(true)}>↗ Share</button>}
          {acts}
        </div>
      </aside>
      {shareOpen && <ShareModal presetAsset={a} onClose={() => setShareOpen(false)} />}
    </>
  );
}
