// migrated to TSX — minimal strict types (controlled)
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { AUTH_STATUS } from "../store/authStore";

const INIT_TIMEOUT_MS = 10000;

function ProtectedRoute({ children, roles }) {
  const { t } = useTranslation();
  const { isAuthenticated, status, user, initError, retryInit } = useAuthStore();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (status !== AUTH_STATUS.INITIALIZING) return undefined;
    const timer = setTimeout(() => setTimedOut(true), INIT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [status]);

  if (status === AUTH_STATUS.INITIALIZING) {
    if (timedOut) {
      return (
        <div className="loading-screen" role="alert" style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center" }}>
          <p>{t("errors.session_check_failed", "Unable to verify your session. Check your connection.")}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-primary" onClick={() => { setTimedOut(false); void retryInit(); }}>
              {t("common.retry", "Retry")}
            </button>
            <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>
              {t("common.reload", "Reload page")}
            </button>
          </div>
        </div>
      );
    }
    return <div className="loading-screen" role="status" aria-live="polite">{t("common.loading", "Loading...")}</div>;
  }
  if (status === AUTH_STATUS.OFFLINE) {
    return (
      <div className="loading-screen" role="alert" style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center" }}>
        <p>{initError || t("errors.network_error", "Network error. Check your connection.")}</p>
        <button type="button" className="btn-primary" onClick={() => retryInit()}>
          {t("common.retry", "Retry")}
        </button>
      </div>
    );
  }
  if (!isAuthenticated)
    return (
      <Navigate
        to={`/login?from=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  if (roles && !roles.includes(user?.role)) return <Navigate to="/403" replace />;

  return children || <Outlet />;
}

export default ProtectedRoute;
