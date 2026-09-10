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
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const { openAuth, openRegister } = useUIStore();

  const toggleMenu = () => setIsOpen(!isOpen);
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

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-left">
            <Link to="/" className="navbar-logo-link">
              <span className="navbar-logo-text">okututor</span>
            </Link>
          </div>

          <div className={`navbar-center drawer ${isOpen ? "active" : ""}`}>
            <ul className="navbar-links">
              <li><Link to="/" onClick={() => setIsOpen(false)}>{t("navbar.home")}</Link></li>
              <li><Link to="/tutors" onClick={() => setIsOpen(false)}>{t("navbar.find_tutor")}</Link></li>
              <li><Link to="/become-tutor" onClick={() => setIsOpen(false)}>{t("navbar.for_tutors")}</Link></li>
              <li><button onClick={() => handleScrollLink("category")}>{t("navbar.category")}</button></li>
            </ul>

            {/* Auth buttons in mobile sidebar */}
            <div className="navbar-mobile-auth">
              {isAuthenticated && user ? (
                <>
                  <button className="btn-nav-dashboard mobile-full-btn" onClick={handleDashboardClick}>
                    {t("navbar.dashboard")}
                  </button>
                  <button className="btn-nav-login mobile-full-btn" onClick={() => { setIsOpen(false); navigate("/profile"); }}>
                    {t("navbar.profile", "Профиль")}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-nav-login mobile-full-btn" onClick={handleLoginClick}>
                    {t("navbar.login")}
                  </button>
                  <button className="btn-nav-signup mobile-full-btn" onClick={handleSignupClick}>
                    {t("navbar.signup")}
                  </button>
                </>
              )}
            </div>
            <div className="navbar-mobile-settings">
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
                      <img src={user.avatar} alt={user.full_name} />
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