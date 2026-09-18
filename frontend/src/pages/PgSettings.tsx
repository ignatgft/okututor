// migrated to TSX — minimal strict types (controlled)
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../hooks/useTheme";
import { usePageTitle } from "../components/pageTitleContext";
import { apiClient } from "../api/http";
import { endpoints } from "../api/endpoints";
import { useToast } from "../components/ui/Toast";
import useAuthStore from "../store/authStore";
import { detectTimezone, IANA_TIMEZONES } from "../utils/timezone";
import "../styles/Settings.css";

export default function PgSettings() {
  const { t, i18n } = useTranslation();
  const setPageTitle = usePageTitle();
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [timezone, setTimezone] = useState("");
  const [savingTz, setSavingTz] = useState(false);

  useEffect(() => { setPageTitle(t("navbar.settings", "Настройки")); }, [setPageTitle, t]);

  useEffect(() => {
    setTimezone(user?.timezone || detectTimezone());
  }, [user]);

  const languages = [
    { code: "en", label: "English" },
    { code: "ru", label: "Русский" },
    { code: "ky", label: "Кыргызча" },
  ];

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
  };

  const handleTimezoneChange = async (e) => {
    const next = e.target.value;
    setTimezone(next);
    if (!user) return;
    setSavingTz(true);
    try {
      const { response, data } = await apiClient.put(endpoints.users.update, { timezone: next });
      if (response.ok) {
        setUser({ ...user, timezone: next });
        toast.success(t("settings.timezone_saved", "Timezone saved"));
      } else {
        toast.error(data?.error || data?.message || t("errors.default", "Something went wrong."));
      }
    } catch (err) {
      toast.error(err.message || t("errors.default", "Something went wrong."));
    } finally {
      setSavingTz(false);
    }
  };

  return (
      <div className="settings-page" style={{ maxWidth: 760, margin: "0 auto", width: "100%", overflowX: "hidden" }}>
        <div className="settings-section">
          <h3>{t("settings.appearance", "Внешний вид")}</h3>
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-label">{t("settings.theme", "Тема")}</span>
              <span className="settings-value">{theme === "dark" ? t("settings.dark", "Тёмная") : t("settings.light", "Светлая")}</span>
            </div>
            <button className="theme-toggle" onClick={toggleTheme} role="switch" aria-checked={theme === "dark"} aria-label={t("settings.toggle_theme", "Toggle dark mode")}>
              <span className={`theme-option ${theme !== "dark" ? "active" : ""}`}>☀ {t("settings.light", "Светлая")}</span>
              <span className={`theme-option ${theme === "dark" ? "active" : ""}`}>☾ {t("settings.dark", "Тёмная")}</span>
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3>{t("settings.language", "Язык")}</h3>
          <div className="settings-row" style={{ borderBottom: "none" }}>
            <div className="language-selector-settings" style={{ width: "100%", justifyContent: "center" }}>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  className={`lang-btn ${i18n.language === lang.code ? "active" : ""}`}
                  onClick={() => handleLanguageChange(lang.code)}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>{t("settings.timezone", "Часовой пояс")}</h3>
          <p style={{ margin: "0 0 12px", fontSize: "0.875rem", color: "var(--color-text-muted)" }}>{t("settings.timezone_hint", "Время в расписании и уроках будет показываться в выбранном поясе")} — текущий: <strong>{timezone}</strong>{savingTz && " …"}</p>
          <select
            className="timezone-select"
            value={timezone}
            onChange={handleTimezoneChange}
            aria-label={t("settings.timezone", "Часовой пояс")}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 14 }}
          >
            {IANA_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        <div className="settings-section">
          <h3>{t("settings.notifications", "Уведомления")}</h3>
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-label">{t("settings.email_notifications", "Уведомления по email")}</span>
              <span className="settings-value" style={{ color: "var(--color-success)", fontWeight: 600 }}>● {t("settings.enabled", "Включены")}</span>
            </div>
            <label style={{ position: "relative", display: "inline-block", width: 44, height: 24 }}>
              <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: "absolute", inset: 0, background: "var(--color-primary)", borderRadius: 9999, transition: "0.2s" }} />
              <span style={{ position: "absolute", top: 2, left: 2, width: 20, height: 20, background: "#fff", borderRadius: "50%", transition: "0.2s", transform: "translateX(20px)" }} />
            </label>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>Получайте письма о новых заявках, сообщениях и модерации резюме.</p>
        </div>
      </div>
  );
}
