import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { tutorApi } from "../api/tutorApi";
import { Avatar } from "../../../components/ui/Avatar";
import { Spinner, ErrorState, EmptyState } from "../../../components/ui/Primitives";
import { useToast } from "../../../components/ui/Toast";
import useAuthStore from "../../../store/authStore";
import { useUIStore } from "../../../store/uiStore";
import useContactTutor from "../../../hooks/useContactTutor";
import ContactAuthSheet from "../../../components/ContactAuthSheet";
import { tutorTypeLabel, isStudentTutor } from "../../../constants/tutorTypes";
import { applyTutorSeo, clearTutorSeo } from "../../../utils/seo";
import { tutorSlug } from "../../../utils/slug";
import "../../../styles/TutorProfile.css";

function getField(tutor: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) if (tutor[k] != null && String(tutor[k]).trim() !== "") return String(tutor[k]);
  return "";
}

export default function TutorProfileMarketplace() {
  const { tutorId, slug, subject: subjectParam } = useParams() as Record<string, string | undefined>;
  const rawParam = slug || tutorId || subjectParam || "";
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useAuthStore();
  const { openAuth } = useUIStore();

  const [tutor, setTutor] = useState<Record<string, unknown> | null>(null);
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const paramForFetch = rawParam || "";

  const load = useCallback(async () => {
    if (!paramForFetch) { setError(t("tutor_profile.not_found", "Tutor not found") as string); setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const res = await tutorApi.bySlug(paramForFetch);
      if (res.response.ok) {
        const data = res.data as Record<string, unknown>;
        // backend may wrap in { tutor, user } or direct
        const tutorData = (data["tutor"] as Record<string, unknown> | undefined) ?? (data["user"] as Record<string, unknown> | undefined) ?? data;
        setTutor(tutorData);
        // try load courses for this tutor (optional, not waterfall blocking)
        try {
          const cr = await tutorApi.byId(String(tutorData["id"] ?? paramForFetch));
          // ignore if not courses; we already have tutorData; courses not essential
          void cr;
        } catch { /* ignore */ }
        // also try courses by teacher
        try {
          const { apiClient } = await import("../../../api/http");
          const { endpoints } = await import("../../../api/endpoints");
          const cr2 = await apiClient.get(endpoints.courses.byTeacher(String(tutorData["id"] ?? paramForFetch)), false);
          if (cr2.response.ok) {
            const d = cr2.data;
            const list = Array.isArray(d) ? d as unknown[] : (d as Record<string, unknown>)["content"] as unknown[] ?? [];
            setCourses(list as Record<string, unknown>[]);
          }
        } catch { /* ignore */ }
        // SEO
        const name = getField(tutorData, ["full_name","fullName","name"]) || "Репетитор";
        const subj = getField(tutorData, ["subject","subjects","main_subject"]).split(",")[0]?.trim() || subjectParam || "";
        const city = getField(tutorData, ["city","location"]);
        const bio = getField(tutorData, ["bio","about","description"]);
        const priceRaw = tutorData["price_per_hour"] ?? tutorData["price"] ?? tutorData["hourly_rate"];
        const price = typeof priceRaw === "number" ? priceRaw : priceRaw ? Number(priceRaw) : null;
        const avatar = getField(tutorData, ["avatar","avatar_url","avatarUrl","photoURL"]) || null;
        const slugVal = tutorSlug(tutorData);
        const typeRaw = getField(tutorData, ["tutor_type","tutorType","type"]);
        applyTutorSeo({ name, subject: subj || undefined, city: city || undefined, bio: bio || undefined, price: price != null && !Number.isNaN(price) ? price : null, currency: "KGS", avatar, slug: slugVal || String(tutorData["id"] ?? paramForFetch), tutorType: typeRaw || undefined });
      } else {
        const msg = (res.data as Record<string, unknown>)?.["message"] as string | undefined ?? (res.data as Record<string, unknown>)?.["error"] as string | undefined ?? t("tutor_profile.not_found", "Tutor not found");
        setError(String(msg));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [paramForFetch, t, toast, subjectParam]);

  useEffect(() => { void load(); return () => { clearTutorSeo(); }; }, [load]);

  const [contactOpen, setContactOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMsg, setContactMsg] = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const { contact: contactDirect, isLoading: contactLoading } = useContactTutor({ source: "tutor_profile" });

  const handleContact = async (): Promise<void> => {
    if (!tutor) return;
    const tutorId = String(tutor["userId"] ?? tutor["user_id"] ?? tutor["id"] ?? "");
    const res = await contactDirect(tutor as Record<string, unknown>);
    if (res && "needsAuth" in res && res.needsAuth) {
      setShowAuthSheet(true);
      return;
    }
    if (res && "needsAuth" in res && !res.needsAuth && "conversationId" in res) {
      // already navigated to chat via hook
      return;
    }
    // fallback to old TutorRequest modal for detailed request (Oставить заявку)
    if (!isAuthenticated) {
      setShowAuthSheet(true);
      return;
    }
    setContactOpen(true);
  };

  const submitContact = async (): Promise<void> => {
    if (!tutor) return;
    if (!contactName.trim() || !contactPhone.trim()) {
      toast.error(t("marketplace.contact_required", "Укажите имя и контакт") as string);
      return;
    }
    setContactSending(true);
    try {
      const profileId = String(tutor["id"] ?? tutor["profileId"] ?? paramForFetch);
      // 1) Create TutorRequest — marketplace flow (no Enrollment)
      const { tutorRequestsMarketplaceApi } = await import("../../../api/marketplace/tutorRequestsMarketplace.api");
      const { response, data } = await tutorRequestsMarketplaceApi.create({
        tutorProfileId: profileId,
        studentName: contactName.trim(),
        studentContact: contactPhone.trim(),
        message: contactMsg.trim() || undefined,
      });
      if (!response.ok) {
        const msg = (data as Record<string, unknown>)?.["message"] as string | undefined ?? (data as Record<string, unknown>)?.["error"] as string | undefined ?? t("errors.default", "Ошибка") as string;
        toast.error(msg);
        return;
      }
      const requestId = String((data as Record<string, unknown>)["id"] ?? "");
      // 2) Create or get Conversation for this TutorRequest (idempotent, unique request_id)
      let conversationId: string | null = null;
      if (requestId) {
        try {
          const { chatApi } = await import("../../../api/chat.api");
          const convRes = await chatApi.createOrGetConversationForRequest(requestId);
          if (convRes.response.ok) {
            const conv = convRes.data as unknown as Record<string, unknown>;
            conversationId = String(conv["id"] ?? "");
          }
        } catch {
          // ignore — will fallback to requests list
        }
      }
      toast.success(t("marketplace.request_sent", "Обращение отправлено!") as string);
      setContactOpen(false);
      if (conversationId) navigate(`/dashboard/requests/${conversationId}`);
      else if (requestId) navigate(`/dashboard/requests/${requestId}`); // fallback: requestId itself (ChatService will resolve)
      else navigate("/dashboard/requests");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setContactSending(false);
    }
  };

  if (loading) return <div className="tutor-profile-page"><Spinner label={t("common.loading", "Загрузка...")} /></div>;
  if (error) return <div className="tutor-profile-page"><ErrorState message={error} onRetry={load} /></div>;
  if (!tutor) return <div className="tutor-profile-page"><EmptyState title={t("tutor_profile.not_found", "Репетитор не найден")} hint={t("tutor_profile.not_found_hint", "Профиль не существует или снят с публикации.") as string} /></div>;

  const name = getField(tutor, ["full_name","fullName","name"]);
  const avatarSrc = getField(tutor, ["avatar","avatar_url","avatarUrl","photoURL"]) || null;
  const tutorTypeRaw = getField(tutor, ["tutor_type","tutorType","type","role"]);
  const tutorType = tutorTypeRaw ? tutorTypeLabel(tutorTypeRaw, t as (k:string, fb:string)=>string) : "";
  const isStudent = isStudentTutor(tutorTypeRaw);
  const subject = getField(tutor, ["subject","subjects","main_subject"]);
  const subjects = subject ? subject.split(",").map((s)=>s.trim()).filter(Boolean) : [];
  const levelsRaw = getField(tutor, ["levels","level"]);
  const levels = levelsRaw ? levelsRaw.split(",").map((s)=>s.trim()).filter(Boolean) : [];
  const city = getField(tutor, ["city","location"]);
  const format = getField(tutor, ["format","location_type","teaching_format"]);
  const priceRaw = tutor["price_per_hour"] ?? tutor["price"] ?? tutor["hourly_rate"];
  const price = priceRaw != null ? String(priceRaw) : "";
  const currency = getField(tutor, ["currency"]) || "KGS";
  const education = getField(tutor, ["education","university","degree"]);
  const university = getField(tutor, ["university","education_place"]);
  const experience = getField(tutor, ["experience","experience_years","experienceYears"]);
  const bio = getField(tutor, ["bio","about","description"]);
  const languagesRaw = getField(tutor, ["languages"]);
  const languages = languagesRaw ? languagesRaw.split(",").map((s)=>s.trim()).filter(Boolean) : [];
  const achievementsRaw = getField(tutor, ["achievements","certificates"]);
  const achievements = achievementsRaw ? achievementsRaw.split(",").map((s)=>s.trim()).filter(Boolean) : [];
  const verified = tutor["verification_status"] === "VERIFIED" || tutor["verified"] === true;

  return (
    <div className="tutor-profile-page">
      <div className="tutor-profile-container" style={{ maxWidth: 900, margin: "0 auto", padding: "var(--space-6) var(--space-4)" }}>
        {/* Breadcrumbs */}
        <nav className="breadcrumbs" aria-label={t("a11y.breadcrumb", "Breadcrumb")} style={{ padding: 0, marginBottom: 16 }}>
          <ol>
            <li><Link to="/">{t("search.breadcrumb_home", "Главная")}</Link></li>
            <li><Link to="/tutors">{t("search.breadcrumb_search", "Репетиторы")}</Link></li>
            {subject && <li><Link to={`/tutors?subject=${encodeURIComponent(subjects[0] ?? subject)}`}>{subjects[0] ?? subject}</Link></li>}
            <li aria-current="page">{name}</li>
          </ol>
        </nav>

        <div className="tutor-card-full" style={{ display: "flex", gap: 24, flexWrap: "wrap", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: 24 }}>
          <Avatar name={name} src={avatarSrc} alt={name} className="tutor-avatar" />
          <div className="tutor-info-full" style={{ flex: "1 1 320px", minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: "var(--font-size-2xl)" }}>{name}</h1>
            {verified && <span className="verified-badge" style={{ display: "inline-flex", marginTop: 6, background: "var(--color-success)", color: "#fff", padding: "2px 8px", borderRadius: "var(--radius-full)", fontSize: "var(--font-size-xs)" }}>✓ {t("tutor_profile.verified", "Проверенный репетитор")}</span>}
            {tutorType && (
              <div style={{ marginTop: 8 }}>
                <span style={{ background: isStudent ? "rgba(245,158,11,0.12)" : "var(--color-bg-secondary)", color: isStudent ? "#b45309" : "var(--color-text-secondary)", border: isStudent ? "1px solid #f59e0b" : "1px solid var(--color-border)", padding: "4px 10px", borderRadius: "var(--radius-full)", fontWeight: 600, fontSize: "var(--font-size-sm)" }}>
                  {tutorType}
                </span>
              </div>
            )}

            <div style={{ marginTop: 16, display: "grid", gap: 8, fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)" }}>
              {subjects.length > 0 && <p style={{ margin: 0 }}><strong>{t("profile.subjects", "Предметы")}:</strong> {subjects.join(", ")}</p>}
              {levels.length > 0 && <p style={{ margin: 0 }}><strong>Уровни:</strong> {levels.join(", ")}</p>}
              {city && <p style={{ margin: 0 }}><strong>{t("profile.location", "Город")}:</strong> {city}</p>}
              {format && <p style={{ margin: 0 }}><strong>Формат:</strong> {t(`search.${String(format).toLowerCase()}`, String(format))}</p>}
              {price && <p style={{ margin: 0 }}><strong>Цена:</strong> {price} {currency}/час</p>}
              {education && <p style={{ margin: 0 }}><strong>{t("profile.education", "Образование")}:</strong> {education}</p>}
              {university && <p style={{ margin: 0 }}><strong>ВУЗ:</strong> {university}</p>}
              {experience && <p style={{ margin: 0 }}><strong>{t("profile.experience", "Опыт")}:</strong> {experience} {t("profile.years", "лет")}</p>}
              {languages.length > 0 && <p style={{ margin: 0 }}><strong>Языки:</strong> {languages.join(", ")}</p>}
              {achievements.length > 0 && <p style={{ margin: 0 }}><strong>Достижения:</strong> {achievements.join(", ")}</p>}
            </div>

            {bio && <p className="tutor-bio" style={{ marginTop: 16, lineHeight: 1.6 }}>{bio}</p>}

            <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleContact}
                disabled={contactLoading}
                aria-busy={contactLoading}
                aria-label={`Связаться с репетитором ${name}`}
                style={{ minHeight: 48, padding: "12px 24px", fontWeight: 700, fontSize: "var(--font-size-base)", opacity: contactLoading ? 0.7 : 1 }}
              >
                {contactLoading ? t("chat.creating", "Создание чата...") as string : t("marketplace.contact_tutor", "Связаться")}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  if (!isAuthenticated) { setShowAuthSheet(true); return; }
                  setContactOpen(true);
                }}
                style={{ minHeight: 48, padding: "12px 20px" }}
              >
                {t("marketplace.leave_request", "Оставить заявку")}
              </button>
              <Link to="/tutors" className="btn-ghost" style={{ minHeight: 48, display: "inline-flex", alignItems: "center" }}>
                {t("common.back", "Назад")}
              </Link>
            </div>
            {/* sticky CTA for desktop */}
            <div
              className="tutor-profile-sticky-cta"
              style={{
                position: "sticky",
                top: 80,
                marginTop: 16,
                padding: 12,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                display: "none",
              }}
            >
              <button type="button" className="btn-primary" onClick={handleContact} disabled={contactLoading} style={{ width: "100%", minHeight: 44 }}>
                {contactLoading ? "Создание..." : "Связаться"}
              </button>
            </div>
          </div>
        </div>

        {courses.length > 0 && (
          <>
            <h2 style={{ marginTop: 32 }}>{t("tutor_profile.courses", "Курсы")}</h2>
            <div className="courses-grid">
              {courses.map((c) => (
                <div key={String(c["id"])} className="course-card" onClick={() => navigate(`/course/${c["id"]}`)} style={{ cursor: "pointer" }}>
                  <h3>{String(c["title"] ?? "")}</h3>
                  <p>{String(c["description"] ?? "").substring(0, 100)}...</p>
                  <div className="course-meta">
                    <span>{String(c["price_per_hour"] ?? "")} {String(c["currency"] || "KGS")}/час</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {/* Mobile sticky bottom CTA */}
      <div
        className="tutor-profile-mobile-sticky"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 16px",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          background: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          gap: 12,
          zIndex: 20,
        }}
      >
        <button
          type="button"
          className="btn-primary"
          onClick={handleContact}
          disabled={contactLoading}
          aria-label={`Связаться с ${name}`}
          style={{ flex: 1, minHeight: 48, fontWeight: 700 }}
        >
          {contactLoading ? "Создание..." : "Связаться"}
        </button>
      </div>

      <ContactAuthSheet isOpen={showAuthSheet} tutorName={name} onClose={() => setShowAuthSheet(false)} />

      {/* Marketplace contact modal — Найти → Открыть → Связаться → Создать обращение → Мои обращения */}
      {contactOpen && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={() => setContactOpen(false)}>
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{t("marketplace.contact_tutor", "Связаться с репетитором")} — {name}</h3>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <label style={{ display: "grid", gap: 6 }}><span>{t("marketplace.your_name", "Ваше имя")} *</span><input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Айбек" style={{ padding: 10, border: "1px solid var(--color-border)", borderRadius: 8 }} /></label>
              <label style={{ display: "grid", gap: 6 }}><span>{t("marketplace.your_contact", "Телефон или email")} *</span><input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+996 700 123 456" style={{ padding: 10, border: "1px solid var(--color-border)", borderRadius: 8 }} /></label>
              <label style={{ display: "grid", gap: 6 }}><span>{t("marketplace.message", "Сообщение")}</span><textarea value={contactMsg} onChange={(e) => setContactMsg(e.target.value)} rows={3} placeholder={t("marketplace.message_hint", "Здравствуйте! Ищу репетитора по математике для 9 класса...")} style={{ padding: 10, border: "1px solid var(--color-border)", borderRadius: 8 }} /></label>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "flex-end" }}>
              <button type="button" className="btn-secondary" onClick={() => setContactOpen(false)} disabled={contactSending}>{t("common.cancel", "Отмена")}</button>
              <button type="button" className="btn-primary" onClick={submitContact} disabled={contactSending}>{contactSending ? t("common.sending", "Отправка...") : t("marketplace.send_request", "Отправить обращение")}</button>
            </div>
            <p style={{ marginTop: 12, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{t("marketplace.request_hint", "Репетитор увидит ваше обращение в разделе Обращения.")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
