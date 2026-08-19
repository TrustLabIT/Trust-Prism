import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { confirmDialog } from "../components/Dialogs";

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 24) || ("d" + Date.now().toString(36));

// Editable list of strings, rendered as removable chips + an add input.
function ChipList({ values, onChange }) {
  const [v, setV] = useState("");
  const add = () => { const x = v.trim(); if (x && !values.includes(x)) onChange([...values, x]); setV(""); };
  return (
    <div className="chipedit">
      {values.map((val) => (
        <span className="c" key={val}>{val}<b onClick={() => onChange(values.filter((y) => y !== val))}>×</b></span>
      ))}
      <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="Add…" />
    </div>
  );
}

const VOCAB = [
  ["channels", "Channels"], ["dists", "Distribution classes"], ["audiences", "Audiences"],
  ["campaigns", "Campaigns"], ["services", "Service lines"], ["geos", "Geographies"],
  ["langs", "Languages"], ["specs", "Production specs"],
];

export default function Settings() {
  const { tax, saveTaxonomy, perms, toast } = useApp();
  const [t, setT] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // seed the working copy from the live taxonomy
    setT(JSON.parse(JSON.stringify({
      domains: tax.domains, channels: tax.channels, dists: tax.dists, audiences: tax.audiences,
      campaigns: tax.campaigns, services: tax.services, geos: tax.geos, langs: tax.langs, specs: tax.specs,
    })));
  }, [tax.loaded]); // eslint-disable-line react-hooks/exhaustive-deps

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
    try { await saveTaxonomy(t); toast("Taxonomy saved — it's live in the New Asset flow"); }
    catch (e) { toast(e.message || "Could not save"); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="crumb">Admin / <b>Settings · Taxonomy</b></div>
      <h2 className="h1">Taxonomy &amp; dropdowns</h2>
      <p className="sub">Everything the New Asset wizard and Library filters offer, by step and field. Add or remove values here and they appear immediately across the app.</p>

      <div className="tx-card">
        <h3>Step 3 · Filter dropdowns</h3>
        <p className="d">The value lists shown as dropdowns when describing an asset (and as filters in the Library).</p>
        <div className="tx-grid">
          {VOCAB.map(([k, label]) => (
            <div className="tx-vocab" key={k}>
              <label>{label}</label>
              <ChipList values={t[k] || []} onChange={(vals) => setVocab(k, vals)} />
            </div>
          ))}
        </div>
      </div>

      <div className="tx-card">
        <h3>Steps 1–2 · Domains, sub-modules &amp; asset types</h3>
        <p className="d">The structure the classify/file-it steps use. Asset <b>types</b> are the dropdown at step 2.</p>
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
                  <div style={{ marginTop: 5 }}><ChipList values={s.types || []} onChange={(vals) => patchSub(di, si, { types: vals })} /></div>
                </div>
              </div>
            ))}
            <button className="btn sm" style={{ marginTop: 10 }} onClick={() => addSub(di)}>+ Add sub-module</button>
          </div>
        ))}
        <button className="btn" onClick={addDomain}>+ Add domain</button>
      </div>

      <div className="tx-save">
        <button className="btn p" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        <span className="pathcell">Statuses (Draft → Live → Expired…) are fixed by the lifecycle and aren't editable.</span>
      </div>
    </>
  );
}
