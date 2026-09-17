// migrated to TSX — minimal strict types (controlled)
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useAuthStore from "../store/authStore";
import { useTheme } from "../hooks/useTheme";
import { isAdmin, isSuperAdmin, isUser } from "../constants/roles";
import { LogOut, Settings as SettingsIcon } from "lucide-react";
import { SIDEBAR_ITEMS, getSectionPath } from "../config/navigation";
import { useUnreadCount } from "../features/chat/hooks/useUnreadCount";
import "../styles/Sidebar.css";

const Sidebar = ({ isOpen = false, onClose, collapsed = false }) => {
  const [langOpen, setLangOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ admin_tutor_requests: true });
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme } = useTheme();
  const { data: chatUnread = 0 } = useUnreadCount(isAuthenticated);

  if (!isAuthenticated) return null;

  const role = user?.role;
  const isRoleSuperAdmin = isSuperAdmin(role);
  const isRoleAdmin = isAdmin(role);
  const isRoleUser = isUser(role);

  let roleKey: string = "user";
  if (isRoleAdmin || isRoleSuperAdmin) roleKey = "admin";
  else if (isRoleUser) roleKey = "user";
  else roleKey = "user";

  let navItems = SIDEBAR_ITEMS[roleKey as keyof typeof SIDEBAR_ITEMS] || SIDEBAR_ITEMS.user;
  if (roleKey === "admin" && !isRoleSuperAdmin) {
    navItems = navItems.filter((item) => item.id !== "admin_legal" && item.id !== "admin_telegram");
  }
  const section = getSectionPath(role);

  const isActive = (path: string) => {
    if (!path) return false;
    if (path.includes("?")) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const getUserInitials = () => {
    if (!user?.full_name) return "?";
    return user.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const currentLang = (i18n.resolvedLanguage || i18n.language || "ru").split("-")[0].toLowerCase();
  const normalizedLang = currentLang === "kg" ? "ky" : currentLang;

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside
      className={`sidebar ${isOpen ? "open" : ""} ${collapsed ? "sidebar--collapsed" : ""}`}
      id="sidebar"
      role="navigation"
      aria-label={t("a11y.main_navigation", "Main navigation")}
    >
      <div className="sidebar-header">
        <Link to="/" className="sidebar-logo" onClick={() => onClose?.()}>
          <span className="sidebar-logo-text">okututor</span>
        </Link>
        <button className="sidebar-close-btn" onClick={onClose} aria-label={t("a11y.close_menu", "Close menu")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const hasChildren = !!(item.children && item.children.length > 0);
            const isGroupExpanded = expandedGroups[item.id] ?? false;
            const isChildActive = hasChildren ? item.children!.some(c => isActive(c.path)) : false;
            const active = !hasChildren && isActive(item.path);

            // Special color handling for certain ids
            const extraClass =
              item.id === "admin_telegram" ? "sidebar-item--telegram" :
              item.id === "admin_seo" ? "sidebar-item--seo" : "";

            if (hasChildren) {
              return (
                <li key={item.id} className="sidebar-group">
                  <button
                    className={`sidebar-item sidebar-item--group ${isChildActive ? "sidebar-item--group-active" : ""}`}
                    onClick={() => toggleGroup(item.id)}
                    aria-expanded={isGroupExpanded}
                  >
                    <IconComponent className="sidebar-icon" />
                    {!collapsed && <span className="sidebar-label">{t(item.labelKey, item.id)}</span>}
                    {!collapsed && (
                      <span className={`sidebar-chevron ${isGroupExpanded ? "open" : ""}`} aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </span>
                    )}
                  </button>
                  {!collapsed && isGroupExpanded && (
                    <ul className="sidebar-submenu">
                      {item.children!.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = isActive(child.path);
                        return (
                          <li key={child.id}>
                            <button
                              className={`sidebar-item sidebar-subitem ${childActive ? "active" : ""}`}
                              onClick={() => { navigate(child.path); onClose?.(); }}
                            >
                              <ChildIcon className="sidebar-icon sidebar-icon--sub" />
                              <span className="sidebar-label">{t(child.labelKey, child.id)}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            const showChatBadge = item.id === "requests" && chatUnread > 0;
            return (
              <li key={item.id}>
                <button
                  className={`sidebar-item ${active ? "active" : ""} ${extraClass}`}
                  onClick={() => { navigate(item.path); onClose?.(); }}
                  title={collapsed ? t(item.labelKey) : undefined}
                >
                  <IconComponent className="sidebar-icon" />
                  {!collapsed && <span className="sidebar-label">{t(item.labelKey, item.id)}</span>}
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
        <ul className="sidebar-menu sidebar-menu--bottom">
          <li>
            <button
              className={`sidebar-item ${isActive(`${section}/settings`) || isActive("/admin/settings") ? "active" : ""}`}
              onClick={() => { navigate(`${section}/settings`); onClose?.(); }}
            >
              <SettingsIcon className="sidebar-icon" />
              {!collapsed && <span className="sidebar-label">{t("navbar.settings", "Настройки")}</span>}
            </button>
          </li>
          <li>
            <button
              className="sidebar-item sidebar-logout"
              onClick={() => { handleLogout(); onClose?.(); }}
            >
              <LogOut className="sidebar-icon" size={18} />
              {!collapsed && <span className="sidebar-label">{t("navbar.logout", "Выйти")}</span>}
            </button>
          </li>
        </ul>

        {!collapsed && (
          <div className="sidebar-bottom-row">
            <div className="sidebar-lang-selector">
              <button className="sidebar-lang-trigger" onClick={() => setLangOpen(!langOpen)} aria-expanded={langOpen} aria-haspopup="true">
                <span>{normalizedLang.toUpperCase()}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`sidebar-lang-arrow ${langOpen ? "open" : ""}`}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {langOpen && (
                <div className="sidebar-lang-dropdown">
                  {["ru", "en", "ky"].map((code) => {
                    const displayCode = code === "ky" ? "KY" : code.toUpperCase();
                    const isActiveLang = normalizedLang === code || (code === "ky" && normalizedLang === "ky");
                    return (
                      <button
                        key={code}
                        className={isActiveLang ? "active" : ""}
                        onClick={() => {
                          const target = code === "ky" ? "ky" : code;
                          i18n.changeLanguage(target);
                          setLangOpen(false);
                        }}
                      >
                        {displayCode}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              className="sidebar-user"
              onClick={() => { navigate(`${section}/profile`); onClose?.(); }}
              aria-label={t("navbar.profile")}
            >
              <div className={`sidebar-avatar ${isRoleSuperAdmin ? "sidebar-avatar--super" : ""}`}>
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.full_name} />
                ) : (
                  <span>{getUserInitials()}</span>
                )}
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user?.full_name || "Ignat Gorbouroukov"}</span>
                <span className="sidebar-user-role">{user?.role || "USER"}</span>
              </div>
            </button>
          </div>
        )}

        {collapsed && (
          <button
            className="sidebar-user sidebar-user--collapsed"
            onClick={() => { navigate(`${section}/profile`); onClose?.(); }}
            aria-label={t("navbar.profile")}
          >
            <div className={`sidebar-avatar ${isRoleSuperAdmin ? "sidebar-avatar--super" : ""}`}>
              {user?.avatar ? <img src={user.avatar} alt={user.full_name} /> : <span>{getUserInitials()}</span>}
            </div>
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
