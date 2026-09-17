import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../components/pageTitleContext";
import { seoApi, type SeoSettings } from "../api/seo.api";
import { Spinner, ErrorState } from "../components/ui/Primitives";
import { useToast } from "../components/ui/Toast";
import "../styles/Admin.css";

export default function PgAdminSeo(): JSX.Element {
  const { t } = useTranslation();
  const setPageTitle = usePageTitle();
  const toast = useToast();
  const [seo, setSeo] = useState<SeoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setPageTitle("SEO — управление"); }, [setPageTitle]);

  useEffect(() => {
    (async () => {
      try {
        const { response, data } = await seoApi.getAdminSettings();
        if (response.ok) setSeo(data as SeoSettings);
        else setError("Failed to load SEO");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally { setLoading(false); }
    })();
  }, []);

  const save = async () => {
    if (!seo) return;
    setSaving(true);
    try {
      const { response, data } = await seoApi.updateSettings(seo);
      if (response.ok) {
        setSeo(data as SeoSettings);
        toast.success("SEO сохранено");
      } else toast.error("Ошибка сохранения");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally { setSaving(false); }
  };

  if (loading) return <Spinner label={t("common.loading") as string} />;
  if (error) return <ErrorState message={error} onRetry={() => location.reload()} />;
  if (!seo) return <ErrorState message="No data" />;

  const Field = ({ label, value, onChange, type = "text", rows = 3 }: { label: string; value: string; onChange: (v: string) => void; type?: string; rows?: number }) => (
    <div className="admin-seo-field">
      <label className="admin-seo-label">{label}</label>
      {type === "textarea" ? (
        <textarea className="admin-seo-input" value={value || ""} onChange={(e) => onChange(e.target.value)} rows={rows} />
      ) : (
        <input className="admin-seo-input" type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );

  return (
    <div className="admin-seo-page" style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 }}>
      <h2>SEO настройки (БД)</h2>
      <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>Управляйте глобальными SEO-мета, canonical и robots.txt. Изменения применяются мгновенно для sitemap.xml и всех страниц через SeoManager.</p>
      <Field label="Site Title" value={seo.siteTitle} onChange={(v) => setSeo({ ...seo, siteTitle: v })} />
      <Field label="Site Description" value={seo.siteDescription} onChange={(v) => setSeo({ ...seo, siteDescription: v })} type="textarea" rows={3} />
      <Field label="Keywords" value={seo.siteKeywords} onChange={(v) => setSeo({ ...seo, siteKeywords: v })} type="textarea" rows={2} />
      <Field label="Canonical Base URL" value={seo.canonicalBaseUrl} onChange={(v) => setSeo({ ...seo, canonicalBaseUrl: v })} />
      <Field label="OG Image URL" value={seo.ogImageUrl} onChange={(v) => setSeo({ ...seo, ogImageUrl: v })} />
      <Field label="OG Locale" value={seo.ogLocale} onChange={(v) => setSeo({ ...seo, ogLocale: v })} />
      <Field label="Robots.txt" value={seo.robotsTxt} onChange={(v) => setSeo({ ...seo, robotsTxt: v })} type="textarea" rows={6} />
      <Field label="Structured Data (JSON-LD)" value={seo.structuredData} onChange={(v) => setSeo({ ...seo, structuredData: v })} type="textarea" rows={6} />
      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" className="btn-primary" onClick={save} disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</button>
        <a className="btn-secondary" href="/api/v1/sitemap.xml" target="_blank" rel="noreferrer">Sitemap.xml</a>
        <a className="btn-secondary" href="/api/v1/robots.txt" target="_blank" rel="noreferrer">Robots.txt</a>
      </div>
      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Обновлено: {seo.updatedAt ? new Date(seo.updatedAt).toLocaleString() : "—"}</div>
    </div>
  );
}
