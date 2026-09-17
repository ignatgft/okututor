// migrated to TSX - minimal strict types (controlled)
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useAuthStore from "../store/authStore";
import { setTokens, clearTokens } from "../api/token";
import { getCurrentUser } from "../api/auth";
import { getDashboardPath } from "../config/navigation";

export default function PgOAuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, init } = useAuthStore();
  const [status, setStatus] = useState("loading");
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const complete = async () => {
      const oauthError = searchParams.get("error");
      // новый flow: ?code= (one-time, обмен на токены), легаси: ?access_token=
      const code = searchParams.get("code");
      const accessTokenParam = searchParams.get("access_token");
      const refreshTokenParam = searchParams.get("refresh_token");

      window.history.replaceState(null, "", "/oauth/callback");

      if (oauthError) {
        clearTokens();
        setStatus("error");
        return;
      }

      try {
        if (code) {
          // обмен code -> tokens (backend POST /api/v1/auth/oauth/exchange)
          const resp = await fetch("/api/v1/auth/oauth/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });
          if (!resp.ok) {
            clearTokens();
            setStatus("error");
            return;
          }
          const data = await resp.json();
          const at = data.access_token || data.accessToken;
          const rt = data.refresh_token || data.refreshToken;
          if (!at) {
            clearTokens();
            setStatus("error");
            return;
          }
          setTokens(at, rt);
        } else if (accessTokenParam) {
          setTokens(accessTokenParam, refreshTokenParam);
        } else {
          clearTokens();
          setStatus("error");
          return;
        }

        const user = await getCurrentUser();
        if (!user) {
          clearTokens();
          setStatus("error");
          return;
        }
        setUser(user);
        await init();
        setStatus("done");
        navigate(getDashboardPath(user.role), { replace: true });
      } catch {
        clearTokens();
        setStatus("error");
      }
    };

    complete();
  }, [navigate, searchParams, setUser, init]);

  if (status === "error") {
    return (
      <div className="loading-screen oauth-callback-error">
        <p>{t("oauth.error", "Google sign-in failed. Please try again.")}</p>
        <Link to="/">{t("buttons.back_home", "Back to Home")}</Link>
      </div>
    );
  }

  return (
    <div className="loading-screen">
      {t("oauth.signing_in", "Signing you in with Google...")}
    </div>
  );
}
