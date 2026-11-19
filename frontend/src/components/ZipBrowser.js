import { useEffect, useState } from "react";
import { api } from "../api/client";
import { fmtBytes } from "../utils/tm";

// Is this master/version file a zip archive?
export const isZipFile = (f) => !!f && (
  String(f.ext || "").toLowerCase() === "zip" ||
  /\.zip$/i.test(f.fname || "") ||
  ["application/zip", "application/x-zip-compressed"].includes(f.mime)
);

const IMG = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "avif", "svg"];
const TEXT = ["txt", "md", "csv", "tsv", "json", "xml", "html", "htm", "css", "js", "ts", "log", "yml", "yaml", "ini", "rtf"];
const extOf = (name) => { const b = name.split("/").pop(); return b.includes(".") ? b.split(".").pop().toLowerCase() : ""; };
const kindOf = (name) => { const e = extOf(name); return IMG.includes(e) ? "image" : e === "pdf" ? "pdf" : TEXT.includes(e) ? "text" : null; };
const TEXT_CAP = 200000; // characters shown in the text viewer

// Lists what's inside a zip master (read in place on the server — the zip itself is never
// downloaded) and lets you open or save individual files before fetching the whole archive.
// Pass version + revision to inspect an older file from the history instead of the current master.
export default function ZipBrowser({ assetId, version, revision }) {
  const [state, setState] = useState({ loading: true, entries: [], count: 0, truncated: false, err: "" });
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");     // entry name being fetched
  const [view, setView] = useState(null);   // { name, kind, url?, text? }
  const [msg, setMsg] = useState("");

  const vq = version && revision ? `version=${version}&revision=${revision}` : "";

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, err: "" }));
    api.get(`/assets/${assetId}/zip${vq ? "?" + vq : ""}`)
      .then((r) => { if (alive) setState({ loading: false, entries: r.entries || [], count: r.count || 0, truncated: !!r.truncated, err: "" }); })
      .catch((e) => { if (alive) setState({ loading: false, entries: [], count: 0, truncated: false, err: e.message || "Could not read this zip" }); });
    return () => { alive = false; };
  }, [assetId, vq]);

  // release the object URL when the viewer closes or switches file
  useEffect(() => () => { if (view?.url) URL.revokeObjectURL(view.url); }, [view]);

  const fetchEntry = (name) => api.blob(`/assets/${assetId}/zip/file?path=${encodeURIComponent(name)}${vq ? "&" + vq : ""}`);

  const open = async (e) => {
    const kind = kindOf(e.name);
    if (!kind || busy) return;
    setBusy(e.name); setMsg("");
    try {
      const blob = await fetchEntry(e.name);
      if (kind === "text") {
        const text = await blob.text();
        setView({ name: e.name, kind, text: text.length > TEXT_CAP ? text.slice(0, TEXT_CAP) + "\n\n… (truncated — save the file to see the rest)" : text });
      } else {
        setView({ name: e.name, kind, url: URL.createObjectURL(blob) });
      }
    } catch (ex) { setMsg(ex.message || "Could not open that file"); }
    finally { setBusy(""); }
  };

  const save = async (ev, e) => {
    ev.stopPropagation();
    if (busy) return;
    setBusy(e.name); setMsg("");
    try {
      const blob = await fetchEntry(e.name);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = e.name.split("/").pop() || "file";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (ex) { setMsg(ex.message || "Could not save that file"); }
    finally { setBusy(""); }
  };

  const files = state.entries.filter((e) => !e.dir);
  const needle = q.trim().toLowerCase();
  const shown = needle ? files.filter((e) => e.name.toLowerCase().includes(needle)) : files;
  const totalBytes = files.reduce((s, e) => s + (e.size || 0), 0);

  return (
    <div className="zipb">
      <h5>
        Inside this zip
        {!state.loading && !state.err && <span className="tx-count">{files.length}</span>}
        {!state.loading && !state.err && files.length > 0 && <span className="zipb-tot">{fmtBytes(totalBytes)} unpacked</span>}
      </h5>

      {state.loading ? <div className="zipb-note">Reading the archive…</div>
        : state.err ? <div className="zipb-note err">{state.err}</div>
        : files.length === 0 ? <div className="zipb-note">This zip is empty.</div>
        : (
          <>
            {files.length > 8 && <input className="zipb-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter files…" />}
            <div className="zipb-list">
              {shown.map((e) => {
                const cut = e.name.lastIndexOf("/");
                const folder = cut >= 0 ? e.name.slice(0, cut + 1) : "";
                const base = e.name.slice(cut + 1);
                const kind = e.encrypted ? null : kindOf(e.name);
                return (
                  <div className={"zipb-row" + (kind ? " can" : "")} key={e.name} onClick={() => open(e)} title={kind ? "Click to open" : e.encrypted ? "Password-protected inside the zip" : "No in-app viewer for this type — save it to open"}>
                    <span className="zipb-ext">{e.encrypted ? "🔒" : (extOf(e.name) || "file").slice(0, 4)}</span>
                    <span className="zipb-nm"><i>{folder}</i>{base}</span>
                    <span className="zipb-sz">{busy === e.name ? "…" : fmtBytes(e.size)}</span>
                    {!e.encrypted && <button className="btn sm" onClick={(ev) => save(ev, e)} disabled={!!busy} title="Save just this file">↓</button>}
                  </div>
                );
              })}
              {shown.length === 0 && <div className="zipb-note">No files match “{q}”.</div>}
            </div>
            {state.truncated && <div className="zipb-note">Showing the first {state.entries.length} of {state.count} entries.</div>}
          </>
        )}
      {msg && <div className="zipb-note err">{msg}</div>}

      {view && (
        <div className="lightbox" onClick={() => setView(null)}>
          {view.kind === "image" && <img src={view.url} alt={view.name} onClick={(e) => e.stopPropagation()} />}
          {view.kind === "pdf" && <iframe title={view.name} src={view.url} className="lb-pdf" onClick={(e) => e.stopPropagation()} />}
          {view.kind === "text" && <pre className="lb-text" onClick={(e) => e.stopPropagation()}>{view.text}</pre>}
          <div className="lb-cap">{view.name}</div>
          <button className="lb-x" onClick={() => setView(null)} aria-label="Close">×</button>
        </div>
      )}
    </div>
  );
}
