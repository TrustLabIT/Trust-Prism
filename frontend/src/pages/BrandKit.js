import { useState, useEffect, useRef } from "react";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CompressOutlinedIcon from "@mui/icons-material/CompressOutlined";
import { useApp } from "../context/AppContext";
import { confirmDialog, promptDialog } from "../components/Dialogs";

export default function BrandKit() {
  const {
    brandKit, brandCanEdit, uploadLogo, removeLogo, toast,
    brandDocs, brandDocsHasMore, brandDocsTotal, brandDocsStatus, brandDocsPage,
    fetchBrandDocs, uploadBrandDoc, renameBrandDoc, deleteBrandDoc, getBrandDocUrl,
  } = useApp();
  const [uploading, setUploading] = useState(false);
  const [logoDark, setLogoDark] = useState(false);
  const [docBusy, setDocBusy] = useState(false);
  const fileRef = useRef(null);
  const docRef = useRef(null);

  // load first page of brand documents once
  useEffect(() => {
    fetchBrandDocs({ page: 1 }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickDoc = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const form = new FormData();
    form.append("file", f);
    form.append("name", f.name);
    setDocBusy(true);
    try {
      const doc = await uploadBrandDoc(form);
      toast(doc.saved ? `Uploaded · compressed ${doc.saved}% smaller` : "Document uploaded");
    } catch (err) { toast(err.message || "Upload failed"); }
    finally { setDocBusy(false); e.target.value = ""; }
  };
  const openDoc = async (id, download) => {
    try {
      const url = await getBrandDocUrl(id, download);
      window.open(url, "_blank", "noopener");
    } catch (e) { toast(e.message || "Could not open document"); }
  };
  const renameDoc = async (d) => {
    const name = await promptDialog({ title: "Rename document", label: "Document name", value: d.name, confirmLabel: "Save" });
    if (!name || name === d.name) return;
    try { await renameBrandDoc(d.id, name); toast("Document renamed"); }
    catch (e) { toast(e.message || "Could not rename"); }
  };
  const delDoc = async (d) => {
    const ok = await confirmDialog({ title: "Delete document", message: `Delete “${d.name}”? This removes the file from S3 and can’t be undone.`, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try { await deleteBrandDoc(d.id); toast("Document deleted"); }
    catch (e) { toast(e.message || "Could not delete"); }
  };
  const loadMoreDocs = () => fetchBrandDocs({ page: brandDocsPage + 1, append: true }).catch((e) => toast(e.message));

  const pickLogo = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const form = new FormData();
    form.append("file", f);
    form.append("label", f.name);
    form.append("dark", String(logoDark));
    setUploading(true);
    try { await uploadLogo(form); toast("Logo uploaded"); }
    catch (err) { toast(err.message || "Upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  };
  const delLogo = async (key) => {
    const ok = await confirmDialog({ title: "Remove logo", message: "Remove this logo from the Brand Kit? It will be deleted from S3.", confirmLabel: "Remove", danger: true });
    if (!ok) return;
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
        <button className="btn btn-ghost" onClick={() => toast("Brand guidelines shared")}><LinkOutlinedIcon sx={{ fontSize: 16 }} /> Share Guidelines</button>
      </div>

      {!brandCanEdit && (
        <div className="callout-card" style={{ marginBottom: 18 }}>
          <b><LockOutlinedIcon sx={{ fontSize: 14, verticalAlign: "-2px" }} /> View only</b>
          <p>Only a <b>Brand Manager</b> or <b>Super Admin</b> can edit the Brand Kit. You can view the current brand assets below.</p>
        </div>
      )}

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
              <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "Uploading…" : <><FileUploadOutlinedIcon sx={{ fontSize: 16 }} /> Upload logo</>}</button>
            </div>
          )}
        </div>
        <div className="logos">
          {(brandKit.logos || []).map((l) => (
            <div className={"logobox" + (l.dark ? " dark" : "")} key={l.key} style={{ position: "relative" }}>
              {l.url ? <img src={l.url} alt={l.label} style={{ maxWidth: "80%", maxHeight: "70%", objectFit: "contain" }} /> : <span className="sh">{l.label}</span>}
              {brandCanEdit && (
                <button onClick={() => delLogo(l.key)} title="Remove logo"
                  style={{ position: "absolute", top: 6, right: 6, background: "rgba(255,255,255,.9)", borderRadius: 6, width: 22, height: 22, color: "var(--danger)", display: "grid", placeItems: "center" }}><CloseIcon sx={{ fontSize: 14 }} /></button>
              )}
            </div>
          ))}
          {(brandKit.logos || []).length === 0 && <div className="perf-empty">No logos uploaded yet.</div>}
        </div>
      </div>

      {/* Brand documents */}
      <div className="bk-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h3>Brand documents {brandDocsTotal > 0 && <span className="ed-hint">· {brandDocsTotal} file{brandDocsTotal > 1 ? "s" : ""}</span>}</h3>
            <div className="desc">Brand guideline PDFs — logo usage, tone of voice, print specs. Stored in S3 and compressed on upload.</div>
          </div>
          {brandCanEdit && (
            <>
              <input ref={docRef} type="file" hidden accept="application/pdf,.pdf" onChange={pickDoc} />
              <button className="btn btn-primary" onClick={() => docRef.current?.click()} disabled={docBusy}>
                {docBusy ? "Uploading…" : <><FileUploadOutlinedIcon sx={{ fontSize: 16 }} /> Upload PDF</>}
              </button>
            </>
          )}
        </div>

        {brandCanEdit && (
          <div className="dropzone" style={{ marginTop: 14, padding: 22, opacity: docBusy ? 0.6 : 1 }} onClick={() => !docBusy && docRef.current?.click()}>
            <div style={{ fontWeight: 700, color: "var(--ink)" }}>Click to upload a brand guideline PDF</div>
            <div style={{ fontSize: 12, marginTop: 3 }}>Up to 50 MB · automatically compressed before storage</div>
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          {brandDocs.length === 0 ? (
            <div className="perf-empty">{brandDocsStatus === "loading" ? "Loading documents…" : "No brand documents yet."}</div>
          ) : (
            brandDocs.map((d) => (
              <div className="bdoc-row" key={d.id}>
                <div className="bdoc-ico"><DescriptionOutlinedIcon sx={{ fontSize: 20 }} /></div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="bdoc-name">{d.name}</div>
                  <div className="bdoc-meta">
                    {d.size}{d.by ? ` · ${d.by}` : ""}{d.date ? ` · ${d.date}` : ""}
                    {d.saved > 0 && <span className="bdoc-save"><CompressOutlinedIcon sx={{ fontSize: 12, verticalAlign: "-2px" }} /> {d.saved}% smaller</span>}
                  </div>
                </div>
                <div className="bdoc-acts">
                  <button onClick={() => openDoc(d.id, false)} title="View"><VisibilityOutlinedIcon sx={{ fontSize: 16 }} /></button>
                  <button onClick={() => openDoc(d.id, true)} title="Download"><FileDownloadOutlinedIcon sx={{ fontSize: 16 }} /></button>
                  {brandCanEdit && <button onClick={() => renameDoc(d)} title="Rename"><DriveFileRenameOutlineIcon sx={{ fontSize: 16 }} /></button>}
                  {brandCanEdit && <button className="del" onClick={() => delDoc(d)} title="Delete"><DeleteOutlineIcon sx={{ fontSize: 16 }} /></button>}
                </div>
              </div>
            ))
          )}
        </div>

        {brandDocsHasMore && (
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button className="btn btn-ghost" onClick={loadMoreDocs} disabled={brandDocsStatus === "loading"}>
              {brandDocsStatus === "loading" ? "Loading…" : `Load more (${brandDocsTotal - brandDocs.length} more)`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
