import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Footer(): JSX.Element {
  const { t } = useTranslation();

  return (
    <footer className="foot" role="contentinfo">
      <div className="row">
        <Link to="/" className="wordmark" aria-label="OkuTutor Главная">
          OkuTutor
        </Link>
        <div className="social">
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href="https://t.me/okututor" target="_blank" rel="noopener noreferrer">Telegram</a>
          <a href="https://instagram.com/okututor" target="_blank" rel="noopener noreferrer">Instagram</a>
        </div>
      </div>
      <div className="row" style={{ marginTop: 24 }}>
        <div className="legal">
          <Link to="/legal/privacy">{t("footer.privacy", "Политика конфиденциальности")}</Link>
          <Link to="/legal/terms">{t("footer.terms", "Условия использования")}</Link>
          <Link to="/legal/cookies">{t("footer.cookies", "Политика cookies")}</Link>
        </div>
      </div>
      <p className="copy">© 2026 OkuTutor Inc.</p>
    </footer>
  );
}
