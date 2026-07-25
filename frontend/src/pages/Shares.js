import AddIcon from "@mui/icons-material/Add";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import WaterDropOutlinedIcon from "@mui/icons-material/WaterDropOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { confirmDialog } from "../components/Dialogs";
import { useApp } from "../context/AppContext";

const ti = { fontSize: 12, verticalAlign: "-2px", marginRight: 3 };

export default function Shares() {
  const { shares, openModal, toast, removeShare } = useApp();

  const linkFor = (s) => (s.token ? `${window.location.origin}/s/${s.token}` : "Link not ready — reopen this share");
  const copy = async (s) => {
    if (!s.token) { toast("This link isn't ready yet — try refreshing"); return; }
    try { await navigator.clipboard.writeText(linkFor(s)); toast("Link copied to clipboard"); }
    catch { toast("Could not copy link"); }
  };
  const del = async (s) => {
    const ok = await confirmDialog({
      title: "Delete share link",
      message: `Delete “${s.n}”? The link will stop working immediately for anyone who has it.`,
      confirmLabel: "Delete", danger: true,
    });
    if (!ok) return;
    try { await removeShare(s.id); toast("Share link deleted"); }
    catch (e) { toast(e.message || "Could not delete share"); }
  };

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <div className="crumbs">Workspace / <b>Shared Links</b></div>
          <h1>Shared Links &amp; Portals</h1><p>Track what you've shared externally and with partners.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal("share")}><AddIcon sx={{ fontSize: 16 }} /> New share link / portal</button>
      </div>

      <div className="share-grid">
        {shares.map((s, i) => {
          const permC = s.perm === "Download" ? "tc-all" : "tc-own";
          return (
            <div className="share" key={s.id || s.n + i}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h4 style={{ margin: 0, flex: 1 }}>{s.n}</h4>
                <button className="iconbtn" title="Delete share link" onClick={() => del(s)} style={{ color: "var(--danger)" }}><DeleteOutlineIcon sx={{ fontSize: 17 }} /></button>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>Shared with {s.to}</div>
              <div className="link" title={linkFor(s)}>{linkFor(s)}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "2px 0 4px" }}>
                <span className={"tagc " + permC}>
                  {s.perm === "Download" ? <><FileDownloadOutlinedIcon sx={ti} />Download</> : <><VisibilityOutlinedIcon sx={ti} />View only</>}
                </span>
                {s.pw && <span className="tagc tc-int"><LockOutlinedIcon sx={ti} />Password</span>}
                {s.wm && <span className="tagc tc-int"><WaterDropOutlinedIcon sx={ti} />Watermark</span>}
                <span className="tagc tc-int" title="Smart link — always serves the current approved version"><LinkOutlinedIcon sx={ti} />Smart link</span>
              </div>
              <div className="srow">
                <span><VisibilityOutlinedIcon sx={ti} />{s.views.toLocaleString()} views</span>
                <span><FileDownloadOutlinedIcon sx={ti} />{s.dls.toLocaleString()} downloads</span>
              </div>
              <div className="srow"><span>{s.exp}</span><button style={{ color: "var(--brand)", fontWeight: 700, opacity: s.token ? 1 : 0.5 }} disabled={!s.token} onClick={() => copy(s)}>Copy link</button></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
