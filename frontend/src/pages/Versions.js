import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { uploadFullFile } from "../api/upload";
import { previewMarkup } from "../utils/thumbs";
import { fmtBytes } from "../utils/tm";
import ZipBrowser, { isZipFile } from "../components/ZipBrowser";

const when = (d) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

export default function Versions() {
  const { versions, fetchVersions, addComment, addVersion, updateStatus, fetchCounts, toast, tax, user, perms } = useApp();
  const { pathOf } = tax;
  const { items = [], status } = versions;

  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [domain, setDomain] = useState("all");
  const [selId, setSelId] = useState(null);
  const [comment, setComment] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(null);
  const [showImg, setShowImg] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    fetchVersions({ params: { q: dq, domain: domain === "all" ? "" : domain } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, domain]);

  // keep a valid selection as the list changes
  useEffect(() => {
    if (!items.length) { setSelId(null); return; }
    if (!items.find((a) => a.id === selId)) setSelId(items[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const sel = useMemo(() => items.find((a) => a.id === selId) || null, [items, selId]);

  const send = async (a) => {
    try { await updateStatus(a.id, "submit"); toast(`${a.name} sent for approval`); fetchCounts(); }
    catch (e) { toast(e.message || "Could not send"); }
  };

  const postComment = async () => {
    const text = comment.trim();
    if (!text || !sel) return;
    try { await addComment(sel.id, text); setComment(""); }
    catch (e) { toast(e.message || "Could not add comment"); }
  };

  const onNewVersion = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !sel) return;
    setBusy(true); setProg(0);
    try {
      const { master, previewKey } = await uploadFullFile(file, (p) => setProg(p));
      await addVersion(sel.id, master, previewKey, note.trim());
      setNote("");
      toast(`New revision added to ${sel.name}`);
    } catch (err) { toast(err.message || "Upload failed"); }
    finally { setBusy(false); setProg(null); }
  };

  const downloadVersion = async (a, v) => {
    try { const { url } = await api.get(`/assets/${a.id}/file-url?version=${v.version}&revision=${v.revision}`); window.open(url, "_blank"); }
    catch (e) { toast(e.message || "Could not get download link"); }
  };

  const domItems = [{ id: "all", name: "All domains" }].concat(tax.domains || []);

  return (
    <>
      <div className="crumb">Create / <b>Version Tracker</b></div>
      <h2 className="h1">Version Tracker</h2>
      <p className="sub">Uploaded work lands here first. Add new versions and leave feedback until it's ready — then send it for approval. Once a Super Admin approves, it moves to its domain in the Library.</p>

      <div className="rangebar" style={{ marginBottom: 14 }}>
        <select className="fbtn" value={domain} onChange={(e) => setDomain(e.target.value)}>
          {domItems.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div className="search" style={{ maxWidth: 280, marginLeft: "auto" }}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search in progress…" />
        </div>
      </div>

      {status === "loading" && !items.length ? <div className="empty">Loading…</div>
        : !items.length ? <div className="empty"><b>Nothing in progress</b>New uploads will appear here for revision before approval.</div>
        : (
          <div className="vx">
            {/* left — list */}
            <div className="vx-list">
              {items.map((a) => (
                <button key={a.id} className={"vx-row" + (a.id === selId ? " on" : "")} onClick={() => setSelId(a.id)}>
                  <span className="mini" dangerouslySetInnerHTML={{ __html: previewMarkup(a) }} />
                  <span className="vx-meta">
                    <span className="nm">{a.name}</span>
                    <span className="pth">{pathOf(a)}</span>
                  </span>
                  <span className="vx-vtag">v{a.versions?.length || 1}</span>
                </button>
              ))}
            </div>

            {/* right — detail */}
            {sel && (
              <div className="vx-detail">
                <div className="vx-dhead">
                  <span className="mini lg" dangerouslySetInnerHTML={{ __html: previewMarkup(sel) }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="nm" style={{ fontSize: 16 }}>{sel.name} <span className="vx-vtag">Version {sel.version}</span></div>
                    <div className="pth">{pathOf(sel)} · {sel.dist}</div>
                    <div className="pth" style={{ marginTop: 2 }}>Uploaded by {sel.by || "—"}</div>
                  </div>
                  {(perms.canSubmitAll || (perms.canSelfPublish && String(sel.owner) === String(user.id)))
                    ? <button className="btn p" onClick={() => send(sel)}>Send for approval</button>
                    : <span className="pathcell" style={{ maxWidth: 160, textAlign: "right" }}>You don’t have access to send this for approval</span>}
                </div>

                {(() => {
                  const mime = sel.master?.mime || "";
                  if (mime.startsWith("video/") && sel.media)
                    return <div className="vx-sec"><video className="vx-video" src={sel.media} poster={sel.preview || undefined} controls preload="metadata" /></div>;
                  if (mime.startsWith("audio/") && sel.media)
                    return <div className="vx-sec"><audio src={sel.media} controls style={{ width: "100%" }} /></div>;
                  if (mime === "application/pdf" && sel.doc)
                    return <div className="vx-sec"><iframe title={sel.name} src={sel.doc} className="vx-pdf" /><button className="btn pdf-open" onClick={() => setShowImg(true)} style={{ marginTop: 8 }}>⤢ Open full screen</button></div>;
                  if (mime.startsWith("image/") && (sel.image || sel.preview))
                    return <div className="vx-sec"><img className="vx-img" src={sel.image || sel.preview} alt={sel.name} onClick={() => setShowImg(true)} title="Click to view full size" /></div>;
                  // zips: list what's inside so it can be checked before downloading
                  if (isZipFile(sel.master))
                    return <div className="vx-sec"><ZipBrowser key={sel.id + "-" + (sel.versions?.length || 0)} assetId={sel.id} /></div>;
                  // spreadsheets have a generated snapshot preview; anything else shows a file badge
                  return <div className="vx-sec"><div className="vx-filebadge" dangerouslySetInnerHTML={{ __html: previewMarkup(sel) }} /></div>;
                })()}

                {/* revisions + history */}
                <div className="vx-sec">
                  <h4>Revisions &amp; history <span className="tx-count">{sel.versions?.length || 0}</span></h4>
                  <div className="vx-vers">
                    {(sel.versions || []).slice().sort((a, b) => (b.version - a.version) || (b.revision - a.revision)).map((v, i) => (
                      <div className={"vx-ver" + (i === 0 ? " cur" : "")} key={v.version + "-" + v.revision}>
                        <span className="vx-vn">v{v.version}<small>r{v.revision}</small></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="nm" style={{ fontSize: 13 }}>{v.fname}</div>
                          <div className="pth">{(v.ext || "").toUpperCase()} · {fmtBytes(v.size)} · {v.by} · {when(v.at)}{i === 0 ? " · current" : ""}</div>
                          {v.note && <div className="vx-vnote">“{v.note}”</div>}
                        </div>
                        <button className="btn sm" onClick={() => downloadVersion(sel, v)}>Download</button>
                      </div>
                    ))}
                  </div>
                  <div className="vx-addver">
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note — what changed in this revision…" />
                    <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>
                      {busy ? (prog != null ? `Uploading ${prog}%` : "Uploading…") : "+ Upload revision"}
                    </button>
                    <input ref={fileRef} type="file" hidden onChange={onNewVersion} />
                  </div>
                </div>

                {/* comments */}
                <div className="vx-sec">
                  <h4>Feedback <span className="tx-count">{sel.comments?.length || 0}</span></h4>
                  <div className="vx-comments">
                    {(sel.comments || []).length === 0 && <div className="pth">No comments yet. Leave feedback below.</div>}
                    {(sel.comments || []).map((c) => (
                      <div className={"vx-cmt" + (c.byName === user.name ? " me" : "")} key={c.id}>
                        <div className="vx-cmt-h"><b>{c.byName || "Someone"}</b><span>{when(c.at)}</span></div>
                        <div className="vx-cmt-t">{c.text}</div>
                      </div>
                    ))}
                  </div>
                  <div className="vx-addcmt">
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add feedback — e.g. “make the logo bigger”…"
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postComment(); }} />
                    <button className="btn p" disabled={!comment.trim()} onClick={postComment}>Comment</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      {showImg && sel && (
        <div className="lightbox" onClick={() => setShowImg(false)}>
          {(sel.master?.mime || "") === "application/pdf" && sel.doc
            ? <iframe title={sel.name} src={sel.doc} className="lb-pdf" onClick={(e) => e.stopPropagation()} />
            : <img src={sel.image || sel.preview} alt={sel.name} onClick={(e) => e.stopPropagation()} />}
          <button className="lb-x" onClick={() => setShowImg(false)} aria-label="Close">×</button>
        </div>
      )}
    </>
  );
}
