import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, FileText, MessageCircle, User, Settings, LogOut, Heart, LifeBuoy } from "lucide-react";
import useAuthStore from "../../store/authStore";
import { useUnreadCount } from "../../features/chat/hooks/useUnreadCount";

const ITEMS = [
  { id: "dashboard", labelKey: "dashboard.overview", label: "Главная", icon: LayoutDashboard, path: "/app/dashboard" },
  { id: "resumes", labelKey: "tutor.resume", label: "Мои резюме", icon: FileText, path: "/app/resumes" },
  { id: "messages", labelKey: "navigation.requests", label: "Сообщения", icon: MessageCircle, path: "/app/messages" },
  { id: "favorites", labelKey: "favorites.title", label: "Избранное", icon: Heart, path: "/app/favorites" },
  { id: "profile", labelKey: "navbar.profile", label: "Профиль", icon: User, path: "/app/profile" },
  { id: "settings", labelKey: "navbar.settings", label: "Настройки", icon: Settings, path: "/app/settings" },
  { id: "support", labelKey: "navbar.support", label: "Поддержка", icon: LifeBuoy, path: "/app/support" },
] as const;

export default function AppSidebar({ collapsed = false, onClose }: { collapsed?: boolean; onClose?: () => void }): JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const { data: unread = 0 } = useUnreadCount(isAuthenticated);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    onClose?.();
  };

  return (
    <aside style={{ width: collapsed ? 72 : 260, flexShrink: 0, background: "var(--color-surface)", borderRight: "1px solid var(--color-border)", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0 }}>
      <div style={{ padding: 16, fontWeight: 800, fontSize: 20 }}>okututor</div>
      <nav style={{ flex: 1, padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const showBadge = it.id === "messages" && unread > 0;
          const pathname = location.pathname;
          const prefix = (it as Record<string, unknown>).matchPrefix as string | undefined;
          const active = pathname === it.path || pathname.startsWith(it.path + "/") || (prefix ? pathname.startsWith(prefix) : false);
          return (
            <NavLink
              key={it.id}
              to={it.path}
              onClick={() => onClose?.()}
              style={() => ({
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                textDecoration: "none",
                color: active ? "var(--color-primary)" : "var(--color-text)",
                background: active ? "var(--color-primary-light, #eff6ff)" : "transparent",
                fontWeight: active ? 600 : 500,
                position: "relative",
              })}
            >
              <Icon size={18} />
              {!collapsed && <span>{t(it.labelKey, it.label)}</span>}
              {showBadge && !collapsed && <span style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", fontSize: 11, minWidth: 18, height: 18, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{unread > 99 ? "99+" : unread}</span>}
            </NavLink>
          );
        })}
      </nav>
      <div style={{ padding: 12, borderTop: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user?.avatar ? <img loading="lazy" decoding="async" src={user.avatar} alt="" style={{ width: 36, height: 36, borderRadius: "50%" }} /> : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>{user?.full_name?.[0] ?? "U"}</div>}
          {!collapsed && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.full_name ?? "User"}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email ?? ""}</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <>
            <button onClick={() => { navigate("/app/profile"); onClose?.(); }} style={{ textAlign: "left", background: "none", border: "none", padding: "6px 0", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 13 }}>Профиль</button>
            <button onClick={() => { navigate("/app/settings"); onClose?.(); }} style={{ textAlign: "left", background: "none", border: "none", padding: "6px 0", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 13 }}>Настройки</button>
          </>
        )}
        <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 8, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: "6px 0" }}>
          <LogOut size={16} /> {!collapsed && "Выйти"}
        </button>
      </div>
    </aside>
  );
}
