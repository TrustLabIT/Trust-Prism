import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { confirmDialog, choiceDialog } from "../components/Dialogs";
import { setNavGuard, clearNavGuard } from "../utils/navGuard";

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 24) || ("d" + Date.now().toString(36));

// Editable list of strings: removable chips + an input with a visible "+ Add".
// Nothing here touches the server — it only updates the page's working copy.
// The single "Save changes" button at the bottom persists everything at once.
function ChipList({ values, onChange, placeholder = "Type a value…" }) {
  const [v, setV] = useState("");
  const inputRef = useRef(null);
  const add = () => {
    const x = v.trim();
    if (!x) return;
    if (!values.includes(x)) onChange([...values, x]);
    setV("");
    inputRef.current?.focus(); // keep focus so you can add several in a row
  };
  return (
    <div className="chipedit">
      <div className="chips">
        {values.length === 0
          ? <span className="chip-empty">Nothing added yet</span>
          : values.map((val) => (
            <span className="c" key={val}>{val}<b onClick={() => onChange(values.filter((y) => y !== val))} title="Remove">×</b></span>
          ))}
      </div>
      <div className="addrow">
        <input
          ref={inputRef}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
        />
        <button type="button" className="addbtn" onClick={add} disabled={!v.trim()} title="Add to the list">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M10 4v12M4 10h12" /></svg>
          Add
        </button>
      </div>
    </div>
  );
}

const VOCAB = [
  ["channels", "Channels"], ["dists", "Distribution classes"], ["audiences", "Audiences"],
  ["campaigns", "Campaigns"], ["services", "Service lines"], ["geos", "Geographies"],
  ["langs", "Languages"], ["specs", "Production specs"],
];

const snapshot = (tax) => JSON.parse(JSON.stringify({
  domains: tax.domains, channels: tax.channels, dists: tax.dists, audiences: tax.audiences,
  campaigns: tax.campaigns, services: tax.services, geos: tax.geos, langs: tax.langs, specs: tax.specs,
}));

export default function Settings() {
  const { tax, saveTaxonomy, perms, toast } = useApp();
  const [t, setT] = useState(null);        // working copy (unsaved)
  const [saved, setSaved] = useState(null); // last-saved copy, to detect changes
  const [busy, setBusy] = useState(false);
  const guardRef = useRef(); // holds latest { dirty, save, discard } for the nav guard

  useEffect(() => {
    // seed the working copy from the live taxonomy
    const snap = snapshot(tax);
    setT(snap);
    setSaved(JSON.parse(JSON.stringify(snap)));
  }, [tax.loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = !!(t && saved && JSON.stringify(t) !== JSON.stringify(saved));

  // Warn before leaving the page with unsaved changes. Registered once; the ref
  // keeps the guard pointed at the latest state/handlers.
  useEffect(() => {
    const guard = async () => {
      const g = guardRef.current;
      if (!g || !g.dirty) return true;
      const choice = await choiceDialog({
        title: "Unsaved changes",
        message: "You’ve added or removed values but haven’t saved yet. What would you like to do?",
        buttons: [
          { label: "Stay on page", value: "stay", kind: "" },
          { label: "Leave without saving", value: "discard", kind: "dgr" },
          { label: "Save & continue", value: "save", kind: "p" },
        ],
        dismissValue: "stay",
      });
      if (choice === "save") return await g.save();   // only leave if the save succeeded
      if (choice === "discard") { g.discard(); return true; }
      return false;                                   // stay
    };
    setNavGuard(guard);
    return () => clearNavGuard(guard);
  }, []);

  // Native prompt for browser refresh / tab close while there are unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  if (!perms.canManageSettings) return (
    <><div className="crumb">Admin / <b>Settings</b></div><div className="empty"><b>Restricted</b>Only a Super Admin can edit the taxonomy.</div></>
  );
  if (!t) return <div className="empty">Loading…</div>;

  const setVocab = (k, vals) => setT((s) => ({ ...s, [k]: vals }));
  const setDomains = (domains) => setT((s) => ({ ...s, domains }));
  const patchDomain = (i, patch) => setDomains(t.domains.map((d, x) => (x === i ? { ...d, ...patch } : d)));
  const patchSub = (di, si, patch) => patchDomain(di, { subs: t.domains[di].subs.map((s, x) => (x === si ? { ...s, ...patch } : s)) });

  const addDomain = () => setDomains([...t.domains, { id: slug("domain " + (t.domains.length + 1)), name: "New domain", color: "#16624C", tint: "#E4F2ED", note: "", test: "", subs: [] }]);
  const delDomain = async (i) => {
    const ok = await confirmDialog({ title: "Delete domain", message: `Delete “${t.domains[i].name}” and its sub-modules? Existing assets filed under it will be hidden until re-filed.`, confirmLabel: "Delete", danger: true });
    if (ok) setDomains(t.domains.filter((_, x) => x !== i));
  };
  const addSub = (di) => patchDomain(di, { subs: [...(t.domains[di].subs || []), { id: slug("sub " + Date.now()), name: "New sub-module", types: [] }] });
  const delSub = (di, si) => patchDomain(di, { subs: t.domains[di].subs.filter((_, x) => x !== si) });

  const save = async () => {
    setBusy(true);
    try {
      await saveTaxonomy(t);
      setSaved(JSON.parse(JSON.stringify(t)));
      toast("Saved — it's live in the New Asset flow");
      return true;
    } catch (e) { toast(e.message || "Could not save"); return false; }
    finally { setBusy(false); }
  };

  const discard = () => setT(JSON.parse(JSON.stringify(saved)));

  guardRef.current = { dirty, save, discard }; // keep the nav guard on latest state

  return (
    <>
      <div className="crumb">Admin / <b>Settings · Taxonomy</b></div>
      <div className="tx-head">
        <div>
          <h2 className="h1">Taxonomy &amp; dropdowns</h2>
          <p className="sub" style={{ margin: 0 }}>Everything the New Asset wizard and Library filters offer. Add or remove values, then click <b>Save changes</b> — nothing is saved until you do.</p>
        </div>
        {dirty && <span className="tx-badge">● Unsaved changes</span>}
      </div>

      <div className="tx-card">
        <h3>Dropdown values</h3>
        <p className="d">These lists appear as dropdowns when describing an asset, and as filters in the Library. Type a value and click <b>+ Add</b> (or press Enter). Add as many as you like, then Save.</p>
        <div className="tx-grid">
          {VOCAB.map(([k, label]) => (
            <div className="tx-vocab" key={k}>
              <label>{label} <span className="tx-count">{(t[k] || []).length}</span></label>
              <ChipList values={t[k] || []} onChange={(vals) => setVocab(k, vals)} placeholder={`Add a ${label.toLowerCase().replace(/s$/, "")}…`} />
            </div>
          ))}
        </div>
      </div>

      <div className="tx-card">
        <h3>Domains, sub-modules &amp; asset types</h3>
        <p className="d">The structure the Classify and File-it steps use. Asset <b>types</b> are the dropdown at step 2.</p>
        {t.domains.map((d, di) => (
          <div className="tx-domain" style={{ "--c": d.color }} key={di}>
            <div className="tx-drow">
              <input type="color" value={d.color} onChange={(e) => patchDomain(di, { color: e.target.value })} title="Domain colour" />
              <input type="text" value={d.name} onChange={(e) => patchDomain(di, { name: e.target.value })} placeholder="Domain name" style={{ flex: 1, minWidth: 160, fontWeight: 700 }} />
              <span className="pathcell">id: {d.id}</span>
              <button className="btn sm dgr" onClick={() => delDomain(di)}>Delete domain</button>
            </div>
            <div className="two" style={{ marginTop: 10 }}>
              <div className="field" style={{ margin: 0 }}><label>Description</label><input type="text" value={d.note || ""} onChange={(e) => patchDomain(di, { note: e.target.value })} /></div>
              <div className="field" style={{ margin: 0 }}><label>Sorting test</label><input type="text" value={d.test || ""} onChange={(e) => patchDomain(di, { test: e.target.value })} /></div>
            </div>

            {(d.subs || []).map((s, si) => (
              <div className="tx-sub" key={si}>
                <div className="tx-drow">
                  <input type="text" value={s.name} onChange={(e) => patchSub(di, si, { name: e.target.value })} placeholder="Sub-module name" style={{ flex: 1, minWidth: 150, fontWeight: 650 }} />
                  <span className="pathcell">id: {s.id}</span>
                  <button className="btn sm" onClick={() => delSub(di, si)}>Remove</button>
                </div>
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Asset types</label>
                  <div style={{ marginTop: 5 }}><ChipList values={s.types || []} onChange={(vals) => patchSub(di, si, { types: vals })} placeholder="Add a type…" /></div>
                </div>
              </div>
            ))}
            <button className="btn sm" style={{ marginTop: 10 }} onClick={() => addSub(di)}>+ Add sub-module</button>
          </div>
        ))}
        <button className="btn" onClick={addDomain}>+ Add domain</button>
      </div>

      <div className="tx-save">
        <button className="btn p" onClick={save} disabled={busy || !dirty}>{busy ? "Saving…" : dirty ? "Save changes" : "Saved"}</button>
        {dirty && !busy && <button className="btn" onClick={discard}>Discard</button>}
        <span className="pathcell">{dirty ? "You have unsaved changes." : "Statuses (Draft → Live → Expired…) are fixed by the lifecycle and aren't editable."}</span>
      </div>
    </>
  );
}
