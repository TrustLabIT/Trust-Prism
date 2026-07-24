import { useApp } from "../context/AppContext";

export default function Toast() {
  const { toastMsg, toastShow } = useApp();
  return (
    <div className={"toast" + (toastShow ? " show" : "")}>
      <span>✓</span>
      <span dangerouslySetInnerHTML={{ __html: toastMsg }} />
    </div>
  );
}
