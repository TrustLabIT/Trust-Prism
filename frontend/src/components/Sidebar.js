import { NavLink } from "react-router-dom";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import CollectionsBookmarkOutlinedIcon from "@mui/icons-material/CollectionsBookmarkOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import DashboardCustomizeOutlinedIcon from "@mui/icons-material/DashboardCustomizeOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import { useApp } from "../context/AppContext";

const IC = { fontSize: 18, color: "inherit" };

function Item({ to, icon, label, badge }) {
  return (
    <NavLink to={to} className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
      <span className="ic">{icon}</span> {label}
      {badge != null && <span className="badge">{badge}</span>}
    </NavLink>
  );
}

export default function Sidebar({ mobileOpen }) {
  const { isSuperAdmin, assetStats } = useApp();
  const libCount = assetStats.total;
  const pending = assetStats.pending;
  return (
    <aside className={"sidebar" + (mobileOpen ? " open" : "")}>
      <div className="logo">
        <img className="logo-mark-img" src={`${process.env.PUBLIC_URL}/favicon.png`} alt="TrustLab" />
        <div>
          <div className="name">Trust Prism</div>
          <div className="tag">Marketing Content</div>
        </div>
      </div>

      <div className="nav-group">
        <div className="nav-label">Workspace</div>
        <Item to="/library" icon={<PhotoLibraryOutlinedIcon sx={IC} />} label="Asset Library" badge={libCount ? libCount.toLocaleString() : null} />
        <Item to="/collections" icon={<CollectionsBookmarkOutlinedIcon sx={IC} />} label="Collections" />
        <Item to="/approvals" icon={<FactCheckOutlinedIcon sx={IC} />} label="Approvals" badge={pending || null} />
        <Item to="/shares" icon={<LinkOutlinedIcon sx={IC} />} label="Shared Links" />
      </div>

      <div className="nav-group">
        <div className="nav-label">Create</div>
        <Item to="/templates" icon={<DashboardCustomizeOutlinedIcon sx={IC} />} label="Templates" />
        <Item to="/brand" icon={<PaletteOutlinedIcon sx={IC} />} label="Brand Kit" />
      </div>

      <div className="nav-group">
        <div className="nav-label">Insights</div>
        <Item to="/analytics" icon={<InsightsOutlinedIcon sx={IC} />} label="Analytics" />
      </div>

      {isSuperAdmin && (
        <div className="nav-group">
          <div className="nav-label">Admin</div>
          <Item to="/settings" icon={<ManageAccountsOutlinedIcon sx={IC} />} label="Settings & Users" />
        </div>
      )}
    </aside>
  );
}
