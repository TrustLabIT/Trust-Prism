import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";

export default function BrandKit() {
  const { brandKit, brandCanEdit, updateBrandKit, uploadLogo, removeLogo, toast } = useApp();
  const [colors, setColors] = useState([]);
  const [fonts, setFonts] = useState({ heading: "", body: "" });
  const [savingC, setSavingC] = useState(false);
  const [savingF, setSavingF] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoDark, setLogoDark] = useState(false);
  const fileRef = useRef(null);

  // seed local edit state from the loaded kit
  useEffect(() => {
    setColors(brandKit.colors || []);
    setFonts({ heading: brandKit.fonts?.heading || "", body: brandKit.fonts?.body || "" });
  }, [brandKit]);

  const setColor = (i, patch) => setColors((cs) => cs.map((c, x) => (x === i ? { ...c, ...patch } : c)));
  const addColor = () => setColors((cs) => [...cs, { name: "New", hex: "#4f46e5" }]);
  const delColor = (i) => setColors((cs) => cs.filter((_, x) => x !== i));

  const saveColors = async () => {
    setSavingC(true);
    try { await updateBrandKit({ colors }); toast("Color palette saved ✓"); }
    catch (e) { toast(e.message); } finally { setSavingC(false); }
  };
  const saveFonts = async () => {
    setSavingF(true);
    try { await updateBrandKit({ fonts }); toast("Typography saved ✓"); }
    catch (e) { toast(e.message); } finally { setSavingF(false); }
  };
  const pickLogo = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const form = new FormData();
    form.append("file", f);
    form.append("label", f.name);
    form.append("dark", String(logoDark));
    setUploading(true);
    try { await uploadLogo(form); toast("Logo uploaded ✓"); }
    catch (err) { toast(err.message || "Upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  };
  const delLogo = async (key) => {
    try { await removeLogo(key); toast("Logo removed"); }
    catch (e) { toast(e.message); }
  };

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <div className="crumbs">Create / <b>Brand Kit</b></div>
          <h1>Brand Kit</h1><p>The single source of truth for how the brand looks and sounds.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => toast("Brand guidelines shared")}>🔗 Share Guidelines</button>
      </div>

      {!brandCanEdit && (
        <div className="callout-card" style={{ marginBottom: 18 }}>
          <b>🔒 View only</b>
          <p>Only a <b>Brand Manager</b> or <b>Super Admin</b> can edit the Brand Kit. You can view the current brand assets below.</p>
        </div>
      )}

      {/* Colors */}
      <div className="bk-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div><h3>Color Palette</h3><div className="desc">Primary and secondary brand colors with usage rules.</div></div>
          {brandCanEdit && (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" onClick={addColor}>＋ Add color</button>
              <button className="btn btn-primary" onClick={saveColors} disabled={savingC}>{savingC ? "Saving…" : "Save colors"}</button>
            </div>
          )}
        </div>
        <div className="swatches">
          {colors.map((c, i) => (
            <div className="swatch" key={i}>
              {brandCanEdit ? (
                <>
                  <label className="chipc" style={{ background: c.hex, display: "block", cursor: "pointer" }}>
                    <input type="color" value={c.hex} onChange={(e) => setColor(i, { hex: e.target.value })} style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} />
                  </label>
                  <input value={c.name} onChange={(e) => setColor(i, { name: e.target.value })} style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 6, padding: "4px 6px", fontSize: 12, fontWeight: 700, marginTop: 7 }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                    <span className="sh">{c.hex}</span>
                    <button onClick={() => delColor(i)} title="Remove" style={{ color: "var(--danger)", fontSize: 12, fontWeight: 700 }}>✕</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="chipc" style={{ background: c.hex }}></div>
                  <div className="sn">{c.name}</div><div className="sh">{c.hex}</div>
                </>
              )}
            </div>
          ))}
          {colors.length === 0 && <div className="perf-empty">No colors defined yet.</div>}
        </div>
      </div>

      {/* Typography */}
      <div className="bk-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div><h3>Typography</h3><div className="desc">Approved typefaces for headings and body.</div></div>
          {brandCanEdit && <button className="btn btn-primary" onClick={saveFonts} disabled={savingF}>{savingF ? "Saving…" : "Save fonts"}</button>}
        </div>
        <div className="fonts">
          <div className="fontcard">
            <div className="fbig" style={{ fontFamily: "Georgia,serif" }}>Aa Bb Cc</div>
            {brandCanEdit
              ? <input value={fonts.heading} onChange={(e) => setFonts((f) => ({ ...f, heading: e.target.value }))} placeholder="Heading font" style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 8px", marginTop: 8 }} />
              : <div className="fname">Headings · "{fonts.heading || "—"}"</div>}
          </div>
          <div className="fontcard">
            <div className="fbig" style={{ fontFamily: "-apple-system,sans-serif", fontWeight: 400 }}>Aa Bb Cc</div>
            {brandCanEdit
              ? <input value={fonts.body} onChange={(e) => setFonts((f) => ({ ...f, body: e.target.value }))} placeholder="Body font" style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 8px", marginTop: 8 }} />
              : <div className="fname">Body · "{fonts.body || "—"}"</div>}
          </div>
        </div>
      </div>

      {/* Logos */}
      <div className="bk-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div><h3>Logos</h3><div className="desc">Upload logo variants (PNG/SVG). Served from your S3 bucket.</div></div>
          {brandCanEdit && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                <input type="checkbox" checked={logoDark} onChange={(e) => setLogoDark(e.target.checked)} /> for dark background
              </label>
              <input ref={fileRef} type="file" hidden accept="image/*" onChange={pickLogo} />
              <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "Uploading…" : "⬆ Upload logo"}</button>
            </div>
          )}
        </div>
        <div className="logos">
          {(brandKit.logos || []).map((l) => (
            <div className={"logobox" + (l.dark ? " dark" : "")} key={l.key} style={{ position: "relative" }}>
              {l.url ? <img src={l.url} alt={l.label} style={{ maxWidth: "80%", maxHeight: "70%", objectFit: "contain" }} /> : <span className="sh">{l.label}</span>}
              {brandCanEdit && (
                <button onClick={() => delLogo(l.key)} title="Remove logo"
                  style={{ position: "absolute", top: 6, right: 6, background: "rgba(255,255,255,.9)", borderRadius: 6, width: 22, height: 22, color: "var(--danger)", fontWeight: 700 }}>✕</button>
              )}
            </div>
          ))}
          {(brandKit.logos || []).length === 0 && <div className="perf-empty">No logos uploaded yet.</div>}
        </div>
      </div>
    </section>
  );
}
