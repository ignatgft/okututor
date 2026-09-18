import { useEffect, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import useAuthStore from "./store/authStore";
import { useUIStore } from "./store/uiStore";
import { AppProviders } from "./app/providers/AppProviders";
import { AppRouter } from "./app/router/AppRouter";
import BottomNav from "./components/BottomNav";
import SeoManager from "./components/SeoManager";
import CookieBanner from "./components/CookieBanner";
import ReconsentBanner from "./components/ReconsentBanner";
import i18n from "./i18n";

const Auth = lazy(() => import("./components/AuthRegister/Auth"));
const Register = lazy(() => import("./components/AuthRegister/Register"));

export default function App(): JSX.Element {
  const { t } = useTranslation();
  const { init, retryInit, status, initError, logout } = useAuthStore();
  const { isAuthOpen, isRegisterOpen, closeAuth, closeRegister } = useUIStore();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const handleAuthLogout = async (): Promise<void> => {
      await logout();
    };
    window.addEventListener("auth:logout", handleAuthLogout);
    return () => {
      window.removeEventListener("auth:logout", handleAuthLogout);
    };
  }, [logout]);

  if (status === "initializing")
    return <div className="loading-screen" role="status" aria-live="polite">{i18n.t("common.loading", "Loading...")}</div>;

  if (status === "offline")
    return (
      <div className="loading-screen" role="alert" style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", justifyContent: "center", minHeight: "100dvh", padding: 24, textAlign: "center" }}>
        <p>{initError || t("errors.network_error", "Network error. Check your connection.")}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn-primary" onClick={() => void retryInit()}>
            {t("common.retry", "Retry")}
          </button>
          <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>
            {t("common.reload", "Reload")}
          </button>
        </div>
      </div>
    );

  return (
    <AppProviders>
      <SeoManager />
      <CookieBanner />
      <ReconsentBanner />
      <a href="#main-content" className="skip-nav">{t("a11y.skip_to_content", "Skip to content")}</a>
      <AppRouter />
      <BottomNav />
      {(isAuthOpen || isRegisterOpen) && (
        <Suspense fallback={null}>
          {isAuthOpen && <Auth isOpen={isAuthOpen} onClose={closeAuth} onSuccess={closeAuth} />}
          {isRegisterOpen && <Register isOpen={isRegisterOpen} onClose={closeRegister} />}
        </Suspense>
      )}
    </AppProviders>
  );
}
