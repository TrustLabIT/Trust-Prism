import { memo } from "react";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import Art from "./Art";
import { OrgIcon } from "./Icon";
import { useApp } from "../context/AppContext";
import { grad, statusClass, statusLabel, fmtDate, idIndex } from "../utils/helpers";
import { catLabel } from "../data/prismData";

function AssetRow({ asset: a }) {
  const { canSeeAll, openDrawer } = useApp();
  const idx = idIndex(a.id);

  return (
    <div className="asset-row" onClick={() => openDrawer(a)}>
      <div className="ar-thumb" style={{ background: a.t === "image" && a.url ? "#f1f2f4" : grad(idx) }}>
        {a.t === "image" && a.url
          ? <img src={a.url} alt={a.n} loading="lazy" />
          : <Art index={idx} label="" />}
        {a.t === "video" && <span className="ar-play"><PlayArrowRoundedIcon sx={{ fontSize: 16, color: "#12131a" }} /></span>}
      </div>
      <div className="ar-main">
        <div className="ar-name">{a.n}</div>
        <div className="ar-tags">{(a.tags || []).slice(0, 4).map((t) => <span className="tag" key={t}>{t}</span>)}</div>
      </div>
      <div className="ar-col">{catLabel[a.cat]} · {a.sub}</div>
      <div className="ar-col">{a.dim || "—"} · {a.size || "—"}</div>
      <div className="ar-col">{fmtDate(a.date)}</div>
      <div className="ar-col">
        {canSeeAll && <span className="ar-org"><OrgIcon org={a.org} sx={{ fontSize: 12 }} />{a.org === "Internal" ? "Internal" : a.org}</span>}
      </div>
      <div><span className={"status-dot " + statusClass(a.st)}>{statusLabel(a.st)}</span></div>
    </div>
  );
}

export default memo(AssetRow);
