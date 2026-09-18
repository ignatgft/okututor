import { Outlet, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import useAuthStore from "../../store/authStore";
import { getDashboardPath } from "../../config/navigation";
import Footer from "../../components/HomeSection/Footer";

export default function PublicLayout(): JSX.Element {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--color-background, #f8fafc)" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "var(--color-surface, #fff)", borderBottom: "1px solid var(--color-border, #e5e7eb)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Link to="/" style={{ fontWeight: 800, fontSize: 20, color: "var(--color-text)", textDecoration: "none" }}>OkuTutor</Link>
          <nav style={{ display: "flex", gap: 16, alignItems: "center" }} className="public-nav-desktop">
            <Link to="/tutors" style={{ textDecoration: "none", color: "var(--color-text)", fontWeight: 500 }}>{t("navbar.find_tutor", "Найти репетитора")}</Link>
            <Link to="/become-tutor" style={{ textDecoration: "none", color: "var(--color-text)", fontWeight: 500 }}>{t("navbar.for_tutors", "Разместить резюме")}</Link>
            {!isAuthenticated ? (
              <button onClick={() => navigate("/login")} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 600 }}>Войти</button>
            ) : (
              <button onClick={() => navigate(getDashboardPath(user?.role))} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 9999, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
                {user?.avatar ? <img loading="lazy" decoding="async" src={user.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} /> : <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#e5e7eb", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{user?.full_name?.[0] ?? "U"}</span>}
                <span style={{ fontWeight: 600, fontSize: 14 }}>{t("navbar.dashboard", "Моё приложение")}</span>
              </button>
            )}
          </nav>
          <button className="public-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="menu" style={{ display: "none", background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ display: "block", width: 22, height: 2, background: "var(--color-text)", margin: "4px 0" }} />
            <span style={{ display: "block", width: 22, height: 2, background: "var(--color-text)", margin: "4px 0" }} />
            <span style={{ display: "block", width: 22, height: 2, background: "var(--color-text)", margin: "4px 0" }} />
          </button>
        </div>
        {mobileOpen && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 12 }}>
            <Link to="/tutors" onClick={() => setMobileOpen(false)} style={{ textDecoration: "none", color: "var(--color-text)" }}>{t("navbar.find_tutor", "Найти репетитора")}</Link>
            <Link to="/become-tutor" onClick={() => setMobileOpen(false)} style={{ textDecoration: "none", color: "var(--color-text)" }}>{t("navbar.for_tutors", "Разместить резюме")}</Link>
          </div>
        )}
      </header>
      <main id="main-content" style={{ flex: 1, maxWidth: 1400, margin: "0 auto", padding: "24px 16px", width: "100%", boxSizing: "border-box" }}>
        <Outlet />
      </main>
      <Footer />
      <style>{`@media(max-width: 768px){ .public-nav-desktop{ display:none !important; } .public-mobile-toggle{ display:block !important; } } @media(min-width: 769px){ .public-mobile-toggle{ display:none !important; } }`}</style>
    </div>
  );
}
