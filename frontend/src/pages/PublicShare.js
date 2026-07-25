import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { api } from "../api/client";

export default function PublicShare() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [needsPw, setNeedsPw] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (password) => {
    setLoading(true); setErr("");
    try {
      const q = password ? `?pw=${encodeURIComponent(password)}` : "";
      const res = await api.get(`/public/share/${token}${q}`);
      setData(res); setNeedsPw(false);
    } catch (e) {
      if (/password/i.test(e.message)) { setNeedsPw(true); if (password) setErr("Wrong password — try again."); }
      else { setErr(e.message); }
    } finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const download = async (id) => {
    try {
      const q = pw ? `?pw=${encodeURIComponent(pw)}` : "";
      const { url } = await api.get(`/public/share/${token}/asset/${id}/url${q}`);
      window.open(url, "_blank", "noopener");
    } catch (e) { setErr(e.message); }
  };

  const Header = () => (
    <header className="pub-head">
      <img src={`${process.env.PUBLIC_URL}/favicon.png`} alt="TrustLab" />
      <div><div className="pub-brand">TrustLab Diagnostics</div><div className="pub-sub">Shared assets</div></div>
    </header>
  );

  if (loading) return <div className="pub-wrap"><Header /><div className="empty">Loading…</div></div>;

  if (needsPw) return (
    <div className="pub-wrap"><Header />
      <div className="pub-gate">
        <LockOutlinedIcon sx={{ fontSize: 30, color: "var(--brand)" }} />
        <h2>This link is password-protected</h2>
        <p>Enter the password you were given to view these assets.</p>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(pw)} placeholder="Password" />
        {err && <div className="dialog-err">{err}</div>}
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => load(pw)}>Unlock</button>
      </div>
    </div>
  );

  if (err || !data) return (
    <div className="pub-wrap"><Header /><div className="empty">{err || "This link isn’t available."}</div></div>
  );

  const { share, assets } = data;
  return (
    <div className="pub-wrap">
      <Header />
      <div className="pub-title">
        <h1>{share.name}</h1>
        <p>{share.collection ? `Collection: ${share.collection} · ` : ""}{assets.length} asset{assets.length === 1 ? "" : "s"} · {share.perm === "Download" ? "Download allowed" : "View only"}</p>
      </div>

      {assets.length === 0 ? (
        <div className="empty">No assets in this share yet.</div>
      ) : (
        <div className="grid">
          {assets.map((a) => (
            <div className="card" key={a.id} style={{ cursor: "default" }}>
              <div className="thumb" style={{ background: "#f4f5f7" }}>
                {a.t === "image" && a.url
                  ? <img className="thumb-img" src={a.url} alt={a.n} loading="lazy" />
                  : <span className="type-badge" style={{ position: "static" }}>{a.sub}</span>}
                {share.wm && <span className="pub-wm">TrustLab</span>}
              </div>
              <div className="card-body">
                <div className="card-title">{a.n}</div>
                <div className="card-meta">{a.dim} · {a.size}</div>
                {share.perm === "Download" && (
                  <button className="btn btn-primary" style={{ marginTop: 10, width: "100%", justifyContent: "center" }} onClick={() => download(a.id)}>
                    <FileDownloadOutlinedIcon sx={{ fontSize: 16 }} /> Download
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pub-foot"><LockOutlinedIcon sx={{ fontSize: 12 }} /> Secure share · powered by Trust Prism</div>
    </div>
  );
}
