import { useEffect } from "react";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import HourglassEmptyOutlinedIcon from "@mui/icons-material/HourglassEmptyOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import { useApp } from "../context/AppContext";
import { grad, nf } from "../utils/helpers";

const li = { fontSize: 15 };

export default function Analytics() {
  const { analytics, fetchAnalytics } = useApp();

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    total = 0, top = [], downloads30d = 0, downloadsDeltaPct = null, activeUsers = 0,
    avgApprovalDays = null, topDownloaded = [], staleCount = 0, taggedPct = 0, pending = 0,
  } = analytics;

  const aggRows = top || [];
  const aggMax = Math.max(1, ...aggRows.map((r) => r.views));
  const usedMax = Math.max(1, ...topDownloaded.map((r) => r.v));

  const dlDelta = downloadsDeltaPct == null
    ? { cls: "up", text: "last 30 days" }
    : downloadsDeltaPct >= 0
      ? { cls: "up", text: `▲ ${downloadsDeltaPct}% vs prev 30d` }
      : { cls: "down", text: `▼ ${Math.abs(downloadsDeltaPct)}% vs prev 30d` };

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <div className="crumbs">Insights / <b>Analytics</b></div>
          <h1>Analytics</h1><p>What's being used, by whom, and where the gaps are.</p>
        </div>
        <div className="viewas" title="Metrics reflect the last 30 days">
          <CalendarMonthOutlinedIcon sx={li} /> Last 30 days
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="lab"><Inventory2OutlinedIcon sx={li} /> Total assets</div><div className="val">{total.toLocaleString()}</div><div className="delta up">live count</div></div>
        <div className="stat"><div className="lab"><FileDownloadOutlinedIcon sx={li} /> Downloads (30d)</div><div className="val">{downloads30d.toLocaleString()}</div><div className={"delta " + dlDelta.cls}>{dlDelta.text}</div></div>
        <div className="stat"><div className="lab"><GroupOutlinedIcon sx={li} /> Active users (30d)</div><div className="val">{activeUsers.toLocaleString()}</div><div className="delta up">downloaded or commented</div></div>
        <div className="stat"><div className="lab"><ScheduleOutlinedIcon sx={li} /> Avg. approval time</div><div className="val">{avgApprovalDays == null ? "—" : `${avgApprovalDays}d`}</div><div className="delta up">{avgApprovalDays == null ? "no approvals yet" : "upload → approved"}</div></div>
      </div>

      <div className="bk-section">
        <h3><CampaignOutlinedIcon sx={{ fontSize: 17, verticalAlign: "-3px" }} /> Campaign outcomes — top electronic media by views</h3>
        <div className="desc">Aggregated from outcomes lodged on each asset (views + impressions across all channels).</div>
        <div style={{ marginTop: 10 }}>
          {aggRows.length === 0
            ? <div className="perf-empty">No campaign outcomes lodged yet. Open any electronic-media asset → Performance → "Lodge outcome".</div>
            : aggRows.map((r, i) => (
              <div className="abar" key={r.n + i}>
                <div className="lbl">{r.n}</div>
                <div className="track"><span style={{ width: (r.views / aggMax * 100) + "%", background: grad(i) }}></span></div>
                <div className="val">{nf(r.views)} views · {nf(r.conv)} conv</div>
              </div>
            ))}
        </div>
      </div>

      <div className="bk-section">
        <h3>Most-used assets</h3><div className="desc">Ranked by downloads (last 30 days where available, otherwise all-time).</div>
        <div style={{ marginTop: 8 }}>
          {topDownloaded.length === 0
            ? <div className="perf-empty">No downloads recorded yet. Downloads appear here once assets are downloaded.</div>
            : topDownloaded.map((r, i) => (
              <div className="abar" key={r.n + i}>
                <div className="lbl r">{r.n}</div>
                <div className="track"><span style={{ width: (r.v / usedMax * 100) + "%", background: grad(i) }}></span></div>
                <div className="val sm">{r.v.toLocaleString()}</div>
              </div>
            ))}
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="lab"><HistoryOutlinedIcon sx={li} /> Stale assets (&gt;12mo unused)</div><div className="val">{staleCount.toLocaleString()}</div><div className={"delta " + (staleCount ? "down" : "up")}>{staleCount ? "Consider archiving" : "None stale"}</div></div>
        <div className="stat"><div className="lab"><SellOutlinedIcon sx={li} /> Tagged assets</div><div className="val">{taggedPct}%</div><div className="delta up">have search tags</div></div>
        <div className="stat"><div className="lab"><HourglassEmptyOutlinedIcon sx={li} /> Pending approvals</div><div className="val">{pending.toLocaleString()}</div><div className={"delta " + (pending ? "down" : "up")}>{pending ? "awaiting review" : "all cleared"}</div></div>
      </div>
    </section>
  );
}
