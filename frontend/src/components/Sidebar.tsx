// migrated to TSX — minimal strict types (controlled)
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useAuthStore from "../store/authStore";
import { useTheme } from "../hooks/useTheme";
import { isAdmin, isTutor, isSuperAdmin, isUser } from "../constants/roles";
import { LogOut, Bell, Settings as SettingsIcon } from "lucide-react";
import { SIDEBAR_ITEMS, getSectionPath } from "../config/navigation";
import { useUnreadCount } from "../features/chat/hooks/useUnreadCount";
import "../styles/Sidebar.css";

const Sidebar = ({ isOpen = false, onClose, collapsed = false }) => {
  const [langOpen, setLangOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const { data: chatUnread = 0 } = useUnreadCount(isAuthenticated);

  if (!isAuthenticated) return null;

  const role = user?.role;
  const isRoleAdmin = isAdmin(role);
  const isRoleTutor = isTutor(role);
  const isRoleSuperAdmin = isSuperAdmin(role);
  const isRoleUser = isUser(role);

  let roleKey: string = "user";
  if (isRoleAdmin || isRoleSuperAdmin) roleKey = "admin";
  else if (isRoleUser) roleKey = "user";
  else if (isRoleTutor) roleKey = "tutor";
  else roleKey = "student";

  const navItems = SIDEBAR_ITEMS[roleKey];
  const section = getSectionPath(role);

  const bottomItems = [
    { id: "settings", labelKey: "navbar.settings", icon: SettingsIcon, path: `${section}/settings` },
  ];

  const isActive = (path) => {
    if (path.includes("?")) {
      return location.pathname + location.search === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const getUserInitials = () => {
    if (!user?.full_name) return "?";
    return user.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <aside
      className={`sidebar ${isOpen ? "open" : ""} ${collapsed ? "sidebar--collapsed" : ""}`}
      id="sidebar"
      role="navigation"
      aria-label={t("a11y.main_navigation", "Main navigation")}
    >
      <div className="sidebar-header">
        <Link to="/" className="sidebar-logo">
          <span className="sidebar-logo-text">okututor</span>
        </Link>
        <button className="sidebar-close-btn" onClick={onClose} aria-label={t("a11y.close_menu", "Close menu")}>
          ✕
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.path);
            const showChatBadge = item.id === "requests" && chatUnread > 0;
            return (
              <li key={item.id}>
                <button
                  className={`sidebar-item ${active ? "active" : ""}`}
                  onClick={() => { navigate(item.path); onClose?.(); }}
                  title={collapsed ? t(item.labelKey) : undefined}
                >
                  <IconComponent className="sidebar-icon" />
                  {!collapsed && <span className="sidebar-label">{t(item.labelKey)}</span>}
                  {!collapsed && showChatBadge && (
                    <span className="sidebar-badge" aria-label={`${chatUnread} непрочитано`}>{chatUnread > 99 ? "99+" : chatUnread}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <ul className="sidebar-menu">
          {bottomItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.id}>
                <button
                  className={`sidebar-item ${isActive(item.path) ? "active" : ""}`}
                  onClick={() => { navigate(item.path); onClose?.(); }}
                  title={collapsed ? t(item.labelKey) : undefined}
                >
                  <IconComponent className="sidebar-icon" />
                  {!collapsed && <span className="sidebar-label">{t(item.labelKey)}</span>}
                  {!collapsed && !!item.badge && item.badge > 0 && (
                    <span className="sidebar-badge">{item.badge > 99 ? "99+" : item.badge}</span>
                  )}
                </button>
              </li>
            );
          })}
          <li>
            <button
              className="sidebar-item sidebar-logout"
              onClick={() => { handleLogout(); onClose?.(); }}
              title={collapsed ? t("navbar.logout") : undefined}
            >
              <LogOut className="sidebar-icon" size={18} />
              {!collapsed && <span className="sidebar-label">{t("navbar.logout")}</span>}
            </button>
          </li>
        </ul>

        {!collapsed && (
          <div className="sidebar-controls">
            <button className="sidebar-control-btn" onClick={toggleTheme} title={t("a11y.toggle_theme", "Toggle theme")}>
              {theme === "dark" ? "\u2600" : "\u263E"}
            </button>
            <div className="sidebar-lang-selector">
              <button className="sidebar-control-btn" onClick={() => setLangOpen(!langOpen)}>
                {i18n.language.toUpperCase()}
              </button>
              {langOpen && (
                <div className="sidebar-lang-dropdown">
                  {["en", "ru", "ky"].map((code) => (
                    <button
                      key={code}
                      className={i18n.language === code ? "active" : ""}
                      onClick={() => { i18n.changeLanguage(code); setLangOpen(false); }}
                    >
                      {code.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <button
          className={`sidebar-user ${collapsed ? "sidebar-user--collapsed" : ""}`}
          onClick={() => { navigate(`${section}/profile`); onClose?.(); }}
          aria-label={t("navbar.profile")}
        >
          <div className="sidebar-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.full_name} />
            ) : (
              <span>{getUserInitials()}</span>
            )}
          </div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.full_name || t("common.user", "User")}</span>
              <span className="sidebar-user-role">{user?.role || ""}</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
