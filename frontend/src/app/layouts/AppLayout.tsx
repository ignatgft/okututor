import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useAuthStore from "../../store/authStore";
import AppSidebar from "./AppSidebar";
import "./AppLayout.css";

export default function AppLayout(): JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // ESC + body scroll lock
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const pageTitle = (() => {
    if (location.pathname.startsWith("/app/tutor/") || location.pathname.startsWith("/app/repetitor") || location.pathname === "/app/tutors") return t("navbar.find_tutor", "Репетиторы");
    if (location.pathname.startsWith("/app/dashboard")) return t("dashboard.overview", "Главная");
    if (location.pathname.startsWith("/app/resumes")) return t("tutor.resume", "Мои резюме");
    if (location.pathname.startsWith("/app/messages")) return t("navigation.requests", "Сообщения");
    if (location.pathname.startsWith("/app/favorites")) return t("favorites.title", "Избранное");
    if (location.pathname.startsWith("/app/profile")) return t("navbar.profile", "Профиль");
    if (location.pathname.startsWith("/app/settings")) return t("navbar.settings", "Настройки");
    if (location.pathname.startsWith("/app/support")) return t("navbar.support", "Поддержка");
    return "";
  })();

  return (
    <div className="app-layout">
      {/* Desktop sidebar */}
      <div className="app-sidebar-desktop">
        <AppSidebar />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} className="app-drawer-backdrop" aria-hidden="true" />
          <div className="app-drawer">
            <AppSidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}

      <div className="app-main-column">
        {/* Top header — single brand: sidebar on desktop, burger+title on mobile */}
        <header className="app-header">
          <button className="app-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <span className="app-hamburger-line" />
            <span className="app-hamburger-line" />
            <span className="app-hamburger-line" />
          </button>
          <Link to="/app/dashboard" className="app-header-logo">
            okututor
          </Link>
          <div className="app-header-title">{pageTitle}</div>
          <div className="app-header-actions">
            <Link to="/app/profile" className="app-header-actions" style={{ textDecoration: "none", color: "var(--color-text)" }}>
              {user?.avatar ? <img loading="lazy" decoding="async" src={user.avatar} alt="" className="app-header-avatar" /> : <span className="app-header-avatar-fallback">{user?.full_name?.[0] ?? "U"}</span>}
              <span className="app-header-user">{user?.full_name ?? ""}</span>
            </Link>
          </div>
        </header>

        <main id="main-content" className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
