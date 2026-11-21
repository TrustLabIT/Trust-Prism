import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import RocketLaunchOutlinedIcon from "@mui/icons-material/RocketLaunchOutlined";
import AddIcon from "@mui/icons-material/Add";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import { useApp } from "../context/AppContext";
import { canLeave } from "../utils/navGuard";

// Every menu item gets its own icon colour (AIMS rail).
const C = {
  library: "#12C48B", approvals: "#FF8C1A", shares: "#2288EE", published: "#33CC55",
  versions: "#976BFF", expired: "#FF5D5D", model: "#5FD3F3", users: "#93A8B8", settings: "#FFC400",
};

const PIN_KEY = "tm.rail.pinned";
const NARROW = "(max-width:960px)";
// Remembered pin; without one, the menu starts open on wide screens and as icons below 1200 px.
function readPinned() {
  const wide = window.innerWidth >= 1200;
  try { const v = localStorage.getItem(PIN_KEY); return v === null ? wide : v === "1"; }
  catch { return wide; }
}

// One rail row: coloured icon tile + uppercase label + count pill. Collapsed: the icon tile only.
function RailLink({ open, on, onClick, icon, label, color, count, tone = "ok", showZero = false }) {
  const has = count > 0;
  const showCount = count != null && (has || showZero);
  return (
    <button className={"rl" + (on ? " on" : "")} style={{ "--ic": color }} onClick={onClick} aria-label={open ? undefined : label} title={open ? undefined : label}>
      <span className="rl-ic">
        {icon}
        {!open && has && <span className={"rl-dot " + tone} />}
      </span>
      {open && <span className="rl-lb">{label}</span>}
      {open && showCount && <span className={"rl-ct " + tone + (has ? " has" : "")}>{count}</span>}
    </button>
  );
}

const Group = ({ open, label }) => (open ? <div className="rail-grp">{label}</div> : <div className="rail-sep" />);

/**
 * Sidebar (AIMS rail, as in TruSentinel): dark green gradient, 258px. Unpinned it collapses to 66px of icons
 * and opens over the page while hovered. The pin is remembered on this browser. On small screens it is
 * always the icon rail.
 */
export default function Sidebar() {
  const { counts, libDomain, setLibDomain, perms, tax } = useApp();
  const navigate = useNavigate();
  const loc = useLocation();
  const view = loc.pathname.replace("/", "") || "library";
  const onLib = view === "library";

  const [pinnedPref, setPinnedPref] = useState(readPinned);
  const [hover, setHover] = useState(false);
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const on = (e) => setNarrow(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const pinned = pinnedPref && !narrow;
  const open = pinned || hover;

  const togglePin = () => {
    const next = !pinnedPref;
    try { localStorage.setItem(PIN_KEY, next ? "1" : "0"); } catch { /* storage blocked: this visit only */ }
    setPinnedPref(next);
    setHover(false);
  };

  // Guarded navigation: pages with unsaved changes can block/confirm the move.
  const nav = async (path) => { if (await canLeave()) { navigate(path); if (narrow) setHover(false); } };
  const goDomain = async (id) => { if (await canLeave()) { setLibDomain(id); navigate("/library"); if (narrow) setHover(false); } };

  const domItems = [{ id: "all", name: "All domains", color: "#8FB3A8" }].concat(tax.domains);
  const domCount = (id) => (id === "all" ? counts.total : counts.byDomain?.[id] || 0);
  const ic = { fontSize: 19 };
  const link = (to, props) => <RailLink open={open} on={view === to} onClick={() => nav("/" + to)} {...props} />;

  return (
    <div className={"railwrap" + (pinned ? " pinned" : "")}>
      <nav
        className={"sidebar" + (open ? " open" : "") + (hover && !pinned ? " float" : "")}
        aria-label="Main menu"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div className="rail-head">
          <div className="brand">
            <div className="mk"><img src={`${process.env.PUBLIC_URL}/favicon.png`} alt="" /></div>
            {open && <div><h1>TrustMark</h1><span className="tag">Brand &amp; Comms</span></div>}
          </div>
          {open && !narrow && (
            <button
              className={"rail-pin" + (pinnedPref ? " on" : "")}
              onClick={togglePin}
              aria-pressed={pinnedPref}
              aria-label={pinnedPref ? "Unpin menu (collapse to icons)" : "Pin menu open"}
              title={pinnedPref ? "Collapse menu" : "Keep menu open"}
            >
              <PushPinOutlinedIcon sx={{ fontSize: 18 }} />
            </button>
          )}
        </div>

        <div className="rail-body">
          {perms.canUpload && (
            <button className={"rail-cta" + (view === "upload" ? " on" : "")} onClick={() => nav("/upload")} aria-label="New asset" title={open ? undefined : "New asset"}>
              <AddIcon sx={{ fontSize: 20 }} />{open && "New asset"}
            </button>
          )}

          <Group open={open} label="Workspace" />
          {link("library", { icon: <PhotoLibraryOutlinedIcon sx={ic} />, label: "Asset Library", color: C.library, count: counts.total || 0, showZero: true })}
          {open && (
            <div className="subnav">
              {domItems.map((d) => (
                <button key={d.id} className={"dnav" + (onLib && libDomain === d.id ? " on" : "")} onClick={() => goDomain(d.id)}>
                  <span className="dot" style={{ background: d.id === "all" ? "#8FB3A8" : d.color === "#16624C" ? "#3FBF9A" : d.color }} />
                  <span className="dn">{d.name}</span>
                  <span className="ct2">{domCount(d.id)}</span>
                </button>
              ))}
            </div>
          )}
          {link("approvals", { icon: <TaskAltOutlinedIcon sx={ic} />, label: "Approvals", color: C.approvals, count: counts.inReview || 0, tone: "warn" })}
          {link("shares", { icon: <LinkOutlinedIcon sx={ic} />, label: "Shared Links", color: C.shares })}
          {link("published", { icon: <RocketLaunchOutlinedIcon sx={ic} />, label: "Published", color: C.published, count: counts.published || 0 })}

          {perms.canUpload && (
            <>
              <Group open={open} label="Create" />
              {link("versions", { icon: <HistoryOutlinedIcon sx={ic} />, label: "Version Tracker", color: C.versions, count: counts.drafts || 0, tone: "warn" })}
            </>
          )}

          <Group open={open} label="Governance" />
          {link("expired", { icon: <EventBusyOutlinedIcon sx={ic} />, label: "Expired", color: C.expired, count: counts.expired || 0, tone: "bad" })}
          {link("model", { icon: <AccountTreeOutlinedIcon sx={ic} />, label: "Taxonomy Model", color: C.model })}

          {perms.canManageUsers && (
            <>
              <Group open={open} label="Admin" />
              {link("users", { icon: <GroupOutlinedIcon sx={ic} />, label: "Settings & Users", color: C.users })}
              {link("settings", { icon: <TuneOutlinedIcon sx={ic} />, label: "Taxonomy & Dropdowns", color: C.settings })}
            </>
          )}
        </div>

        <div className="side-foot">
          <VerifiedUserOutlinedIcon sx={{ fontSize: 15 }} />
          {open && <span>TrustMark · TrustLab Diagnostics</span>}
        </div>
      </nav>
    </div>
  );
}
