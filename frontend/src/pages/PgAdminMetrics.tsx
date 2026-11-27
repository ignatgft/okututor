// Admin metrics page — platform KPIs (users, lessons, revenue).
// Data comes from /api/v1/admin/metrics/*; falls back to admin stats
// when the metrics endpoints are not yet deployed.
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { adminApi } from "../api/admin.api";
import { apiClient } from "../api/http";
import { endpoints } from "../api/endpoints";
import { usePageTitle } from "../components/pageTitleContext";
import { ErrorState, Skeleton } from "../components/ui/Primitives";
import MetricCard from "../components/ui/MetricCard";
import { isRecord } from "../utils/apiHelpers";
import "../styles/Admin.css";

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function PgAdminMetrics() {
  const { t } = useTranslation();
  const setPageTitle = usePageTitle();
  const [overview, setOverview] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sys, setSys] = useState<Record<string, unknown> | null>(null);
  const [sysError, setSysError] = useState("");

  useEffect(() => {
    setPageTitle(t("admin.metrics", "Metrics"));
  }, [setPageTitle, t]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { response, data } = await adminApi.metricsOverview();
      if (response.ok && isRecord(data)) {
        setOverview(data);
      } else if (response.status === 404) {
        // Metrics API not deployed yet — degrade gracefully to base stats.
        const fallback = await apiClient.get(endpoints.admin.stats);
        setOverview(isRecord(fallback.data) ? fallback.data : {});
      } else {
        const msg = isRecord(data) ? (data["message"] ?? data["error"]) : undefined;
        setError(typeof msg === "string" && msg ? msg : t("errors.default", "Something went wrong."));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadSys = useCallback(async () => {
    try {
      const { response, data } = await adminApi.systemResources();
      if (response.ok && isRecord(data)) { setSys(data); setSysError(""); }
      else if (response.status === 403 || response.status === 401) setSysError(t("errors.forbidden", "Нет доступа"));
      else setSysError("");
    } catch { setSysError(""); }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    void loadSys();
    const id = setInterval(loadSys, 15000);
    return () => clearInterval(id);
  }, [loadSys]);

  const cards: { key: string; label: string; value: number; icon: string }[] = [
    { key: "total_users", label: t("admin.users", "Пользователи"), value: num(overview["total_users"] ?? overview["totalUsers"]), icon: "👥" },
    { key: "published_tutors", label: t("admin.published_resumes", "Опубликовано анкет"), value: num(overview["published_tutor_profiles"] ?? overview["total_tutors"] ?? overview["totalTutors"]), icon: "🧑‍🏫" },
    { key: "pending_tutors", label: t("admin.pending_resumes", "Очередь модерации"), value: num(overview["pending_tutor_profiles"] ?? overview["pendingTutors"]), icon: "⏳" },
    { key: "active_tutors", label: t("admin.active_resumes", "Активные анкеты"), value: num(overview["active_tutor_profiles"]), icon: "🟢" },
    { key: "expiring_soon", label: t("admin.expiring_resumes", "Истекают скоро (7 дн)"), value: num(overview["expiring_soon_tutor_profiles"]), icon: "⚠️" },
    { key: "total_requests", label: t("navigation.requests", "Обращения"), value: num(overview["total_tutor_requests"] ?? overview["total_requests"] ?? overview["totalRequests"]), icon: "📨" },
  ];

  const fmtBytes = (v: unknown) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return "—";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };
  const pct = (used: unknown, max: unknown) => {
    const u = Number(used), m = Number(max);
    if (!m || !Number.isFinite(u) || !Number.isFinite(m)) return 0;
    return Math.round((u / m) * 100);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>{t("admin.metrics", "Метрики")}</h1>
          <p>{t("admin.metrics_subtitle", "Ключевые показатели платформы")}</p>
        </div>
      </div>

      {loading ? (
        <Skeleton count={4} className="skeleton-card" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="stats-grid">
          {cards.map((c) => (
            <MetricCard
              key={c.key}
              label={c.label}
              value={c.value.toLocaleString()}
              icon={c.icon ? <span aria-hidden="true">{c.icon}</span> : undefined}
              tone="info"
            />
          ))}
        </div>
      )}

      {/* Сервер — ресурсы бэкенда и хоста */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🖥️ {t("admin.metrics.server_title", "Ресурсы сервера — бэкенд")}</h2>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)", border: "1px solid var(--color-border)", padding: "2px 6px", borderRadius: 999 }}>live 15s</span>
          <button type="button" onClick={() => void loadSys()} style={{ marginLeft: "auto", fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", cursor: "pointer" }}>{t("admin.metrics.refresh", "Обновить")}</button>
        </div>
        {sysError ? (
          <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{sysError}</div>
        ) : !sys ? (
          <Skeleton count={3} className="skeleton-card" />
        ) : (
          (() => {
            const jvm = (sys["jvm"] as Record<string, unknown>) ?? {};
            const os = (sys["os"] as Record<string, unknown>) ?? {};
            const disk = (sys["disk"] as Record<string, unknown>) ?? {};
            const heapPct = pct(jvm["heapUsedBytes"], jvm["heapMaxBytes"]);
            const memPct = pct(jvm["usedMemoryBytes"], jvm["maxMemoryBytes"]);
            const diskPct = pct(disk["usedBytes"], disk["totalBytes"]);
            const cpu = Math.round(Number(os["cpuLoad"] ?? 0) * 100);
            const pCpu = Math.round(Number(os["processCpuLoad"] ?? 0) * 100);
            return (
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))" }}>
                <div style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: 12, background: "var(--color-surface)", minWidth: 0, overflowWrap: "anywhere" }}>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{t("admin.metrics.jvm_heap", "JVM Heap")}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, overflowWrap: "anywhere" }}>{fmtBytes(jvm["heapUsedBytes"])} / {fmtBytes(jvm["heapMaxBytes"])} <span style={{ fontSize: 12, color: heapPct > 85 ? "var(--color-danger)" : "var(--color-text-muted)" }}>{heapPct}%</span></div>
                  <div style={{ height: 6, background: "var(--color-border)", borderRadius: 999, marginTop: 6 }}><div style={{ width: `${heapPct}%`, height: "100%", background: heapPct > 85 ? "var(--color-danger)" : "var(--color-primary)", borderRadius: 999 }} /></div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>{Number(jvm["threadCount"] ?? 0)} {t("admin.metrics.threads", "потоков")} · up {String(jvm["uptimeHuman"] ?? "")}</div>
                </div>
                <div style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: 12, background: "var(--color-surface)", minWidth: 0, overflowWrap: "anywhere" }}>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{t("admin.metrics.process_memory", "Память процесса")}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, overflowWrap: "anywhere" }}>{fmtBytes(jvm["usedMemoryBytes"])} / {fmtBytes(jvm["maxMemoryBytes"])} <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{memPct}%</span></div>
                  <div style={{ height: 6, background: "var(--color-border)", borderRadius: 999, marginTop: 6 }}><div style={{ width: `${memPct}%`, height: "100%", background: "var(--color-primary)", borderRadius: 999 }} /></div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>{String(os["name"] ?? "")} {String(os["arch"] ?? "")}</div>
                </div>
                <div style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: 12, background: "var(--color-surface)", minWidth: 0, overflowWrap: "anywhere" }}>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{t("admin.metrics.cpu", "CPU")}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, overflowWrap: "anywhere" }}>{cpu}% <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{t("admin.metrics.sys_proc", "система · процесс")} {pCpu}%</span></div>
                  <div style={{ height: 6, background: "var(--color-border)", borderRadius: 999, marginTop: 6 }}><div style={{ width: `${cpu}%`, height: "100%", background: cpu > 80 ? "var(--color-warning)" : "var(--color-success)", borderRadius: 999 }} /></div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>{Number(jvm["availableProcessors"] ?? 0)} {t("admin.metrics.cores", "ядра")} · load {Number(os["systemLoadAverage"] ?? 0).toFixed(2)}</div>
                </div>
                <div style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: 12, background: "var(--color-surface)", minWidth: 0, overflowWrap: "anywhere" }}>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{t("admin.metrics.disk_root", "Диск /")}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, overflowWrap: "anywhere" }}>{fmtBytes(disk["usedBytes"])} / {fmtBytes(disk["totalBytes"])} <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{diskPct}%</span></div>
                  <div style={{ height: 6, background: "var(--color-border)", borderRadius: 999, marginTop: 6 }}><div style={{ width: `${diskPct}%`, height: "100%", background: diskPct > 85 ? "var(--color-danger)" : "var(--color-success)", borderRadius: 999 }} /></div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>{t("admin.metrics.free", "свободно")} {fmtBytes(disk["freeBytes"])}</div>
                </div>
                <div style={{ gridColumn: "1 / -1", fontSize: 11, color: "var(--color-text-muted)", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <span>{t("admin.metrics.grafana_note", "Grafana → Дашборд «Сервер — состояние» (node-exporter: CPU/RAM/диск/сеть)")}</span>
                  <span style={{ marginLeft: "auto" }}>{sys["timestamp"] ? new Date(String(sys["timestamp"])).toLocaleTimeString() : ""}</span>
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
