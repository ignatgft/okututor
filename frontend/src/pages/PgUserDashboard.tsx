import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../components/pageTitleContext";
import { Badge, Spinner, EmptyState, ErrorState } from "../components/ui/Primitives";
import useAuthStore from "../store/authStore";
import { useDashboardResume } from "../features/dashboard/hooks/useDashboardResume";
import { useDashboardRequests } from "../features/dashboard/hooks/useDashboardRequests";
import { useConversations } from "../features/chat/hooks/useConversations";
import { useUnreadCount } from "../features/chat/hooks/useUnreadCount";
import { chatApi } from "../api/chat.api";

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso as string);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return "сейчас";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин назад`;
    if (diff < 86_400_000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

function resumeStatusLabel(status: string, t: (k: string, fb: string) => string): string {
  const map: Record<string, string> = {
    DRAFT: t("statuses.DRAFT", "Черновик"),
    PENDING_MODERATION: t("tutor_status.PENDING_MODERATION", "На модерации"),
    PENDING: t("statuses.PENDING", "На модерации"),
    PUBLISHED: t("statuses.PUBLISHED", "Опубликовано"),
    REJECTED: t("statuses.REJECTED", "Отклонено"),
    SUSPENDED: t("tutor_status.SUSPENDED", "Приостановлено"),
  };
  return map[status] ?? status;
}

export default function PgUserDashboard(): JSX.Element {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const setPageTitle = usePageTitle();
  const navigate = useNavigate();

  useEffect(() => { setPageTitle(t("dashboard.overview", "Обзор") as string); }, [setPageTitle, t]);

  const resumeQuery = useDashboardResume(isAuthenticated);
  const requestsQuery = useDashboardRequests(isAuthenticated);
  const conversationsQuery = useConversations(isAuthenticated);
  const unreadQuery = useUnreadCount(isAuthenticated);

  const resume = resumeQuery.data ?? null;
  const hasResume = !!resume;
  const status = (resume?.status as string) ?? null;
  const views = (resume?.viewsCount as number) ?? 0;
  const requests = requestsQuery.data ?? [];
  const conversations = (conversationsQuery.data as unknown as { id: string; counterpart_name?: string | null; last_message?: string | null; last_message_at?: string | null; updated_at?: string | null; unread_count?: number; requestId?: string }[]) ?? [];
  const unreadCount = unreadQuery.data ?? 0;

  const isInitialLoading = resumeQuery.isLoading || requestsQuery.isLoading;
  // we show per-section loading, not full white screen, but if everything is loading initially, show spinner
  const showInitialSpinner = isInitialLoading && !resumeQuery.isError && !requestsQuery.isError && conversations.length === 0 && requests.length === 0;

  const handleRecentClick = async (item: { id: string; requestId?: string; counterpart_name?: string | null }) => {
    // Prefer conversation id if we have it
    // If item is a TutorRequest, try to get/create conversation
    const isRequest = requests.some((r) => String(r.id) === String(item.id));
    if (isRequest) {
      try {
        const res = await chatApi.createOrGetConversationForRequest(String(item.id));
        if (res.response.ok && (res.data as unknown as Record<string, unknown>)?.["id"]) {
          const convId = String((res.data as unknown as Record<string, unknown>)["id"]);
          navigate(`/dashboard/requests/${convId}`);
          return;
        }
      } catch {
        // fallback to request id navigation
      }
      navigate(`/dashboard/requests/${item.id}`);
    } else {
      navigate(`/dashboard/requests/${item.id}`);
    }
  };

  // Merge requests + conversations for recent display: prioritize requests with conversation enrichment
  const recentRequestsForDisplay = requests.slice(0, 5);
  const recentConversationsForDisplay = conversations.slice(0, 5);
  // Decide what to show: if we have conversations, enrich recent with conversation data; else show requests
  const hasRecentData = recentRequestsForDisplay.length > 0 || recentConversationsForDisplay.length > 0;

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 1440, margin: "0 auto", width: "100%" }}>
      {/* Greeting */}
      <section aria-labelledby="dashboard-greeting">
        <h1 id="dashboard-greeting" style={{ margin: 0, fontSize: "var(--font-size-2xl)", lineHeight: "var(--line-height-tight)" }}>
          {t("dashboard.greeting", "Привет, {{name}}", { name: user?.full_name || t("common.user", "User") as string })}
        </h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 8, marginBottom: 0, fontSize: "var(--font-size-base)" }}>
          {hasResume
            ? t("dashboard.has_resume_hint", "У вас есть резюме. Вы можете искать репетиторов и принимать обращения.")
            : t("dashboard.no_resume_hint", "Вы можете искать репетиторов или создать своё резюме.")}
        </p>
      </section>

      {showInitialSpinner ? (
        <Spinner label={t("common.loading", "Загрузка...") as string} />
      ) : (
        <>
          {/* Stats */}
          <section aria-labelledby="dashboard-stats" style={{ display: "grid", gap: 12 }}>
            <h2 id="dashboard-stats" className="visually-hidden">{t("dashboard.stats", "Статистика")}</h2>
            <div
              className="stats-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 16,
              }}
            >
              {/* Мои обращения */}
              <div className="card" style={{ padding: 16, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
                {requestsQuery.isLoading ? (
                  <div className="skeleton" style={{ height: 24, width: 40, marginBottom: 8 }} />
                ) : requestsQuery.isError ? (
                  <div style={{ color: "var(--color-danger)", fontSize: "var(--font-size-sm)" }}>{(requestsQuery.error as Error)?.message || t("common.error", "Ошибка")}</div>
                ) : (
                  <>
                    <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, color: "var(--color-text)" }}>{requests.length}</div>
                    <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: 4 }}>{t("dashboard.my_requests", "Мои обращения")}</div>
                  </>
                )}
              </div>

              {/* Непрочитанные */}
              <div className="card" style={{ padding: 16, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
                {unreadQuery.isLoading ? (
                  <div className="skeleton" style={{ height: 24, width: 40, marginBottom: 8 }} />
                ) : unreadQuery.isError ? (
                  <div style={{ color: "var(--color-danger)", fontSize: "var(--font-size-sm)" }}>{t("common.error", "Ошибка")}</div>
                ) : (
                  <>
                    <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, color: unreadCount > 0 ? "var(--color-primary)" : "var(--color-text)" }}>{unreadCount}</div>
                    <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: 4 }}>{t("dashboard.unread", "Непрочитанные")}</div>
                  </>
                )}
              </div>

              {/* Просмотры резюме */}
              <div className="card" style={{ padding: 16, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
                {resumeQuery.isLoading ? (
                  <div className="skeleton" style={{ height: 24, width: 40, marginBottom: 8 }} />
                ) : resumeQuery.isError ? (
                  <div style={{ color: "var(--color-danger)", fontSize: "var(--font-size-sm)" }}>{t("common.error", "Ошибка")}</div>
                ) : hasResume ? (
                  <>
                    <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, color: "var(--color-text)" }}>{views}</div>
                    <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: 4 }}>{t("dashboard.resume_views", "Просмотры резюме")}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, color: "var(--color-text-muted)" }}>—</div>
                    <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: 4 }}>{t("dashboard.resume_views", "Просмотры резюме")}</div>
                  </>
                )}
              </div>

              {/* Статус резюме */}
              <div className="card" style={{ padding: 16, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
                {resumeQuery.isLoading ? (
                  <div className="skeleton" style={{ height: 24, width: 80, marginBottom: 8 }} />
                ) : resumeQuery.isError ? (
                  <div style={{ color: "var(--color-danger)", fontSize: "var(--font-size-sm)" }}>{t("common.error", "Ошибка")}</div>
                ) : hasResume && status ? (
                  <>
                    <div style={{ marginBottom: 6 }}><Badge status={status}>{resumeStatusLabel(status, t as (k: string, fb: string) => string)}</Badge></div>
                    <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: 4 }}>{t("dashboard.resume_status", "Статус резюме")}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-muted)" }}>{t("dashboard.no_resume", "Нет резюме")}</div>
                    <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: 4 }}>{t("dashboard.resume_status", "Статус резюме")}</div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Quick actions + Resume status */}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }} aria-labelledby="dashboard-actions">
            <h2 id="dashboard-actions" className="visually-hidden">{t("dashboard.quick_actions", "Быстрые действия")}</h2>

            {/* Resume card */}
            <div className="card" style={{ padding: 20, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>📄 {t("tutor.resume", "Моё резюме")}</h3>
              {resumeQuery.isLoading ? (
                <Spinner label={t("common.loading", "Загрузка...") as string} />
              ) : resumeQuery.isError ? (
                <ErrorState message={(resumeQuery.error as Error).message} onRetry={() => void resumeQuery.refetch()} />
              ) : hasResume ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Badge status={status ?? "DRAFT"}>{status ? resumeStatusLabel(status, t as (k: string, fb: string) => string) : "—"}</Badge>
                    <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>👁 {views} {t("tutor.views", "просмотров")}</span>
                  </div>
                  {status === "REJECTED" && (resume?.rejectionReason as string) && (
                    <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-danger)", background: "var(--color-danger-soft, #FEF2F2)", padding: 8, borderRadius: 8 }}>{resume?.rejectionReason as string}</p>
                  )}
                  {status === "PENDING_MODERATION" && (
                    <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>{t("become_tutor.verification_hint", "Ваша заявка будет рассмотрена нашей командой.")}</p>
                  )}
                  {status === "PUBLISHED" && (
                    <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-success)" }}>{t("dashboard.resume_published_hint", "Резюме видно ученикам")}</p>
                  )}
                  {status === "SUSPENDED" && (
                    <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-danger)" }}>{t("dashboard.resume_suspended_hint", "Резюме приостановлено")}</p>
                  )}
                  {status === "DRAFT" && (
                    <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>{t("dashboard.resume_draft_hint", "Резюме в черновике. Отправьте на модерацию.")}</p>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                    <Link to="/dashboard/resume" className="btn-primary" style={{ textDecoration: "none" }}>{t("common.view", "Открыть резюме")}</Link>
                    <Link to="/become-tutor" className="btn-secondary" style={{ textDecoration: "none" }}>{t("common.edit", "Редактировать резюме")}</Link>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ textAlign: "left", padding: "8px 0" }}>
                    <p style={{ margin: "0 0 8px", fontWeight: 600, color: "var(--color-text)" }}>{t("dashboard.create_resume_title", "Создайте своё резюме")}</p>
                    <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                      {t("dashboard.create_resume_hint", "Разместите информацию о себе и принимайте обращения.")}
                    </p>
                  </div>
                  <Link to="/become-tutor" className="btn-primary" style={{ textDecoration: "none", alignSelf: "flex-start" }}>{t("marketplace.create_resume", "Создать резюме")}</Link>
                </>
              )}
            </div>

            {/* Quick actions card */}
            <div className="card" style={{ padding: 20, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>⚡ {t("dashboard.quick_actions", "Быстрые действия")}</h3>
              <div style={{ display: "grid", gap: 8 }}>
                <Link to="/tutors" className="btn-primary" style={{ textDecoration: "none", justifyContent: "center" }}>🔍 {t("dashboard.find_tutors", "Найти репетитора")}</Link>
                <Link to="/dashboard/requests" className="btn-secondary" style={{ textDecoration: "none", justifyContent: "center", position: "relative" }}>
                  💬 {t("navigation.requests", "Мои обращения")}
                  {unreadCount > 0 && (
                    <span style={{ marginLeft: 8, background: "var(--color-danger)", color: "#fff", fontSize: "var(--font-size-xs)", fontWeight: 700, minWidth: 18, height: 18, borderRadius: 9, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{unreadCount > 99 ? "99+" : unreadCount}</span>
                  )}
                </Link>
                {hasResume ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <Link to="/dashboard/resume" className="btn-secondary" style={{ textDecoration: "none", justifyContent: "center" }}>{t("common.view", "Открыть резюме")}</Link>
                    <Link to="/become-tutor" className="btn-secondary" style={{ textDecoration: "none", justifyContent: "center" }}>{t("common.edit", "Редактировать")}</Link>
                  </div>
                ) : (
                  <Link to="/become-tutor" className="btn-secondary" style={{ textDecoration: "none", justifyContent: "center" }}>{t("marketplace.create_resume", "Создать резюме")}</Link>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                <Link to="/dashboard/profile" className="btn-ghost" style={{ textDecoration: "none", fontSize: "var(--font-size-sm)" }}>{t("navbar.profile", "Профиль")}</Link>
                <Link to="/dashboard/settings" className="btn-ghost" style={{ textDecoration: "none", fontSize: "var(--font-size-sm)" }}>{t("navbar.settings", "Настройки")}</Link>
              </div>
            </div>
          </section>

          {/* Recent requests */}
          <section className="card" style={{ padding: 16, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }} aria-labelledby="dashboard-recent">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h3 id="dashboard-recent" style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>{t("dashboard.recent_requests", "Последние обращения")}</h3>
              <Link to="/dashboard/requests" className="btn-ghost" style={{ textDecoration: "none", fontSize: "var(--font-size-sm)" }}>{t("common.view", "Все")}</Link>
            </div>

            {requestsQuery.isLoading || conversationsQuery.isLoading ? (
              <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton" style={{ height: 72, borderRadius: "var(--radius-lg)" }} aria-hidden="true" />
                ))}
              </div>
            ) : requestsQuery.isError && conversationsQuery.isError ? (
              <div style={{ marginTop: 16 }}>
                <ErrorState message={(requestsQuery.error as Error)?.message || (conversationsQuery.error as Error)?.message || t("common.error", "Ошибка") as string} onRetry={() => { void requestsQuery.refetch(); void conversationsQuery.refetch(); }} />
              </div>
            ) : !hasRecentData ? (
              <div style={{ marginTop: 16 }}>
                <EmptyState
                  title={t("student_requests.empty", "Пока нет обращений") as string}
                  hint={t("dashboard.requests_empty_hint", "Когда вы отправите или получите обращение, оно появится здесь.") as string}
                  action={<Link to="/tutors" className="btn-primary">{t("dashboard.find_tutors", "Найти репетитора")}</Link>}
                />
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
                {/* Prefer conversations for richer display if we have them, else requests */}
                {(recentConversationsForDisplay.length > 0 ? recentConversationsForDisplay : []).length > 0 ? (
                  recentConversationsForDisplay.map((c) => {
                    // try to find matching request for status
                    const matchedRequest = requests.find((r) => String(r.id) === String(c.requestId));
                    const name = (c.counterpart_name as string | null) || matchedRequest?.studentName || t("common.user", "User") as string;
                    const subject = matchedRequest?.tutorProfileSlug || (c as unknown as Record<string, unknown>)["tutorProfileSlug"] as string | undefined || "";
                    const lastMessage = (c.last_message as string | null) || matchedRequest?.message || "";
                    const time = formatTime((c.last_message_at as string | null) || (c.updated_at as string | null) || matchedRequest?.createdAt);
                    const status = matchedRequest?.status || null;
                    const unread = c.unread_count ?? 0;
                    return (
                      <button
                        key={String(c.id)}
                        type="button"
                        onClick={() => void handleRecentClick({ id: String(c.id) })}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: 12,
                          background: unread > 0 ? "var(--color-primary-light)" : "var(--color-bg-secondary)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-lg)",
                          textAlign: "left",
                          cursor: "pointer",
                          width: "100%",
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-text)" }}>{name}{subject ? ` · ${subject}` : ""}</div>
                          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{lastMessage ? lastMessage.slice(0, 80) + (lastMessage.length > 80 ? "…" : "") : t("marketplace.no_message", "Без сообщения") as string}</div>
                          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 4 }}>{time}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                          {status && <Badge status={status}>{status}</Badge>}
                          {unread > 0 && <span style={{ background: "var(--color-danger)", color: "#fff", fontSize: "var(--font-size-xs)", fontWeight: 700, minWidth: 18, height: 18, borderRadius: 9, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{unread > 99 ? "99+" : unread}</span>}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  recentRequestsForDisplay.map((r) => {
                    const matchedConv = conversations.find((c) => String((c as unknown as Record<string, unknown>)["requestId"]) === String(r.id) || String(c.id) === String(r.id));
                    const name = r.studentName || (matchedConv?.counterpart_name as string | null) || t("common.user", "User") as string;
                    const subject = r.tutorProfileSlug || "";
                    const lastMessage = (matchedConv?.last_message as string | null) || r.message || "";
                    const time = formatTime((matchedConv?.last_message_at as string | null) || r.createdAt);
                    const unread = matchedConv?.unread_count ?? 0;
                    return (
                      <button
                        key={String(r.id)}
                        type="button"
                        onClick={() => void handleRecentClick({ id: String(r.id) })}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: 12,
                          background: unread > 0 ? "var(--color-primary-light)" : "var(--color-bg-secondary)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-lg)",
                          textAlign: "left",
                          cursor: "pointer",
                          width: "100%",
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-text)" }}>{name}{subject ? ` → ${subject}` : ""}</div>
                          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{lastMessage ? lastMessage.slice(0, 80) + (lastMessage.length > 80 ? "…" : "") : t("marketplace.no_message", "Без сообщения") as string}</div>
                          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 4 }}>{time}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                          <Badge status={r.status}>{r.status}</Badge>
                          {unread > 0 && <span style={{ background: "var(--color-danger)", color: "#fff", fontSize: "var(--font-size-xs)", fontWeight: 700, minWidth: 18, height: 18, borderRadius: 9, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{unread > 99 ? "99+" : unread}</span>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
