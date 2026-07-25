import { useState, useEffect, useRef } from "react";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";

// Imperative API — call from anywhere; resolves a Promise.
// confirmDialog({title,message,confirmLabel,danger}) -> boolean
// passwordDialog({title,name}) -> string|null
// promptDialog({title,label,value,confirmLabel}) -> string|null (trimmed, non-empty)
let openFn = null;
export function confirmDialog(opts = {}) {
  return openFn ? openFn({ kind: "confirm", ...opts }) : Promise.resolve(window.confirm(opts.message || "Are you sure?"));
}
export function passwordDialog(opts = {}) {
  return openFn ? openFn({ kind: "password", ...opts }) : Promise.resolve(window.prompt(opts.message || "New password:"));
}
export function promptDialog(opts = {}) {
  return openFn ? openFn({ kind: "prompt", ...opts }) : Promise.resolve(window.prompt(opts.label || opts.title || "", opts.value || ""));
}

export default function Dialogs() {
  const [state, setState] = useState(null); // { opts, resolve }
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    openFn = (opts) => new Promise((resolve) => { setPw(opts.value || ""); setErr(""); setState({ opts, resolve }); });
    return () => { openFn = null; };
  }, []);

  const finish = (val) => { setState(null); if (state) state.resolve(val); };
  const kind = state?.opts.kind;
  const cancel = () => finish(kind === "password" || kind === "prompt" ? null : false);
  const confirm = () => {
    if (kind === "password") {
      if (pw.length < 6) { setErr("Password must be at least 6 characters"); return; }
      finish(pw);
    } else if (kind === "prompt") {
      if (!pw.trim()) { setErr("This can't be empty"); return; }
      finish(pw.trim());
    } else finish(true);
  };

  useEffect(() => {
    if (state?.opts.kind === "password" || state?.opts.kind === "prompt") setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select?.(); }, 40);
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const onKey = (e) => { if (e.key === "Escape") cancel(); else if (e.key === "Enter") confirm(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, pw]);

  if (!state) return null;
  const { opts } = state;
  const isPw = opts.kind === "password";
  const isPrompt = opts.kind === "prompt";
  const hasInput = isPw || isPrompt;
  const danger = opts.danger;

  return (
    <div className="modal-scrim open" onClick={cancel}>
      <div className="modal" style={{ width: 430 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{opts.title || (isPw ? "Set password" : isPrompt ? "Edit" : "Please confirm")}</h2>
          <button className="iconbtn" onClick={cancel}><CloseIcon sx={{ fontSize: 18 }} /></button>
        </div>
        <div className="modal-body">
          <div className="dialog-row">
            <div className={"dialog-ic" + (danger ? " danger" : "")}>
              {isPw ? <VpnKeyOutlinedIcon sx={{ fontSize: 20 }} /> : isPrompt ? <DriveFileRenameOutlineIcon sx={{ fontSize: 20 }} /> : <WarningAmberRoundedIcon sx={{ fontSize: 20 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {opts.message && <div className="dialog-msg">{opts.message}</div>}
              {hasInput && (
                <div className="field" style={{ marginTop: opts.message ? 12 : 0 }}>
                  <label>{isPw ? `New password${opts.name ? ` for ${opts.name}` : ""}` : (opts.label || "Value")}</label>
                  <input ref={inputRef} type="text" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }}
                    placeholder={isPw ? "min 6 characters" : (opts.placeholder || "")} autoComplete={isPw ? "new-password" : "off"} />
                  {err && <div className="dialog-err">{err}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={cancel}>{opts.cancelLabel || "Cancel"}</button>
          <button className={"btn " + (danger ? "btn-danger" : "btn-primary")} onClick={confirm}>
            {opts.confirmLabel || (isPw ? "Set password" : isPrompt ? "Save" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
