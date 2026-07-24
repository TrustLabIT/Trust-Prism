import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { initials, avColor } from "../utils/helpers";

const FILTERS = [
  ["all", "All users"], ["Internal", "Internal"],
  ["External", "External / agencies"], ["allwork", "Sees all work"],
];

export default function Settings() {
  const { users, isSuperAdmin, toggleScope, removeUser, openModal, toast, fetchUsers } = useApp();
  const [filter, setFilter] = useState("all");

  // Load the real user list when a Super Admin opens Settings
  useEffect(() => {
    if (isSuperAdmin) fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  const stUsers = users.length;
  const stAgencies = new Set(users.filter((u) => u.type === "External").map((u) => u.org)).size;
  const stAll = users.filter((u) => u.scope === "all").length;
  const stInvited = users.filter((u) => u.status === "Invited").length;

  let list = users.slice();
  if (filter === "Internal") list = list.filter((u) => u.type === "Internal");
  else if (filter === "External") list = list.filter((u) => u.type === "External");
  else if (filter === "allwork") list = list.filter((u) => u.scope === "all");

  const grant = async (u) => {
    try {
      await toggleScope(u.id);
      toast(u.scope === "all" ? `${u.name} now sees own work only` : `Granted "All work" to ${u.name}`);
    } catch (err) { toast(err.message || "Could not update access"); }
  };
  const del = async (u) => {
    if (!window.confirm(`Remove ${u.name}? This cannot be undone.`)) return;
    try { await removeUser(u.id); toast(`Removed ${u.name}`); }
    catch (err) { toast(err.message || "Could not remove user"); }
  };

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <div className="crumbs">Admin / <b>Settings &amp; Users</b></div>
          <h1>User Management</h1><p>Set up internal team members and external agencies, and control what each can see.</p>
        </div>
        {isSuperAdmin && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-ghost" onClick={() => openModal("user", { userType: "External" })}>＋ Invite agency</button>
            <button className="btn btn-primary" onClick={() => openModal("user", { userType: "Internal" })}>＋ Add user</button>
          </div>
        )}
      </div>

      {!isSuperAdmin ? (
        <div className="empty">🔒 Only a Super Admin can manage users.</div>
      ) : (
        <>
          <div className="callout-card">
            <b>🔑 How access works</b>
            <p>By default every user sees <b>only their own work</b> — the assets and collections their organization created. External agencies can store, work on and comment on assets, but each agency sees only its own past and present work. A <b>Super Admin</b> can grant specific users <b>"All work"</b> access, and only a Super Admin can add or edit users.</p>
          </div>

          <div className="stats" style={{ marginTop: 18 }}>
            <div className="stat"><div className="lab">👥 Total users</div><div className="val">{stUsers}</div></div>
            <div className="stat"><div className="lab">🏢 External agencies</div><div className="val">{stAgencies}</div></div>
            <div className="stat"><div className="lab">🌐 Can see all work</div><div className="val">{stAll}</div></div>
            <div className="stat"><div className="lab">✉ Pending invites</div><div className="val">{stInvited}</div></div>
          </div>

          <div className="filters" style={{ marginTop: 20 }}>
            {FILTERS.map(([f, label]) => (
              <button key={f} className={"chip" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>{label}</button>
            ))}
          </div>

          <div className="table">
            <div className="urow head"><div>User</div><div>Type</div><div>Organization</div><div>Role</div><div>Access</div><div></div></div>
            {list.map((u) => {
              const isSup = u.role === "Super Admin";
              return (
                <div className="urow" key={u.id}>
                  <div className="u">
                    <span className="av" style={{ background: avColor(u.name) }}>{initials(u.name)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="nm">{u.name}{" "}
                        {u.status === "Active"
                          ? <span className="tagc tc-active">Active</span>
                          : <span className="tagc tc-invited">Invited</span>}
                      </div>
                      <div className="em">{u.email}</div>
                    </div>
                  </div>
                  <div>{u.type === "External" ? <span className="tagc tc-ext">External</span> : <span className="tagc tc-int">Internal</span>}</div>
                  <div>{u.org === "Internal" ? "🏠 Internal" : u.org}</div>
                  <div>{isSup ? <span className="tagc tc-super">Super Admin</span> : u.role}</div>
                  <div>{u.scope === "all" ? <span className="tagc tc-all">🌐 All work</span> : <span className="tagc tc-own">🔒 Own work</span>}</div>
                  <div className="uact">
                    {!isSup && <button onClick={() => grant(u)}>{u.scope === "all" ? "Revoke all" : "Grant all"}</button>}
                    {!isSup && <button onClick={() => del(u)} title="Remove user">✕</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
