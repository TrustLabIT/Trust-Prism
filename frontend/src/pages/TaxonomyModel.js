import { useApp } from "../context/AppContext";

export default function TaxonomyModel() {
  const { tax } = useApp();
  const DOMAINS = tax.domains;
  const metaChips = ["Distribution class", "Lifecycle status", "Campaign", "Service line", "Audience", "Geography", "Language", "Production spec", "Rights & expiry", "Version"];
  return (
    <>
      <div className="crumb">Governance / <b>Taxonomy Model</b></div>
      <h2 className="h1">How this library is organised</h2>
      <p className="sub">“Indoor” and “Outdoor” describe where an asset ends up — the least stable thing about it. These four domains classify by the job the asset does, so every item has exactly one home.</p>

      {DOMAINS.map((d) => (
        <div className="sect" key={d.id}>
          <div className="wcard" style={{ borderLeft: `5px solid ${d.color}` }}>
            <h3>{d.name}</h3>
            <p className="lead">{d.note}</p>
            <div className="verdict" style={{ background: d.tint, color: d.color, marginBottom: 14 }}><b>Sorting test</b>{d.test}</div>
            <div className="pick" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))" }}>
              {d.subs.map((s) => (
                <div key={s.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontWeight: 650, fontSize: 13.5, color: d.color }}>{s.name}</div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>{s.types.join(" · ")}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div className="sect">
        <div className="wcard" style={{ borderLeft: "5px solid var(--gold)" }}>
          <h3>One master, many renditions — the master never changes</h3>
          <p className="lead">Every asset is stored as the exact file that was uploaded. Nothing is re-encoded, resampled or colour-converted on the way in, and every download returns those bytes under the original filename and extension.</p>
          <div className="rev" style={{ marginBottom: 14 }}>
            <dt>Master</dt><dd>The uploaded file, untouched. A 240 MB layered TIFF comes back a 240 MB layered TIFF.</dd>
            <dt>Renditions</dt><dd>Thumbnails and web previews are generated alongside the master, never over it — they exist to make the library fast, and are never what downloads.</dd>
            <dt>Integrity</dt><dd>A SHA-256 checksum is taken at upload and shown on the asset. Same checksum in, same checksum out.</dd>
            <dt>Scale</dt><dd>Large masters upload straight to S3 (multipart for big files), so the library stays fast no matter the total size.</dd>
          </div>
          <div className="note">This matters most for print. A CMYK hoarding with bleed, spot colours and an embedded ICC profile is worthless if the library hands back an sRGB JPEG.</div>
        </div>
      </div>

      <div className="sect">
        <div className="wcard">
          <h3>Folders answer one question. Everything else is a filter.</h3>
          <p className="lead">The moment an attribute becomes a folder, assets start needing to be in two places at once. These stay in the metadata layer:</p>
          <div className="chips">{metaChips.map((c) => <span className="chip g" key={c}>{c}</span>)}</div>
          <div className="note">Distribution class is mandatory at upload and enforced before anything goes Live — so the flag always carries a real decision, never a default.</div>
        </div>
      </div>
    </>
  );
}
