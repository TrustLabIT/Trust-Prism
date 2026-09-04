import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { previewMarkup } from "../utils/thumbs";
import { fmtDate, fmtBytes, daysTo, stClass } from "../utils/tm";
import { confirmDialog } from "./Dialogs";
import ShareModal from "./ShareModal";

const when = (d) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

export default function Drawer() {
  const { drawer, closeDrawer, openDrawer, updateStatus, downloadAsset, deleteAsset, toast, user, perms, tax } = useApp();
  const a = drawer.asset;
  const nav = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
  const [openV, setOpenV] = useState(null);   // which version group is expanded in the drawer
  const [showImg, setShowImg] = useState(false);   // full-size image lightbox

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
  const dlVersion = async (v) => {
    try { const { url } = await api.get(`/assets/${a.id}/file-url?version=${v.version}&revision=${v.revision}`); window.open(url, "_blank", "noopener"); }
    catch (e) { toast(e.message || "Could not get download link"); }
  };
  const addChanges = async () => {
    try { await updateStatus(a.id, "revise"); closeDrawer(); toast(`${a.name} · moved to Version Tracker for changes`); nav("/versions"); }
    catch (e) { toast(e.message || "Could not start changes"); }
  };

  if (!a) return (<><div className="scrim" onClick={closeDrawer} /><aside className="drawer" /></>);

  const expChip = a.expiry
    ? (daysTo(a.expiry) < 0
      ? <span className="chip r">Expired {fmtDate(a.expiry)}</span>
      : <span className="chip y">Expires {fmtDate(a.expiry)}</span>)
    : null;

  // group the file history + comments by version cycle, newest first
  const groupsMap = new Map();
  const grp = (k) => { if (!groupsMap.has(k)) groupsMap.set(k, { version: k, files: [], comments: [] }); return groupsMap.get(k); };
  (a.versions || []).forEach((v) => grp(v.version || 1).files.push(v));
  (a.comments || []).forEach((c) => grp(c.version || 1).comments.push(c));
  const versionGroups = [...groupsMap.values()].sort((x, y) => y.version - x.version);

  // the live/current file = highest version, then highest revision (mirrors `master`)
  const cur = (a.versions || []).reduce((best, v) =>
    (!best || v.version > best.version || (v.version === best.version && v.revision > best.revision)) ? v : best, null);
  const curKey = cur ? cur.version + "-" + cur.revision : null;
  const curLabel = a.status === "Live" ? "Published" : a.status === "Approved" ? "Approved" : "Current";

  const isOwner = user.id && a.owner && String(user.id) === String(a.owner);
  const released = !["Draft", "In review"].includes(a.status);   // approved and beyond
  const canDelete = perms.isSuperAdmin || (isOwner && !released); // once approved, admin only
  const canModerate = perms.isApprover || isOwner;   // any lifecycle action at all
  // approve / reject: Super Admin (any asset) or a Publisher on their OWN
  const approver = perms.isApprover || (perms.canSelfPublish && isOwner);
  // send for approval: Super Admin / Brand Manager (any asset) or a Publisher on their OWN
  const canSubmit = perms.canSubmitAll || (perms.canSelfPublish && isOwner);
  // publish: Super Admin (any asset) or the OWNER of the asset (any role)
  const canPublish = perms.isApprover || isOwner;

  // lifecycle actions per status (role-gated; backend enforces too)
  let acts = null;
  if (!canModerate) acts = null;
  else if (a.status === "Draft") acts = canSubmit
    ? <button className="btn p" onClick={() => act("submit", "Submitted for review")}>Submit for review</button>
    : <span style={{ fontSize: 13, color: "var(--muted)", alignSelf: "center" }}>You don’t have access to send this for approval.</span>;
  else if (a.status === "In review") acts = approver
    ? <><button className="btn" onClick={() => act("approve", "Approved")}>Approve</button><button className="btn dgr" onClick={() => act("reject", "Sent back to draft")}>Send back</button></>
    : <span style={{ fontSize: 13, color: "var(--muted)", alignSelf: "center" }}>Awaiting a reviewer.</span>;
  else if (a.status === "Approved") acts = <>{canPublish && <button className="btn gold" onClick={() => act("publish", "Published — now Live")}>Publish · make Live</button>}<button className="btn" onClick={() => act("archive", "Archived")}>Archive</button></>;
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
          {a.media && (a.master?.mime || "").startsWith("video/")
            ? <video className="dprev vid" src={a.media} poster={a.preview || undefined} controls preload="metadata" />
            : a.media && (a.master?.mime || "").startsWith("audio/")
              ? <div className="dprev" style={{ display: "flex", alignItems: "center", padding: 16 }}><audio src={a.media} controls style={{ width: "100%" }} /></div>
              : a.doc && (a.master?.mime || "") === "application/pdf"
                ? <iframe title={a.name} src={a.doc} className="dprev pdf" />
                : (a.master?.mime || "").startsWith("image/") && a.preview
                  ? <div className="dprev zoom" title="Click to view full size" onClick={() => setShowImg(true)} dangerouslySetInnerHTML={{ __html: previewMarkup(a) }} />
                  : <div className="dprev" dangerouslySetInnerHTML={{ __html: previewMarkup(a) }} />}

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
            {a.channel && <span className="chip b">{a.channel}</span>}
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
            <dt>Version</dt><dd>v{a.version}</dd>
            <dt>Owner</dt><dd>{a.by}</dd>
            <dt>Expiry</dt><dd>{a.expiry ? fmtDate(a.expiry) : "Evergreen"}</dd>
          </dl>

          {versionGroups.length > 0 && (
            <div className="dvers">
              <h5>Versions <span className="tx-count">{versionGroups.length}</span></h5>
              {versionGroups.map((g) => (
                <div className={"dvg" + (openV === g.version ? " open" : "")} key={g.version}>
                  <button className="dvg-h" onClick={() => setOpenV(openV === g.version ? null : g.version)}>
                    <span className="dvn">v{g.version}</span>
                    <span className="dvg-title">Version {g.version}</span>
                    {cur && g.version === cur.version && <span className={"pubtag" + (a.status === "Live" ? " live" : "")}>{curLabel}</span>}
                    <span className="dvg-meta">{g.files.length} file{g.files.length !== 1 ? "s" : ""}{g.comments.length ? ` · ${g.comments.length} comment${g.comments.length !== 1 ? "s" : ""}` : ""}</span>
                    <span className="dvg-caret">{openV === g.version ? "▾" : "▸"}</span>
                  </button>
                  {openV === g.version && (
                    <div className="dvg-body">
                      {g.files.slice().sort((x, y) => y.revision - x.revision).map((v) => {
                        const isCur = curKey === v.version + "-" + v.revision;
                        return (
                          <div className={"dver" + (isCur ? " cur" : "")} key={v.revision}>
                            <span className="dvn sm">r{v.revision}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="fn" style={{ fontSize: 12.5 }}>{v.fname}{isCur && <span className={"pubtag" + (a.status === "Live" ? " live" : "")}>{curLabel}</span>}</div>
                              <div className="sp">{(v.ext || "").toUpperCase()} · {fmtBytes(v.size)} · {v.by} · {when(v.at)}</div>
                              {v.note && <div className="dvnote">“{v.note}”</div>}
                            </div>
                            <button className="btn sm" onClick={() => dlVersion(v)} title="Download this file">↓</button>
                          </div>
                        );
                      })}
                      {g.comments.length > 0 && (
                        <div className="dvg-conv">
                          {g.comments.map((c) => (
                            <div className="dcmt" key={c.id}>
                              <div className="dcmt-h"><b>{c.byName || "Someone"}</b><span>{when(c.at)}</span></div>
                              <div className="dcmt-t">{c.text}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {canDelete && <button className="btn dgr sm" onClick={del}>Delete asset</button>}
        </div>

        <div className="dact">
          <button className="btn p" onClick={dl} disabled={!a.master}>↓ Download {a.master ? "original" : ""}</button>
          {(a.status === "Approved" || a.status === "Live") && <button className="btn" onClick={() => setShareOpen(true)}>↗ Share</button>}
          {(a.status === "Approved" || a.status === "Live") && canModerate && <button className="btn" onClick={addChanges} title="Send back to the Version Tracker as the next version">✎ Add changes</button>}
          {acts}
        </div>
      </aside>
      {shareOpen && <ShareModal presetAsset={a} onClose={() => setShareOpen(false)} />}
      {showImg && (
        <div className="lightbox" onClick={() => setShowImg(false)}>
          <img src={a.image || a.preview} alt={a.name} onClick={(e) => e.stopPropagation()} />
          <button className="lb-x" onClick={() => setShowImg(false)} aria-label="Close">×</button>
        </div>
      )}
    </>
  );
}
