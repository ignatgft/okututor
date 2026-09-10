// Admin — marketplace requests moderation (USER → RESUME → REQUESTS)
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../components/pageTitleContext";
import { Badge, Spinner, EmptyState, ErrorState } from "../components/ui/Primitives";
import { apiClient } from "../api/http";
import { tutorRequestsMarketplaceApi, type TutorRequestDto } from "../api/marketplace/tutorRequestsMarketplace.api";

function toList(data: unknown): TutorRequestDto[] {
  if (Array.isArray(data)) return data as TutorRequestDto[];
  if (typeof data === "object" && data !== null) {
    const rec = data as Record<string, unknown>;
    if (Array.isArray(rec["content"])) return rec["content"] as TutorRequestDto[];
    if (Array.isArray(rec["items"])) return rec["items"] as TutorRequestDto[];
  }
  return [];
}

export default function PgAdminRequests(): JSX.Element {
  const { t } = useTranslation();
  const setPageTitle = usePageTitle();
  const [requests, setRequests] = useState<TutorRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => { setPageTitle(t("navigation.requests", "Обращения") as string); }, [setPageTitle, t]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Try admin endpoint first, fallback to marketplace list
      const res = await apiClient.get("/api/v1/admin/requests?page=0&size=100");
      if (!res.response.ok) {
        const fb = await tutorRequestsMarketplaceApi.list(0, 100);
        if (fb.response.ok) setRequests(toList(fb.data));
        else setError((fb.data as Record<string, unknown>)?.["message"] as string || t("common.error", "Ошибка") as string);
      } else {
        setRequests(toList(res.data));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const filtered = statusFilter === "all" ? requests : requests.filter((r) => r.status === statusFilter);

  return (
    <>
      <div className="dashboard-tabs" role="tablist" aria-label={t("navigation.requests", "Обращения")}>
        {[
          ["all", t("dashboard.all", "Все")],
          ["NEW", "NEW"],
          ["VIEWED", "VIEWED"],
          ["CONTACTED", "CONTACTED"],
          ["CLOSED", "CLOSED"],
        ].map(([val, label]) => (
          <button
            key={String(val)}
            type="button"
            className={`tab-btn ${statusFilter === val ? "active" : ""}`}
            onClick={() => setStatusFilter(String(val))}
          >
            {String(label)}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner label={t("common.loading", "Загрузка...") as string} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={requests.length === 0 ? (t("admin.no_requests", "Пока нет обращений") as string) : (t("student_requests.empty_tab", "Ничего в этой вкладке") as string)}
          hint={requests.length === 0 ? (t("admin.no_requests_hint", "Обращения появятся после создания заявок") as string) : (t("student_requests.empty_tab_hint", "Проверьте другие вкладки") as string)}
        />
      ) : (
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>{t("tutor_request.title", "Заявка")}</th>
                <th>{t("admin.users", "Пользователь")}</th>
                <th>{t("course.subject", "Предмет")}</th>
                <th>{t("admin.status", "Status")}</th>
                <th>{t("common.submitted", "Дата")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={String(r.id)}>
                  <td>
                    <Link to={`/admin/requests/${r.id}`} className="btn-link" style={{ display: "none" }}>
                      {String(r.id).slice(0, 8)}
                    </Link>
                    <span style={{ fontWeight: 600 }}>{r.studentName || "—"}</span>
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{r.studentContact}</div>
                  </td>
                  <td>{r.tutorProfileSlug || String(r.tutorUserId).slice(0, 8)}</td>
                  <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.message ? r.message.slice(0, 60) + (r.message.length > 60 ? "…" : "") : "—"}</td>
                  <td><Badge status={r.status}>{r.status}</Badge></td>
                  <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
