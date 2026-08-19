import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchMe } from "./store/authSlice";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Library from "./pages/Library";
import Approvals from "./pages/Approvals";
import Upload from "./pages/Upload";
import TaxonomyModel from "./pages/TaxonomyModel";
import Expired from "./pages/Expired";
import Shares from "./pages/Shares";
import PublicShare from "./pages/PublicShare";
import Users from "./pages/Users";
import Settings from "./pages/Settings";

export default function App() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const token = useSelector((s) => s.auth.token);
  const [booting, setBooting] = useState(!!token);

  useEffect(() => {
    if (token && !user) dispatch(fetchMe()).finally(() => setBooting(false));
    else setBooting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (booting) return <div className="empty" style={{ margin: 120 }}>Loading TrustMark…</div>;

  return (
    <Routes>
      <Route path="/s/:token" element={<PublicShare />} />
      <Route path="/login" element={user ? <Navigate to="/library" replace /> : <Login />} />
      <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Navigate to="/library" replace />} />
        <Route path="/library" element={<Library />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/shares" element={<Shares />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/expired" element={<Expired />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/model" element={<TaxonomyModel />} />
        <Route path="*" element={<Navigate to="/library" replace />} />
      </Route>
    </Routes>
  );
}
