import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import GppGoodOutlinedIcon from "@mui/icons-material/GppGoodOutlined";
import { useApp } from "../context/AppContext";

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
    <div className="sp-login-wrap">
      <div className="sp-grid"></div>
      <div className="sp-particle"></div><div className="sp-particle"></div><div className="sp-particle"></div>
      <div className="sp-particle"></div><div className="sp-particle"></div><div className="sp-particle"></div>

      <div className="sp-login-container">
        {/* Left brand panel */}
        <div className="sp-login-left">
          <div className="sp-left-content">
            <div className="sp-company-logo">TP</div>
            <div className="sp-brand-name">TRUSTLAB DIAGNOSTICS</div>
            <div className="sp-brand-sub">Private Limited</div>
            <div className="sp-app-title">Trust <span>Prism</span></div>
            <p className="sp-app-desc">
              Your marketing content platform. Store, approve, share and measure every creative asset in one place.
            </p>
            <div className="sp-pulse-dots"><span></span><span></span><span></span><span></span></div>
          </div>
        </div>

        {/* Right login form */}
        <div className="sp-login-right">
          <div className="sp-secure-badge"><GppGoodOutlinedIcon sx={{ fontSize: 12 }} /> SECURE</div>
          <div className="sp-form-title">Sign <span>In</span></div>
          <div className="sp-form-subtitle">Welcome back. Enter your credentials to continue.</div>

          <form onSubmit={submit}>
            <div className="sp-input-group">
              <label className="sp-input-label">Email</label>
              <div className="sp-input-wrap">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" autoComplete="username" required />
                <PersonOutlineIcon className="sp-input-icon" sx={{ fontSize: 18 }} />
              </div>
            </div>

            <div className="sp-input-group">
              <label className="sp-input-label">Password</label>
              <div className="sp-input-wrap">
                <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required />
                <LockOutlinedIcon className="sp-input-icon" sx={{ fontSize: 18 }} />
                <span className="sp-eye-toggle" onClick={() => setShow((v) => !v)} title={show ? "Hide" : "Show"}>
                  {show ? <VisibilityOffOutlinedIcon sx={{ fontSize: 18 }} /> : <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />}
                </span>
              </div>
            </div>

            {error && <span className="sp-error">{error}</span>}

            <div className="sp-btn-row">
              <button type="submit" className={"sp-btn-signin" + (loading ? " loading" : "")}>{loading ? "Signing In" : "Sign In"}</button>
              <button type="button" className="sp-btn-clear" onClick={clear}>Clear</button>
            </div>

            <div className="sp-forgot-link">
              <a href="/forgot" onClick={(e) => e.preventDefault()}>Forgot Password?</a>
            </div>
          </form>

          <div className="sp-footer-text">
            <LockOutlinedIcon sx={{ fontSize: 11 }} /> 256-bit SSL encrypted · Authorized access only
          </div>
        </div>
      </div>
    </div>
  );
}
