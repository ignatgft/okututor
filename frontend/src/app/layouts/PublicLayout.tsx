import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useAuthStore from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { getDashboardPath } from "../../config/navigation";
import Footer from "../../components/HomeSection/Footer";
import ThemeSwitch from "../../components/ui/ThemeSwitch";

export default function PublicLayout(): JSX.Element {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const openAuth = useUIStore((s) => s.openAuth);
  const navigate = useNavigate();
  const location = useLocation();

  const isTutorsActive = location.pathname === "/" || location.pathname.startsWith("/tutors");

  const handleLoginClick = () => {
    openAuth();
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-base)" }}>
      <div className="wrap">
        <header className="top">
          <Link to="/" className="wordmark" aria-label="OkuTutor Главная">
            OkuTutor
          </Link>

          {/* Desktop Navigation (>=900px) */}
          <nav className="top-nav" aria-label="Основная навигация">
            <Link to="/tutors" className={isTutorsActive ? "on" : ""}>
              {t("navbar.find_tutor", "Найти репетитора")}
            </Link>
            <Link to="/become-tutor">
              {t("navbar.for_tutors", "Для преподавателей")}
            </Link>
          </nav>

          {/* Header Actions */}
          <div className="top-actions">
            <ThemeSwitch />
            {!isAuthenticated ? (
              <button
                type="button"
                className="signin"
                onClick={handleLoginClick}
              >
                {t("navbar.login", "Войти")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(getDashboardPath(user?.role))}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 14px",
                  borderRadius: "var(--radius-full)",
                  border: "1px solid var(--border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {user?.avatar ? (
                  <img
                    loading="lazy"
                    decoding="async"
                    src={user.avatar}
                    alt=""
                    style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "var(--accent-subtle)",
                      color: "var(--accent)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {user?.full_name?.[0] ?? "U"}
                  </span>
                )}
                <span>{t("navbar.dashboard", "Кабинет")}</span>
              </button>
            )}
          </div>
        </header>

        <main id="main-content" style={{ flex: 1, width: "100%", boxSizing: "border-box" }}>
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
