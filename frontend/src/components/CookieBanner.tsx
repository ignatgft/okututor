import { useEffect, useState } from "react";
import { legalApi, consentApi } from "../api/legal.api";
import { setAnalyticsConsent } from "../utils/analytics";

const KEY = "okututor_cookie_consent_v1";

export default function CookieBanner(): JSX.Element | null {
  const [visible, setVisible] = useState(false);
  const [categories, setCategories] = useState<{ code: string; name: string; isRequired: boolean }[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return;
    } catch {}
    legalApi.getConsentConfig().then(({ response, data }) => {
      if (!response.ok || !data) return;
      const cfg = data as { cookieCategories: { code: string; name: string; isRequired: boolean }[] };
      if (cfg.cookieCategories?.some((c) => !c.isRequired)) {
        setCategories(cfg.cookieCategories);
        setVisible(true);
      }
    }).catch(() => {});
  }, []);

  if (!visible) return null;

  const accept = (all: boolean) => {
    if (all) {
      categories.filter((c) => !c.isRequired).forEach((c) => {
        consentApi.accept({ consentType: `COOKIE_${c.code}` }).catch(() => {});
      });
      setAnalyticsConsent(true);
    } else {
      // "Только необходимые" — no optional category is accepted (incl. analytics).
      setAnalyticsConsent(false);
    }
    try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), all })); } catch {}
    setVisible(false);
  };

  return (
    <div style={{ position: "fixed", bottom: 16, left: 16, right: 16, maxWidth: 640, margin: "0 auto", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, padding: 16, boxShadow: "0 12px 32px rgba(0,0,0,0.15)", zIndex: 60 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Мы используем cookies</div>
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5, marginBottom: 12 }}>
        Необходимые — всегда включены. Аналитика и маркетинг — по вашему выбору. Подробнее в <a href="/legal/cookies" target="_blank" rel="noreferrer">Cookie Policy</a>.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn-primary" onClick={() => accept(true)}>Принять все</button>
        <button type="button" className="btn-secondary" onClick={() => accept(false)}>Только необходимые</button>
        <a href="/legal/cookies" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", padding: "8px 12px", textDecoration: "none" }}>Настройки</a>
      </div>
    </div>
  );
}
