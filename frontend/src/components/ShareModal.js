import { useEffect, useState, useRef } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { previewMarkup } from "../utils/thumbs";

// onClose(): close. presetAsset: when set, share just that one asset (skip the picker).
export default function ShareModal({ onClose, presetAsset = null }) {
  const { addShare, toast, tax } = useApp();
  const preset = !!presetAsset;

  const [name, setName] = useState(presetAsset ? presetAsset.name : "");
  const [to, setTo] = useState("");
  const [include, setInclude] = useState(preset ? "Specific assets" : "Specific assets");
  const [scopeDomain, setScopeDomain] = useState(tax.domains[0]?.id || "");
  const [scopeSub, setScopeSub] = useState("");
  const [q, setQ] = useState("");
  const [pickDomain, setPickDomain] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState(preset ? { [presetAsset.id]: presetAsset } : {});
  const [perm, setPerm] = useState("View only");
  const [exp, setExp] = useState("No expiry");
  const [pw, setPw] = useState(false);
  const [password, setPassword] = useState("");
  const [wm, setWm] = useState(true);
  const [busy, setBusy] = useState(false);
  const [createdLink, setCreatedLink] = useState("");
  const debounce = useRef(null);

  useEffect(() => {
    if (preset || include !== "Specific assets") return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ status: "Approved,Live", limit: "50" });
        if (q.trim()) qs.set("q", q.trim());
        if (pickDomain) qs.set("domain", pickDomain);
        const r = await api.get("/assets?" + qs.toString());
        setResults(r.assets || []);
      } catch (e) { toast(e.message || "Search failed"); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [q, pickDomain, include, preset, toast]);

  const toggle = (a) => setPicked((p) => { const n = { ...p }; if (n[a.id]) delete n[a.id]; else n[a.id] = a; return n; });
  const pickedIds = Object.keys(picked);
  const subs = tax.dom(scopeDomain)?.subs || [];

  const save = async () => {
    if (!name.trim()) return toast("Name the share link");
    if (include === "Specific assets" && pickedIds.length === 0) return toast("Pick at least one asset");
    if (include === "A category" && !scopeDomain) return toast("Choose a category");
    if (pw && password.trim().length < 4) return toast("Password must be at least 4 characters");
    setBusy(true);
    try {
      const share = await addShare({
        name: name.trim(), to: to.trim() || "specific people", include,
        assets: include === "Specific assets" ? pickedIds : [],
        scopeDomain: include === "A category" ? scopeDomain : "",
        scopeSub: include === "A category" ? scopeSub : "",
        perm, exp: exp === "No expiry" ? "No expiry" : `Expires in ${exp}`,
        wm, password: pw ? password.trim() : "",
      });
      const link = share?.token ? `${window.location.origin}/s/${share.token}` : "";
      setCreatedLink(link);
      toast("Share link created");
    } catch (e) { toast(e.message || "Could not create share link"); }
    finally { setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(createdLink); toast("Link copied to clipboard"); }
    catch { toast("Could not copy"); }
  };

  return (
    <div className="modal-scrim open" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{preset ? "Share this asset" : "New share link"}</h2>
          <button className="x" onClick={onClose} style={{ fontSize: 22, color: "var(--muted)" }}>×</button>
        </div>

        {createdLink ? (
          <>
            <div className="modal-body">
              <div className="verdict" style={{ marginBottom: 14 }}>✓ Your link is ready. Anyone with it sees {preset ? "this asset" : "the shared items"} — always the current approved version.</div>
              <div className="field"><label>Shareable link</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="text" readOnly value={createdLink} style={{ flex: 1, padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 9, fontFamily: "ui-monospace,monospace", fontSize: 12.5 }} />
                  <button className="btn p" onClick={copy}>Copy</button>
                </div>
              </div>
            </div>
            <div className="modal-foot"><button className="btn" onClick={onClose}>Done</button></div>
          </>
        ) : (
          <>
            <div className="modal-body" style={{ maxHeight: "72vh", overflowY: "auto" }}>
              {preset && (
                <div className="apick" style={{ maxHeight: "none", marginTop: 0, marginBottom: 4 }}>
                  <table className="lst"><tbody>
                    <tr style={{ cursor: "default" }}>
                      <td style={{ width: 52 }}><span className="th" dangerouslySetInnerHTML={{ __html: previewMarkup(presetAsset) }} /></td>
                      <td style={{ fontWeight: 600 }}>{presetAsset.name}</td>
                      <td className="pathcell">{tax.dom(presetAsset.domain)?.name} › {tax.subOf(presetAsset.domain, presetAsset.sub)?.name || presetAsset.type}</td>
                    </tr>
                  </tbody></table>
                </div>
              )}

              <div className="field"><label>Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Father's Day Press Kit" /></div>
              <div className="two">
                <div className="field"><label>Share with (audience)</label><input type="text" value={to} onChange={(e) => setTo(e.target.value)} placeholder="e.g. external agencies" /></div>
                {!preset && (
                  <div className="field"><label>Include</label>
                    <select value={include} onChange={(e) => setInclude(e.target.value)}>
                      <option>Specific assets</option><option>A category</option><option>Whole portal</option>
                    </select></div>
                )}
              </div>

              {!preset && include === "A category" && (
                <div className="two">
                  <div className="field"><label>Domain</label>
                    <select value={scopeDomain} onChange={(e) => { setScopeDomain(e.target.value); setScopeSub(""); }}>
                      {tax.domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select></div>
                  <div className="field"><label>Sub-module</label>
                    <select value={scopeSub} onChange={(e) => setScopeSub(e.target.value)}>
                      <option value="">All sub-modules</option>
                      {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select></div>
                </div>
              )}

              {!preset && include === "Specific assets" && (
                <div className="field">
                  <label>Pick assets <span className="hint">· {pickedIds.length} selected · Approved/Live only</span></label>
                  <div className="two" style={{ marginBottom: 8 }}>
                    <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, campaign, type…" />
                    <select value={pickDomain} onChange={(e) => setPickDomain(e.target.value)}>
                      <option value="">All domains</option>
                      {tax.domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  {pickedIds.length > 0 && (
                    <div className="chipedit" style={{ marginBottom: 8 }}>
                      {pickedIds.map((id) => <span className="c" key={id}>{picked[id].name}<b onClick={() => toggle(picked[id])}>×</b></span>)}
                    </div>
                  )}
                  <div className="apick">
                    <table className="lst">
                      <thead><tr><th style={{ width: 34 }}></th><th style={{ width: 52 }}></th><th>Name</th><th>Category</th></tr></thead>
                      <tbody>
                        {loading ? <tr><td colSpan={4} className="apick-empty">Searching…</td></tr>
                          : results.length === 0 ? <tr><td colSpan={4} className="apick-empty">No Approved/Live assets match.</td></tr>
                          : results.map((a) => (
                            <tr key={a.id} className={picked[a.id] ? "sel" : ""} onClick={() => toggle(a)}>
                              <td><input type="checkbox" checked={!!picked[a.id]} readOnly /></td>
                              <td><span className="th" dangerouslySetInnerHTML={{ __html: previewMarkup(a) }} /></td>
                              <td style={{ fontWeight: 600 }}>{a.name}</td>
                              <td className="pathcell">{tax.dom(a.domain)?.name} › {tax.subOf(a.domain, a.sub)?.name || a.type}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="two">
                <div className="field"><label>Permission</label>
                  <select value={perm} onChange={(e) => setPerm(e.target.value)}><option>View only</option><option>Download</option></select></div>
                <div className="field"><label>Link expiry</label>
                  <select value={exp} onChange={(e) => setExp(e.target.value)}><option>No expiry</option><option>7 days</option><option>30 days</option><option>90 days</option></select></div>
              </div>
              <div className="two">
                <div className="field"><label>Password protect</label>
                  <label className="check"><input type="checkbox" checked={pw} onChange={(e) => setPw(e.target.checked)} /> Require a password</label>
                  {pw && <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="recipients must enter this" style={{ marginTop: 8 }} />}
                </div>
                <div className="field"><label>Watermark</label>
                  <label className="check"><input type="checkbox" checked={wm} onChange={(e) => setWm(e.target.checked)} /> Show watermark badge</label>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn p" onClick={save} disabled={busy}>{busy ? "Creating…" : "Create link"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
