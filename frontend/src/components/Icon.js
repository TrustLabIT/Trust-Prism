import MovieOutlinedIcon from "@mui/icons-material/MovieOutlined";
import DevicesOtherOutlinedIcon from "@mui/icons-material/DevicesOtherOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";

// Icon for a media category
export function CatIcon({ cat, sx }) {
  const s = { fontSize: 16, ...sx };
  if (cat === "Videos") return <MovieOutlinedIcon sx={s} />;
  if (cat === "Print") return <PrintOutlinedIcon sx={s} />;
  return <DevicesOtherOutlinedIcon sx={s} />; // Electronic (default)
}

// Icon for who owns an asset (internal team vs external agency)
export function OrgIcon({ org, sx }) {
  const s = { fontSize: 14, ...sx };
  return org === "Internal" ? <HomeOutlinedIcon sx={s} /> : <BusinessOutlinedIcon sx={s} />;
}
