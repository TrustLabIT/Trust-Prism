import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import Art from "../components/Art";
import { grad, statusLabel, statusClass, initials, avColor, idIndex } from "../utils/helpers";
import { TYPES } from "../data/prismData";

const FILTERS = [
  ["all", "All"], ["mine", "Awaiting me"], ["review", "In review"], ["draft", "Drafts"],
];
const stages = ["Legal & compliance", "Brand check", "Creative review", "Final publish"];
const people = ["Marcus L.", "Priya S.", "Ana R.", "Brand Team"];

export default function Approvals() {
  const { approvals, openDrawer, toast, updateStatus, currentUser, fetchApprovals } = useApp();
  const [filter, setFilter] = useState("all");
  const canApprove = ["Super Admin", "Brand Manager", "Reviewer"].includes(currentUser?.role);

  useEffect(() => {
    fetchApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = async (a, e) => {
    e.stopPropagation();
    try { await updateStatus(a.id, "approved"); toast(`Approved "${a.n}" ✓`); }
    catch (err) { toast(err.message || "Could not approve"); }
  };

  let rows = approvals;
  if (filter === "review") rows = approvals.filter((a) => a.st === "review");
  else if (filter === "draft") rows = approvals.filter((a) => a.st === "draft");
  else if (filter === "mine") rows = approvals.slice(0, 3);

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <div className="crumbs">Workspace / <b>Approvals</b></div>
          <h1>Approval Queue</h1><p>Review, comment and sign off before assets go live.</p>
        </div>
      </div>

      <div className="filters">
        {FILTERS.map(([f, label]) => (
          <button key={f} className={"chip" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>{label}</button>
        ))}
      </div>

      {rows.length === 0
        ? <div className="empty">Nothing awaiting approval right now. 🎉</div>
        : (
          <div className="table">
            <div className="trow head"><div></div><div>Asset</div><div>Stage</div><div>Assignee</div><div>Status</div><div></div></div>
            {rows.map((a, idx) => {
              const who = people[idx % people.length];
              const gi = idIndex(a.id);
              return (
                <div className="trow" key={a.id} onClick={() => openDrawer(a, "approval")}>
                  <div className="tmini" style={{ background: grad(gi) }}><Art index={gi} /></div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{a.n}</div>
                    <div style={{ color: "var(--muted)", fontSize: 11.5 }}>{TYPES[a.t]} · {a.by}</div>
                  </div>
                  <div>{stages[idx % stages.length]}</div>
                  <div className="who"><span className="av" style={{ background: avColor(who) }}>{initials(who)}</span>{who}</div>
                  <div><span className={"pill " + statusClass(a.st)}>{statusLabel(a.st)}</span></div>
                  <div>
                    {canApprove
                      ? <button className="btn btn-primary" style={{ padding: "5px 10px" }} onClick={(e) => approve(a, e)}>Approve</button>
                      : <button className="btn btn-ghost" style={{ padding: "5px 10px" }} onClick={(e) => { e.stopPropagation(); toast("Reminder sent"); }}>Nudge</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </section>
  );
}
