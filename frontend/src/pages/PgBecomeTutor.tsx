// migrated to TSX — minimal strict types (controlled)
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useAuthStore from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { tutorsApi } from "../api/tutors.api";
import { TUTOR_LANGUAGES as LANGUAGES } from "../constants/course";
import { MARKETPLACE_SUBJECTS } from "../constants/cities";
import Navbar from "../components/Navbar";
import "../styles/Dashboard.css";
import "../styles/AuthForms.css";

// Marketplace wizard — §12 (10 steps, not one huge form)
const STEPS = ["personal", "subjects", "levels", "education", "experience", "price", "format", "photo", "preview", "submit"] as const;
const LEVELS = ["Школьный", "ВУЗ", "Начинающий", "Продвинутый", "ОРТ"];
const FORMATS = ["online", "offline", "both"];

export default function PgBecomeTutor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { openAuth } = useUIStore();

  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    location: "",
    experience_years: 0,
    experience_description: "",
    education: "",
    subjects: [] as string[],
    levels: [] as string[],
    languages: [] as string[],
    bio: "",
    price_per_hour: "",
    format: "online",
    photo: null as string | null,
  });

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const toggleIn = (field, value) =>
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));

  const validateStep = () => {
    switch (STEPS[step]) {
      case "personal":
        return form.full_name.trim() ? "" : t("become_tutor.error_name", "Name is required");
      case "subjects":
        return form.subjects.length > 0 ? "" : t("become_tutor.error_subjects", "Выберите хотя бы один предмет");
      case "languages":
        return form.languages.length > 0 ? "" : t("become_tutor.error_languages", "Select at least one language");
      case "price":
        return form.price_per_hour && Number(form.price_per_hour) >= 0 ? "" : t("cr_course.errors.price", "Укажите цену");
      default:
        return "";
    }
  };

  const next = () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await tutorsApi.submitApplication({
        full_name: form.full_name,
        phone: form.phone,
        location: form.location,
        experience_years: form.experience_years,
        experience_description: form.experience_description,
        education: form.education,
        subjects: form.subjects.join(","),
        levels: form.levels.join(","),
        languages: form.languages.join(","),
        bio: form.bio,
        price_per_hour: form.price_per_hour ? Number(form.price_per_hour) : undefined,
        format: form.format,
      });
      navigate("/tutor/application");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || (t("become_tutor.error_submit", "Failed to submit application") as string));
    } finally {
      setSubmitting(false);
    }
  };

  const field = (label, key, type = "text", props = {}) => (
    <div className="auth-form-field">
      <label htmlFor={`bt-${key}`}>{label}</label>
      <input
        id={`bt-${key}`}
        type={type}
        value={form[key]}
        onChange={(e) => set({ [key]: type === "number" ? Number(e.target.value) || 0 : e.target.value })}
        {...props}
      />
    </div>
  );

  const stepContent = {
    personal: (
      <>
        <h2>{t("become_tutor.step_personal", "Personal information")}</h2>
        {field(t("profile.full_name", "Full name"), "full_name")}
        {field(t("profile.phone", "Phone"), "phone", "tel")}
        {field(t("profile.location", "Location"), "location")}
      </>
    ),
    experience: (
      <>
        <h2>{t("become_tutor.step_experience", "Experience")}</h2>
        {field(t("cr_course.experience_label", "Years of experience"), "experience_years", "number", { min: 0 })}
        <div className="auth-form-field">
          <label htmlFor="bt-exp-desc">{t("become_tutor.experience_desc", "Describe your teaching experience")}</label>
          <textarea
            id="bt-exp-desc"
            rows={4}
            value={form.experience_description}
            onChange={(e) => set({ experience_description: e.target.value })}
          />
        </div>
      </>
    ),
    education: (
      <>
        <h2>{t("become_tutor.step_education", "Education")}</h2>
        <div className="auth-form-field">
          <label htmlFor="bt-education">{t("become_tutor.education", "University / degrees / certificates")}</label>
          <textarea
            id="bt-education"
            rows={3}
            value={form.education}
            onChange={(e) => set({ education: e.target.value })}
            placeholder={t("become_tutor.education_hint", "e.g. KSU, Mathematics, 2018-2022")}
          />
        </div>
      </>
    ),
    
    subjects: (
      <>
        <h2>{t("become_tutor.step_subjects", "Предметы")}</h2>
        <p className="auth-form-hint">{t("become_tutor.subjects_hint", "Выберите предметы, которые преподаёте")}</p>
        <div className="multi-select">
          {MARKETPLACE_SUBJECTS.map((s) => (
            <div key={s.value} className="select-item">
              <input
                type="checkbox"
                id={`subj-${s.value}`}
                checked={form.subjects.includes(s.labelRu)}
                onChange={() => toggleIn("subjects", s.labelRu)}
              />
              <label htmlFor={`subj-${s.value}`}>{t(s.labelKey, s.labelRu)}</label>
            </div>
          ))}
        </div>
      </>
    ),
    levels: (
      <>
        <h2>Уровни</h2>
        <div className="multi-select">
          {LEVELS.map((lv) => (
            <div key={lv} className="select-item">
              <input
                type="checkbox"
                id={`lvl-${lv}`}
                checked={form.levels.includes(lv)}
                onChange={() => toggleIn("levels", lv)}
              />
              <label htmlFor={`lvl-${lv}`}>{lv}</label>
            </div>
          ))}
        </div>
      </>
    ),
    languages: (
      <>
        <h2>{t("become_tutor.step_languages", "Languages")}</h2>
        <div className="multi-select">
          {LANGUAGES.map((l) => (
            <div key={l.value} className="select-item">
              <input
                type="checkbox"
                id={`lang-${l.value}`}
                checked={form.languages.includes(l.value)}
                onChange={() => toggleIn("languages", l.value)}
              />
              <label htmlFor={`lang-${l.value}`}>{t(l.labelKey, l.value)}</label>
            </div>
          ))}
        </div>
      </>
    ),
    about: (
      <>
        <h2>{t("become_tutor.step_about", "About you")}</h2>
        <div className="auth-form-field">
          <label htmlFor="bt-bio">{t("become_tutor.bio", "Short bio for students")}</label>
          <textarea
            id="bt-bio"
            rows={5}
            value={form.bio}
            onChange={(e) => set({ bio: e.target.value })}
            placeholder={t("become_tutor.bio_hint", "Tell students why they should learn with you...")}
          />
        </div>
      </>
    ),
    verification: (
      <>
        <h2>{t("become_tutor.step_verification", "Verification")}</h2>
        <p className="auth-form-hint">{t("become_tutor.verification_hint", "Your application will be reviewed by our team.")}</p>
      </>
    ),
    price: (
      <>
        <h2>Цена</h2>
        <div className="auth-form-field">
          <label htmlFor="bt-price">Цена за час (сом)</label>
          <input id="bt-price" type="number" min={0} value={form.price_per_hour} onChange={(e) => set({ price_per_hour: e.target.value })} placeholder="500" />
        </div>
      </>
    ),
    format: (
      <>
        <h2>Формат</h2>
        <div className="multi-select">
          {FORMATS.map((f) => (
            <div key={f} className="select-item">
              <input type="radio" id={`fmt-${f}`} name="format" checked={form.format === f} onChange={() => set({ format: f })} />
              <label htmlFor={`fmt-${f}`}>{f === "online" ? "Онлайн" : f === "offline" ? "Офлайн" : "Оба"}</label>
            </div>
          ))}
        </div>
      </>
    ),
    photo: (
      <>
        <h2>Фото</h2>
        <p className="auth-form-hint">Загрузите фото — его увидят ученики. Можно пропустить и добавить позже в профиле.</p>
        <div className="auth-form-field">
          <input type="file" accept="image/*" onChange={(e) => set({ photo: e.target.files?.[0]?.name ?? null })} />
          {form.photo && <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Выбрано: {form.photo}</p>}
        </div>
      </>
    ),
    preview: null,
    submit: null,
  };

  const currentKey = STEPS[step] as string;
  const isPreview = currentKey === "preview" || currentKey === "submit";

  // Sales landing — §11 Become Tutor (public)
  if (!showWizard) {
    return (
      <>
        <Navbar />
        <main id="main-content" style={{ maxWidth: 900, margin: "0 auto", padding: "calc(var(--header-height,64px) + 24px) var(--space-4) var(--space-8)" }}>
          <section style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-8)", textAlign: "center" }}>
            <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)", marginBottom: 12 }}>{t("become_tutor.title", "Стать репетитором")}</h1>
            <p style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-secondary)", marginBottom: 8 }}>
              {t("marketplace.become_sales1", "Ты студент?")}
            </p>
            <p style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-secondary)", marginBottom: 8 }}>
              {t("marketplace.become_sales2", "Хорошо знаешь предмет?")}
            </p>
            <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)", marginBottom: 24 }}>
              {t("marketplace.become_sales3", "Размести своё резюме и найди первых учеников.")}
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                if (!isAuthenticated) {
                  openAuth();
                  return;
                }
                setShowWizard(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{ minHeight: 48, padding: "12px 32px", fontSize: "var(--font-size-base)", fontWeight: 700 }}
            >
              {t("marketplace.create_resume", "Создать резюме")}
            </button>
            {!isAuthenticated && (
              <p className="auth-form-hint" style={{ marginTop: 16 }}>
                <Link to="/login" className="btn-link">{t("navbar.login", "Войти")}</Link>{" "}
                {t("become_tutor.login_first", "чтобы сохранить прогресс в вашем аккаунте")}
              </p>
            )}
          </section>

          <section style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <div className="card"><h3>1. Основная информация</h3><p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>Расскажи о себе — имя, телефон, город</p></div>
            <div className="card"><h3>2. Предметы и уровни</h3><p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>Математика, английский, ОРТ — что преподаёшь</p></div>
            <div className="card"><h3>3. Оплата и модерация</h3><p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>Цена, формат, фото → предпросмотр → на модерацию</p></div>
          </section>

          <p style={{ marginTop: 24, textAlign: "center" }}>
            <button type="button" className="btn-secondary" onClick={() => { if (isAuthenticated) setShowWizard(true); else openAuth(); }}>
              {t("common.next", "Далее")} → анкета репетитора
            </button>
          </p>
        </main>
      </>
    );
  }

  // Wizard — §12 (10 шагов)
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "calc(var(--header-height,64px) + 16px) var(--space-4) var(--space-8)" }}>
      <button type="button" className="btn-ghost" onClick={() => setShowWizard(false)} style={{ marginBottom: 12 }}>← {t("common.back", "Назад к описанию")}</button>
      <h1 style={{ fontSize: "var(--font-size-xl)", marginBottom: 8 }}>{t("become_tutor.title", "Стать репетитором")}</h1>
      <p style={{ color: "var(--color-text-secondary)", marginBottom: 16 }}>{t("marketplace.wizard_hint", "Шаги: основная → предметы → уровни → образование → опыт → цена → формат → фото → предпросмотр → модерация. Не одна огромная форма.")}</p>

      <div className="wizard-progress" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
        {STEPS.map((key, idx) => (
          <span key={key} className={`wizard-step-dot ${idx <= step ? "done" : ""}`} aria-label={key} style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: idx <= step ? "var(--color-primary)" : "var(--color-border)", marginRight: 4 }} />
        ))}
      </div>
      <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: 8 }}>Шаг {step + 1} из {STEPS.length}: {currentKey}</p>

      {!isPreview ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          style={{ maxWidth: 520, marginTop: 16 }}
        >
          {(stepContent as Record<string, JSX.Element>)[currentKey]}
          {error && <p className="auth-form-error" style={{ color: "var(--color-danger)", marginTop: 8 }}>{error}</p>}
          <div className="form-actions" style={{ marginTop: 16, display: "flex", gap: 8 }}>
            {step > 0 && (
              <button type="button" className="btn-secondary" onClick={back}>
                {t("common.back", "Back")}
              </button>
            )}
            <button type="submit" className="btn-primary">
              {t("common.next", "Next")}
            </button>
          </div>
        </form>
      ) : (
        <section style={{ maxWidth: 560, marginTop: 16 }}>
          <h2>{t("become_tutor.step_preview", "Предпросмотр")}</h2>
          <div className="booking-card" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: 16 }}>
            <div className="booking-info" style={{ display: "grid", gap: 8 }}>
              <p style={{ margin: 0 }}><strong>{form.full_name || (user?.full_name as string) || ""}</strong> — {form.location}</p>
              <p style={{ margin: 0 }}>{form.bio}</p>
              <p style={{ margin: 0 }}>{t("cr_course.experience_label", "Experience")}: {form.experience_years} • {t("become_tutor.education", "Education")}: {form.education}</p>
              <p style={{ margin: 0 }}>{t("course.subject", "Предметы")}: {form.subjects.join(", ") || "—"}</p>
              <p style={{ margin: 0 }}>Уровни: {form.levels.join(", ") || "—"}</p>
              <p style={{ margin: 0 }}>{t("become_tutor.languages", "Языки")}: {form.languages.join(", ") || "—"}</p>
              <p style={{ margin: 0 }}>Цена: {form.price_per_hour ? `${form.price_per_hour} KGS/час` : "—"} • Формат: {form.format}</p>
              {form.photo && <p style={{ margin: 0 }}>Фото: {form.photo}</p>}
            </div>
          </div>
          {error && <p className="auth-form-error" style={{ color: "var(--color-danger)", marginTop: 8 }}>{error}</p>}
          <div className="form-actions" style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={back}>
              {t("common.back", "Back")}
            </button>
            <button type="button" className="btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? t("common.sending", "Sending...") : t("marketplace.submit_moderation", "Отправить на модерацию")}
            </button>
          </div>
        </section>
      )}

      {!user && (
        <p className="auth-form-hint" style={{ marginTop: 16 }}>
          <Link to="/login" className="btn-link">{t("navbar.login", "Login")}</Link>{" "}
          {t("become_tutor.login_first", "to save your progress under your account")}
        </p>
      )}
    </div>
  );
}
