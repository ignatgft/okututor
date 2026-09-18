// migrated to TSX — minimal strict types (controlled)
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { scroller } from "react-scroll";
import { useTranslation } from "react-i18next";
import useAuthStore from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { useTheme } from "../hooks/useTheme";
import { getDashboardPath } from "../config/navigation";
import "../styles/Navbar.css";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const { openAuth, openRegister } = useUIStore();

  const toggleMenu = () => {
    if (typeof window !== "undefined" && window.parent !== window) {
      try {
        window.parent.postMessage({ type: isOpen ? "closeSidebar" : "openSidebar" }, "*");
      } catch {}
      return;
    }
    setIsOpen(!isOpen);
  };
  const toggleLanguageDropdown = () => setLanguageOpen((prev) => !prev);

  const handleScrollLink = (section) => {
    setIsOpen(false);
    if (location.pathname !== "/") {
      navigate("/", { state: { target: section } });
    } else {
      scroller.scrollTo(section, { duration: 500, smooth: true });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- retained for legacy callers; marketplace uses <Link to="/tutors">
  const handleFindTutorClick = (): void => {
    setIsOpen(false);
    navigate("/tutors");
  };

  const handleLoginClick = () => {
    setIsOpen(false);
    openAuth();
  };

  const handleSignupClick = () => {
    setIsOpen(false);
    openRegister();
  };

  const handleDashboardClick = () => {
    setIsOpen(false);
    navigate(getDashboardPath(user?.role));
  };

  const handleLanguageChange = (lang: string) => {
    const normalized = lang === "kg" ? "ky" : lang;
    void i18n.changeLanguage(normalized);
    setLanguageOpen(false);
  };

  const currentLang = (i18n.resolvedLanguage || i18n.language || "ru").split("-")[0].toLowerCase() === "kg" ? "ky" : (i18n.resolvedLanguage || i18n.language || "ru").split("-")[0].toLowerCase();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [isOpen]);

  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest(".language-selector")) setLanguageOpen(false);
      if (!e.target.closest(".navbar-user-menu")) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // AppLayout/PublicLayout already provide headers — hide legacy Navbar everywhere to avoid duplicate headers
  if (
    location.pathname.startsWith("/app") ||
    location.pathname.startsWith("/admin") ||
    location.pathname === "/" ||
    location.pathname.startsWith("/tutors") ||
    location.pathname.startsWith("/tutor") ||
    location.pathname.startsWith("/repetitor") ||
    location.pathname.startsWith("/subjects") ||
    location.pathname.startsWith("/cities") ||
    location.pathname.startsWith("/search") ||
    location.pathname.startsWith("/become-tutor") ||
    location.pathname.startsWith("/legal") ||
    location.pathname.startsWith("/share")
  )
    return null;

  return (
    <>
      <nav className={`navbar ${isOpen ? "navbar--menu-open" : ""}`}>
        <div className="navbar-container">
          <div className="navbar-left">
            <Link to="/" className="navbar-logo-link">
              <span className="navbar-logo-text">okututor</span>
            </Link>
          </div>

          <div className={`navbar-center drawer ${isOpen ? "active" : ""}`}>
            {/* Mobile drawer header — okututor branding (как в Sidebar) */}
            <div className="drawer-header">
              <Link to="/" className="drawer-logo" onClick={() => setIsOpen(false)}>
                <span className="navbar-logo-text">okututor</span>
              </Link>
              <button className="drawer-close-btn" onClick={() => setIsOpen(false)} aria-label="Close menu">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mobile nav — matches Figma panel */}
            <nav className="drawer-nav" aria-label="Mobile navigation">
              <Link to="/" className="drawer-nav-item" onClick={() => setIsOpen(false)}>
                <span className="drawer-nav-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
                  </svg>
                </span>
                <span>{t("navbar.home", "Главная")}</span>
              </Link>
              <Link to="/tutors" className="drawer-nav-item" onClick={() => setIsOpen(false)}>
                <span className="drawer-nav-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5" />
                  </svg>
                </span>
                <span>{t("navbar.find_tutor", "Найти репетитора")}</span>
              </Link>
              <Link to="/become-tutor" className="drawer-nav-item" onClick={() => setIsOpen(false)}>
                <span className="drawer-nav-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                <span>{t("navbar.for_tutors", "Для преподавателей")}</span>
              </Link>

              <div className="drawer-divider" role="separator" />

              <button className="drawer-nav-item drawer-categories-toggle" onClick={() => setCategoriesOpen(v => !v)} aria-expanded={categoriesOpen}>
                <span>{t("navbar.category", "Категории")}</span>
                <span className={`drawer-chevron ${categoriesOpen ? "open" : ""}`} aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>

              {categoriesOpen && (
                <div className="drawer-subnav">
                  <Link to="/tutors?subject=english" className="drawer-subitem" onClick={() => setIsOpen(false)}>
                    <span className="drawer-subitem-icon drawer-subitem-icon--blue" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 7.9 5.5z" />
                      </svg>
                    </span>
                    <span>Английский</span>
                  </Link>
                  <Link to="/tutors?subject=russian" className="drawer-subitem" onClick={() => setIsOpen(false)}>
                    <span className="drawer-subitem-icon drawer-subitem-icon--blue" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </span>
                    <span>Русский</span>
                  </Link>
                  <Link to="/tutors?subject=math" className="drawer-subitem" onClick={() => setIsOpen(false)}>
                    <span className="drawer-subitem-icon drawer-subitem-icon--blue" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a7cff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 20L20 4" />
                        <path d="M4 7h6" />
                        <path d="M14 4h6v6" />
                      </svg>
                      <span style={{ position: "absolute", fontSize: 8, fontWeight: 700, color: "#0a7cff", right: 2, bottom: 0 }}>T</span>
                    </span>
                    <span>Математика</span>
                  </Link>
                  <Link to="/tutors?subject=physics" className="drawer-subitem" onClick={() => setIsOpen(false)}>
                    <span className="drawer-subitem-icon drawer-subitem-icon--blue" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <ellipse cx="12" cy="12" rx="9" ry="5" />
                        <ellipse cx="12" cy="12" rx="5" ry="9" />
                      </svg>
                    </span>
                    <span>Физика</span>
                  </Link>
                </div>
              )}

              <div className="drawer-divider" role="separator" />
            </nav>

            {/* Legacy desktop links hidden on mobile but kept for desktop */}
            <ul className="navbar-links navbar-links--desktop-only">
              <li><Link to="/" onClick={() => setIsOpen(false)}>{t("navbar.home")}</Link></li>
              <li><Link to="/tutors" onClick={() => setIsOpen(false)}>{t("navbar.find_tutor")}</Link></li>
              <li><Link to="/become-tutor" onClick={() => setIsOpen(false)}>{t("navbar.for_tutors")}</Link></li>
              <li><button onClick={() => handleScrollLink("category")}>{t("navbar.category")}</button></li>
            </ul>

            {/* Auth section */}
            <div className="drawer-auth">
              {isAuthenticated && user ? (
                <>
                  <button className="drawer-nav-item" onClick={handleDashboardClick}>
                    <span className="drawer-nav-icon" aria-hidden="true">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
                    </span>
                    <span>{t("navbar.dashboard", "Кабинет")}</span>
                  </button>
                  <button className="btn-nav-login mobile-full-btn" onClick={() => { setIsOpen(false); navigate("/profile"); }}>
                    {t("navbar.profile", "Профиль")}
                  </button>
                </>
              ) : (
                <>
                  <Link to="#" className="drawer-nav-item" onClick={(e) => { e.preventDefault(); handleLoginClick(); }}>
                    <span className="drawer-nav-icon" aria-hidden="true">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21a8 8 0 0 0-16 0" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                    <span>{t("navbar.login", "Войти")}</span>
                  </Link>
                  <button className="drawer-register-btn" onClick={handleSignupClick}>
                    {t("navbar.signup", "Регистрация")}
                  </button>
                </>
              )}
            </div>

            {/* Language switcher — pill as in mockup */}
            <div className="drawer-lang-switcher">
              <button className={`drawer-lang-btn ${currentLang === "ru" ? "active" : ""}`} onClick={() => handleLanguageChange("ru")} aria-pressed={currentLang === "ru"}>
                <span className="flag flag--ru" aria-hidden="true" />
                <span>RU</span>
              </button>
              <span className="drawer-lang-sep" aria-hidden="true">|</span>
              <button className={`drawer-lang-btn ${currentLang === "en" ? "active" : ""}`} onClick={() => handleLanguageChange("en")} aria-pressed={currentLang === "en"}>
                <span>EN</span>
              </button>
              <span className="drawer-lang-sep" aria-hidden="true">|</span>
              <button className={`drawer-lang-btn ${currentLang === "ky" ? "active" : ""}`} onClick={() => handleLanguageChange("ky")} aria-pressed={currentLang === "ky"}>
                <span className="flag flag--ky" aria-hidden="true" />
                <span>KY</span>
              </button>
            </div>

            {/* Hidden old mobile settings — kept for theme */}
            <div className="navbar-mobile-settings" style={{ display: "none" }}>
              <div className="navbar-mobile-lang">
                {["ru", "en", "ky"].map((langCode) => (
                  <button
                    key={langCode}
                    className={`lang-btn ${currentLang === langCode ? "active" : ""}`}
                    onClick={() => handleLanguageChange(langCode)}
                  >
                    {langCode.toUpperCase()}
                  </button>
                ))}
              </div>
              <button className="theme-toggle-btn" onClick={toggleTheme} title={t("a11y.toggle_theme", "Toggle theme")} aria-label={t("a11y.toggle_theme", "Toggle theme")}>
                {theme === "dark" ? "☀" : "☾"}
              </button>
            </div>
          </div>

          <div className="navbar-right">
            {/* 1. theme toggle */}
            <button className="theme-toggle-btn" onClick={toggleTheme} title={t("a11y.toggle_theme", "Toggle theme")} aria-label={t("a11y.toggle_theme", "Toggle theme")}>
              {theme === "dark" ? "\u2600" : "\u263E"}
            </button>

            {/* 2. user actions / auth buttons */}
            {isAuthenticated && user ? (
              <div className="navbar-user-menu">
                {/* Кнопка "Главная" — marketplace dashboard */}
                <button className="btn-nav-dashboard" onClick={handleDashboardClick}>
                  {t("navbar.dashboard")}
                </button>

                {/* Аватар → dropdown с профилем */}
                <div className="navbar-avatar-wrap">
                  <button
                    className="navbar-avatar"
                    onClick={() => setUserMenuOpen((prev) => !prev)}
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
                    aria-label={t("navbar.profile", "Profile")}
                  >
                    {user.avatar ? (
                      <img loading="lazy" decoding="async" src={user.avatar} alt={user.full_name} />
                    ) : (
                      <span>{user.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"}</span>
                    )}
                  </button>

                  {userMenuOpen && (
                    <div className="user-dropdown">
                      <button
                        className="user-dropdown-item"
                        onClick={() => { setUserMenuOpen(false); navigate("/profile"); }}
                      >
                        {t("navbar.profile", "Мой профиль")}
                      </button>
                      <button
                        className="user-dropdown-item"
                        onClick={() => { setUserMenuOpen(false); navigate("/dashboard/settings"); }}
                      >
                        {t("navbar.settings", "Настройки")}
                      </button>
                      <button
                        className="user-dropdown-item"
                        onClick={() => { setUserMenuOpen(false); handleDashboardClick(); }}
                      >
                        {t("navbar.dashboard", "Главная")}
                      </button>
                      <div className="user-dropdown-divider" />
                      <button
                        className="user-dropdown-item user-dropdown-item--danger"
                        onClick={() => {
                          setUserMenuOpen(false);
                          useAuthStore.getState().logout?.();
                          navigate("/");
                        }}
                      >
                        {t("navbar.logout", "Выйти")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="navbar-auth-buttons">
                <button className="btn-nav-login" onClick={openAuth}>
                  {t("navbar.login")}
                </button>
                <button className="btn-nav-signup" onClick={openRegister}>
                  {t("navbar.signup")}
                </button>
              </div>
            )}

            {/* 3. language selector — ПОСЛЕДНИМ, чтобы dropdown шёл вправо и не перекрывал */}
            <button className="language-selector" onClick={toggleLanguageDropdown} aria-expanded={languageOpen} aria-haspopup="true">
              <span className="language-current">{currentLang.toUpperCase()}</span>
              {languageOpen && (
                <div className="language-dropdown">
                  {["ru", "en", "ky"].map((langCode) => (
                    <button
                      key={langCode}
                      className={`lang-btn ${currentLang === langCode ? "active" : ""}`}
                      onClick={(e) => { e.stopPropagation(); handleLanguageChange(langCode); }}
                    >
                      {langCode.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </button>

            {/* 4. hamburger */}
            <button className={`navbar-hamburger ${isOpen ? "active" : ""}`} onClick={toggleMenu} aria-label={t("a11y.toggle_menu", "Toggle menu")} aria-expanded={isOpen} aria-controls="navbar-center">
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>
      <div className={`navbar-overlay ${isOpen ? "active" : ""}`} onClick={() => setIsOpen(false)} />
    </>
  );
};

export default Navbar;