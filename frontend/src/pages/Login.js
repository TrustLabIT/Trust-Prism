import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { useApp } from "../context/AppContext";

// Same split card as the TruSentinel (GateBook) login: teal brand half with the Trustlab mark,
// frosted form half with a teal → gold strip on top.
export default function Login() {
  const { login, authStatus } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const loading = authStatus === "loading";

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError("Enter your email and password."); return; }
    setError("");
    try {
      await login(email.trim(), password);
      navigate("/library", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  const clear = () => { setEmail(""); setPassword(""); setError(""); };

  return (
    <div className="gbl-wrap">
      <div className="gbl-orb a" aria-hidden="true" />
      <div className="gbl-orb b" aria-hidden="true" />

      <div className="gbl-card">
        {/* Brand half */}
        <div className="gbl-brand">
          <img src={`${process.env.PUBLIC_URL}/trustlab-logo.png`} alt="" aria-hidden="true" />
          <h1>TrustMark</h1>
          <div className="gbl-dept">Brand &amp; Communications</div>
        </div>

        {/* Form half */}
        <form className="gbl-form" onSubmit={submit} noValidate>
          <div className="gbl-badge"><ShieldOutlinedIcon sx={{ fontSize: 14 }} /><span>SECURE</span></div>
          <h2 className="gbl-title">Sign <span>In</span></h2>
          <p className="gbl-sub">Use the email and password your admin gave you.</p>

          <div className="gbl-field">
            <label htmlFor="login-email">Email</label>
            <div className="gbl-input">
              <span className="ico"><PersonOutlineIcon sx={{ fontSize: 20 }} /></span>
              <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus />
            </div>
          </div>

          <div className="gbl-field">
            <label htmlFor="login-password">Password</label>
            <div className="gbl-input">
              <span className="ico"><LockOutlinedIcon sx={{ fontSize: 20 }} /></span>
              <input id="login-password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              <button type="button" className="gbl-eye" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}>
                {show ? <VisibilityOffOutlinedIcon sx={{ fontSize: 20 }} /> : <VisibilityOutlinedIcon sx={{ fontSize: 20 }} />}
              </button>
            </div>
          </div>

          {error && <div className="gbl-err" role="alert">{error}</div>}

          <div className="gbl-btns">
            <button type="submit" className="gbl-signin" disabled={loading}>{loading ? "Signing in…" : "Sign In"}</button>
            <button type="button" className="gbl-clear" onClick={clear} disabled={loading}>Clear</button>
          </div>

          <div className="gbl-foot">
            <LockOutlinedIcon sx={{ fontSize: 13 }} />
            <span>Authorized access only · TrustMark</span>
          </div>
        </form>
      </div>
    </div>
  );
}
