import { useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import AddIcon from "@mui/icons-material/Add";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import { useApp } from "../context/AppContext";
import { initials } from "../utils/helpers";

export default function Topbar({ onMenu }) {
  const navigate = useNavigate();
  const { currentUser, searchTerm, setSearchTerm, openModal, logout } = useApp();

  const onSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase().trim());
    navigate("/library");
  };

  const doLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const avatarBg = currentUser.type === "External"
    ? "linear-gradient(135deg,#f59e0b,#ef4444)"
    : "linear-gradient(135deg,#4f46e5,#7c3aed)";

  return (
    <div className="topbar">
      <button className="menu-btn iconbtn" onClick={onMenu} title="Menu"><MenuIcon sx={{ fontSize: 22 }} /></button>
      <div className="search">
        <span className="si"><SearchIcon sx={{ fontSize: 18 }} /></span>
        <input value={searchTerm} onChange={onSearch} placeholder={'Search assets — try "blue product banner Q3"'} autoComplete="off" />
        <span className="aihint">✨ AI Search</span>
      </div>
      <div className="spacer" style={{ flex: 1 }}></div>

      <div className="topuser" title={`${currentUser.name} — ${currentUser.role}`}>
        <div className="avatar" style={{ background: avatarBg }}>{initials(currentUser.name || "User")}</div>
        <div className="topuser-meta">
          <div className="tu-name">{currentUser.name}</div>
          <div className="tu-role">{currentUser.role}</div>
        </div>
      </div>

      <button className="btn btn-ghost" onClick={() => openModal("upload")}>
        <FileUploadOutlinedIcon sx={{ fontSize: 16 }} /> Upload
      </button>
      <button className="btn btn-primary" onClick={() => openModal("upload")}>
        <AddIcon sx={{ fontSize: 16 }} /> New Asset
      </button>
      <button className="iconbtn" onClick={doLogout} title="Log out"><LogoutIcon sx={{ fontSize: 18 }} /></button>
    </div>
  );
}
