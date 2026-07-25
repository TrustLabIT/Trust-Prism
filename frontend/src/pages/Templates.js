import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import { useApp } from "../context/AppContext";
import Art from "../components/Art";
import { grad } from "../utils/helpers";

const CHIPS = ["All", "Social", "Banners", "Print / Pamphlets", "Email", "Presentations"];

export default function Templates() {
  const { templates, openModal } = useApp();
  const [chip, setChip] = useState("All");

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <div className="crumbs">Create / <b>Templates</b></div>
          <h1>Templates</h1><p>On-brand, editable starting points. Locked to brand colors and fonts.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal("editor")}><AddIcon sx={{ fontSize: 16 }} /> Create Template</button>
      </div>

      <div className="filters">
        {CHIPS.map((c) => (
          <button key={c} className={"chip" + (chip === c ? " active" : "")} onClick={() => setChip(c)}>{c}</button>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="empty">No templates yet. Click <b>Create Template</b> to make an on-brand starter.</div>
      )}

      <div className="grid">
        {templates.map((t, i) => (
          <div className="card tpl-card" key={t.id || t.n + i} onClick={() => openModal("editor", { templateId: t.id })}>
            <div className="thumb" style={{ background: grad(i + 1) }}>
              <Art index={i + 1} label={t.k} />
              <span className="tpl-badge">{t.r}</span>
            </div>
            <div className="card-body">
              <div className="card-title">{t.n}</div>
              <div className="card-meta">{t.k} template · brand-locked</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
