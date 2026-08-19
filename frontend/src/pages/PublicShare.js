import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { previewMarkup } from "../utils/thumbs";
import { fmtBytes } from "../utils/tm";

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
      else setErr(e.message);
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

  const Head = () => (
    <header className="pub-head">
      <div className="mk"><img src={`${process.env.PUBLIC_URL}/favicon.png`} alt="TrustLab" /></div>
      <div><div className="pb">TrustLab Diagnostics</div><div className="ps">Shared assets · TrustMark</div></div>
    </header>
  );

  if (loading) return <div className="pub-wrap"><Head /><div className="empty">Loading…</div></div>;

  if (needsPw) return (
    <div className="pub-wrap"><Head />
      <div className="pub-gate">
        <h2>🔒 Password-protected</h2>
        <p>Enter the password you were given to view these assets.</p>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(pw)} placeholder="Password" />
        {err && <div className="login-err">{err}</div>}
        <button className="btn p" style={{ width: "100%", justifyContent: "center" }} onClick={() => load(pw)}>Unlock</button>
      </div>
    </div>
  );

  if (err || !data) return <div className="pub-wrap"><Head /><div className="empty">{err || "This link isn't available."}</div></div>;

  const { share, assets } = data;
  return (
    <div className="pub-wrap">
      <Head />
      <div className="pub-title">
        <h1>{share.name}</h1>
        <p>{assets.length} asset{assets.length === 1 ? "" : "s"} · {share.perm === "Download" ? "Download allowed" : "View only"}</p>
      </div>
      {assets.length === 0 ? (
        <div className="empty">No assets in this share yet.</div>
      ) : (
        <div className="grid">
          {assets.map((a) => (
            <div className="acard" key={a.id} style={{ cursor: "default" }}>
              <span className="thumb">
                <span style={{ position: "absolute", inset: 0 }} dangerouslySetInnerHTML={{ __html: previewMarkup(a) }} />
                {share.wm && <span className="pub-wm">TrustLab</span>}
              </span>
              <span className="body">
                <span className="nm">{a.name}</span>
                <span className="mt">{a.type}{a.w ? ` · ${a.w}×${a.h}` : ""}{a.size ? ` · ${fmtBytes(a.size)}` : ""}</span>
                {share.perm === "Download" && (
                  <button className="btn p sm" style={{ marginTop: 10, width: "100%", justifyContent: "center" }} onClick={() => download(a.id)}>↓ Download</button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="pub-foot">🔒 Secure share · powered by TrustMark</div>
    </div>
  );
}
