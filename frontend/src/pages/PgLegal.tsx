import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { legalApi } from "../api/legal.api";
import { Spinner, ErrorState } from "../components/ui/Primitives";

export default function PgLegal(): JSX.Element {
  const { type = "privacy" } = useParams<{ type: string }>();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // map short type to backend type
    const map: Record<string, string> = {
      terms: "TERMS",
      privacy: "PRIVACY",
      "personal-data": "PERSONAL_DATA",
      cookies: "COOKIE",
      marketing: "MARKETING",
    };
    const backendType = map[type.toLowerCase()] ?? type.toUpperCase();
    legalApi.getPublished(backendType).then(({ response, data }) => {
      if (cancelled) return;
      if (response.ok) setData(data as Record<string, unknown>);
      else setError("Документ не найден");
    }).catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [type]);

  if (loading) return <div style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}><Spinner label="Загрузка..." /></div>;
  if (error) return <div style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}><ErrorState message={error} onRetry={() => location.reload()} /></div>;
  if (!data) return null;

  const rawContent = String(data["content"] ?? "");
  const isHtml = rawContent.includes("<");
  const sanitized = useMemo(() => isHtml ? DOMPurify.sanitize(rawContent, { USE_PROFILES: { html: true }, FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form"], FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"] }) : "", [rawContent, isHtml]);
  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{String(data["title"] ?? type)}</h1>
      <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginBottom: 16 }}>
        Версия {String(data["version"] ?? "")} • {data["effectiveAt"] ? `Вступает в силу: ${new Date(String(data["effectiveAt"])).toLocaleDateString()}` : ""} • Язык {String(data["language"] ?? "ru")}
      </div>
      {isHtml ? (
        <div dangerouslySetInnerHTML={{ __html: sanitized }} style={{ lineHeight: 1.7, fontSize: 15 }} />
      ) : (
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: 15 }}>{rawContent}</div>
      )}
    </div>
  );
}
