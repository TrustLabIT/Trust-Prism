import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchMe } from "./store/authSlice";
import { fetchAssetStats } from "./store/assetsSlice";
import { fetchCollections } from "./store/collectionsSlice";
import { fetchShares } from "./store/sharesSlice";
import { fetchTemplates } from "./store/templatesSlice";
import { fetchBrandKit } from "./store/brandKitSlice";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import PublicShare from "./pages/PublicShare";
import Library from "./pages/Library";
import Collections from "./pages/Collections";
import CollectionDetail from "./pages/CollectionDetail";
import Approvals from "./pages/Approvals";
import Shares from "./pages/Shares";
import Templates from "./pages/Templates";
import BrandKit from "./pages/BrandKit";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";

export default function App() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const token = useSelector((s) => s.auth.token);
  const [booting, setBooting] = useState(!!token);

  // On load: if we have a stored token, confirm who we are
  useEffect(() => {
    if (token && !user) {
      dispatch(fetchMe()).finally(() => setBooting(false));
    } else {
      setBooting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever we become authenticated, load workspace data
  useEffect(() => {
    if (user) {
      dispatch(fetchAssetStats());
      dispatch(fetchCollections());
      dispatch(fetchShares());
      dispatch(fetchTemplates());
      dispatch(fetchBrandKit());
    }
  }, [user, dispatch]);

  if (booting) {
    return <div className="empty" style={{ paddingTop: 120 }}>Loading Trust Prism…</div>;
  }
  
  return (
    <Routes>
      <Route path="/s/:token" element={<PublicShare />} />
      <Route path="/login" element={user ? <Navigate to="/library" replace /> : <Login />} />
      <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Navigate to="/library" replace />} />
        <Route path="/library" element={<Library />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/collections/:id" element={<CollectionDetail />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/shares" element={<Shares />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/brand" element={<BrandKit />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/library" replace />} />
      </Route>
    </Routes>
  );
}
