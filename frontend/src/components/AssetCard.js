import { useState, memo } from "react";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import Art from "./Art";
import { OrgIcon } from "./Icon";
import { useApp } from "../context/AppContext";
import { grad, statusClass, statusLabel, fmtDate, idIndex } from "../utils/helpers";
import { catLabel } from "../data/prismData";

function AssetCard({ asset: a }) {
  const { canSeeAll, openDrawer } = useApp();
  const [fav, setFav] = useState(false);
  const idx = idIndex(a.id);

  return (
    <div className="card" onClick={() => openDrawer(a)}>
      <div className="thumb" style={{ background: grad(idx) }}>
        {a.t === "image" && a.url
          ? <img className="thumb-img" src={a.url} alt={a.n} loading="lazy" />
          : <Art index={idx} label={a.sub} />}
        {a.t === "video" && <div className="play"><PlayArrowRoundedIcon sx={{ fontSize: 26, color: "#12131a" }} /></div>}
        <span className="type-badge">{a.sub}</span>
        <span className={"status-dot " + statusClass(a.st)}>{statusLabel(a.st)}</span>
        {canSeeAll && (
          <span className="org-chip"><OrgIcon org={a.org} sx={{ fontSize: 12 }} />{a.org === "Internal" ? "Internal" : a.org}</span>
        )}
      </div>
      <div className="card-body">
        <div className="card-title">{a.n}</div>
        <div className="card-meta">{catLabel[a.cat]} · {a.dim} · {fmtDate(a.date)}</div>
        <div className="card-tags">
          {a.tags.slice(0, 3).map((t) => <span className="tag" key={t}>{t}</span>)}
        </div>
        <button
          className={"fav" + (fav ? " on" : "")}
          onClick={(e) => { e.stopPropagation(); setFav((v) => !v); }}
        >
          {fav ? <StarRoundedIcon sx={{ fontSize: 18 }} /> : <StarBorderRoundedIcon sx={{ fontSize: 18 }} />}
        </button>
      </div>
    </div>
  );
}

export default memo(AssetCard);
