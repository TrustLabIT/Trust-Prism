import { useState, useEffect } from "react";

// Imperative confirm — confirmDialog({title,message,confirmLabel,danger}) → Promise<boolean>
let openFn = null;
export function confirmDialog(opts = {}) {
  return openFn ? openFn(opts) : Promise.resolve(window.confirm(opts.message || "Are you sure?"));
}

// Imperative multi-choice — choiceDialog({title,message,buttons:[{label,value,kind}],dismissValue})
// → Promise<value>. Clicking the scrim resolves to dismissValue (default null).
export function choiceDialog(opts = {}) {
  return openFn ? openFn({ ...opts, _choice: true }) : Promise.resolve(opts.dismissValue ?? null);
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

  const buttons = opts._choice
    ? (opts.buttons || [])
    : [
        { label: opts.cancelLabel || "Cancel", value: false, kind: "" },
        { label: opts.confirmLabel || "Confirm", value: true, kind: opts.danger ? "dgr" : "p" },
      ];
  const dismiss = opts._choice ? (opts.dismissValue ?? null) : false;

  return (
    <div className="modal-scrim open" onClick={() => done(dismiss)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>{opts.title || "Please confirm"}</h2></div>
        <div className="modal-body"><div className="dialog-msg">{opts.message}</div></div>
        <div className="modal-foot">
          {buttons.map((b, i) => (
            <button key={i} className={"btn " + (b.kind || "")} onClick={() => done(b.value)}>{b.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
