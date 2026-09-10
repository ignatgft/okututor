// migrated to TSX — minimal strict types (controlled)
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useAuthStore from "../store/authStore";
import { isAdmin, isTutor, isUser } from "../constants/roles";
import { BOTTOMNAV_ITEMS } from "../config/navigation";
import { useUnreadCount } from "../features/chat/hooks/useUnreadCount";
import "../styles/BottomNav.css";

const BottomNav = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const { data: unreadCount = 0 } = useUnreadCount(isAuthenticated);

  if (!isAuthenticated) return null;

  const p = location.pathname;
  const isDetailPage = /^\/(course|lesson)\/[^/]+/.test(p) || /^\/tutor\/[^/]+/.test(p) || /^\/repetitor\/[^/]+\/[^/]+/.test(p);
  if (p === "/" || isDetailPage) return null;

  const isAdminRole = isAdmin(user?.role);
  const isTutorRole = isTutor(user?.role);
  const isUserRole = isUser(user?.role);

  let roleKey: string = "user";
  if (isAdminRole) roleKey = "admin";
  else if (isUserRole) roleKey = "user";
  else if (isTutorRole) roleKey = "tutor";
  else roleKey = "student";
  const tabs = BOTTOMNAV_ITEMS[roleKey];
  if (!tabs || tabs.length === 0) return null;

  const isActive = (path: string): boolean => {
    if (path.includes("?")) {
      const [route, query] = path.split("?");
      return location.pathname === route && location.search === "?" + query;
    }
    if (location.pathname === path) return true;
    if (location.pathname.startsWith(path + "/")) return true;
    if (path === "/tutors" && (location.pathname === "/repetitors" || location.pathname.startsWith("/repetitors/"))) return true;
    if (path === "/student/search" && location.pathname === "/find-tutors") return true;
    return false;
  };

  return (
    <nav className="bottom-nav" aria-label={t("a11y.mobile_navigation", "Mobile navigation")}>
      <div className="bottom-nav-container">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const active = isActive(tab.path);
          const showBadge = tab.id === "requests" && unreadCount > 0;
          return (
            <button
              key={tab.id}
              className={`bottom-nav-item ${active ? "active" : ""}`}
              onClick={() => navigate(tab.path)}
              aria-label={t(tab.labelKey) + (showBadge ? ` ${unreadCount}` : "")}
              title={t(tab.labelKey)}
              aria-current={active ? "page" : undefined}
            >
              <div className="bottom-nav-icon-wrap" style={{ position: "relative" }}>
                <IconComponent className="bottom-nav-icon" />
                {showBadge && (
                  <span
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -8,
                      minWidth: 18,
                      height: 18,
                      padding: "0 4px",
                      borderRadius: "999px",
                      background: "var(--color-danger, #EF4444)",
                      color: "#fff",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1,
                    }}
                    aria-hidden="true"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {active && <div className="bottom-nav-indicator" />}
              </div>
              <span className="bottom-nav-label">{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
