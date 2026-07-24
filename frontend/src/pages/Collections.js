import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Art from "../components/Art";
import { grad } from "../utils/helpers";

export default function Collections() {
  const { collections, canSee, openModal, toast } = useApp();
  const navigate = useNavigate();

  const vis = collections.filter((c) => canSee(c.org));
  const years = [...new Set(vis.map((c) => c.y))].sort((x, y) => y - x);

  const open = (c) => { navigate("/library"); toast(`Opened "${c.n}" · ${c.y}`); };

  const Card = (c) => {
    const i = collections.indexOf(c);
    return (
      <div className="coll" key={c.n} style={{ background: c.grad || grad(i + 2) }} onClick={() => open(c)}>
        <div style={{ position: "absolute", inset: 0 }}><Art index={i + 2} /></div>
        <div className="cinfo"><h3>{c.n}</h3><span>{c.c} assets · {c.y}</span></div>
      </div>
    );
  };

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <div className="crumbs">Workspace / <b>Collections</b></div>
          <h1>Collections</h1><p>Curated groups for campaigns, regions and teams.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal("collection")}>＋ New Collection</button>
      </div>

      {vis.length === 0 && <div className="empty">No collections in your workspace yet.</div>}

      {years.map((y) => {
        const items = vis.filter((c) => c.y === y);
        return (
          <div className="year-sec" key={y}>
            <div className="year-head">
              <span className="yr">{y}</span>
              <span className="yc">{items.length} collection{items.length > 1 ? "s" : ""}</span>
              <span className="yl"></span>
            </div>
            <div className="coll-grid">{items.map(Card)}</div>
          </div>
        );
      })}
    </section>
  );
}
