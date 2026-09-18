// migrated to TSX — minimal strict types (controlled)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { register as apiRegister, buildGoogleOAuthUrl } from "../../api/auth";
import googleIcon from "../../assets/AuthRegister/google-icon.svg";
import { ROLES } from "../../constants/roles";
import { useUIStore } from "../../store/uiStore";
import useAuthStore from "../../store/authStore";
import { getContactIntent } from "../../store/authIntentStore";
import Modal from "./Modal";
import "../../styles/AuthRegister/Register.css";

export default function Register({ isOpen, onClose }: Record<string, unknown>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUser, init } = useAuthStore();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    repeatPassword: "",
    termsAccepted: false,
    privacyAccepted: false,
  });
  // Marketplace unified: role is always USER (tutor = USER with resume, not separate role)
  const role = ROLES.USER;
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = t("validation.required", "Required");
    }

    if (!formData.email.trim()) {
      errors.email = t("validation.required", "Required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t("validation.invalid_email", "Invalid email");
    }

    if (!formData.password) {
      errors.password = t("validation.required", "Required");
    } else if (formData.password.length < 8) {
      errors.password = t("validation.password_min", "Minimum 8 characters");
    } else if (formData.password.length > 128) {
      errors.password = t("validation.password_max", "Maximum 128 characters");
    }

    if (formData.password !== formData.repeatPassword) {
      errors.repeatPassword = t("validation.password_match", "Passwords do not match");
    }

    if (!formData.termsAccepted) {
      errors.termsAccepted = t("validation.terms_required", "You must accept Terms of Use");
    }
    if (!formData.privacyAccepted) {
      errors.privacyAccepted = t("validation.privacy_required", "You must accept Privacy Policy");
    }

    return errors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const result = await apiRegister(
        formData.email,
        formData.password,
        formData.repeatPassword,
        formData.fullName,
        role,
        { termsAccepted: formData.termsAccepted, privacyAccepted: formData.privacyAccepted }
      );
      if (result.emailVerificationRequired) {
        onClose();
        navigate("/verify-email", {
          replace: true,
          state: { email: result.email || formData.email }
        });
      } else {
        setUser(result.user);
        await init();
        onClose();
        if (getContactIntent()) return;
        navigate("/app/dashboard", { replace: true });
      }
    } catch (err: unknown) {
      const e = err as Error & { fieldErrors?: Record<string, string>; status?: number };
      if (e.fieldErrors) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(e.fieldErrors)) {
          // backend uses snake_case: repeat_password, termsAccepted etc.
          const key = k === "repeat_password" ? "repeatPassword" : k === "full_name" ? "fullName" : k;
          mapped[key] = v;
        }
        setFieldErrors((prev) => ({ ...prev, ...mapped }));
        // also show first field error at top if no generic message
        if (!e.message || e.message === "Validation failed") {
          const first = Object.values(mapped)[0];
          if (first) setError(first);
          else setError(e.message || "Registration failed");
        } else {
          setError(e.message || "Registration failed");
        }
      } else {
        setError((err as Error).message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    window.location.href = buildGoogleOAuthUrl(role);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="auth-form">
        <h2>{t("navbar.signup") || "Sign Up"}</h2>

        {error && <div className="auth-error">{error}</div>}

        {/* Marketplace unified: no role selection — any USER can search and create resume */}
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", textAlign: "center", margin: "0 0 var(--space-4)" }}>
          {t("register.unified_hint", "Один аккаунт — ищите репетиторов и создавайте своё резюме, когда захотите.")}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <input
              name="fullName"
              type="text"
              placeholder={t("cr_course.full_name") || "Полное имя"}
              value={formData.fullName}
              onChange={handleChange}
              aria-invalid={!!fieldErrors.fullName}
              aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
            />
            {fieldErrors.fullName && (
              <span id="fullName-error" className="field-error">{fieldErrors.fullName}</span>
            )}
          </div>

          <div className="form-field">
            <input
              name="email"
              type="email"
              placeholder={t("common.email", "Электронная почта")}
              value={formData.email}
              onChange={handleChange}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
            {fieldErrors.email && (
              <span id="email-error" className="field-error">{fieldErrors.email}</span>
            )}
          </div>

          <div className="form-field">
            <input
              name="password"
              type="password"
              placeholder={t("cr_course.password") || "Пароль"}
              value={formData.password}
              onChange={handleChange}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
            />
            {fieldErrors.password && (
              <span id="password-error" className="field-error">{fieldErrors.password}</span>
            )}
          </div>

          <div className="form-field">
            <input
              name="repeatPassword"
              type="password"
              placeholder={t("cr_course.repeat_password") || "Повторите пароль"}
              value={formData.repeatPassword}
              onChange={handleChange}
              aria-invalid={!!fieldErrors.repeatPassword}
              aria-describedby={fieldErrors.repeatPassword ? "repeatPassword-error" : undefined}
            />
            {fieldErrors.repeatPassword && (
              <span id="repeatPassword-error" className="field-error">{fieldErrors.repeatPassword}</span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4, margin: "12px 0 4px", textAlign: "left" }}>
            <label className="auth-checkbox">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleChange}
                className={fieldErrors.termsAccepted ? "is-error" : ""}
                aria-invalid={!!fieldErrors.termsAccepted}
                aria-describedby={fieldErrors.termsAccepted ? "terms-error" : undefined}
              />
              <span>{t("auth.terms", "Соглашаюсь с")} <a href="/legal/terms" target="_blank" rel="noopener noreferrer">{t("legal.terms", "Пользовательским соглашением")}</a></span>
            </label>
            {fieldErrors.termsAccepted && <span id="terms-error" className="field-error" style={{ marginLeft: 38 }}>{fieldErrors.termsAccepted}</span>}
            <label className="auth-checkbox">
              <input
                type="checkbox"
                name="privacyAccepted"
                checked={formData.privacyAccepted}
                onChange={handleChange}
                className={fieldErrors.privacyAccepted ? "is-error" : ""}
                aria-invalid={!!fieldErrors.privacyAccepted}
                aria-describedby={fieldErrors.privacyAccepted ? "privacy-error" : undefined}
              />
              <span>{t("auth.privacy", "Соглашаюсь с")} <a href="/legal/privacy" target="_blank" rel="noopener noreferrer">{t("legal.privacy", "Политикой конфиденциальности")}</a></span>
            </label>
            {fieldErrors.privacyAccepted && <span id="privacy-error" className="field-error" style={{ marginLeft: 38 }}>{fieldErrors.privacyAccepted}</span>}
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "..." : t("navbar.signup") || "Sign Up"}
          </button>
        </form>

        <div className="auth-divider"><span>{t("auth.or", "или")}</span></div>

        <button
          className="google-btn"
          type="button"
          onClick={handleGoogleRegister}
          title={t("register.continue_google", "Continue with Google")}
        >
          <img loading="lazy" decoding="async" src={googleIcon} alt="Google" width={20} />
          {t("register.continue_google", "Continue with Google")}
        </button>

        <p className="auth-switch">
          {t("auth.have_account") || "Already have an account?"}{" "}
          <button
            type="button"
            className="link-btn"
            onClick={() => { onClose(); useUIStore.getState().openAuth(); }}
          >
            {t("navbar.login") || "Login"}
          </button>
        </p>
      </div>
    </Modal>
  );
}