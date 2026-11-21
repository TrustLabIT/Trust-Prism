import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useApp } from "../context/AppContext";
import { initials } from "../utils/tm";
import { canLeave } from "../utils/navGuard";
import { confirmDialog } from "./Dialogs";

// Page names for the breadcrumb: [group, page].
const CRUMBS = {
  library: ["Workspace", "Asset Library"],
  approvals: ["Workspace", "Approvals"],
  shares: ["Workspace", "Shared Links"],
  published: ["Workspace", "Published"],
  upload: ["Create", "New Asset"],
  versions: ["Create", "Version Tracker"],
  expired: ["Governance", "Expired"],
  model: ["Governance", "Taxonomy Model"],
  users: ["Admin", "Settings & Users"],
  settings: ["Admin", "Taxonomy & Dropdowns"],
};

// Top bar (AIMS topbar, as in TruSentinel): breadcrumb, search, date, user chip with a menu.
export default function Topbar() {
  const { user, perms, search, setSearch, logout, toast } = useApp();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const userRef = useRef(null);

  const [group, page] = CRUMBS[pathname.split("/")[1] || "library"] || ["", ""];
  const today = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

  // close the account menu on an outside click or Escape
  useEffect(() => {
    if (!menu) return undefined;
    const onDown = (e) => { if (userRef.current && !userRef.current.contains(e.target)) setMenu(false); };
    const onKey = (e) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menu]);

  const go = async (to) => { setMenu(false); if (await canLeave()) nav(to); };

  const doLogout = async () => {
    setMenu(false);
    const ok = await confirmDialog({ title: "Sign out", message: "Sign out of TrustMark?", confirmLabel: "Sign out", danger: true });
    if (!ok) return;
    logout();
    toast("Signed out");
    nav("/login");
  };

  const onSearch = (e) => {
    setSearch(e.target.value);
    if (pathname !== "/library") nav("/library");
  };

  const av = initials(user.name || "?");

  return (
    <header className="topbar">
      <div className="tb-crumb">
        {group && <><span className="g">{group}</span><span className="g">›</span></>}
        <span className="p">{page}</span>
      </div>
      <div className="search">
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" /></svg>
        <input value={search} onChange={onSearch} placeholder="Search assets, types, campaigns, centres…" />
      </div>
      <div className="tb-sp" />
      <span className="tb-date">{today}</span>
      <span className="tb-div" />
      <div className="tb-user" ref={userRef}>
        <button className="tb-chip" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label={`Account menu, ${user.name || ""}`}>
          <span className="tb-av">{av}</span>
          <span className="tb-txt">
            <span className="tb-nm" style={{ display: "block" }}>{user.name || "—"}</span>
            <span className="tb-role" style={{ display: "block" }}>{user.role || ""}</span>
          </span>
          <KeyboardArrowDownIcon sx={{ fontSize: 18, color: "#4A5763" }} />
        </button>
        {menu && (
          <div className="tb-menu" role="menu">
            <div className="tb-mhead">
              <span className="tb-av lg">{av}</span>
              <div style={{ minWidth: 0 }}>
                <div className="n">{user.name || "—"}</div>
                <div className="e">{[user.role, user.email].filter(Boolean).join(" · ")}</div>
              </div>
            </div>
            {perms.canManageUsers && (
              <button className="tb-mi" role="menuitem" onClick={() => go("/users")}>
                <span className="i"><GroupOutlinedIcon sx={{ fontSize: 18 }} /></span>Settings &amp; Users
              </button>
            )}
            {perms.canManageSettings && (
              <button className="tb-mi" role="menuitem" onClick={() => go("/settings")}>
                <span className="i"><TuneOutlinedIcon sx={{ fontSize: 18 }} /></span>Taxonomy &amp; Dropdowns
              </button>
            )}
            <button className="tb-mi out" role="menuitem" onClick={doLogout}>
              <span className="i"><LogoutOutlinedIcon sx={{ fontSize: 18 }} /></span>Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
