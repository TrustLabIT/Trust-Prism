import { useState, useEffect } from "react";

// Imperative confirm — confirmDialog({title,message,confirmLabel,danger}) → Promise<boolean>
let openFn = null;
export function confirmDialog(opts = {}) {
  return openFn ? openFn(opts) : Promise.resolve(window.confirm(opts.message || "Are you sure?"));
}

export default function Dialogs() {
  const [state, setState] = useState(null);

  useEffect(() => {
    openFn = (opts) => new Promise((resolve) => setState({ opts, resolve }));
    return () => { openFn = null; };
  }, []);

  if (!state) return null;
  const { opts } = state;
  const done = (v) => { setState(null); state.resolve(v); };

  return (
    <div className="modal-scrim open" onClick={() => done(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>{opts.title || "Please confirm"}</h2></div>
        <div className="modal-body"><div className="dialog-msg">{opts.message}</div></div>
        <div className="modal-foot">
          <button className="btn" onClick={() => done(false)}>{opts.cancelLabel || "Cancel"}</button>
          <button className={"btn " + (opts.danger ? "dgr" : "p")} onClick={() => done(true)}>{opts.confirmLabel || "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}
