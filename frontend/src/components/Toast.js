import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { useApp } from "../context/AppContext";

export default function Toast() {
  const { toastMsg, toastShow } = useApp();
  return (
    <div className={"toast" + (toastShow ? " show" : "")}>
      <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
      <span dangerouslySetInnerHTML={{ __html: toastMsg }} />
    </div>
  );
}
