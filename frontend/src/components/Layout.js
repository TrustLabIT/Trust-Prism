import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Drawer from "./Drawer";
import Dialogs from "./Dialogs";
import Toast from "./Toast";
import { useApp } from "../context/AppContext";

export default function Layout() {
  const { fetchCounts, fetchTaxonomy, drawer } = useApp();
  useEffect(() => {
    fetchCounts();
    fetchTaxonomy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <Topbar />
        <div className="page"><Outlet /></div>
      </main>
      {drawer.open && <Drawer />}
      <Dialogs />
      <Toast />
    </div>
  );
}
