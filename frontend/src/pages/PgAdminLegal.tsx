import { useEffect, useState, useMemo } from "react";
import DOMPurify from "dompurify";
import { legalApi } from "../api/legal.api";
import { Spinner, ErrorState } from "../components/ui/Primitives";
import { useToast } from "../components/ui/Toast";

type Doc = { id: string; type: string; title: string; description?: string };
type Version = { id: string; documentId: string; version: string; title: string; content: string; language: string; status: string; createdAt: string; publishedAt?: string; effectiveAt?: string; requiresReconsent: boolean };

export default function PgAdminLegal(): JSX.Element {
  const toast = useToast();
  const [tab, setTab] = useState<"docs" | "cookies" | "consents" | "audit">("docs");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [versions, setVersions] = useState<Record<string, Version[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Version | null>(null);
  const [preview, setPreview] = useState<Version | null>(null);
  const [providers, setProviders] = useState<Record<string, unknown>[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { response, data } = await legalApi.listDocuments();
      if (response.ok) {
        const raw = data as unknown;
        const list = Array.isArray(raw) ? (raw as Doc[]) : [];
        // защита: backend может вернуть {content: []} или объект ошибки — нормализуем к массиву
        const safeList = Array.isArray(list) ? list : [];
        setDocs(safeList);
        const map: Record<string, Version[]> = {};
        for (const d of safeList) {
          try {
            const { response: vr, data: v } = await legalApi.listVersions(d.id);
            map[d.id] = vr.ok && Array.isArray(v) ? (v as Version[]) : [];
          } catch { map[d.id] = []; }
        }
        setVersions(map);
      } else if (response.status === 403) {
        setError("Доступ только для SUPER_ADMIN");
        setDocs([]);
      } else setError("Failed to load");
      try {
        const { response: pr, data: prov } = await legalApi.listProviders();
        setProviders(pr.ok && Array.isArray(prov) ? (prov as Record<string, unknown>[]) : []);
      } catch { setProviders([]); }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const createVersion = async (docId: string) => {
    const version = prompt("Новая версия (например 1.1):", "1.1");
    if (!version) return;
    const title = prompt("Заголовок:", "Privacy Policy") ?? "Draft";
    const content = prompt("Содержимое (markdown):", "# Новый документ\n\nТекст...") ?? "";
    const { response, data } = await legalApi.createVersion(docId, { version, title, content, language: "ru", requiresReconsent: true });
    if (response.ok) { toast.success("Версия создана"); void load(); }
    else toast.error((data as Record<string, unknown>)?.["message"] as string ?? "Ошибка");
  };

  const saveDraft = async () => {
    if (!editing) return;
    const { response } = await legalApi.updateDraft(editing.id, { title: editing.title, content: editing.content, requiresReconsent: editing.requiresReconsent });
    if (response.ok) { toast.success("Сохранено"); setEditing(null); void load(); }
    else toast.error("Ошибка сохранения");
  };

  const publish = async (v: Version) => {
    if (!confirm(`Опубликовать ${v.title} ${v.version}? Старая PUBLISHED станет ARCHIVED. Требуется re-consent: ${v.requiresReconsent ? "Да" : "Нет"}`)) return;
    const { response } = await legalApi.publish(v.id);
    if (response.ok) { toast.success("Опубликовано"); void load(); }
    else toast.error("Ошибка публикации");
  };

  const archive = async (v: Version) => {
    if (!confirm(`Архивировать ${v.version}?`)) return;
    const { response } = await legalApi.archive(v.id);
    if (response.ok) { toast.success("Архивировано"); void load(); }
    else toast.error("Ошибка");
  };

  if (loading) return <Spinner label="Загрузка..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Legal & Privacy <span style={{ fontSize: 12, background: "#fee2e2", color: "#dc2626", padding: "2px 6px", borderRadius: 6, marginLeft: 8 }}>SUPER_ADMIN</span></h1>
      <div style={{ display: "flex", gap: 8, margin: "12px 0 16px", flexWrap: "wrap" }}>
        {(["docs", "cookies", "consents", "audit"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={tab === t ? "btn-primary" : "btn-secondary"} style={{ textTransform: "capitalize" }}>{t}</button>
        ))}
      </div>

      {tab === "docs" && (
        <div style={{ display: "grid", gap: 16 }}>
          {docs.map((d) => (
            <div key={d.id} style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: 16, background: "var(--color-surface)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{d.title} <span style={{ fontSize: 11, background: "#eef", padding: "2px 6px", borderRadius: 6 }}>{d.type}</span></div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{d.description}</div>
                </div>
                <button type="button" className="btn-secondary" onClick={() => void createVersion(d.id)}>+ Новая версия</button>
              </div>
              <div style={{ marginTop: 12, overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead><tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}><th>Version</th><th>Lang</th><th>Status</th><th>Effective</th><th>Updated</th><th>Actions</th></tr></thead>
                  <tbody>
                    {(versions[d.id] ?? []).map((v) => (
                      <tr key={v.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                        <td>{v.version}</td><td>{v.language}</td>
                        <td><span style={{ padding: "2px 6px", borderRadius: 6, background: v.status === "PUBLISHED" ? "#dcfce7" : v.status === "DRAFT" ? "#fef9c3" : "#f3f4f6", fontSize: 11 }}>{v.status}</span></td>
                        <td>{v.effectiveAt ? new Date(v.effectiveAt).toLocaleDateString() : "—"}</td>
                        <td>{new Date(v.updatedAt ?? v.createdAt).toLocaleDateString()}</td>
                        <td style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "6px 0" }}>
                          <button type="button" className="btn-ghost" onClick={() => setPreview(v)} style={{ fontSize: 12 }}>Preview</button>
                          {v.status === "DRAFT" && <><button type="button" className="btn-ghost" onClick={() => setEditing(v)} style={{ fontSize: 12 }}>Edit</button><button type="button" className="btn-primary" onClick={() => void publish(v)} style={{ fontSize: 12, padding: "4px 8px" }}>Publish</button></>}
                          {v.status !== "ARCHIVED" && <button type="button" className="btn-ghost" onClick={() => void archive(v)} style={{ fontSize: 12 }}>Archive</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={() => setEditing(null)}>
          <div style={{ background: "var(--color-surface)", borderRadius: 16, width: "100%", maxWidth: 800, maxHeight: "90vh", overflow: "auto", padding: 16 }} onClick={(e) => e.stopPropagation()}>
            <h3>Редактирование {editing.version} ({editing.language})</h3>
            <label style={{ display: "grid", gap: 6, marginTop: 12 }}>Title<input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} style={{ padding: 8, border: "1px solid var(--color-border)", borderRadius: 8 }} /></label>
            <label style={{ display: "grid", gap: 6, marginTop: 12 }}>Content (markdown/HTML)<textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} rows={14} style={{ padding: 8, border: "1px solid var(--color-border)", borderRadius: 8, fontFamily: "monospace", fontSize: 13 }} /></label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}><input type="checkbox" checked={editing.requiresReconsent} onChange={(e) => setEditing({ ...editing, requiresReconsent: e.target.checked })} /> requiresReconsent</label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" className="btn-secondary" onClick={() => setPreview(editing)}>Preview</button>
              <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Отмена</button>
              <button type="button" className="btn-primary" onClick={saveDraft}>Сохранить draft</button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }} onClick={() => setPreview(null)}>
          <div style={{ background: "var(--color-surface)", borderRadius: 16, width: "100%", maxWidth: 800, maxHeight: "90vh", overflow: "auto", padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 8 }}>PREVIEW • {preview.title} • v{preview.version} • {preview.language} • effective {preview.effectiveAt ? new Date(preview.effectiveAt).toLocaleString() : "now"}</div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>{preview.title}</h1>
            <div style={{ marginTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(preview.content.includes("<") ? preview.content : preview.content.replace(/\n/g, "<br/>"), { USE_PROFILES: { html: true }, FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form"], FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"] }) }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
              <button type="button" className="btn-ghost" onClick={() => setPreview(null)}>Back to editing</button>
              {preview.status === "DRAFT" && <button type="button" className="btn-primary" onClick={() => { setPreview(null); void publish(preview); }}>Publish</button>}
            </div>
          </div>
        </div>
      )}

      {tab === "cookies" && (
        <div style={{ display: "grid", gap: 12 }}>
          <h3>Cookie Providers</h3>
          {(Array.isArray(providers) ? providers : []).map((p) => (
            <div key={String(p["id"])} style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div><div style={{ fontWeight: 600 }}>{String(p["name"])} <span style={{ fontSize: 11, background: "#eef", padding: "2px 6px", borderRadius: 6 }}>{String(p["category"] ?? p["category_id"])}</span></div><div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{String(p["purpose"] ?? p["description"] ?? "")} • {String(p["duration"] ?? "")}</div></div>
              <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 20, background: p["is_active"] ? "#dcfce7" : "#f3f4f6" }}>{p["is_active"] ? "active" : "inactive"}</span>
            </div>
          ))}
          {(!Array.isArray(providers) || providers.length === 0) && <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Нет провайдеров или нет доступа.</div>}
        </div>
      )}

      {tab === "consents" && <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Consent history — используйте фильтры в API: GET /api/v1/admin/legal/consents?userId=&documentId=&status=</div>}
      {tab === "audit" && <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Audit Log — все изменения Legal попадают в audit_logs (action: CREATE_DOCUMENT, PUBLISH, ARCHIVE...), просмотр в /admin/audit.</div>}
    </div>
  );
}
