import { useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import BoltIcon from "@mui/icons-material/Bolt";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Art from "./Art";
import { confirmDialog } from "./Dialogs";
import { useApp } from "../context/AppContext";
import {
  grad, fmtDate, statusLabel, statusClass, idIndex, initials, avColor,
  nf, money, chMeta, perfTotals,
} from "../utils/helpers";
import { TYPES, channels } from "../data/prismData";

const TABS = [
  { k: "details", label: "Details" },
  { k: "performance", label: "Performance" },
  { k: "versions", label: "Versions" },
  { k: "approval", label: "Approval" },
  { k: "comments", label: "Comments" },
];

export default function DetailDrawer() {
  const {
    drawer, closeDrawer, setDrawerTab, openModal, toast, lodgeOutcome, removeOutcome, updateStatus, currentUser, deleteAsset, addComment,
  } = useApp();
  const a = drawer.asset;

  // Nothing selected yet — render just the closed shell.
  if (!a) {
    return (
      <>
        <div className="drawer-scrim" onClick={closeDrawer}></div>
        <aside className="drawer"></aside>
      </>
    );
  }

  const idx = idIndex(a.id);
  const isMedia = (a.t === "image" || a.t === "video") && a.url;
  // download/share only for approved assets (reviewers can always fetch to review)
  const isApprover = ["Super Admin", "Brand Manager", "Reviewer"].includes(currentUser?.role);
  const canUse = a.st === "approved" || isApprover;

  const doDelete = async () => {
    const ok = await confirmDialog({
      title: "Delete asset",
      message: `Delete “${a.n}”? This removes the file from S3 and can’t be undone.`,
      confirmLabel: "Delete", danger: true,
    });
    if (!ok) return;
    try { await deleteAsset(a.id); closeDrawer(); toast("Asset deleted"); }
    catch (err) { toast(err.message || "Could not delete"); }
  };

  return (
    <>
      <div className={"drawer-scrim" + (drawer.open ? " open" : "")} onClick={closeDrawer}></div>
      <aside className={"drawer" + (drawer.open ? " open" : "")}>
        <div className="drawer-head">
          <button className="iconbtn" onClick={closeDrawer}><ArrowBackIcon sx={{ fontSize: 20 }} /></button>
          <h2>{a.n}</h2>
          <button className="iconbtn" title="Edit" onClick={() => openModal("editAsset")}><EditOutlinedIcon sx={{ fontSize: 18 }} /></button>
          <button className="iconbtn" title="Delete" onClick={doDelete} style={{ color: "var(--danger)" }}><DeleteOutlineIcon sx={{ fontSize: 19 }} /></button>
        </div>
        <div className="drawer-body">
          <div className="preview-pane">
            <div className={"preview-hero" + (isMedia ? " media" : "")} style={isMedia ? undefined : { background: grad(idx) }}>
              {a.t === "image" && a.url
                ? <img className="hero-img" src={a.url} alt={a.n} />
                : a.t === "video" && a.url
                  ? <video className="hero-img" src={a.url} controls />
                  : <Art index={idx} label={TYPES[a.t]} />}
              {a.t === "video" && !a.url && <div className="play" style={{ width: 60, height: 60 }}><PlayArrowRoundedIcon sx={{ fontSize: 34, color: "#12131a" }} /></div>}
            </div>
            <div className="preview-actions">
              <button className="btn btn-primary" style={{ minWidth: 150 }} disabled={!canUse} title={canUse ? "" : "Only approved assets can be downloaded"} onClick={() => openModal("download")}><FileDownloadOutlinedIcon sx={{ fontSize: 17 }} /> Download</button>
              <button className="btn btn-ghost" onClick={() => openModal("editAsset")}><EditOutlinedIcon sx={{ fontSize: 16 }} /> Edit</button>
            </div>
            {!canUse && (
              <div className="ssub" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: -6 }}>
                <LockOutlinedIcon sx={{ fontSize: 14 }} /> Download unlocks once this asset is <b>approved</b>.
              </div>
            )}
            <div>
              <div className="section-t">Rendition presets</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Original", "Web 1600px", "Social 1080²", "Thumbnail", "PDF", "WebP"].map((r) => (
                  <span className="tag" key={r}>{r}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="info-pane">
            <div className="tabs">
              {TABS.map((t) => (
                <button
                  key={t.k}
                  className={"tab" + (drawer.tab === t.k ? " active" : "")}
                  onClick={() => setDrawerTab(t.k)}
                >{t.label}</button>
              ))}
            </div>

            {drawer.tab === "details" && <DetailsTab a={a} />}
            {drawer.tab === "performance" && (
              <PerformanceTab a={a} lodgeOutcome={lodgeOutcome} removeOutcome={removeOutcome} toast={toast} />
            )}
            {drawer.tab === "versions" && <VersionsTab toast={toast} />}
            {drawer.tab === "approval" && <ApprovalTab a={a} updateStatus={updateStatus} toast={toast} currentUser={currentUser} />}
            {drawer.tab === "comments" && <CommentsTab a={a} addComment={addComment} toast={toast} />}
          </div>
        </div>
      </aside>
    </>
  );
}

function DetailsTab({ a }) {
  const kv = [
    ["Type", TYPES[a.t]], ["Dimensions", a.dim], ["File size", a.size],
    ["Status", statusLabel(a.st)], ["Date", fmtDate(a.date)], ["Calendar year", a.year],
    ["Uploaded by", a.by], ["Owner / org", a.org === "Internal" ? "Internal" : a.org],
    ["Downloads", a.dl.toLocaleString()], ["Rights", "Cleared · exp. Dec 2026"],
  ];
  return (
    <>
      <div>
        {kv.map(([k, v]) => (
          <div className="kv" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
        ))}
      </div>
      <div className="section-t">AI-generated tags</div>
      <div className="card-tags">{a.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
      <div className="ai-suggest" style={{ marginTop: 16 }}>
        <b><AutoAwesomeOutlinedIcon sx={{ fontSize: 14 }} /> Trust Prism AI</b>
        Auto-tagged, color-analyzed and transcribed on upload. Content is brand-safe and rights-cleared.
      </div>
    </>
  );
}

function PerformanceTab({ a, lodgeOutcome, removeOutcome, toast }) {
  const [showLodge, setShowLodge] = useState(false);
  const hasOutcomes = (a.outcomes || []).length > 0;

  const delOne = async (i) => {
    try { await removeOutcome(a.id, i); toast("Outcome removed"); }
    catch (e) { toast(e.message || "Could not remove outcome"); }
  };
  const clearAll = async () => {
    const ok = await confirmDialog({
      title: "Clear all outcomes",
      message: "Remove every lodged/synced outcome for this asset? This resets its campaign metrics to zero.",
      confirmLabel: "Clear all", danger: true,
    });
    if (!ok) return;
    try { await removeOutcome(a.id); toast("All outcomes cleared"); }
    catch (e) { toast(e.message || "Could not clear outcomes"); }
  };
  const blank = { loChannel: channels[0].n, loDate: "2026-07-23", loImp: "", loViews: "", loClicks: "", loEng: "", loConv: "", loSpend: "", loRev: "" };
  const [form, setForm] = useState(blank);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const t = perfTotals(a);
  const roiPos = t.roi >= 0;

  const kpis = [
    ["Views", nf(t.views), "plays / opens"], ["Impressions", nf(t.impressions), "served"],
    ["Clicks", nf(t.clicks), "link clicks"], ["CTR", t.ctr.toFixed(2) + "%", "click-through"],
    ["Conversions", nf(t.conversions), "actions"], ["Spend", money(t.spend), "media cost"],
    ["Revenue", money(t.revenue), "attributed"], ["ROAS", (t.roas ? t.roas.toFixed(1) : "0") + "×", "return on ad spend"],
  ];

  // views by channel
  const byCh = {};
  (a.outcomes || []).forEach((o) => { const v = +o.views || +o.impressions || 0; byCh[o.channel] = (byCh[o.channel] || 0) + v; });
  const rows = Object.entries(byCh).sort((x, y) => y[1] - x[1]);
  const max = Math.max(1, ...rows.map((r) => r[1]));

  const doLodge = () => {
    const g = (k) => +form[k] || 0;
    const rec = {
      channel: form.loChannel, date: form.loDate || "2026-07-23",
      impressions: g("loImp"), views: g("loViews"), clicks: g("loClicks"), engagements: g("loEng"),
      conversions: g("loConv"), spend: g("loSpend"), revenue: g("loRev"), auto: false,
    };
    if (!rec.impressions && !rec.views && !rec.clicks && !rec.conversions) { toast("Enter at least one metric"); return; }
    lodgeOutcome(a.id, rec);
    setForm(blank);
    setShowLodge(false);
    toast(`Outcome lodged for ${rec.channel}`);
  };

  const syncChannel = () => {
    const preset = [
      { channel: "Google Ads", impressions: 640000, views: 0, clicks: 8100, engagements: 0, conversions: 360, spend: 2800, revenue: 39600 },
      { channel: "Meta / Facebook", impressions: 410000, views: 72000, clicks: 4600, engagements: 12800, conversions: 210, spend: 2200, revenue: 23100 },
      { channel: "LinkedIn", impressions: 180000, views: 0, clicks: 2400, engagements: 3100, conversions: 90, spend: 1900, revenue: 14400 },
      { channel: "TikTok", impressions: 0, views: 260000, clicks: 5400, engagements: 31000, conversions: 170, spend: 1600, revenue: 18700 },
    ];
    const p = preset[(a.outcomes || []).length % preset.length];
    lodgeOutcome(a.id, { ...p, date: "2026-07-22", auto: true });
    toast(`Synced latest metrics from ${p.channel}`);
  };

  const numFields = [
    ["Impressions", "loImp"], ["Views", "loViews"], ["Clicks", "loClicks"], ["Engagements", "loEng"],
    ["Conversions", "loConv"], ["Spend ($)", "loSpend"], ["Revenue ($)", "loRev"],
  ];

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div className="section-t" style={{ margin: 0 }}>Campaign outcomes</div>
        <div style={{ display: "flex", gap: 8 }}>
          {hasOutcomes && <button className="btn btn-ghost" style={{ padding: "6px 12px", color: "var(--danger)", borderColor: "var(--danger-soft)" }} onClick={clearAll} title="Remove all lodged/synced outcomes"><DeleteOutlineIcon sx={{ fontSize: 15 }} /> Clear all</button>}
          <button className="btn btn-ghost" style={{ padding: "6px 12px" }} onClick={syncChannel} title="Simulate auto-pulling metrics from a connected ad/analytics platform"><SyncOutlinedIcon sx={{ fontSize: 15 }} /> Sync channel</button>
          <button className="btn btn-primary" style={{ padding: "6px 12px" }} onClick={() => setShowLodge((v) => !v)}><AddIcon sx={{ fontSize: 16 }} /> Lodge outcome</button>
        </div>
      </div>

      <div className="perf-kpis">
        {kpis.map(([l, v, d]) => (
          <div className="kpi" key={l}><div className="kl">{l}</div><div className="kv2">{v}</div><div className="kd">{d}</div></div>
        ))}
        <div className="kpi">
          <div className="kl">ROI</div>
          <div className="kv2" style={{ color: roiPos ? "#16a34a" : "#dc2626" }}>{roiPos ? "+" : ""}{t.roi.toFixed(0)}%</div>
          <div className="kd">CPA {t.cpa ? money(t.cpa) : "—"}</div>
        </div>
      </div>

      {showLodge && (
        <div className="lodge">
          <div className="section-t" style={{ marginTop: 0 }}>Lodge a campaign outcome</div>
          <div className="lodge-grid">
            <div className="field"><label>Channel / platform</label>
              <select value={form.loChannel} onChange={set("loChannel")}>
                {channels.map((c) => <option key={c.n}>{c.n}</option>)}
              </select>
            </div>
            <div className="field"><label>Period / date</label>
              <input type="date" className="datepick" value={form.loDate} onChange={set("loDate")} />
            </div>
            {numFields.map(([label, k]) => (
              <div className="field" key={k}><label>{label}</label>
                <input type="number" min="0" placeholder="0" value={form[k]} onChange={set(k)} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={doLodge}><CheckIcon sx={{ fontSize: 16 }} /> Save outcome</button>
            <button className="btn btn-ghost" onClick={() => setShowLodge(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="section-t">Views by channel</div>
      <div>
        {rows.length ? rows.map(([n, v]) => {
          const m = chMeta(n);
          return (
            <div className="perf-bar" key={n}>
              <div className="pl">{m.i} {n}</div>
              <div className="pbar"><span style={{ width: (v / max * 100) + "%", background: m.c }}></span></div>
              <div className="pt">{nf(v)}</div>
            </div>
          );
        }) : <div className="perf-empty">No results lodged yet.</div>}
      </div>

      <div className="section-t">Lodged results</div>
      <div>
        <div className="perf-row head"><div>Channel</div><div>Period</div><div>Views</div><div>Clicks</div><div>Conv.</div><div>Revenue</div><div></div></div>
        {(a.outcomes || []).length ? a.outcomes.map((o, i) => {
          const m = chMeta(o.channel);
          return (
            <div className="perf-row" key={i}>
              <div className="ch"><span className="cdot" style={{ background: m.c }}>{m.i}</span>{o.channel}
                {o.auto && <span className="auto-badge" title="Auto-synced from connected platform"><BoltIcon sx={{ fontSize: 10 }} /></span>}
              </div>
              <div>{fmtDate(o.date)}</div><div>{nf(o.views || o.impressions)}</div>
              <div>{nf(o.clicks)}</div><div>{nf(o.conversions)}</div><div>{money(o.revenue)}</div>
              <button className="perf-del" title="Remove this outcome" onClick={() => delOne(i)}><DeleteOutlineIcon sx={{ fontSize: 15 }} /></button>
            </div>
          );
        }) : <div className="perf-empty">Nothing lodged yet — click "Lodge outcome" to record views, clicks, spend and revenue, or "Sync channel" to auto-pull them.</div>}
      </div>
    </>
  );
}

function VersionsTab({ toast }) {
  const vers = [
    { vn: "v3", cur: true, t: "Current — final color grade", m: "Priya S. · 2 days ago · 4.2 MB" },
    { vn: "v2", t: "Legal feedback applied", m: "Marcus L. · 5 days ago · 4.1 MB" },
    { vn: "v1", t: "Initial upload", m: "Priya S. · 8 days ago · 3.9 MB" },
  ];
  return (
    <>
      <div className="section-t">Version history</div>
      {vers.map((v) => (
        <div className={"ver" + (v.cur ? " cur" : "")} key={v.vn}>
          <div className="vn">{v.vn}</div>
          <div><div style={{ fontWeight: 600 }}>{v.t}</div><div className="vmeta">{v.m}</div></div>
        </div>
      ))}
      <button className="btn btn-ghost" style={{ marginTop: 14, width: "100%" }} onClick={() => toast("Upload new version")}><FileUploadOutlinedIcon sx={{ fontSize: 16 }} /> Upload new version</button>
    </>
  );
}

function ApprovalTab({ a, updateStatus, toast, currentUser }) {
  const [busy, setBusy] = useState(false);
  const canApprove = ["Super Admin", "Brand Manager", "Reviewer"].includes(currentUser?.role);

  // Build the workflow track from the asset's real status
  const order = { draft: 0, review: 1, approved: 3 };
  const cur = order[a.st] ?? 1;
  const stepFor = (idx) => (cur > idx ? "done" : cur === idx ? "now" : "wait");
  const steps = [
    { name: "Draft", sub: `Uploaded by ${a.by}` },
    { name: "In review", sub: "Creative + brand check" },
    { name: "Legal & compliance", sub: "Rights / claims check" },
    { name: "Approved & live", sub: canApprove ? "You can approve" : "Awaiting an approver" },
  ];

  const setStatus = async (status, msg) => {
    setBusy(true);
    try { await updateStatus(a.id, status); toast(msg); }
    catch (err) { toast(err.message || "Could not update status"); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="section-t" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Approval status</span>
        <span className={"pill " + statusClass(a.st)}>{statusLabel(a.st)}</span>
      </div>
      <div className="approval-track">
        {steps.map((s, i) => {
          const st = i === 3 ? (a.st === "approved" ? "done" : "wait") : stepFor(i);
          return (
            <div className="step" key={s.name}>
              <div className={"sdot " + st}>{st === "done" ? <CheckIcon sx={{ fontSize: 16 }} /> : i + 1}</div>
              <div className="stext"><div className="sname">{s.name}</div><div className="ssub">{s.sub}</div></div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        {a.st !== "approved" && canApprove && (
          <button className="btn btn-primary" style={{ flex: 1, minWidth: 140 }} disabled={busy} onClick={() => setStatus("approved", "Approved")}><CheckCircleOutlineIcon sx={{ fontSize: 17 }} /> Approve</button>
        )}
        {a.st === "draft" && (
          <button className="btn btn-ghost" disabled={busy} onClick={() => setStatus("review", "Submitted for review")}><SendOutlinedIcon sx={{ fontSize: 15 }} /> Submit for review</button>
        )}
        {a.st !== "draft" && (
          <button className="btn btn-ghost" disabled={busy} onClick={() => setStatus("review", "Sent back for changes")}><ReplayOutlinedIcon sx={{ fontSize: 16 }} /> Request changes</button>
        )}
        {a.st === "approved" && !canApprove && (
          <div className="ssub" style={{ padding: "8px 0" }}>This asset is approved and live.</div>
        )}
      </div>
      {!canApprove && a.st !== "approved" && (
        <div className="ai-suggest" style={{ marginTop: 14 }}><b><LockOutlinedIcon sx={{ fontSize: 13 }} /> Approval permission</b>Only Reviewers, Brand Managers or a Super Admin can approve. Your role is <b>{currentUser?.role || "—"}</b>.</div>
      )}
    </>
  );
}

function CommentsTab({ a, addComment, toast }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const when = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " +
      dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };
  // merge comments + download activity into one feed, newest first
  const feed = [
    ...(a.comments || []).map((c) => ({ kind: "comment", by: c.by, text: c.text, date: c.date })),
    ...(a.recentDownloads || []).map((d) => ({ kind: "download", by: d.by, reason: d.reason, date: d.date })),
  ].sort((x, y) => new Date(y.date) - new Date(x.date));

  const post = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try { await addComment(a.id, t); setText(""); }
    catch (err) { toast(err.message || "Could not post comment"); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="section-t">Activity &amp; comments</div>
      {feed.length === 0 && <div className="ssub" style={{ padding: "4px 0 10px" }}>No activity yet — be the first to comment.</div>}
      {feed.map((it, i) => it.kind === "comment" ? (
        <div className="comment" key={i}>
          <div className="av" style={{ background: avColor(it.by || "?") }}>{initials(it.by || "?")}</div>
          <div className="cbody"><span className="cname">{it.by}</span><span className="ctime">{when(it.date)}</span>
            <div>{it.text}</div></div>
        </div>
      ) : (
        <div className="activity-row" key={i}>
          <FileDownloadOutlinedIcon sx={{ fontSize: 15 }} />
          <span><b>{it.by}</b> downloaded{it.reason ? ` — ${it.reason}` : ""}</span>
          <span className="ctime">{when(it.date)}</span>
        </div>
      ))}
      <div className="commentbox">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") post(); }} placeholder="Add a comment…" />
        <button className="btn btn-primary" onClick={post} disabled={busy}>{busy ? "…" : "Send"}</button>
      </div>
    </>
  );
}
