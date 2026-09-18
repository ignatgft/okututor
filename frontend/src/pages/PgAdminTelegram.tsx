import { useEffect, useState } from "react";
import { tgApi } from "../api/legal.api";
import { Spinner, ErrorState } from "../components/ui/Primitives";
import { useToast } from "../components/ui/Toast";

type Recipient = { id: string; chatId: string; username?: string; displayName?: string; isActive: boolean; notifyCritical: boolean; notifyWarning: boolean; createdAt: string };

export default function PgAdminTelegram(): JSX.Element {
  const toast = useToast();
  const [list, setList] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ chatId: string; username: string; displayName: string; notifyCritical: boolean; notifyWarning: boolean }>({ chatId: "", username: "", displayName: "", notifyCritical: true, notifyWarning: false });
  const [editing, setEditing] = useState<Recipient | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { response, data } = await tgApi.list();
      if (response.ok && Array.isArray(data)) setList(data as Recipient[]);
      else if (response.status === 403) setError("Доступ только для SUPER_ADMIN — проверь роль и токен");
      else {
        const msg = (data as Record<string, unknown>)?.["message"] as string || (data as Record<string, unknown>)?.["error"] as string || `HTTP ${response.status}`;
        setError(`Failed to load: ${msg} — проверь backend /api/v1/admin/telegram/recipients, proxy и TG_BOT_TOKEN`);
      }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const submit = async () => {
    if (!form.chatId.trim() || !/^-?\d{5,32}$/.test(form.chatId.trim())) { toast.error("chatId должен быть numeric Telegram userId (например 123456789)"); return; }
    const payload = { chatId: form.chatId.trim(), username: form.username.trim() || undefined, displayName: form.displayName.trim() || undefined, notifyCritical: form.notifyCritical, notifyWarning: form.notifyWarning };
    const { response, data } = editing ? await tgApi.update(editing.id, payload) : await tgApi.create(payload);
    if (response.ok) { toast.success(editing ? "Обновлено" : "Добавлен"); setForm({ chatId: "", username: "", displayName: "", notifyCritical: true, notifyWarning: false }); setEditing(null); void load(); }
    else toast.error((data as Record<string, unknown>)?.["message"] as string ?? "Ошибка");
  };
  const startEdit = (r: Recipient) => { setEditing(r); setForm({ chatId: r.chatId, username: r.username ?? "", displayName: r.displayName ?? "", notifyCritical: r.notifyCritical, notifyWarning: r.notifyWarning }); };
  const remove = async (r: Recipient) => {
    if (!confirm(`Удалить ${r.chatId}?`)) return;
    const { response } = await tgApi.remove(r.id);
    if (response.ok) { toast.success("Удален"); void load(); } else toast.error("Ошибка удаления");
  };
  const test = async (r: Recipient) => {
    const { response } = await tgApi.test(r.id);
    if (response.ok) toast.success(`Тест отправлен в ${r.chatId}`); else toast.error("Ошибка отправки — проверь TG_BOT_TOKEN");
  };

  if (loading) return <Spinner label="Загрузка..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Telegram получатели <span style={{ fontSize: 12, background: "#fee2e2", color: "#dc2626", padding: "2px 6px", borderRadius: 6, marginLeft: 8 }}>SUPER_ADMIN</span></h1>
      <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 6 }}>Назначай получателей по Telegram userId. Юзер подтягивается автоматически из TG через getChat (username/displayName). Бот должен быть запущен (TG_BOT_TOKEN) и юзер должен хоть раз написать боту /start.</div>

      <div style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: 16, marginTop: 16, background: "var(--color-surface)" }}>
        <h3 style={{ margin: 0 }}>{editing ? "Редактировать" : "Добавить"} получателя</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>chatId (Telegram userId) *<input value={form.chatId} onChange={e => setForm({ ...form, chatId: e.target.value })} placeholder="123456789" style={{ padding: 8, border: "1px solid var(--color-border)", borderRadius: 8 }} /></label>
          <label style={{ display: "grid", gap: 6 }}>username (без @)<input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="ivanov" style={{ padding: 8, border: "1px solid var(--color-border)", borderRadius: 8 }} /></label>
          <label style={{ display: "grid", gap: 6 }}>displayName<input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="Иван" style={{ padding: 8, border: "1px solid var(--color-border)", borderRadius: 8 }} /></label>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={form.notifyCritical} onChange={e => setForm({ ...form, notifyCritical: e.target.checked })} /> Критичные</label>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={form.notifyWarning} onChange={e => setForm({ ...form, notifyWarning: e.target.checked })} /> Варнинги</label>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--color-text-muted)" }}>Подсказка: узнай chatId через @userinfobot — перешли сообщение от пользователя боту, или попроси юзера написать твоему боту /start и посмотри getUpdates.</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          {editing && <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setForm({ chatId: "", username: "", displayName: "", notifyCritical: true, notifyWarning: false }); }}>Отмена</button>}
          <button type="button" className="btn-primary" onClick={submit}>{editing ? "Сохранить" : "Добавить"}</button>
        </div>
      </div>

      <div style={{ marginTop: 16, overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead><tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}><th>chatId</th><th>username</th><th>Имя</th><th>Активен</th><th>Уведомления</th><th>Создан</th><th>Действия</th></tr></thead>
          <tbody>
            {list.map(r => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                <td style={{ fontFamily: "monospace" }}>{r.chatId}</td><td>{r.username ? "@" + r.username : "—"}</td><td>{r.displayName ?? "—"}</td>
                <td><span style={{ padding: "2px 6px", borderRadius: 6, background: r.isActive ? "#dcfce7" : "#f3f4f6", fontSize: 11 }}>{r.isActive ? "active" : "inactive"}</span></td>
                <td style={{ fontSize: 11 }}>{r.notifyCritical ? "critical " : ""}{r.notifyWarning ? "warning" : ""}</td>
                <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                <td style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "6px 0" }}>
                  <button type="button" className="btn-ghost" onClick={() => startEdit(r)} style={{ fontSize: 12 }}>Edit</button>
                  <button type="button" className="btn-ghost" onClick={() => void test(r)} style={{ fontSize: 12 }}>Test</button>
                  <button type="button" className="btn-ghost" onClick={() => void remove(r)} style={{ fontSize: 12, color: "#dc2626" }}>Delete</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} style={{ padding: 16, textAlign: "center", color: "var(--color-text-muted)" }}>Нет получателей</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
