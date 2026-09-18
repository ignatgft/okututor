// migrated to TSX — minimal strict types (controlled)
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../components/pageTitleContext";
import { adminApi } from "../api/admin.api";
import ConfirmModal from "../components/ui/ConfirmModal";
import ReasonModal from "../components/ui/ReasonModal";
import { Spinner, EmptyState, ErrorState } from "../components/ui/Primitives";
import { useToast } from "../components/ui/Toast";
import "../styles/Admin.css";

function ApplicationDrawer({ application, onClose }: { application: Record<string, unknown>; onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [chatLoading, setChatLoading] = useState(false);

  const handleChat = async () => {
    const a = application;
    const userId = String(a["user_id"] || a["userId"] || (a["user"] as Record<string, unknown>)?.["id"] || a["id"] || "");
    if (!userId) {
      navigate("/conversations");
      return;
    }
    setChatLoading(true);
    try {
      const { apiClient } = await import("../api/http");
      // Try to create or get direct conversation with the applicant
      const { response, data } = await apiClient.post("/api/v1/conversations/direct", { participantId: userId });
      if (response.ok && data && (data as Record<string, unknown>)["id"]) {
        const convId = String((data as Record<string, unknown>)["id"]);
        navigate(`/conversations/${convId}`);
        onClose();
      } else {
        // Fallback to conversations list filtered by user
        navigate(`/conversations?userId=${userId}`);
        onClose();
      }
    } catch {
      navigate("/conversations");
      onClose();
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="admin-drawer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="admin-drawer" role="dialog" aria-modal="true" aria-label={t("admin.application_detail", "Application details")} style={{ width: "min(520px, 96vw)", maxWidth: 520 }}>
        <div className="admin-drawer-header">
          <h2>{t("admin.application_detail", "Application details")}</h2>
          <button type="button" className="admin-drawer-close" onClick={onClose} aria-label={t("common.close", "Close")}>
            ✕
          </button>
        </div>

        <div className="admin-drawer-body" style={{ padding: 16, overflowY: "auto", display: "grid", gap: 16 }}>
          {/* Full resume card — all tutor data */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, overflow: "hidden" }}>
            {(() => {
              const s = application as Record<string, unknown>;
              const get = (keys: string[]) => {
                for (const k of keys) if (s[k] != null && String(s[k]).trim() !== "") return s[k];
                return null;
              };
              const firstName = String(get(["firstName","first_name"]) ?? (String(s["full_name"]||"").split(" ")[0]||"")).trim();
              const lastName = String(get(["lastName","last_name"]) ?? String(s["full_name"]||"").split(" ").slice(1).join(" ") ?? "").trim();
              const fullName = `${firstName} ${lastName}`.trim() || String(s["full_name"]||s["slug"]||"—");
              const avatar = (s["photoUrl"] as string) || (s["photo_url"] as string) || (s["avatar"] as string) || null;
              const city = ((s["city"] as Record<string, unknown>)?.["nameRu"] as string) || ((s["city"] as Record<string, unknown>)?.["slug"] as string) || s["location"] || "";
              const district = ((s["district"] as Record<string, unknown>)?.["nameRu"] as string) || "";
              const subjects = Array.isArray(s["subjects"]) ? (s["subjects"] as unknown[]).map(x=> typeof x==="string"?x:((x as Record<string, unknown>)["nameRu"] as string)||((x as Record<string, unknown>)["slug"] as string)).join(", ") : String(s["subjects"]||"—");
              const levels = Array.isArray(s["levels"]) ? (s["levels"] as unknown[]).map(x=> typeof x==="string"?x:((x as Record<string, unknown>)["nameRu"] as string)||((x as Record<string, unknown>)["slug"] as string)).join(", ") : (s["levels"]? String(s["levels"]) : "—");
              const langs = Array.isArray(s["languages"]) ? (s["languages"] as unknown[]).join(", ") : String(s["languages"]||"—");
              const views = s["viewsCount"] ?? s["views_count"] ?? 0;
              const rating = s["rating"] ?? 0;
              const reviews = s["reviewsCount"] ?? s["reviews_count"] ?? 0;
              const priceFrom = s["priceFrom"] ?? s["price_from"] ?? s["price"] ?? "—";
              const priceTo = s["priceTo"] ?? s["price_to"] ?? "";
              const favCount = (s["favoritesCount"] ?? s["favorites_count"] ?? "—");
              return (
                <>
                  <div style={{ padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 72, height: 72, borderRadius: 16, overflow: "hidden", background: "var(--color-bg-secondary)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, color: "var(--color-primary)", border: "1px solid var(--color-border)" }}>
                      {avatar ? <img loading="lazy" decoding="async" src={String(avatar)} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : fullName.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: "var(--color-text)", lineHeight: 1.2 }}>{fullName}</div>
                      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>{s["title"] as string || "—"}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span> {String(views)} просмотров</span>
                        <span> {String(favCount)} в избранном</span>
                        <span>★ {String(rating)} ({String(reviews)} отзывов)</span>
                        {(s["isVerified"] || s["is_verified"]) && <span style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)", padding: "2px 6px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>✓ Подтверждён</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>{s["email"] as string || ((s["user"] as Record<string, unknown>)?.["email"] as string) || ""} {s["phone"] ? `· ${s["phone"]}` : ""}</div>
                    </div>
                    <span style={{ padding: "6px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: String(s["status"])==="PUBLISHED"?"var(--color-success-soft)":"var(--color-warning-soft)", color: String(s["status"])==="PUBLISHED"?"var(--color-success)":"var(--color-warning)", border: "1px solid var(--color-border)" }}>{String(s["status"]||"")}</span>
                  </div>
                  <div style={{ padding: "0 16px 12px", display: "grid", gap: 10, fontSize: 13 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div><span style={{ color: "var(--color-text-muted)" }}>Город:</span> <strong>{city || "—"}{district ? `, ${district}` : ""}</strong></div>
                      <div><span style={{ color: "var(--color-text-muted)" }}>Тип:</span> <strong>{String(s["tutorType"]||s["tutor_type"]||"—")}</strong></div>
                      <div><span style={{ color: "var(--color-text-muted)" }}>Опыт:</span> <strong>{String(s["experienceYears"]||s["experience_years"]||"—")} лет</strong></div>
                      <div><span style={{ color: "var(--color-text-muted)" }}>Формат:</span> <strong>{s["online"] && s["offline"] ? "Очно / Онлайн" : s["online"] ? "Онлайн" : s["offline"] ? "Очно" : "—"}</strong></div>
                      <div><span style={{ color: "var(--color-text-muted)" }}>Ставка:</span> <strong>{String(priceFrom)}{priceTo ? `–${priceTo}` : ""} {(s["currency"] as string)||"KGS"}/час</strong></div>
                      <div><span style={{ color: "var(--color-text-muted)" }}>Телефон:</span> <strong>{String(s["phone"]||"—")}</strong></div>
                    </div>
                    <div><span style={{ color: "var(--color-text-muted)" }}>Предметы:</span> <strong>{subjects}</strong></div>
                    <div><span style={{ color: "var(--color-text-muted)" }}>Уровни:</span> <strong>{levels}</strong></div>
                    <div><span style={{ color: "var(--color-text-muted)" }}>Языки:</span> <strong>{langs}</strong></div>
                    {(s["shortDescription"] || s["short_description"]) && <div><span style={{ color: "var(--color-text-muted)" }}>Кратко:</span> <span>{String(s["shortDescription"]||s["short_description"])}</span></div>}
                    {(s["about"] || s["bio"]) && <div><span style={{ color: "var(--color-text-muted)" }}>О себе:</span> <span style={{ whiteSpace: "pre-wrap" }}>{String(s["about"]||s["bio"]).slice(0,600)}</span></div>}
                    {(s["education"] || s["university"]) && <div><span style={{ color: "var(--color-text-muted)" }}>Образование:</span> <strong>{String(s["education"]||"")}{s["university"]?` — ${s["university"]}`:""}{s["educationDetails"]||s["education_details"]?` (${s["educationDetails"]||s["education_details"]})`:""}</strong></div>}
                    {Array.isArray(s["achievements"]) && (s["achievements"] as unknown[]).length>0 && <div><span style={{ color: "var(--color-text-muted)" }}>Достижения:</span> <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>{(s["achievements"] as unknown[]).slice(0,4).map((a,i)=><li key={i} style={{ marginBottom: 2 }}>{String(a)}</li>)}</ul></div>}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, color: "var(--color-text-muted)", borderTop: "1px solid var(--color-border)", paddingTop: 8, marginTop: 4 }}>
                      <span>Создано: {s["createdAt"]||s["created_at"] ? new Date(String(s["createdAt"]||s["created_at"])).toLocaleDateString() : "—"}</span>
                      <span>Обновлено: {s["updatedAt"]||s["updated_at"] ? new Date(String(s["updatedAt"]||s["updated_at"])).toLocaleDateString() : "—"}</span>
                      <span>Опубликовано: {s["publishedAt"]||s["published_at"] ? new Date(String(s["publishedAt"]||s["published_at"])).toLocaleDateString() : "—"}</span>
                      <span>Истекает: {s["expiresAt"]||s["expires_at"] ? new Date(String(s["expiresAt"]||s["expires_at"])).toLocaleDateString() : "—"}</span>
                    </div>
                    {(s["rejectionReason"]||s["rejection_reason"]) && <div style={{ background: "var(--color-danger-soft)", border: "1px solid var(--color-danger)", color: "var(--color-danger)", padding: 8, borderRadius: 8 }}><strong>Причина отклонения:</strong> {String(s["rejectionReason"]||s["rejection_reason"])}</div>}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        <div className="admin-drawer-actions" style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleChat}
            disabled={chatLoading}
            style={{ flex: 1 }}
          >
            {chatLoading ? t("common.loading", "Загрузка...") : t("admin.chat_with_applicant", "Чат с заявителем")}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
            {t("common.close", "Закрыть")}
          </button>
        </div>
      </aside>
    </div>
  );
}

// helpers for initials and colors matching the design
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function avatarBg(name: string): string {
  const palette = [
    { bg: "#FFE4B5", color: "#9A6A00" }, // AM peach
    { bg: "#EDE9FE", color: "#6D28D9" }, // ЭА purple
    { bg: "#DBEAFE", color: "#1D4ED8" }, // НУ blue
    { bg: "#D1FAE5", color: "#065F46" }, // ДС mint
    { bg: "#FFE4C4", color: "#9A3412" }, // БК peach
    { bg: "#E0E7FF", color: "#3730A3" }, // МТ indigo
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % palette.length;
  return `background:${palette[hash].bg};color:${palette[hash].color}`;
}

function subjectBadgeStyle(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("математ") || s.includes("math")) return "background:var(--color-primary-soft);color:var(--color-primary);border:1px solid var(--color-border)";
  if (s.includes("орт") || s.includes("ort")) return "background:var(--color-info-soft);color:var(--color-info);border:1px solid var(--color-border)";
  if (s.includes("англий") || s.includes("english")) return "background:var(--color-success-soft);color:var(--color-success);border:1px solid var(--color-border)";
  if (s.includes("физик") || s.includes("phys")) return "background:var(--color-warning-soft);color:var(--color-warning);border:1px solid var(--color-border)";
  if (s.includes("истори")) return "background:var(--color-info-soft);color:var(--color-info);border:1px solid var(--color-border)";
  if (s.includes("биолог")) return "background:var(--color-danger-soft);color:var(--color-danger);border:1px solid var(--color-border)";
  if (s.includes("хими")) return "background:var(--color-info-soft);color:var(--color-primary);border:1px solid var(--color-border)";
  if (s.includes("информат") || s.includes("inform")) return "background:var(--color-info-soft);color:var(--color-info);border:1px solid var(--color-border)";
  return "background:var(--color-surface-hover);color:var(--color-text-secondary);border:1px solid var(--color-border)";
}

function statusBadge(status: string): { bg: string; dot: string; label: string } {
  const s = String(status).toUpperCase();
  if (s === "PUBLISHED" || s === "APPROVED") return { bg: "background:var(--color-success-soft);color:var(--color-success);border:1px solid var(--color-border)", dot: "var(--color-success)", label: "PUBLISHED" };
  if (s === "PENDING_MODERATION" || s === "PENDING")
    return { bg: "background:var(--color-warning-soft);color:var(--color-warning);border:1px solid var(--color-border)", dot: "var(--color-warning)", label: "PENDING_MODERATION" };
  if (s === "REJECTED") return { bg: "background:var(--color-danger-soft);color:var(--color-danger);border:1px solid var(--color-border)", dot: "var(--color-danger)", label: "REJECTED" };
  if (s === "SUSPENDED") return { bg: "background:var(--color-danger-soft);color:var(--color-danger);border:1px solid var(--color-border)", dot: "var(--color-danger)", label: "SUSPENDED" };
  if (s === "DRAFT") return { bg: "background:var(--color-surface-hover);color:var(--color-text-secondary);border:1px solid var(--color-border)", dot: "var(--color-text-muted)", label: "DRAFT" };
  if (s === "EXPIRED") return { bg: "background:var(--color-danger-soft);color:var(--color-danger);border:1px solid var(--color-border)", dot: "var(--color-danger)", label: "EXPIRED" };
  if (s === "HIDDEN") return { bg: "background:var(--color-surface-hover);color:var(--color-text-secondary);border:1px solid var(--color-border)", dot: "var(--color-text-muted)", label: "HIDDEN" };
  if (s === "ARCHIVED") return { bg: "background:var(--color-surface-hover);color:var(--color-text-secondary);border:1px solid var(--color-border)", dot: "var(--color-text-muted)", label: "ARCHIVED" };
  return { bg: "background:var(--color-surface-hover);color:var(--color-text-secondary);border:1px solid var(--color-border)", dot: "var(--color-text-muted)", label: s };
}

export default function PgAdminTutors() {
  const { t } = useTranslation();
  const setPageTitle = usePageTitle();
  const toast = useToast();
  const [applications, setApplications] = useState<Record<string, unknown>[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approveTarget, setApproveTarget] = useState<Record<string, unknown> | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Record<string, unknown> | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let queryStatus = statusFilter;
      if (queryStatus === "PENDING") queryStatus = "PENDING_MODERATION";
      // Use new tutor-profiles endpoint when searching or for new statuses, fallback to legacy
      const useNewApi = debouncedQuery || ["EXPIRED","HIDDEN","ARCHIVED","PUBLISHED","DRAFT","PENDING_MODERATION","REJECTED","SUSPENDED"].includes(queryStatus);
      if (useNewApi) {
        const { response, data } = await adminApi.tutorProfiles(queryStatus, debouncedQuery);
        if (response.ok) {
          const content = (data as Record<string, unknown>)["content"] ?? [];
          // Map new API shape (TutorProfileResponse) to legacy display if needed
          setApplications(Array.isArray(content) ? content as Record<string, unknown>[] : Array.isArray(data) ? data as Record<string, unknown>[] : []);
        } else {
          setError(String((data as Record<string, unknown>)["message"] ?? (data as Record<string, unknown>)["error"] ?? t("common.error")));
        }
      } else {
        const { response, data } = await adminApi.tutorApplications(queryStatus);
        if (response.ok) {
          setApplications(Array.isArray(data) ? data as Record<string, unknown>[] : (data as Record<string, unknown>)["content"] as Record<string, unknown>[] ?? []);
        } else {
          setError(String((data as Record<string, unknown>)["message"] ?? (data as Record<string, unknown>)["error"] ?? t("common.error")));
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedQuery, t]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async () => {
    if (!approveTarget) return;
    setActionLoading(true);
    try {
      await adminApi.approveTutor(approveTarget.id);
      toast.success(t("admin.tutor_approved", "Tutor approved successfully"));
      setApproveTarget(null);
      await load();
    } catch (e) {
      toast.error(e.message || t("errors.default", "Something went wrong."));
    } finally {
      setActionLoading(false);
    }
  };

  const reject = async (reason) => {
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      await adminApi.rejectTutor(rejectTarget.id, reason);
      toast.success(t("admin.tutor_rejected", "Tutor application rejected"));
      setRejectTarget(null);
      await load();
    } catch (e) {
      toast.error(e.message || t("errors.default", "Something went wrong."));
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => { setPageTitle(t("admin.tutor_applications", "Tutor applications")); }, [setPageTitle, t]);

  const statusTabs: [string, string][] = [
    ["", t("dashboard.all", "All")],
    ["PENDING", t("admin.awaiting_response", "Ожидает ответа")],
    ["PUBLISHED", t("admin.published", "Опубликовано")],
    ["REJECTED", t("admin.rejected", "Отклонено")],
    ["SUSPENDED", t("admin.suspended", "Приостановлено")],
    ["DRAFT", t("statuses.DRAFT", "Черновик")],
    ["PENDING_MODERATION", t("admin.pending", "На рассмотрении")],
    ["EXPIRED", t("statuses.EXPIRED", "Истекло")],
    ["HIDDEN", t("statuses.HIDDEN", "Скрыто")],
    ["ARCHIVED", t("statuses.ARCHIVED", "Архив")],
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 0 24px" }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--color-text)" }}>{t("admin.tutor_applications", "Заявки репетиторов")}</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>{t("admin.tutors_subtitle", "Управление заявками на регистрацию репетиторов")}</p>
      </div>

      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="search"
          placeholder={t("admin.search_tutors", "Поиск по имени, предмету, городу")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 200, maxWidth: 360, padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", background: "var(--color-surface)", minHeight: "var(--touch-target)" }}
        />
        {debouncedQuery && <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>{applications.length} {t("common.results", "результатов")}</span>}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {statusTabs.map(([value, label]) => {
          const active = statusFilter === value;
          return (
            <button
              key={value || "all"}
              type="button"
              onClick={() => setStatusFilter(value)}
              style={{
                height: 32,
                padding: "0 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                border: active ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                background: active ? "var(--color-primary)" : "var(--color-surface)",
                color: active ? "var(--color-primary-foreground)" : "var(--color-text-secondary)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        {loading ? (
          <div style={{ padding: 24 }}><Spinner label={t("common.loading")} /></div>
        ) : error ? (
          <div style={{ padding: 24 }}><ErrorState message={error} onRetry={load} /></div>
        ) : applications.length === 0 ? (
          <div style={{ padding: 24 }}><EmptyState title={t("admin.no_applications", "No applications found")} /></div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.3, whiteSpace: "nowrap" }}>{t("admin.name", "Имя")}</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.3, whiteSpace: "nowrap" }}>{t("admin.email", "Эл. почта")}</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.3, whiteSpace: "nowrap" }}>{t("course.subject", "Предметы")}</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.3, whiteSpace: "nowrap" }}>{t("admin.status", "Статус")}</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.3, whiteSpace: "nowrap", textAlign: "right" }}>{t("admin.actions", "Действия")}</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => {
                  const displayName = (a as Record<string, unknown>)["full_name"] as string || ((a as Record<string, unknown>)["user"] as Record<string, unknown> && ((a as Record<string, unknown>)["user"] as Record<string, unknown>)["full_name"] as string) || [(a as Record<string, unknown>)["firstName"] as string, (a as Record<string, unknown>)["lastName"] as string].filter(Boolean).join(" ") || (a as Record<string, unknown>)["slug"] as string || "—";
                  const displayEmail = (a as Record<string, unknown>)["email"] as string || ((a as Record<string, unknown>)["user"] as Record<string, unknown> && ((a as Record<string, unknown>)["user"] as Record<string, unknown>)["email"] as string) || "—";
                  const subjectsVal = (a as Record<string, unknown>)["subjects"];
                  const subjectsList: string[] = Array.isArray(subjectsVal)
                    ? (subjectsVal as unknown[]).map((s) => typeof s === "string" ? s : (s as Record<string,unknown>)["nameRu"] as string || (s as Record<string,unknown>)["slug"] as string || "").filter(Boolean)
                    : typeof subjectsVal === "string" && subjectsVal ? subjectsVal.split(",").map(s=>s.trim()).filter(Boolean) : [];
                  const status = (a as Record<string, unknown>)["status"] as string;
                  const sb = statusBadge(status);
                  const showApprove = status === "PENDING_MODERATION" || status === "PENDING" || sb.label === "PENDING_MODERATION";
                  const initials = getInitials(displayName);
                  const avatarStyle = avatarBg(displayName);
                  return (
                    <tr key={(a as Record<string, unknown>)["id"] as string} onClick={() => setDetail(a)} style={{ borderBottom: "1px solid var(--color-border-light)", cursor: "pointer" }} onMouseEnter={(e)=> e.currentTarget.style.background="var(--color-surface-hover)"} onMouseLeave={(e)=> e.currentTarget.style.background="var(--color-surface)"}>
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <div style={{ width: 36, height: 36, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0, ...(() => { const s=avatarStyle; const obj: Record<string, string>={}; s.split(";").forEach(kv=>{const [k,v]=kv.split(":"); if(k&&v) obj[k.trim()]=v.trim()}); return obj; })() }}>{initials}</div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: 14, lineHeight: 1.2 }}>{displayName}</div>
                            <div style={{ display: "none" }}>{/* email shown in next column on desktop */}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap", color: "var(--color-text-secondary)", fontSize: 13 }}>{displayEmail}</td>
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {subjectsList.length ? subjectsList.map((subj, idx) => (
                            <span key={idx} style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, ...(() => { const s=subjectBadgeStyle(subj); const obj: Record<string, string>={}; s.split(";").forEach(kv=>{const [k,v]=kv.split(":"); if(k&&v) obj[k.trim()]=v.trim()}); return obj; })() }}>{subj}</span>
                          )) : <span style={{ color: "#94A3B8" }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: 0.2, ...(() => { const obj: Record<string, string>={}; sb.bg.split(";").forEach(kv=>{const [k,v]=kv.split(":"); if(k&&v) obj[k.trim()]=v.trim()}); return obj; })() }}>
                          <span style={{ width: 7, height: 7, borderRadius: 999, background: sb.dot, display: "inline-block" }} />
                          {sb.label}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap", textAlign: "right" as const }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "inline-flex", gap: 8, justifyContent: "flex-end" }}>
                          {showApprove && (
                            <button
                              onClick={() => setApproveTarget(a)}
                              style={{ height: 32, padding: "0 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "1px solid var(--color-border)", background: "var(--color-info-soft)", color: "var(--color-info)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                            >
                              <span style={{ fontSize: 14 }}>✓</span> {t("admin.approve", "Одобрить")}
                            </button>
                          )}
                          <button
                            onClick={() => setRejectTarget(a)}
                            style={{ height: 32, padding: "0 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "1px solid var(--color-border)", background: "var(--color-danger-soft)", color: "var(--color-danger)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                          >
                            <span style={{ fontSize: 13 }}>⚑</span> {t("admin.reject", "Отклонить")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!approveTarget}
        title={t("admin.approve_title", "Approve application?")}
        message={t("admin.approve_message", "{{name}} will become a verified tutor.", {
          name: approveTarget?.full_name || approveTarget?.user?.full_name || "",
        })}
        confirmLabel={t("admin.approve", "Approve")}
        loading={actionLoading}
        onCancel={() => setApproveTarget(null)}
        onConfirm={approve}
      />
      <ReasonModal
        isOpen={!!rejectTarget}
        title={t("admin.reject_title", "Reject application?")}
        loading={actionLoading}
        onCancel={() => setRejectTarget(null)}
        onConfirm={reject}
      />
      {detail && <ApplicationDrawer application={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
