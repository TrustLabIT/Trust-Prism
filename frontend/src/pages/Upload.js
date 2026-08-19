import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { todayISO, fmtBytes, fmtDate } from "../utils/tm";
import { uploadMaster, uploadPreview, makeImagePreview, imageDims, sha256OfFile } from "../api/upload";
import { guessThumb } from "../utils/thumbs";

const blank = () => ({
  step: 1, name: "", file: null, master: null, previewKey: null, uploading: false, progress: 0,
  q1: null, q2: null, q3: null, domain: null, sub: null, type: "", channel: "",
  dist: "", audience: "Consumer", campaign: "Always-on", service: "General",
  geo: "All centres", lang: "English", spec: "RGB", date: todayISO(), expiry: "", err: "",
});
const verdictOf = (w) => {
  if (w.q1 === true) return "demand";
  if (w.q1 === false && w.q2 === true) return "compliance";
  if (w.q1 === false && w.q2 === false && w.q3 === true) return "foundation";
  if (w.q1 === false && w.q2 === false && w.q3 === false) return "collateral";
  return null;
};

export default function Upload() {
  const { confirmUpload, fetchCounts, toast, tax } = useApp();
  const { dom, subOf } = tax;
  const CHANNELS = tax.channels, DISTS = tax.dists, AUDIENCES = tax.audiences, CAMPAIGNS = tax.campaigns,
    SERVICES = tax.services, GEOS = tax.geos, LANGS = tax.langs, SPECS = tax.specs;
  const nav = useNavigate();
  const [W, setW] = useState(blank);
  const set = (patch) => setW((w) => ({ ...w, ...patch }));
  const s = W.step;

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const nm = W.name.trim() || f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    set({ file: f, name: nm, err: "", uploading: true, progress: 0, master: null, previewKey: null });
    try {
      toast("Uploading master — this may take a moment for large files…");
      const dims = await imageDims(f);
      const key = await uploadMaster(f, (p) => set({ progress: p }));
      let previewKey = null;
      const blob = await makeImagePreview(f);
      if (blob) previewKey = await uploadPreview(blob, f.name + ".webp");
      const sha = await sha256OfFile(f);
      const ext = (f.name.includes(".") ? f.name.split(".").pop() : "FILE").toUpperCase();
      set({
        uploading: false, progress: 100, previewKey,
        master: { key, fname: f.name, mime: f.type || "application/octet-stream", ext, size: f.size, sha256: sha, w: dims.w, h: dims.h },
      });
      toast(`Master stored · ${fmtBytes(f.size)}${sha ? " · checksummed" : ""}`);
    } catch (err) {
      set({ uploading: false, err: err.message || "Upload failed" });
      toast(err.message || "Upload failed");
    }
  };

  const next = () => {
    if (s === 1) {
      const v = verdictOf(W);
      if (!W.name.trim()) return set({ err: "Give the asset a name." });
      if (!v) return set({ err: "Answer the sorting questions so the asset can be routed." });
      return set({ domain: v, err: "", step: 2 });
    }
    if (s === 2) {
      if (!W.sub) return set({ err: "Choose a sub-module." });
      if (!W.type) return set({ err: "Choose an asset type." });
      if (!W.channel) return set({ err: "Choose a channel." });
      return set({ err: "", step: 3 });
    }
    if (s === 3) {
      if (!W.dist) return set({ err: "Distribution class is mandatory — decide who may see and share this." });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(W.date)) return set({ err: "Set the asset date." });
      if (W.expiry && W.expiry < W.date) return set({ err: "Expiry cannot fall before the asset date." });
      return set({ err: "", step: 4 });
    }
    if (s === 4) {
      if (W.uploading) return set({ err: "Wait for the upload to finish." });
      if (!W.master) return set({ err: "Attach a master file — an asset record without its master is a broken promise." });
      return set({ err: "", step: 5 });
    }
  };

  const submit = async () => {
    try {
      await confirmUpload({
        name: W.name.trim(), domain: W.domain, sub: W.sub, type: W.type, channel: W.channel,
        dist: W.dist, audience: W.audience, campaign: W.campaign, service: W.service,
        geo: W.geo, lang: W.lang, spec: W.spec, date: W.date, expiry: W.expiry || null,
        master: W.master, previewKey: W.previewKey, thumb: guessThumb(W.type, W.channel),
      });
      fetchCounts();
      toast("Submitted for review — it is in the Approvals queue");
      nav("/approvals");
    } catch (e) { set({ err: e.message || "Could not submit" }); }
  };

  const stepbar = ["Classify", "File it", "Describe it", "Upload", "Review"].map((t, i) => (
    <div className={"step" + (s === i + 1 ? " on" : "") + (s > i + 1 ? " done" : "")} key={t}>{t}</div>
  ));

  const v1 = verdictOf(W);
  const D = W.domain ? dom(W.domain) : null;
  const types = W.sub ? subOf(W.domain, W.sub)?.types || [] : [];
  const YN = (k, label) => (
    <div className="q"><p>{label}</p>
      <div className="yn">
        <button className={W[k] === true ? "on" : ""} onClick={() => set({ [k]: true, ...(k === "q1" ? { q2: null, q3: null } : k === "q2" ? { q3: null } : {}), err: "" })}>Yes</button>
        <button className={W[k] === false ? "on" : ""} onClick={() => set({ [k]: false, err: "" })}>No</button>
      </div>
    </div>
  );

  return (
    <>
      <div className="crumb">Create / <b>New Asset</b></div>
      <h2 className="h1">New asset</h2>
      <p className="sub">A guided upload is the only thing that keeps a taxonomy alive. Free-text folders and optional tags decay within a quarter.</p>
      <div className="wiz">
        <div className="steps">{stepbar}</div>
        <div className="wcard">

          {s === 1 && (<>
            <h3>Classify the asset</h3>
            <p className="lead">Three questions decide the domain. The person uploading answers them — you never arbitrate.</p>
            <div className="field"><label className="req">Asset name</label>
              <input type="text" value={W.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Kurnool Hoarding — Care Plans" /></div>
            {YN("q1", "Is its job to persuade someone outside the company to choose TrustLab?")}
            {W.q1 === false && YN("q2", "Is it an accreditation mark or a regulatory certificate?")}
            {W.q1 === false && W.q2 === false && YN("q3", "Is it part of the identity system itself — logo, colour, typography, corporate photography?")}
            {v1 && dom(v1) && <div className="verdict"><b>→ {dom(v1).name}</b>{dom(v1).note}</div>}
          </>)}

          {s === 2 && (<>
            <h3>File it</h3>
            <p className="lead">Domain <b>{D?.name}</b>. Pick the sub-module, then the asset type. Channel is recorded separately so “all print” or “all video” works across every domain.</p>
            <div className="field"><label className="req">Sub-module</label>
              <div className="pick">{D?.subs.map((x) => <button key={x.id} className={W.sub === x.id ? "on" : ""} onClick={() => set({ sub: x.id, type: "", err: "" })}>{x.name}</button>)}</div></div>
            {W.sub && <div className="field"><label className="req">Asset type</label>
              <select value={W.type} onChange={(e) => set({ type: e.target.value })}><option value="">Choose…</option>{types.map((t) => <option key={t}>{t}</option>)}</select></div>}
            {W.sub && <div className="field"><label className="req">Channel</label>
              <select value={W.channel} onChange={(e) => set({ channel: e.target.value })}><option value="">Choose…</option>{CHANNELS.map((c) => <option key={c}>{c}</option>)}</select></div>}
          </>)}

          {s === 3 && (<>
            <h3>Describe it</h3>
            <p className="lead">Distribution class is mandatory — it is a decision, not a default. Everything else is a filter you'll be glad exists in six months.</p>
            <div className="field"><label className="req">Distribution class <span className="hint">who is allowed to see and share this</span></label>
              <select value={W.dist} onChange={(e) => set({ dist: e.target.value })}><option value="">Choose…</option>{DISTS.map((d) => <option key={d}>{d}</option>)}</select></div>
            <div className="two">
              <div className="field"><label>Audience</label><select value={W.audience} onChange={(e) => set({ audience: e.target.value })}>{AUDIENCES.map((d) => <option key={d}>{d}</option>)}</select></div>
              <div className="field"><label>Campaign</label><select value={W.campaign} onChange={(e) => set({ campaign: e.target.value })}>{CAMPAIGNS.map((d) => <option key={d}>{d}</option>)}</select></div>
              <div className="field"><label>Service line</label><select value={W.service} onChange={(e) => set({ service: e.target.value })}>{SERVICES.map((d) => <option key={d}>{d}</option>)}</select></div>
              <div className="field"><label>Geography</label><select value={W.geo} onChange={(e) => set({ geo: e.target.value })}>{GEOS.map((d) => <option key={d}>{d}</option>)}</select></div>
              <div className="field"><label>Language</label><select value={W.lang} onChange={(e) => set({ lang: e.target.value })}>{LANGS.map((d) => <option key={d}>{d}</option>)}</select></div>
              <div className="field"><label>Production spec</label><select value={W.spec} onChange={(e) => set({ spec: e.target.value })}>{SPECS.map((d) => <option key={d}>{d}</option>)}</select></div>
            </div>
            <div className="two">
              <div className="field"><label className="req">Asset date <span className="hint">when it was created or published</span></label><input type="date" value={W.date} onChange={(e) => set({ date: e.target.value })} /></div>
              <div className="field"><label>Expiry date <span className="hint">blank means evergreen</span></label><input type="date" value={W.expiry} onChange={(e) => set({ expiry: e.target.value })} /></div>
            </div>
          </>)}

          {s === 4 && (<>
            <h3>Upload the master file</h3>
            <p className="lead">The file you upload is the file that comes back out. TrustMark stores the master untouched — big files upload straight to secure storage — and every download returns those exact bytes under the original filename.</p>
            <div className="field"><label className="req">Master file <span className="hint">any format — PNG, JPG, TIFF, PDF, AI, PSD, INDD, MP4, WAV, ZIP</span></label>
              <label className={"drop" + (W.master || W.uploading ? " has" : "")}>
                <input type="file" style={{ display: "none" }} onChange={onFile} disabled={W.uploading} />
                {W.master ? (<>
                  <div className="big">{W.master.fname}</div>
                  <div className="sm">{W.master.mime} · {fmtBytes(W.master.size)}{W.master.w ? ` · ${W.master.w} × ${W.master.h} px` : ""}</div>
                  {W.master.sha256 && <div className="sm" style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, marginTop: 5 }}>SHA-256 {W.master.sha256.slice(0, 32)}…</div>}
                  <span className="swap">Choose a different file</span>
                </>) : W.uploading ? (<>
                  <div className="big">Uploading… {W.progress}%</div>
                  <div className="uprog"><span style={{ width: W.progress + "%" }} /></div>
                </>) : (<>
                  <div className="big">Choose a file to upload</div>
                  <div className="sm">Stored as the master rendition — bit-for-bit, at full quality</div>
                </>)}
              </label></div>
            {W.master && <div className="verdict">✓ Master stored{W.master.sha256 ? " and checksummed" : ""}. It downloads back byte-identical, as <b>{W.master.fname}</b>.</div>}
          </>)}

          {s === 5 && (<>
            <h3>Review and submit</h3>
            <p className="lead">This enters the queue as <b>In review</b>. It becomes visible to the wider team once approved.</p>
            <dl className="rev">
              <dt>Master file</dt><dd>{W.master.fname} · {W.master.mime} · {fmtBytes(W.master.size)}{W.master.w ? ` · ${W.master.w} × ${W.master.h} px` : ""}</dd>
              <dt>Name</dt><dd>{W.name}</dd>
              <dt>Files under</dt><dd>{dom(W.domain).name} › {subOf(W.domain, W.sub).name} › {W.type}</dd>
              <dt>Channel</dt><dd>{W.channel}</dd>
              <dt>Distribution</dt><dd>{W.dist}</dd>
              <dt>Audience</dt><dd>{W.audience}</dd>
              <dt>Campaign</dt><dd>{W.campaign}</dd>
              <dt>Service line</dt><dd>{W.service}</dd>
              <dt>Geography</dt><dd>{W.geo}</dd>
              <dt>Language</dt><dd>{W.lang}</dd>
              <dt>Spec</dt><dd>{W.spec}</dd>
              <dt>Asset date</dt><dd>{fmtDate(W.date)}</dd>
              <dt>Expiry</dt><dd>{W.expiry ? fmtDate(W.expiry) : "None — evergreen"}</dd>
            </dl>
          </>)}

          {W.err && <div className="err">{W.err}</div>}
          <div className="wfoot">
            {s > 1 && <button className="btn" onClick={() => set({ step: s - 1, err: "" })}>Back</button>}
            <span className="sp" />
            {s < 5 ? <button className="btn p" onClick={next} disabled={W.uploading}>Continue</button>
              : <button className="btn p" onClick={submit}>Submit for review</button>}
          </div>
        </div>
      </div>
    </>
  );
}
