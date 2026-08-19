import { useNavigate } from "react-router-dom";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import { useApp } from "../context/AppContext";
import { initials } from "../utils/tm";
import { confirmDialog } from "./Dialogs";

export default function Topbar() {
  const { user, search, setSearch, logout, toast } = useApp();
  const nav = useNavigate();

  const doLogout = async () => {
    const ok = await confirmDialog({ title: "Sign out", message: "Sign out of TrustMark?", confirmLabel: "Sign out", danger: true });
    if (!ok) return;
    logout();
    toast("Signed out");
    nav("/login");
  };

  const onSearch = (e) => {
    setSearch(e.target.value);
    if (window.location.pathname !== "/library") nav("/library");
  };

  return (
    <div className="topbar">
      <div className="search">
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" /></svg>
        <input value={search} onChange={onSearch} placeholder="Search assets, types, campaigns, centres…" />
      </div>
      <div className="who">
        <div className="av">{initials(user.name || "?")}</div>
        <div>
          <div className="nm">{user.name || "—"}</div>
          <div className="rl">{user.role || ""}</div>
        </div>
        <button className="logout" title="Sign out" onClick={doLogout}><LogoutOutlinedIcon sx={{ fontSize: 18 }} /></button>
      </div>
    </div>
  );
}
