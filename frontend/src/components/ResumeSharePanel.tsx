import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Share2, Link2, Copy, Trash2, Loader2 } from "lucide-react";
import { shareApi, copyShareLink, type ShareResponse } from "../api/share.api";
import { useToast } from "./ui/Toast";

function formatExpiry(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function ResumeSharePanel({ resumeId }: { resumeId: string }): JSX.Element {
  const { t } = useTranslation();
  const toast = useToast();
  const [share, setShare] = useState<ShareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!resumeId) return;
    setLoading(true);
    try {
      const res = await shareApi.getOwn(resumeId);
      if (res.response.ok && res.data && typeof res.data === "object") {
        setShare(res.data as ShareResponse);
      }
    } catch {
      // нет активной ссылки — это нормально
    } finally {
      setLoading(false);
    }
  }, [resumeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await shareApi.create(resumeId);
      if (!res.response.ok) {
        toast.error((res.data as unknown as Record<string, unknown>)?.["message"] as string ?? t("share.error", "Не удалось создать ссылку"));
        return;
      }
      const created = res.data as ShareResponse;
      setShare(created);
      const ok = await copyShareLink(created.url);
      toast.success(ok ? t("share.copied", "Ссылка скопирована в буфер обмена") : t("share.created", "Ссылка на резюме создана"));
    } catch {
      toast.error(t("share.error", "Не удалось создать ссылку"));
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!share) return;
    const ok = await copyShareLink(share.url);
    toast.success(ok ? t("share.copied", "Ссылка скопирована в буфер обмена") : share.url);
  };

  const handleRevoke = async () => {
    if (!share) return;
    try {
      const res = await shareApi.revoke(resumeId);
      if (res.response.ok || res.response.status === 404) {
        setShare(null);
        toast.info(t("share.revoked", "Ссылка отозвана"));
      } else {
        toast.error(t("share.error", "Не удалось отозвать ссылку"));
      }
    } catch {
      toast.error(t("share.error", "Не удалось отозвать ссылку"));
    }
  };

  return (
    <div
      style={{
        border: "none",
        borderRadius: 0,
        padding: 0,
        background: "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>
          <Share2 size={16} style={{ color: "var(--color-primary)" }} /> {t("share.title", "Поделиться ссылкой")}
        </span>
        {share?.viewCount != null && share.viewCount > 0 && (
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
            {t("share.views", "{{count}} переходов по ссылке", { count: share.viewCount })}
          </span>
        )}
      </div>

      {loading ? null : share ? (
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              flex: "1 1 240px",
              minWidth: 0,
              padding: "10px 14px",
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
              overflow: "hidden",
              minHeight: "var(--touch-target)",
            }}
            title={share.url}
          >
            <Link2 size={14} style={{ flexShrink: 0, color: "var(--color-text-muted)" }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{share.url}</span>
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ minHeight: "var(--touch-target)", background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", borderRadius: "var(--radius-lg)", fontWeight: "var(--font-weight-medium)" }}
            onClick={handleCopy}
          >
            <Copy size={14} /> {t("share.copy", "Копировать")}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ minHeight: "var(--touch-target)", background: "var(--color-surface)", border: "1px solid var(--color-danger)", color: "var(--color-danger)", borderRadius: "var(--radius-lg)", fontWeight: "var(--font-weight-medium)" }}
            onClick={handleRevoke}
          >
            <Trash2 size={14} /> {t("share.revoke", "Отозвать")}
          </button>
          {share.expiresAt && (
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", flexBasis: "100%" }}>
              {t("share.expires", "Действует до {{date}}", { date: formatExpiry(share.expiresAt) })}
            </span>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          style={{ minHeight: "var(--touch-target)" }}
          onClick={handleCreate}
          disabled={creating}
          aria-busy={creating}
        >
          {creating ? <Loader2 size={16} className="loading-spinner-sm" /> : <Share2 size={16} />}
          {t("share.create", "Получить ссылку")}
        </button>
      )}
    </div>
  );
}