import { useSelector } from "react-redux";

export default function Toast() {
  const toast = useSelector((s) => s.ui.toast);
  return (
    <div className={"toast" + (toast.show ? " on" : "")}>
      <div className="t">{toast.msg}</div>
    </div>
  );
}
