import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { initials } from "../utils/tm";
import { confirmDialog } from "../components/Dialogs";

const ROLES = ["Brand Manager", "Reviewer", "Content Editor", "Agency Contributor", "Viewer"];

export default function Users() {
  const { users, usersPage, usersHasMore, usersTotal, usersStatus, fetchUsers, addUser, updateUser, setUserPassword, toggleScope, removeUser, perms, toast } = useApp();
  const [modal, setModal] = useState(null); // null | {} (new) | user (edit)
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [type, setType] = useState("any");
  const [scope, setScope] = useState("any");

  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);

  const params = { q: dq, type, scope, page: 1, limit: 24 };
  const paramsKey = JSON.stringify(params);
  useEffect(() => {
    if (perms.canManageUsers) fetchUsers({ params: { ...params, page: 1 }, append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perms.canManageUsers, paramsKey]);
  const loadMore = () => fetchUsers({ params: { ...params, page: usersPage + 1 }, append: true });

  if (!perms.canManageUsers) return (
    <><div className="crumb">Admin / <b>Settings &amp; Users</b></div>
      <div className="empty"><b>Restricted</b>Only a Super Admin can manage users.</div></>
  );

  const del = async (u) => {
    const ok = await confirmDialog({ title: "Remove user", message: `Remove ${u.name} (${u.email})? They will lose access immediately.`, confirmLabel: "Remove", danger: true });
    if (!ok) return;
    try { await removeUser(u.id); toast("User removed"); } catch (e) { toast(e.message || "Could not remove"); }
  };
  const flipScope = async (u) => {
    try { await toggleScope(u.id); toast(`${u.name} → ${u.scope === "all" ? "own work only" : "all work"}`); }
    catch (e) { toast(e.message || "Could not change access"); }
  };

  const roleTag = (r) => r === "Super Admin" ? <span className="tagc tc-i">Super Admin</span> : r;

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="crumb">Admin / <b>Settings &amp; Users</b></div>
          <h2 className="h1">User Management</h2>
          <p className="sub">Internal team and external agencies. Access defaults to <b>own work only</b>; grant <b>all work</b> to trusted staff. Only a Super Admin can manage users.</p>
        </div>
        <button className="btn p" onClick={() => setModal({})}>+ Add user</button>
      </div>

      <div className="fbar">
        <div className="search" style={{ maxWidth: 320 }}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, agency…" />
        </div>
        <select className="fbtn" value={type} onChange={(e) => setType(e.target.value)}><option value="any">All types</option><option value="Internal">Internal</option><option value="External">External</option></select>
        <select className="fbtn" value={scope} onChange={(e) => setScope(e.target.value)}><option value="any">All access</option><option value="own">Own work</option><option value="all">All work</option></select>
        <span className="fbl" style={{ marginLeft: "auto" }}>{usersTotal} user{usersTotal === 1 ? "" : "s"}</span>
      </div>

      {users.length === 0 ? <div className="empty">{usersStatus === "loading" ? "Loading…" : "No users match."}</div> : (
        <table className="lst">
          <thead><tr><th>User</th><th>Type</th><th>Organization</th><th>Role</th><th>Access</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ cursor: "default" }}>
                <td><div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span className="av" style={{ width: 30, height: 30, fontSize: 11, background: u.type === "External" ? "var(--gold-d)" : "var(--g500)" }}>{initials(u.name)}</span>
                  <div><div style={{ fontWeight: 640 }}>{u.name}</div><div className="pathcell">{u.email}</div></div>
                </div></td>
                <td><span className={"tagc " + (u.type === "External" ? "tc-i" : "tc-v")}>{u.type}</span></td>
                <td className="pathcell">{u.org === "Internal" ? "Internal" : u.org}</td>
                <td>{roleTag(u.role)}</td>
                <td><span className={"tagc " + (u.scope === "all" ? "tc-dl" : "tc-v")}>{u.scope === "all" ? "All work" : "Own work"}</span></td>
                <td><span className={"tagc " + (u.status === "Active" ? "tc-dl" : "tc-i")}>{u.status}</span></td>
                <td>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button className="btn sm" onClick={() => setModal(u)}>Edit</button>
                    {u.role !== "Super Admin" && <button className="btn sm" onClick={() => flipScope(u)}>{u.scope === "all" ? "Revoke all" : "Grant all"}</button>}
                    {u.role !== "Super Admin" && <button className="btn sm dgr" onClick={() => del(u)}>Remove</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {usersHasMore && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button className="btn" onClick={loadMore} disabled={usersStatus === "loading"}>{usersStatus === "loading" ? "Loading…" : `Load more (${usersTotal - users.length} more)`}</button>
        </div>
      )}

      {modal && <UserModal editUser={modal.id ? modal : null} onClose={() => setModal(null)} addUser={addUser} updateUser={updateUser} setUserPassword={setUserPassword} toast={toast} />}
    </>
  );
}

function UserModal({ editUser, onClose, addUser, updateUser, setUserPassword, toast }) {
  const [name, setName] = useState(editUser?.name || "");
  const [email, setEmail] = useState(editUser?.email || "");
  const [type, setType] = useState(editUser?.type || "Internal");
  const [org, setOrg] = useState(editUser?.org || "Internal");
  const [role, setRole] = useState(editUser?.role && editUser.role !== "Super Admin" ? editUser.role : "Content Editor");
  const [scope, setScope] = useState(editUser?.scope || "own");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const isSuper = editUser?.role === "Super Admin";

  const save = async () => {
    if (!name.trim() || !email.trim()) return toast("Name and email are required");
    let o = type === "Internal" ? "Internal" : org.trim();
    if (type === "External" && !o) return toast("Enter the agency name");
    if (pwd && pwd.length < 6) return toast("Password must be at least 6 characters");
    setBusy(true);
    try {
      if (editUser) {
        if (!isSuper) await updateUser(editUser.id, { name: name.trim(), email: email.trim(), role, type, org: o, scope });
        if (pwd) await setUserPassword(editUser.id, pwd);
        toast(pwd ? `${name.trim()} updated · password changed` : `${name.trim()} updated`);
      } else {
        const res = await addUser({ name: name.trim(), email: email.trim(), role, type, org: o, scope, password: pwd || undefined });
        toast(res.tempPassword ? `Added ${name.trim()} · temp password: ${res.tempPassword}` : `Added ${name.trim()}`);
      }
      onClose();
    } catch (e) { toast(e.message || "Could not save user"); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-scrim open" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>{editUser ? "Edit user" : "Add user"}</h2><button className="x" onClick={onClose} style={{ fontSize: 22, color: "var(--muted)" }}>×</button></div>
        <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {isSuper && <div className="note" style={{ marginTop: 0, marginBottom: 12 }}>This is a Super Admin — role, type and access are locked. You can still set a new password.</div>}
          <div className="two">
            <div className="field"><label>Full name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={isSuper} /></div>
            <div className="field"><label>Email</label><input type="text" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSuper} /></div>
          </div>
          {!isSuper && <>
            <div className="two">
              <div className="field"><label>User type</label>
                <select value={type} onChange={(e) => { setType(e.target.value); if (e.target.value === "Internal") setOrg("Internal"); else if (org === "Internal") setOrg(""); }}>
                  <option>Internal</option><option>External</option></select></div>
              <div className="field"><label>Organization / agency</label>
                <input type="text" value={org} disabled={type === "Internal"} onChange={(e) => setOrg(e.target.value)} placeholder="Agency name" /></div>
            </div>
            <div className="two">
              <div className="field"><label>Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
              <div className="field"><label>Access</label>
                <select value={scope} onChange={(e) => setScope(e.target.value)}><option value="own">Own work only</option><option value="all">All work</option></select></div>
            </div>
          </>}
          <div className="field"><label>{editUser ? "New password (leave blank to keep current)" : "Password (optional — auto-generated if blank)"}</label>
            <input type="text" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="min 6 characters" autoComplete="new-password" /></div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn p" onClick={save} disabled={busy}>{busy ? "Saving…" : editUser ? "Save changes" : "Add user"}</button>
        </div>
      </div>
    </div>
  );
}
