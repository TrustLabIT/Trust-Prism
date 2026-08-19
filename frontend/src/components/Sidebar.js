import { useNavigate, useLocation } from "react-router-dom";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import { useApp } from "../context/AppContext";

export default function Sidebar() {
  const { counts, libDomain, setLibDomain, perms, tax } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const view = loc.pathname.replace("/", "") || "library";
  const onLib = view === "library";

  const domItems = [{ id: "all", name: "All domains", color: "#8FB3A8" }].concat(tax.domains);
  const domCount = (id) => (id === "all" ? counts.total : counts.byDomain?.[id] || 0);

  const goDomain = (id) => { setLibDomain(id); nav("/library"); };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="mk"><img src={`${process.env.PUBLIC_URL}/favicon.png`} alt="TrustMark" /></div>
        <div><h1>TrustMark</h1><span className="tag">Brand &amp; Comms</span></div>
      </div>

      <div className="navgrp">
        <div className="lbl">Workspace</div>
        <button className={"nav" + (onLib ? " on" : "")} onClick={() => nav("/library")}>
          <span className="ic"><PhotoLibraryOutlinedIcon sx={{ fontSize: 17 }} /></span> Asset Library
          <span className="ct">{counts.total || 0}</span>
        </button>
        <div className="subnav">
          {domItems.map((d) => (
            <button key={d.id} className={"dnav" + (onLib && libDomain === d.id ? " on" : "")} onClick={() => goDomain(d.id)}>
              <span className="dot" style={{ background: d.id === "all" ? "#8FB3A8" : d.color === "#16624C" ? "#3FBF9A" : d.color }} />
              <span>{d.name}</span>
              <span className="ct2">{domCount(d.id)}</span>
            </button>
          ))}
        </div>
        <button className={"nav" + (view === "approvals" ? " on" : "")} onClick={() => nav("/approvals")}>
          <span className="ic"><TaskAltOutlinedIcon sx={{ fontSize: 17 }} /></span> Approvals
          {counts.inReview > 0 && <span className="ct">{counts.inReview}</span>}
        </button>
        <button className={"nav" + (view === "shares" ? " on" : "")} onClick={() => nav("/shares")}>
          <span className="ic"><LinkOutlinedIcon sx={{ fontSize: 17 }} /></span> Shared Links
        </button>
      </div>

      {perms.canUpload && (
        <div className="navgrp">
          <div className="lbl">Create</div>
          <button className={"nav" + (view === "upload" ? " on" : "")} onClick={() => nav("/upload")}>
            <span className="ic"><UploadOutlinedIcon sx={{ fontSize: 17 }} /></span> New Asset
          </button>
        </div>
      )}

      <div className="navgrp">
        <div className="lbl">Governance</div>
        <button className={"nav" + (view === "expired" ? " on" : "")} onClick={() => nav("/expired")}>
          <span className="ic"><EventBusyOutlinedIcon sx={{ fontSize: 17 }} /></span> Expired
          {counts.expired > 0 && <span className="ct" style={{ background: "var(--red)", color: "#fff" }}>{counts.expired}</span>}
        </button>
        <button className={"nav" + (view === "model" ? " on" : "")} onClick={() => nav("/model")}>
          <span className="ic"><AccountTreeOutlinedIcon sx={{ fontSize: 17 }} /></span> Taxonomy Model
        </button>
      </div>

      {perms.canManageUsers && (
        <div className="navgrp">
          <div className="lbl">Admin</div>
          <button className={"nav" + (view === "users" ? " on" : "")} onClick={() => nav("/users")}>
            <span className="ic"><GroupOutlinedIcon sx={{ fontSize: 17 }} /></span> Settings &amp; Users
          </button>
          <button className={"nav" + (view === "settings" ? " on" : "")} onClick={() => nav("/settings")}>
            <span className="ic"><TuneOutlinedIcon sx={{ fontSize: 17 }} /></span> Taxonomy &amp; Dropdowns
          </button>
        </div>
      )}

      <div className="side-foot">TrustMark · TrustLab Diagnostics<br />Files classified by the job they do.</div>
    </aside>
  );
}
