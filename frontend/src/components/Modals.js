import { useState, useRef } from "react";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import BrushOutlinedIcon from "@mui/icons-material/BrushOutlined";
import DesignServicesOutlinedIcon from "@mui/icons-material/DesignServicesOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import MovieOutlinedIcon from "@mui/icons-material/MovieOutlined";
import ViewInArOutlinedIcon from "@mui/icons-material/ViewInArOutlined";
import AudiotrackOutlinedIcon from "@mui/icons-material/AudiotrackOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import TextFieldsOutlinedIcon from "@mui/icons-material/TextFieldsOutlined";
import FolderZipOutlinedIcon from "@mui/icons-material/FolderZipOutlined";
import { confirmDialog } from "./Dialogs";
import { useApp } from "../context/AppContext";
import { api, putToS3 } from "../api/client";
import {
  formatGroups, edColorPairs, ncColorPairs, fmtSpec, roles, mediaTax,
} from "../data/prismData";
import { yearOf } from "../utils/helpers";

const bi = { fontSize: 16 };  // button icon
const hi = { fontSize: 14, verticalAlign: "-2px" };  // inline header icon

// icon per accepted-format group
const FMT_ICONS = {
  "Raster / photo": ImageOutlinedIcon,
  "Vector / illustration": BrushOutlinedIcon,
  "Design source files": DesignServicesOutlinedIcon,
  "RAW camera": PhotoCameraOutlinedIcon,
  "Motion / video": MovieOutlinedIcon,
  "3D / AR": ViewInArOutlinedIcon,
  "Audio": AudiotrackOutlinedIcon,
  "Documents / office": DescriptionOutlinedIcon,
  "Fonts": TextFieldsOutlinedIcon,
  "Archives & anything else": FolderZipOutlinedIcon,
};
function FmtIcon({ label }) {
  const I = FMT_ICONS[label] || ImageOutlinedIcon;
  return <I sx={{ fontSize: 12 }} />;
}

function Scrim({ onClose, children, wide, width }) {
  return (
    <div className="modal-scrim open" onClick={onClose}>
      <div className={wide ? "editor" : "modal"} style={width ? { width } : undefined} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export default function Modals() {
  const { modals } = useApp();
  return (
    <>
      {modals.upload && <UploadModal />}
      {modals.collection && <CollectionModal />}
      {modals.editor && <EditorModal />}
      {modals.user && <UserModal />}
      {modals.share && <ShareModal />}
      {modals.download && <DownloadModal />}
      {modals.editAsset && <EditAssetModal />}
    </>
  );
}

/* ---------- Edit asset metadata ---------- */
function EditAssetModal() {
  const { closeModal, closeDrawer, toast, drawer, updateAsset, deleteAsset, collections } = useApp();
  const a = drawer.asset;
  const [name, setName] = useState(a?.n || "");
  const [cat, setCat] = useState(a?.cat || "Electronic");
  const [sub, setSub] = useState(a?.sub || "Images");
  const [tags, setTags] = useState((a?.tags || []).join(", "));
  const [collectionId, setCollectionId] = useState(a?.collection || "");
  const [busy, setBusy] = useState(false);
  if (!a) return null;

  const save = async () => {
    if (!name.trim()) { toast("Name is required"); return; }
    setBusy(true);
    try {
      await updateAsset(a.id, { name: name.trim(), cat, sub, tags, collection: collectionId || null });
      closeModal("editAsset");
      toast("Asset updated");
    } catch (err) {
      toast(err.message || "Could not update asset");
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    const ok = await confirmDialog({
      title: "Delete asset",
      message: `Delete “${a.n}”? This removes the file from S3 and can’t be undone.`,
      confirmLabel: "Delete", danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteAsset(a.id);
      closeModal("editAsset");
      closeDrawer();
      toast("Asset deleted");
    } catch (err) {
      toast(err.message || "Could not delete asset");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Scrim onClose={() => closeModal("editAsset")}>
      <div className="modal-head"><h2>Edit asset</h2><button className="iconbtn" onClick={() => closeModal("editAsset")}><CloseIcon sx={{ fontSize: 18 }} /></button></div>
      <div className="modal-body">
        <div className="field"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field-row">
          <div className="field" style={{ flex: 1 }}><label>Category</label>
            <select value={cat} onChange={(e) => { setCat(e.target.value); setSub((mediaTax[e.target.value] || [])[0] || ""); }}>
              <option>Videos</option><option>Electronic</option><option>Print</option>
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}><label>Sub-type</label>
            <select value={sub} onChange={(e) => setSub(e.target.value)}>
              {(mediaTax[cat] || []).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Tags (comma-separated)</label><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="summer, product, hero" /></div>
        <div className="field"><label>Collection (album)</label>
          <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
            <option value="">— No collection —</option>
            {collections.map((c) => <option key={c.id} value={c.id}>{c.n}</option>)}
          </select>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" style={{ marginRight: "auto", color: "var(--danger)", borderColor: "var(--danger-soft)" }} onClick={del} disabled={busy}><DeleteOutlineIcon sx={bi} /> Delete</button>
        <button className="btn btn-ghost" onClick={() => closeModal("editAsset")}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
      </div>
    </Scrim>
  );
}

/* ---------- Upload (images → backend compress; video/large → direct-to-S3) ---------- */
const IMG_MAX = 30 * 1024 * 1024; // 30 MB → server compress path

// Best-effort read of pixel dimensions from the chosen file (client-side)
function readDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const done = (d) => { URL.revokeObjectURL(url); resolve(d); };
    if (file.type.startsWith("image/")) {
      const img = new Image();
      img.onload = () => done(`${img.naturalWidth}×${img.naturalHeight}`);
      img.onerror = () => done("");
      img.src = url;
    } else if (file.type.startsWith("video/")) {
      const v = document.createElement("video");
      v.onloadedmetadata = () => done(`${v.videoWidth}×${v.videoHeight}`);
      v.onerror = () => done("");
      v.src = url;
    } else { done(""); }
  });
}

function UploadModal() {
  const { closeModal, toast, uploadImage, confirmUpload, collections } = useApp();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [cat, setCat] = useState("Electronic");
  const [sub, setSub] = useState("Images");
  const [tags, setTags] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [date, setDate] = useState("2026-07-23");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const total = formatGroups.reduce((s, g) => s + g.ext.length, 0);
  const y = yearOf(date) || "2026";
  const isImage = file && file.type.startsWith("image/");
  const isVideo = file && file.type.startsWith("video/");
  const direct = file && !(isImage && file.size <= IMG_MAX); // video / large → presigned direct

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
    if (f.type.startsWith("video/")) { setCat("Videos"); setSub(mediaTax.Videos[0]); }
  };

  const doUpload = async () => {
    if (!file) { toast("Choose a file first"); return; }
    const type = isVideo ? "video" : isImage ? "image" : "document";
    setBusy(true);
    setProgress(0);
    try {
      if (!direct) {
        // Image ≤30 MB → backend compresses to WebP, then stores
        const form = new FormData();
        form.append("file", file);
        form.append("name", name || file.name);
        form.append("cat", cat); form.append("sub", sub);
        form.append("tags", tags); form.append("date", date); form.append("type", type);
        if (collectionId) form.append("collection", collectionId);
        await uploadImage(form);
      } else {
        // Video / large → presigned direct-to-S3 upload, then register the record
        const contentType = file.type || "application/octet-stream";
        const { key, uploadUrl } = await api.presign(file.name, contentType);
        await putToS3(uploadUrl, file, contentType, setProgress);
        const dim = await readDimensions(file);
        await confirmUpload({
          key, name: name || file.name, type, cat, sub, tags, date,
          bytes: file.size, mimeType: contentType, dim, collection: collectionId || null,
        });
      }
      closeModal("upload");
      toast(`"${name || file.name}" uploaded & stored`);
    } catch (err) {
      toast(err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Scrim onClose={() => closeModal("upload")}>
      <div className="modal-head"><h2>Upload asset</h2><button className="iconbtn" onClick={() => closeModal("upload")}><CloseIcon sx={{ fontSize: 18 }} /></button></div>
      <div className="modal-body">
        <input ref={fileRef} type="file" hidden accept="image/*,video/*,application/pdf" onChange={pick} />
        <div className="dropzone" onClick={() => fileRef.current?.click()}>
          <div className="big"><CloudUploadOutlinedIcon sx={{ fontSize: 26 }} /></div>
          {file ? (
            <>
              <div style={{ fontWeight: 700, color: "var(--ink)" }}>{file.name}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{(file.size / 1024 / 1024).toFixed(2)} MB · click to change · {direct ? "direct upload to S3" : "will be compressed"}</div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 700, color: "var(--ink)" }}>Click to choose a file</div>
              <div style={{ fontSize: 12, marginTop: 4 }}><b>Images compress automatically; videos upload straight to S3.</b> No size limit on video.</div>
            </>
          )}
        </div>

        {busy && direct && (
          <div className="up-progress">
            <div className="up-track"><span style={{ width: progress + "%" }}></span></div>
            <em>{progress}%</em>
          </div>
        )}

        <div className="ai-suggest" style={{ background: "var(--ok-soft)" }}>
          <b style={{ color: "#16a34a" }}><CheckIcon sx={hi} /> Images optimized on upload</b>
          Photos are auto-oriented, resized and re-encoded to WebP before being stored in your S3 bucket — smaller files, same visual quality.
        </div>

        <div className="field"><label>Asset name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hero — Summer Shot" /></div>
        <div className="field-row">
          <div className="field" style={{ flex: 1 }}><label>Category</label>
            <select value={cat} onChange={(e) => { setCat(e.target.value); setSub((mediaTax[e.target.value] || [])[0] || ""); }}>
              <option>Videos</option><option>Electronic</option><option>Print</option>
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}><label>Sub-type</label>
            <select value={sub} onChange={(e) => setSub(e.target.value)}>
              {(mediaTax[cat] || []).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Tags (comma-separated)</label><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="summer, product, hero" /></div>
        <div className="field"><label>Collection (album)</label>
          <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
            <option value="">— No collection —</option>
            {collections.map((c) => <option key={c.id} value={c.id}>{c.n}</option>)}
          </select>
        </div>
        <div className="field-row">
          <div className="field" style={{ flex: 1 }}><label>Asset date</label>
            <input type="date" className="datepick" style={{ width: "100%" }} value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="field" style={{ flex: 1 }}><label>Rights / expiry</label><input placeholder="e.g. Licensed until Dec 2026" /></div>
        </div>
        <div className="ed-note" style={{ color: "var(--brand)", fontWeight: 600 }}><CalendarMonthOutlinedIcon sx={hi} /> Stored under calendar year {y}</div>

        <div className="section-t" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
          Accepted formats <span className="tag">{total}+ types · no restrictions</span>
        </div>
        <div className="fmt-groups">
          {formatGroups.map((g) => (
            <div className="fmt-group" key={g.label}>
              <div className="fg-label"><span className="ico" style={{ background: g.color }}><FmtIcon label={g.label} /></span>{g.label}</div>
              <div className="fmt-chips">
                {g.ext.map((x) => <span className={"fx" + (/any other|Lottie/.test(x) ? " more" : "")} key={x}>{x}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={() => closeModal("upload")}>Cancel</button>
        <button className="btn btn-primary" onClick={doUpload} disabled={busy}>{busy ? (direct ? `Uploading ${progress}%` : "Uploading…") : "Upload & store"}</button>
      </div>
    </Scrim>
  );
}

/* ---------- New Collection ---------- */
function CollectionModal() {
  const { closeModal, toast, addCollection } = useApp();
  const [name, setName] = useState("");
  const [type, setType] = useState("Campaign");
  const [visibility, setVisibility] = useState("Organization");
  const [date, setDate] = useState("2026-07-23");
  const [year, setYear] = useState("2026");
  const [colorIdx, setColorIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const onDate = (e) => { setDate(e.target.value); setYear(yearOf(e.target.value) || "2026"); };
  const save = async () => {
    if (!name.trim()) { toast("Please name the collection"); return; }
    const p = ncColorPairs[colorIdx];
    setBusy(true);
    try {
      await addCollection({ name: name.trim(), type, visibility, year, grad: `linear-gradient(135deg,${p[0]},${p[1]})` });
      closeModal("collection");
      toast(`Collection "${name.trim()}" created · filed under ${year}`);
    } catch (err) {
      toast(err.message || "Could not create collection");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Scrim onClose={() => closeModal("collection")}>
      <div className="modal-head"><h2>New collection</h2><button className="iconbtn" onClick={() => closeModal("collection")}><CloseIcon sx={{ fontSize: 18 }} /></button></div>
      <div className="modal-body">
        <div className="field"><label>Collection name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Holiday Campaign 2026" /></div>
        <div className="field-row">
          <div className="field" style={{ flex: 1 }}><label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}><option>Campaign</option><option>Region</option><option>Team</option><option>Portal</option></select></div>
          <div className="field" style={{ flex: 1 }}><label>Visibility</label>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)}><option>Organization</option><option>Team</option><option>Private</option></select></div>
        </div>
        <div className="field-row">
          <div className="field" style={{ flex: 1 }}><label>Date</label>
            <input type="date" className="datepick" style={{ width: "100%" }} value={date} onChange={onDate} /></div>
          <div className="field" style={{ flex: 1 }}><label>Calendar year (storage)</label>
            <select className="yearsel" style={{ width: "100%" }} value={year} onChange={(e) => setYear(e.target.value)}>
              <option>2026</option><option>2025</option><option>2024</option><option>2027</option></select></div>
        </div>
        <div className="field"><label>Cover color</label>
          <div className="colorrow">
            {ncColorPairs.map((p, i) => (
              <div key={i} className={"colordot" + (i === colorIdx ? " sel" : "")}
                style={{ background: `linear-gradient(135deg,${p[0]},${p[1]})` }} onClick={() => setColorIdx(i)} />
            ))}
          </div>
        </div>
        <div className="ai-suggest"><b><CalendarMonthOutlinedIcon sx={hi} /> Calendar-year storage</b>This collection and its assets will be filed under <b>{year}</b>.</div>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={() => closeModal("collection")}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Creating…" : <><AddIcon sx={bi} /> Create collection</>}</button>
      </div>
    </Scrim>
  );
}

/* ---------- Template Editor ---------- */
function EditorModal() {
  const { closeModal, toast, addTemplate, templates, modalData, brandKit } = useApp();
  const editing = modalData.templateId ? templates.find((t) => t.id === modalData.templateId) : null;
  const initialFmt = editing?.format && fmtSpec[editing.format] ? editing.format : "Instagram Post";

  const [fmt, setFmt] = useState(initialFmt);
  const [head, setHead] = useState(editing?.headline ?? "Summer Sale — up to 40% off");
  const [sub, setSub] = useState(editing?.subtext ?? "Limited time. Shop the new collection today.");
  const [cta, setCta] = useState(editing?.cta ?? "Shop now");
  const [colorIdx, setColorIdx] = useState(editing?.colorIdx ?? 0);
  const [align, setAlign] = useState(editing?.align ?? "center");
  const [busy, setBusy] = useState(false);

  // brand-locked: color options come from the real Brand Kit (fallback to defaults)
  const pairs = brandKit?.colors?.length ? brandKit.colors.map((c) => [c.hex, c.hex]) : edColorPairs;
  const s = fmtSpec[fmt] || fmtSpec["Instagram Post"];
  const p = pairs[colorIdx] || pairs[0];
  const textAlign = align === "flex-start" ? "left" : align === "flex-end" ? "right" : "center";

  const save = async () => {
    const kindMap = { "Instagram Post": "Social", "Instagram Story": "Social", "LinkedIn Ad": "Social", "Leaderboard Banner": "Banner", "Email Newsletter": "Email", "Trifold Brochure": "Print", "Sales One-Pager": "Print", "Pitch Deck": "Presentation" };
    const rMap = { "Instagram Post": "1080×1080", "Instagram Story": "1080×1920", "LinkedIn Ad": "1200×627", "Leaderboard Banner": "728×90", "Email Newsletter": "600px", "Trifold Brochure": "A4", "Sales One-Pager": "A4", "Pitch Deck": "16:9" };
    const title = (head || "Untitled").trim();
    setBusy(true);
    try {
      await addTemplate({
        name: title.slice(0, 28) || fmt, kind: kindMap[fmt] || "Social", ratio: rMap[fmt] || "",
        format: fmt, headline: head, subtext: sub, cta, colorIdx, align,
      });
      closeModal("editor");
      toast("Template saved & added to library");
    } catch (err) {
      toast(err.message || "Could not save template");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Scrim onClose={() => closeModal("editor")} wide>
      <div className="modal-head"><h2>{editing ? "Edit — " + editing.n : "New Template"}</h2><button className="iconbtn" onClick={() => closeModal("editor")}><CloseIcon sx={{ fontSize: 18 }} /></button></div>
      <div className="ed-grid">
        <div className="ed-canvas">
          <span className="ed-lock"><LockOutlinedIcon sx={{ fontSize: 12, verticalAlign: "-2px" }} /> Brand-locked · colors &amp; fonts from Brand Kit</span>
          <div className="canvasstage" style={{
            width: s.w, height: s.h, background: `linear-gradient(135deg,${p[0]},${p[1]})`,
            alignItems: align, textAlign,
          }}>
            <div className="clogo"><span className="cm"></span>Trust Prism</div>
            {head.trim() && <div className="ch" style={{ fontSize: s.hs }}>{head}</div>}
            {sub.trim() && <div className="cs" style={{ fontSize: s.ss }}>{sub}</div>}
            {cta.trim() && <div className="ccta">{cta}</div>}
          </div>
        </div>
        <div className="ed-controls">
          <div className="field"><label>Format</label>
            <select value={fmt} onChange={(e) => setFmt(e.target.value)}>
              {Object.keys(fmtSpec).map((k) => <option key={k}>{k}</option>)}
            </select>
            <div className="ed-note">{s.r}</div>
          </div>
          <div className="field"><label>Headline</label><textarea value={head} onChange={(e) => setHead(e.target.value)} /></div>
          <div className="field"><label>Subtext</label><textarea value={sub} onChange={(e) => setSub(e.target.value)} /></div>
          <div className="field"><label>Call to action</label><input value={cta} onChange={(e) => setCta(e.target.value)} /></div>
          <div className="field"><label>Brand color <span className="ed-note" style={{ display: "inline" }}>· from Brand Kit</span></label>
            <div className="colorrow">
              {pairs.map((cp, i) => (
                <div key={i} className={"colordot" + (i === colorIdx ? " sel" : "")}
                  style={{ background: `linear-gradient(135deg,${cp[0]},${cp[1]})` }} onClick={() => setColorIdx(i)} />
              ))}
            </div>
          </div>
          <div className="field"><label>Alignment</label>
            <div className="alignrow">
              {[["flex-start", "Left"], ["center", "Center"], ["flex-end", "Right"]].map(([v, l]) => (
                <button key={v} className={align === v ? "sel" : ""} onClick={() => setAlign(v)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="ai-suggest" style={{ marginTop: 16 }}>
            <b><AutoAwesomeOutlinedIcon sx={hi} /> Trust Prism AI</b>
            Fonts, logo and color options are restricted to your Brand Kit, so whatever you make here is on-brand by construction.
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={() => closeModal("editor")}>Cancel</button>
        <button className="btn btn-ghost" onClick={() => toast("Draft saved to templates")}>Save draft</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : <><CheckIcon sx={bi} /> Save & add to library</>}</button>
      </div>
    </Scrim>
  );
}

/* ---------- Add / Edit User ---------- */
function UserModal() {
  const { closeModal, toast, addUser, updateUser, setUserPassword, agencies, modalData } = useApp();
  const editUser = modalData.editUser || null;
  const type0 = editUser ? editUser.type : (modalData.userType || "Internal");
  const [type, setType] = useState(type0);
  const [scope, setScope] = useState(editUser ? editUser.scope : "own");
  const [name, setName] = useState(editUser ? editUser.name : "");
  const [email, setEmail] = useState(editUser ? editUser.email : "");
  const [org, setOrg] = useState(editUser ? editUser.org : (type0 === "External" ? "" : "Internal"));
  const [role, setRole] = useState(editUser ? editUser.role : (type0 === "External" ? "Agency Contributor" : "Content Editor"));
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const setTypeAndOrg = (t) => { setType(t); setOrg(t === "Internal" ? "Internal" : (org === "Internal" ? "" : org)); };
  const title = editUser ? "Edit user" : (type0 === "External" ? "Invite an agency" : "Add user");

  const save = async () => {
    if (!name.trim() || !email.trim()) { toast("Name and email are required"); return; }
    let o = org.trim();
    if (type === "External" && !o) { toast("Enter the agency name"); return; }
    if (type === "Internal") o = "Internal";
    if (pwd && pwd.length < 6) { toast("Password must be at least 6 characters"); return; }
    setBusy(true);
    try {
      if (editUser) {
        await updateUser(editUser.id, { name: name.trim(), email: email.trim(), role, type, org: o, scope });
        if (pwd) await setUserPassword(editUser.id, pwd);
        closeModal("user");
        toast(pwd ? `${name.trim()} updated · password changed` : `${name.trim()} updated`);
      } else {
        const res = await addUser({ name: name.trim(), email: email.trim(), role, type, org: o, scope, password: pwd || undefined });
        closeModal("user");
        const who = type === "External" ? `Invited ${name.trim()} at ${o}` : `Added ${name.trim()}`;
        toast(pwd ? who : (res.tempPassword ? `${who} · temp password: ${res.tempPassword}` : who));
      }
    } catch (err) {
      toast(err.message || "Could not save user");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Scrim onClose={() => closeModal("user")}>
      <div className="modal-head"><h2>{title}</h2><button className="iconbtn" onClick={() => closeModal("user")}><CloseIcon sx={{ fontSize: 18 }} /></button></div>
      <div className="modal-body">
        <div className="field-row">
          <div className="field" style={{ flex: 1 }}><label>Full name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Liam Brooks" /></div>
          <div className="field" style={{ flex: 1 }}><label>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" /></div>
        </div>
        <div className="field"><label>User type</label>
          <div className="alignrow">
            <button className={type === "Internal" ? "sel" : ""} onClick={() => setTypeAndOrg("Internal")}><HomeOutlinedIcon sx={hi} /> Internal</button>
            <button className={type === "External" ? "sel" : ""} onClick={() => setTypeAndOrg("External")}><BusinessOutlinedIcon sx={hi} /> External / agency</button>
          </div>
        </div>
        <div className="field-row">
          <div className="field" style={{ flex: 1 }}><label>Organization / agency</label>
            <input value={org} disabled={type === "Internal"} onChange={(e) => setOrg(e.target.value)} list="agencyList" placeholder="Agency name" />
            <datalist id="agencyList">{agencies.map((a) => <option value={a} key={a} />)}</datalist>
          </div>
          <div className="field" style={{ flex: 1 }}><label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.filter((r) => r !== "Super Admin").map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Access — what can this user see?</label>
          <div className="alignrow">
            <button className={scope === "own" ? "sel" : ""} onClick={() => setScope("own")}><LockOutlinedIcon sx={hi} /> Own work only</button>
            <button className={scope === "all" ? "sel" : ""} onClick={() => setScope("all")}><PublicOutlinedIcon sx={hi} /> All work</button>
          </div>
          <div className="ed-note" dangerouslySetInnerHTML={{
            __html: scope === "all"
              ? "Sees <b>every asset across all teams and agencies</b>. Reserve for trusted internal staff."
              : "Sees only their organization's past and present work. Recommended for agencies.",
          }} />
        </div>
        <div className="field"><label>{editUser ? "New password (leave blank to keep current)" : "Password (optional — auto-generated if blank)"}</label>
          <input type="text" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="min 6 characters" autoComplete="new-password" />
        </div>
        <div className="ai-suggest" style={{ marginTop: 14 }}><b><VpnKeyOutlinedIcon sx={hi} /> Super Admin only</b>Only a Super Admin can add or edit users and set passwords. Share the password with the person so they can sign in.</div>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={() => closeModal("user")}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : (editUser ? <><CheckIcon sx={bi} /> Save changes</> : (type0 === "External" ? <><MailOutlineIcon sx={bi} /> Send invite</> : <><AddIcon sx={bi} /> Add user</>))}</button>
      </div>
    </Scrim>
  );
}

/* ---------- Create Share / Portal ---------- */
function ShareModal() {
  const { closeModal, toast, addShare, collections } = useApp();
  const [name, setName] = useState("");
  const [to, setTo] = useState("");
  const [include, setInclude] = useState("A collection");
  const [collectionId, setCollectionId] = useState("");
  const [assetList, setAssetList] = useState([]);      // approved assets to pick from
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [picked, setPicked] = useState([]);            // selected asset ids
  const [assetFilter, setAssetFilter] = useState("");
  const [perm, setPerm] = useState("View only");
  const [exp, setExp] = useState("No expiry");
  const [pw, setPw] = useState(false);
  const [password, setPassword] = useState("");
  const [wm, setWm] = useState(true);
  const [busy, setBusy] = useState(false);

  // Load approved assets the first time "Specific assets" is chosen
  const onInclude = async (v) => {
    setInclude(v);
    if (v === "Specific assets" && assetList.length === 0 && !assetsLoading) {
      setAssetsLoading(true);
      try {
        const res = await api.get("/assets?status=approved&limit=100");
        setAssetList(res.assets || []);
      } catch (e) { toast(e.message || "Could not load assets"); }
      finally { setAssetsLoading(false); }
    }
  };
  const toggle = (id) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const shown = assetList.filter((a) => !assetFilter || a.n.toLowerCase().includes(assetFilter.toLowerCase()));

  const save = async () => {
    if (!name.trim()) { toast("Name the share link"); return; }
    if (include === "A collection" && !collectionId) { toast("Pick a collection to share"); return; }
    if (include === "Specific assets" && picked.length === 0) { toast("Pick at least one asset to share"); return; }
    if (pw && password.trim().length < 4) { toast("Password must be at least 4 characters"); return; }
    const audience = to.trim() || "specific people";
    setBusy(true);
    try {
      await addShare({
        name: name.trim(), to: audience, include,
        collection: include === "A collection" ? collectionId : null,
        assets: include === "Specific assets" ? picked : [],
        exp: exp === "No expiry" ? "No expiry" : `Expires in ${exp}`,
        perm, wm, password: pw ? password.trim() : "",
      });
      closeModal("share");
      toast(`Smart link created for "${name.trim()}"`);
    } catch (err) {
      toast(err.message || "Could not create share link");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Scrim onClose={() => closeModal("share")}>
      <div className="modal-head"><h2>New share link / portal</h2><button className="iconbtn" onClick={() => closeModal("share")}><CloseIcon sx={{ fontSize: 18 }} /></button></div>
      <div className="modal-body">
        <div className="field"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Holiday Press Kit" /></div>
        <div className="field-row">
          <div className="field" style={{ flex: 1 }}><label>Share with (audience)</label><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="e.g. external agencies" /></div>
          <div className="field" style={{ flex: 1 }}><label>Include</label>
            <select value={include} onChange={(e) => onInclude(e.target.value)}><option>A collection</option><option>Specific assets</option><option>Whole brand portal</option></select></div>
        </div>
        {include === "A collection" && (
          <div className="field"><label>Which collection</label>
            <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
              <option value="">— Select a collection —</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.n}</option>)}
            </select>
          </div>
        )}
        {include === "Specific assets" && (
          <div className="field">
            <label>Which assets <span className="ed-note" style={{ display: "inline" }}>· {picked.length} selected · approved only</span></label>
            <input value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} placeholder="Search assets by name…" style={{ marginBottom: 8 }} />
            <div className="asset-picker">
              {assetsLoading ? (
                <div className="ap-empty">Loading assets…</div>
              ) : shown.length === 0 ? (
                <div className="ap-empty">{assetList.length === 0 ? "No approved assets to share yet." : "No assets match your search."}</div>
              ) : shown.map((a) => (
                <label className={"ap-row" + (picked.includes(a.id) ? " sel" : "")} key={a.id}>
                  <input type="checkbox" checked={picked.includes(a.id)} onChange={() => toggle(a.id)} />
                  <span className="ap-thumb">{a.url && a.t === "image"
                    ? <img src={a.url} alt={a.n} loading="lazy" />
                    : <ImageOutlinedIcon sx={{ fontSize: 16, color: "var(--muted)" }} />}</span>
                  <span className="ap-name">{a.n}<span className="ap-meta">{a.sub} · {a.size}</span></span>
                  {picked.includes(a.id) && <CheckIcon sx={{ fontSize: 15, color: "var(--brand)", marginLeft: "auto" }} />}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="field"><label>Permission</label>
          <div className="alignrow">
            <button className={perm === "View only" ? "sel" : ""} onClick={() => setPerm("View only")}><VisibilityOutlinedIcon sx={hi} /> View only</button>
            <button className={perm === "Download" ? "sel" : ""} onClick={() => setPerm("Download")}><FileDownloadOutlinedIcon sx={hi} /> Allow download</button>
          </div>
        </div>
        <div className="field-row">
          <div className="field" style={{ flex: 1 }}><label>Link expiry</label>
            <select value={exp} onChange={(e) => setExp(e.target.value)}><option>No expiry</option><option>7 days</option><option>30 days</option><option>90 days</option></select></div>
          <div className="field" style={{ flex: 1 }}><label>Protection</label>
            <div style={{ display: "flex", gap: 14, paddingTop: 8, fontSize: 13 }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 600 }}><input type="checkbox" checked={pw} onChange={(e) => setPw(e.target.checked)} /> Password</label>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 600 }}><input type="checkbox" checked={wm} onChange={(e) => setWm(e.target.checked)} /> Watermark</label>
            </div>
          </div>
        </div>
        {pw && (
          <div className="field"><label>Link password</label>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="recipients must enter this" />
          </div>
        )}
        <div className="ai-suggest" style={{ marginTop: 14 }}><b><LinkOutlinedIcon sx={hi} /> Smart link</b>The link always serves the current <b>approved</b> version and respects rights &amp; expiry. Every view and download is tracked in this portal's analytics.</div>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={() => closeModal("share")}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Creating…" : <><LinkOutlinedIcon sx={bi} /> Create link</>}</button>
      </div>
    </Scrim>
  );
}

/* ---------- Download-intent ---------- */
function DownloadModal() {
  const { closeModal, toast, drawer, downloadAsset } = useApp();
  const [why, setWhy] = useState("Social media post");
  const [busy, setBusy] = useState(false);
  const asset = drawer.asset;

  const confirm = async () => {
    if (!asset?.id) { closeModal("download"); toast("No asset selected"); return; }
    setBusy(true);
    try {
      const { url } = await downloadAsset(asset.id, why);
      window.open(url, "_blank", "noopener");
      closeModal("download");
      toast(`Download started · logged: ${why}`);
    } catch (err) {
      toast(err.message || "Could not get download link");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Scrim onClose={() => closeModal("download")} width={440}>
      <div className="modal-head"><h2>Before you download</h2><button className="iconbtn" onClick={() => closeModal("download")}><CloseIcon sx={{ fontSize: 18 }} /></button></div>
      <div className="modal-body">
        <div className="field"><label>What are you using this asset for?</label>
          <select value={why} onChange={(e) => setWhy(e.target.value)}>
            <option>Social media post</option><option>Paid ad campaign</option><option>Website / landing page</option>
            <option>Email campaign</option><option>Print / OOH</option><option>Presentation / pitch</option>
            <option>Internal use</option><option>Other</option>
          </select>
        </div>
        <div className="ai-suggest" style={{ marginTop: 12, background: "var(--ok-soft)" }}><b style={{ color: "#16a34a" }}><InsightsOutlinedIcon sx={hi} /> Why we ask</b>Capturing intent tells us which assets actually get used and where — so the library keeps what performs and retires what doesn't.</div>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={() => closeModal("download")}>Cancel</button>
        <button className="btn btn-primary" onClick={confirm} disabled={busy}>{busy ? "Preparing…" : <><FileDownloadOutlinedIcon sx={bi} /> Download</>}</button>
      </div>
    </Scrim>
  );
}
