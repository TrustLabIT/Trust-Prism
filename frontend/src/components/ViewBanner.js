import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useApp } from "../context/AppContext";

export default function ViewBanner() {
  const { canSeeAll, currentUser, assetStats } = useApp();
  if (canSeeAll) return null;
  const n = assetStats.total;
  return (
    <div className="viewbanner">
      <VisibilityOutlinedIcon sx={{ fontSize: 15 }} /> Signed in as <b>{currentUser.name}</b> ({currentUser.org}) — you can see only <b>{currentUser.org}</b>'s work:{" "}
      {n} asset{n !== 1 ? "s" : ""} visible.
    </div>
  );
}
