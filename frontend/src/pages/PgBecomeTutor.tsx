import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { User, Phone, MapPin, ArrowLeft, ArrowRight, Check } from "lucide-react";
import useAuthStore from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { tutorsApi } from "../api/tutors.api";
import { TUTOR_LANGUAGES as LANGUAGES } from "../constants/course";
import { MARKETPLACE_SUBJECTS, MARKETPLACE_CITIES } from "../constants/cities";
import PhotoDropzone from "../components/photo/PhotoDropzone";
import { apiClient } from "../api/http";
import "../styles/Dashboard.css";
import "../styles/AuthForms.css";
import "../styles/Wizard.css";
import "../components/photo/PhotoDropzone.css";
import "../components/photo/PhotoCropModal.css";

const STEPS = ["personal", "subjects", "levels", "education", "experience", "price", "format", "photo", "preview", "submit"] as const;
type StepKey = (typeof STEPS)[number];

const STEP_META: Record<StepKey, { title: string; desc?: string }> = {
  personal: { title: "Личные данные", desc: "Расскажите немного о себе. Эти данные помогут ученикам узнать вас лучше." },
  subjects: { title: "Предметы", desc: "Выберите предметы, которые преподаёте" },
  levels: { title: "Уровни", desc: "Выберите уровни, с которыми вы работаете." },
  education: { title: "Образование", desc: "Укажите ваше образование — это повышает доверие учеников." },
  experience: { title: "Опыт", desc: "Расскажите о преподавательском опыте." },
  price: { title: "Цена занятий", desc: "Укажите стоимость часа — можно изменить позже." },
  format: { title: "Формат занятий", desc: "Как вы проводите занятия?" },
  photo: { title: "Фото", desc: "Загрузите фото — его увидят ученики. Можно пропустить и добавить позже" },
  preview: { title: "Предпросмотр", desc: "Проверьте анкету перед отправкой на модерацию." },
  submit: { title: "Отправка", desc: "Ваша анкета готова к модерации." },
};

const LEVELS = ["Школьный", "ВУЗ", "Начинающий", "Продвинутый", "ОРТ"];
const FORMATS: { value: string; label: string }[] = [
  { value: "online", label: "Онлайн" },
  { value: "offline", label: "Офлайн" },
  { value: "both", label: "Оба" },
];

export default function PgBecomeTutor(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { openAuth } = useUIStore();

  const isAppCreate = location.pathname === "/app/resumes/new";
  const [showWizard, setShowWizard] = useState(isAppCreate);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [customSubject, setCustomSubject] = useState("");

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
  });

  const set = (patch: Record<string, unknown>) => setForm((prev) => ({ ...prev, ...patch }));
  const toggleIn = (field: "subjects" | "levels" | "languages", value: string) =>
    setForm((prev) => ({
      ...prev,
      [field]: (prev[field] as string[]).includes(value)
        ? (prev[field] as string[]).filter((v) => v !== value)
        : [...(prev[field] as string[]), value],
    }));

  const validateStep = (): string => {
    const key = STEPS[step] as StepKey;
    switch (key) {
      case "personal":
        if (!form.full_name.trim()) return t("become_tutor.error_name", "Укажите ФИО") as string;
        if (form.phone) {
          const digits = form.phone.replace(/\D/g, "");
          const withoutCountry = digits.startsWith("996") ? digits.slice(3) : digits;
          if (withoutCountry.length < 9) return "Укажите корректный телефон +996 XXX XXX XXX";
        }
        return "";
      case "subjects":
        return form.subjects.length > 0 ? "" : (t("become_tutor.error_subjects", "Выберите хотя бы один предмет") as string);
      case "price":
        if (form.price_per_hour && Number(form.price_per_hour) < 0) return t("cr_course.errors.price", "Укажите цену") as string;
        return "";
      default:
        return "";
    }
  };

  const next = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  };

  const handlePhotoChange = (file: File, previewUrl: string) => {
    setPhotoFile(file);
    setPhotoPreview(previewUrl);
    setPhotoUrl(previewUrl);
  };

  const handlePhotoRemove = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoUrl(null);
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
      // if photo was chosen in wizard, upload it now that TutorProfile exists (sync creates it)
      if (photoFile) {
        try {
          const fd = new FormData();
          fd.append("file", photoFile, photoFile.name);
          await apiClient.request("POST", "/api/v1/tutors/me/photo", fd as unknown as Record<string, unknown>);
        } catch (e) {
          // photo is optional — don't block navigation, user can add later
          console.warn("photo upload after submit failed", e);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["tutorProfile", "me"] });
      await queryClient.invalidateQueries({ queryKey: ["tutorApplication"] });
      await queryClient.invalidateQueries({ queryKey: ["tutorProfile"] });
      navigate("/app/resumes");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || (t("become_tutor.error_submit", "Не удалось отправить анкету") as string));
    } finally {
      setSubmitting(false);
    }
  };

  const currentKey = STEPS[step] as StepKey;
  const meta = STEP_META[currentKey];
  const isPreview = currentKey === "preview" || currentKey === "submit";

  // Sales landing — public, PublicLayout already provides header (§11)
  if (!showWizard) {
    return (
      <main id="main-content" style={{ maxWidth: 900, margin: "0 auto", padding: "24px var(--space-4) var(--space-8)" }}>
          <section style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-8)", textAlign: "center" }}>
            <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)", marginBottom: 12 }}>{t("become_tutor.title", "Стать репетитором")}</h1>
            <p style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-secondary)", marginBottom: 8 }}>{t("marketplace.become_sales1", "Ты студент?")}</p>
            <p style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-secondary)", marginBottom: 8 }}>{t("marketplace.become_sales2", "Хорошо знаешь предмет?")}</p>
            <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)", marginBottom: 24 }}>{t("marketplace.become_sales3", "Размести своё резюме и найди первых учеников.")}</p>
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
                <Link to="/login" className="btn-link">{t("navbar.login", "Войти")}</Link> {t("become_tutor.login_first", "чтобы сохранить прогресс в вашем аккаунте")}
              </p>
            )}
          </section>
          <section style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <div className="card"><h3>1. Основная информация</h3><p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>Расскажи о себе — имя, телефон, город</p></div>
            <div className="card"><h3>2. Предметы и уровни</h3><p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>Математика, английский, ОРТ — что преподаёшь</p></div>
            <div className="card"><h3>3. Оплата и модерация</h3><p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>Цена, формат, фото → предпросмотр → на модерацию</p></div>
          </section>
          <p style={{ marginTop: 24, textAlign: "center" }}>
            <button type="button" className="btn-secondary" onClick={() => { if (isAuthenticated) setShowWizard(true); else openAuth(); }}>{t("common.next", "Далее")} → анкета репетитора</button>
          </p>
        </main>
    );
  }

  // Wizard shell — matches Image 1 / Image 2 — расширен для предметов
  return (
    <div className={`wizard-page ${currentKey === "subjects" ? "wizard-page--wide" : ""}`}>
      <button type="button" onClick={() => (isAppCreate ? navigate("/app/resumes") : setShowWizard(false))} className="wizard-back">
        <ArrowLeft size={18} /> Назад
      </button>
      <h1 className="wizard-title">{t("become_tutor.title", "Стать репетитором")}</h1>
      <div className="wizard-dots" aria-hidden>
        {STEPS.map((key, idx) => (
          <span key={key} className={`wizard-dot ${idx <= step ? "active" : ""}`} />
        ))}
      </div>
      <p className="wizard-step-label">
        Шаг {step + 1} из {STEPS.length} · <strong>{meta.title}</strong>
      </p>

      {!isPreview ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          <div className="wizard-card">
            <h2 className="wizard-card-title">{meta.title}</h2>
            {meta.desc && <p className="wizard-card-desc">{meta.desc}</p>}

            {currentKey === "personal" && (
              <div className="wizard-fields">
                <div className="wizard-field">
                  <label htmlFor="bt-full_name">ФИО</label>
                  <div className="wizard-field-row">
                    <span className="wizard-field-icon"><User size={18} /></span>
                    <input
                      id="bt-full_name"
                      type="text"
                      placeholder="Например, Асан Усенов"
                      value={form.full_name}
                      onChange={(e) => set({ full_name: e.target.value })}
                      autoComplete="name"
                    />
                  </div>
                </div>
                <div className="wizard-field">
                  <label htmlFor="bt-phone">Телефон</label>
                  <div className="wizard-field-row">
                    <span className="wizard-field-icon"><Phone size={18} /></span>
                    <input
                      id="bt-phone"
                      type="tel"
                      placeholder="+996 (___) ___-___"
                      value={form.phone}
                      onChange={(e) => {
                        let v = e.target.value.replace(/[^0-9+]/g, "");
                        if (!v.startsWith("+996")) {
                          if (v.startsWith("996")) v = "+" + v;
                          else if (v.startsWith("0")) v = "+996" + v.slice(1);
                          else if (!v.startsWith("+")) v = "+996 " + v.replace(/^\+?996/, "");
                        }
                        set({ phone: v });
                      }}
                      inputMode="tel"
                    />
                  </div>
                </div>
                <div className="wizard-field">
                  <label htmlFor="bt-location">Местоположение</label>
                  <div className="wizard-field-row">
                    <span className="wizard-field-icon"><MapPin size={18} /></span>
                    <select
                      id="bt-location"
                      value={form.location}
                      onChange={(e) => set({ location: e.target.value })}
                    >
                      <option value="">Выберите ваш город или регион</option>
                      {MARKETPLACE_CITIES.map((c) => (
                        <option key={c.value} value={c.labelRu}>{c.labelRu}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {currentKey === "subjects" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                  Выберите предметы, которые вы преподаёте. Можно выбрать несколько. Если вашего предмета нет в списке — добавьте свой.
                </p>
                <div className="wizard-options-grid wizard-options-grid--expanded">
                  {MARKETPLACE_SUBJECTS.map((s) => {
                    const selected = form.subjects.includes(s.labelRu);
                    return (
                      <label key={s.value} className={`wizard-option ${selected ? "active" : ""}`}>
                        <input type="checkbox" checked={selected} onChange={() => toggleIn("subjects", s.labelRu)} />
                        <span>{t(s.labelKey, s.labelRu)}</span>
                      </label>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                  <input
                    type="text"
                    placeholder="Свой предмет, например: Дизайн"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const v = customSubject.trim();
                        if (v && !form.subjects.includes(v)) {
                          setForm((prev) => ({ ...prev, subjects: [...prev.subjects, v] }));
                          setCustomSubject("");
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "12px 14px",
                      border: "1.5px solid var(--color-border, #E5E9F0)",
                      borderRadius: 12,
                      fontSize: 15,
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = customSubject.trim();
                      if (v && !form.subjects.includes(v)) {
                        setForm((prev) => ({ ...prev, subjects: [...prev.subjects, v] }));
                        setCustomSubject("");
                      }
                    }}
                    className="wizard-btn wizard-btn-secondary"
                    style={{ minHeight: 44, padding: "0 18px", whiteSpace: "nowrap" }}
                  >
                    Добавить
                  </button>
                </div>
                {form.subjects.filter((s) => !MARKETPLACE_SUBJECTS.some((m) => m.labelRu === s)).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {form.subjects
                      .filter((s) => !MARKETPLACE_SUBJECTS.some((m) => m.labelRu === s))
                      .map((s) => (
                        <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 9999, background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8", fontSize: 13 }}>
                          {s}
                          <button type="button" onClick={() => toggleIn("subjects", s)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1D4ED8", fontWeight: 700 }}>×</button>
                        </span>
                      ))}
                  </div>
                )}
              </div>
            )}

            {currentKey === "levels" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {LEVELS.map((lv) => {
                  const selected = form.levels.includes(lv);
                  return (
                    <label key={lv} className={`wizard-option ${selected ? "active" : ""}`} style={{ borderRadius: 12 }}>
                      <input type="checkbox" checked={selected} onChange={() => toggleIn("levels", lv)} />
                      <span>{lv}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {currentKey === "education" && (
              <div className="wizard-fields">
                <div>
                  <label htmlFor="bt-education" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6, display: "block" }}>Образование</label>
                  <textarea
                    id="bt-education"
                    className="wizard-textarea"
                    rows={3}
                    value={form.education}
                    onChange={(e) => set({ education: e.target.value })}
                    placeholder="Например: КРСУ, Математика, 2018-2022"
                  />
                </div>
              </div>
            )}

            {currentKey === "experience" && (
              <div className="wizard-fields">
                <div className="wizard-field">
                  <label htmlFor="bt-exp-years">Опыт (лет)</label>
                  <div className="wizard-field-row">
                    <input id="bt-exp-years" type="number" min={0} max={80} value={form.experience_years} onChange={(e) => set({ experience_years: Number(e.target.value) || 0 })} placeholder="0" />
                  </div>
                </div>
                <div>
                  <label htmlFor="bt-exp-desc" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6, display: "block" }}>О себе</label>
                  <textarea
                    id="bt-exp-desc"
                    className="wizard-textarea"
                    rows={4}
                    value={form.experience_description}
                    onChange={(e) => set({ experience_description: e.target.value })}
                    placeholder="Расскажите о вашем опыте преподавания"
                  />
                </div>
                <div>
                  <label htmlFor="bt-bio" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6, display: "block" }}>Кратко о себе для учеников</label>
                  <textarea
                    id="bt-bio"
                    className="wizard-textarea"
                    rows={3}
                    value={form.bio}
                    onChange={(e) => set({ bio: e.target.value })}
                    placeholder="Почему стоит заниматься именно с вами..."
                  />
                </div>
              </div>
            )}

            {currentKey === "price" && (
              <div className="wizard-fields">
                <div className="wizard-field">
                  <label htmlFor="bt-price">Цена за час (сом)</label>
                  <div className="wizard-field-row">
                    <input id="bt-price" type="number" min={0} value={form.price_per_hour} onChange={(e) => set({ price_per_hour: e.target.value })} placeholder="500" />
                    <span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>KGS</span>
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.4 }}>Укажите среднюю стоимость одного часа. Можно изменить позже в резюме.</p>
                </div>
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", marginBottom: 4 }}>На каких языках вы преподаёте?</div>
                  <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                    Ученики смогут фильтровать репетиторов по языку преподавания. Выберите все языки, на которых вы ведёте занятия.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {LANGUAGES.map((l) => (
                      <label key={l.value} className={`wizard-option ${form.languages.includes(l.value) ? "active" : ""}`} style={{ flex: "1 1 140px" }}>
                        <input type="checkbox" checked={form.languages.includes(l.value)} onChange={() => toggleIn("languages", l.value)} />
                        <span>{t(l.labelKey, l.value)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentKey === "format" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {FORMATS.map((f) => (
                  <label key={f.value} className={`wizard-option ${form.format === f.value ? "active" : ""}`} style={{ borderRadius: 12 }}>
                    <input type="radio" name="format" checked={form.format === f.value} onChange={() => set({ format: f.value })} />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
            )}

            {currentKey === "photo" && (
              <div>
                <PhotoDropzone
                  value={photoPreview || photoUrl}
                  onChange={handlePhotoChange}
                  onRemove={photoPreview || photoUrl ? handlePhotoRemove : undefined}
                />
                <p style={{ marginTop: 12, fontSize: 13, color: "var(--color-text-muted)", textAlign: "center" }}>
                  Можно пропустить — фото добавите позже в профиле
                </p>
              </div>
            )}

            {error && <p className="wizard-error" role="alert">{error}</p>}

            <div className="wizard-actions">
              <button type="button" onClick={back} className="wizard-btn wizard-btn-secondary">
                <ArrowLeft size={18} /> Назад
              </button>
              <button type="submit" className="wizard-btn wizard-btn-primary">
                Далее <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </form>
      ) : currentKey === "preview" ? (
        <div className="wizard-card">
          <h2 className="wizard-card-title">Предпросмотр</h2>
          <p className="wizard-card-desc">Так увидят ваше резюме ученики.</p>
          <div className="wizard-preview-card">
            { (photoPreview || photoUrl) && (
              <img loading="lazy" decoding="async" src={(photoPreview || photoUrl) as string} alt="Фото" style={{ width: 96, height: 96, borderRadius: 16, objectFit: "cover", border: "1px solid var(--color-border)" }} />
            )}
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{form.full_name || (user?.full_name as string) || "—"} {form.location ? `· ${form.location}` : ""}</p>
            {form.bio && <p style={{ margin: 0, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{form.bio}</p>}
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-secondary)" }}>Опыт: {form.experience_years} • Образование: {form.education || "—"}</p>
            <p style={{ margin: 0, fontSize: 14 }}>Предметы: {form.subjects.join(", ") || "—"}</p>
            <p style={{ margin: 0, fontSize: 14 }}>Уровни: {form.levels.join(", ") || "—"}</p>
            <p style={{ margin: 0, fontSize: 14 }}>Языки: {form.languages.join(", ") || "—"}</p>
            <p style={{ margin: 0, fontSize: 14 }}>Цена: {form.price_per_hour ? `${form.price_per_hour} KGS/час` : "—"} · Формат: {form.format}</p>
          </div>
          {error && <p className="wizard-error" role="alert">{error}</p>}
          <div className="wizard-actions">
            <button type="button" className="wizard-btn wizard-btn-secondary" onClick={back}>
              <ArrowLeft size={18} /> Назад
            </button>
            <button type="button" className="wizard-btn wizard-btn-primary" onClick={() => setStep(STEPS.indexOf("submit"))}>
              Далее <ArrowRight size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="wizard-card" style={{ textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 9999, background: "#EFF6FF", color: "#2563EB", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Check size={32} />
          </div>
          <h2 className="wizard-card-title" style={{ textAlign: "center" }}>Готово к отправке</h2>
          <p className="wizard-card-desc" style={{ textAlign: "center" }}>Анкета будет проверена модератором. Обычно это занимает до 24 часов.</p>
          {error && <p className="wizard-error" role="alert">{error}</p>}
          <div className="wizard-actions">
            <button type="button" className="wizard-btn wizard-btn-secondary" onClick={back}>
              <ArrowLeft size={18} /> Назад
            </button>
            <button type="button" className="wizard-btn wizard-btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? "Отправка..." : "Отправить на модерацию"}
            </button>
          </div>
        </div>
      )}

      {!user && (
        <p className="auth-form-hint" style={{ marginTop: 16, textAlign: "center" }}>
          <Link to="/login" className="btn-link">{t("navbar.login", "Войти")}</Link> {t("become_tutor.login_first", "чтобы сохранить прогресс")}
        </p>
      )}
    </div>
  );
}
