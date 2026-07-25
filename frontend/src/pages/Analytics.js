import { useEffect } from "react";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import { useApp } from "../context/AppContext";
import { grad, nf } from "../utils/helpers";

const li = { fontSize: 15 };

const chartData = [
  ["Brand Guidelines 2026", 1567], ["Retargeting Banner", 988], ["Hero — Summer Shot", 842],
  ["Social Teaser 9:16", 820], ["Newsletter Header", 733], ["Pitch Deck Master", 611],
];

export default function Analytics() {
  const { analytics, fetchAnalytics, toast } = useApp();

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aggRows = analytics.top || [];
  const aggMax = Math.max(1, ...aggRows.map((r) => r.views));
  const chartMax = 1600;

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <div className="crumbs">Insights / <b>Analytics</b></div>
          <h1>Analytics</h1><p>What's being used, by whom, and where the gaps are.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4 }}><CalendarMonthOutlinedIcon sx={li} /> Range</label>
          <select className="yearsel" onChange={(e) => toast("Analytics range: " + e.target.value)}>
            <option>Last 30 days</option><option>This year (2026)</option><option>2025</option><option>2024</option>
            <option>Custom range…</option><option>All time</option>
          </select>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="lab"><Inventory2OutlinedIcon sx={li} /> Total assets</div><div className="val">{(analytics.total || 0).toLocaleString()}</div><div className="delta up">live count</div></div>
        <div className="stat"><div className="lab"><FileDownloadOutlinedIcon sx={li} /> Downloads (30d)</div><div className="val">9,732</div><div className="delta up">▲ 12.4% vs last month</div></div>
        <div className="stat"><div className="lab"><GroupOutlinedIcon sx={li} /> Active users</div><div className="val">146</div><div className="delta up">▲ 9 new</div></div>
        <div className="stat"><div className="lab"><ScheduleOutlinedIcon sx={li} /> Avg. approval time</div><div className="val">1.8d</div><div className="delta up">▼ 0.6d faster</div></div>
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
        <h3>Most-used assets (30 days)</h3><div className="desc">Downloads and shares by asset.</div>
        <div style={{ marginTop: 8 }}>
          {chartData.map(([n, v], i) => (
            <div className="abar" key={n}>
              <div className="lbl r">{n}</div>
              <div className="track"><span style={{ width: (v / chartMax * 100) + "%", background: grad(i) }}></span></div>
              <div className="val sm">{v.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="lab"><HistoryOutlinedIcon sx={li} /> Stale assets (&gt;12mo unused)</div><div className="val">312</div><div className="delta down">Consider archiving</div></div>
        <div className="stat"><div className="lab"><SellOutlinedIcon sx={li} /> Auto-tagged by AI</div><div className="val">96%</div><div className="delta up">Coverage</div></div>
        <div className="stat"><div className="lab"><WarningAmberOutlinedIcon sx={li} /> Expiring rights (30d)</div><div className="val">14</div><div className="delta down">Licenses / model releases</div></div>
      </div>
    </section>
  );
}
