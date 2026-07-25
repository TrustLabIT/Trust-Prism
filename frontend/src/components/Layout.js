import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ViewBanner from "./ViewBanner";
import DetailDrawer from "./DetailDrawer";
import Modals from "./Modals";
import Toast from "./Toast";
import Dialogs from "./Dialogs";
import { useApp } from "../context/AppContext";

export default function Layout() {
  const { closeDrawer, closeAllModals } = useApp();
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // close mobile nav on route change
  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  // Escape closes drawer + modals
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { closeDrawer(); closeAllModals(); setNavOpen(false); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeDrawer, closeAllModals]);

  return (
    <div className="app">
      <div className={"nav-backdrop" + (navOpen ? " open" : "")} onClick={() => setNavOpen(false)}></div>
      <Sidebar mobileOpen={navOpen} />
      <div className="main">
        <Topbar onMenu={() => setNavOpen((v) => !v)} />
        <ViewBanner />
        <div className="content">
          <Outlet />
        </div>
      </div>
      <DetailDrawer />
      <Modals />
      <Dialogs />
      <Toast />
    </div>
  );
}
