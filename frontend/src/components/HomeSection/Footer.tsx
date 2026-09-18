// migrated to TSX — minimal strict types (controlled)
import React from "react";
import { useTranslation } from "react-i18next";
import "../../styles/HomeSectionCSS/Footer.css";
import instagram from "../../assets/Footer/instagram.svg";
import linkedIn from "../../assets/Footer/linkedIn.svg";
import telegram from "../../assets/Footer/telegram.svg";
import logoBlue from "../../assets/Navbar/logo.svg";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="footer footer-light">
      <div className="footer-container">
        {/* Логотип и заголовок - как на макете Image 3 */}
        <div className="footer-logo">
          <img loading="lazy" decoding="async" src={logoBlue} alt={t("footer.logo_alt", "Okututor Logo")} className="logo-image" style={{ height: 36 }} />
          <div className="footer-logo-text">
            <p style={{ margin: 0, fontWeight: 700, fontSize: 18, color: "var(--color-text)" }}>Okututor</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>{t("footer.learning_and_teaching")}</p>
          </div>
        </div>

        {/* Текст подписки */}
        <p className="newsletter-text">
          {t("footer.subscribe")}
        </p>

        {/* Социальные иконки - светлые как на макете */}
        <div className="social-icons">
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <div className="social-icon">
              <img loading="lazy" decoding="async" src={linkedIn} alt="LinkedIn" />
            </div>
          </a>
          <a href="https://t.me/okututor" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
            <div className="social-icon">
              <img loading="lazy" decoding="async" src={telegram} alt="telegram" />
            </div>
          </a>
          <a
            href="https://www.instagram.com/okututor/?igsh=MTVsOTR6Mm44M3RpbA%3D%3D#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            <div className="social-icon">
              <img loading="lazy" decoding="async" src={instagram} alt="instagram" />
            </div>
          </a>
        </div>

        {/* Ссылки на политики - как просили */}
        <div className="footer-links" style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", fontSize: 13 }}>
          <a href="/legal/privacy" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>{t("footer.privacy", "Политика конфиденциальности")}</a>
          <span style={{ color: "var(--color-border)" }}>|</span>
          <a href="/legal/terms" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>{t("footer.terms", "Условия использования")}</a>
          <span style={{ color: "var(--color-border)" }}>|</span>
          <a href="/legal/cookies" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>{t("footer.cookies", "Политика cookies")}</a>
        </div>

        {/* Копирайт */}
        <p className="copyright">
          © 2026 Okututor Inc.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
