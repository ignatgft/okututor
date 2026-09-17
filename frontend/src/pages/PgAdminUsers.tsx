// migrated to TSX — minimal strict types (controlled)
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api/http";
import { endpoints } from "../api/endpoints";
import { usePageTitle } from "../components/pageTitleContext";
import ConfirmModal from "../components/ui/ConfirmModal";
import { Spinner, EmptyState, ErrorState } from "../components/ui/Primitives";
import { useToast } from "../components/ui/Toast";
import { ROLES, ADMIN_ROLES } from "../constants/roles";
import "../styles/Admin.css";

export default function PgAdminUsers() {
  const { t } = useTranslation();
  const setPageTitle = usePageTitle();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [blockTarget, setBlockTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = debouncedQuery ? `?q=${encodeURIComponent(debouncedQuery)}` : "";
      const { response, data } = await apiClient.get(`${endpoints.admin.users}${q}`);
      if (response.ok) setUsers(data.content || []);
      else setError(data.error || t("errors.default", "Something went wrong."));
    } catch (e) {
      setError(t("errors.network", "Network error") + ": " + e.message);
    } finally {
      setLoading(false);
    }
  }, [t, debouncedQuery]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const runAction = async (action) => {
    setActionLoading(true);
    try {
      await action();
      setBlockTarget(null);
      await loadUsers();
      toast.success(t("common.success", "Action completed"));
    } catch (e) {
      toast.error(e.message || t("errors.default", "Something went wrong."));
    } finally {
      setActionLoading(false);
    }
  };

  const blockUser = (id) => runAction(() => apiClient.put(endpoints.admin.block(id)));
  const unblockUser = (id) => runAction(() => apiClient.put(endpoints.admin.unblock(id)));
  const verifyTutor = (id) => runAction(() => apiClient.put(endpoints.admin.verify(id)));
  const changeRole = (id, role) => runAction(() => apiClient.put(endpoints.admin.role(id), { role }));

  useEffect(() => { setPageTitle(t("admin.users", "Users")); }, [setPageTitle, t]);

  return (
    <>
      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="search"
          placeholder={t("admin.search_users", "Поиск по имени, email")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 200, maxWidth: 360, padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", background: "var(--color-surface)", minHeight: "var(--touch-target)" }}
        />
        {debouncedQuery && <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>{users.length} {t("common.results", "результатов")}</span>}
      </div>
      {loading ? (
        <Spinner label={t("common.loading", "Loading...")} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadUsers} />
      ) : users.length === 0 ? (
        <EmptyState
          icon="👥"
          title={t("admin.no_users", "No users found")}
          hint={t("admin.no_users_hint", "Users will appear here once they register.")}
        />
      ) : (
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>{t("admin.name", "Name")}</th>
                <th>{t("admin.email", "Email")}</th>
                <th>{t("admin.role", "Role")}</th>
                <th>{t("admin.status", "Status")}</th>
                <th>{t("admin.actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <span className={`status-badge status-${u.status === "ACTIVE" ? "active" : "cancelled"}`}>
                      {u.status === "ACTIVE" ? t("admin.active", "Active") : t("admin.blocked", "Blocked")}
                    </span>
                    {u.role === ROLES.TUTOR && u.verification_status === "VERIFIED" && (
                      <span className="status-badge status-completed">{t("tutor_profile.verified", "Verified")}</span>
                    )}
                  </td>
                  <td className="actions-cell">
                    {u.status === "ACTIVE" ? (
                      <button className="btn-danger" onClick={() => setBlockTarget(u)}>
                        {t("admin.block", "Block")}
                      </button>
                    ) : (
                      <button className="btn-primary" onClick={() => unblockUser(u.id)}>
                        {t("admin.unblock", "Unblock")}
                      </button>
                    )}
                    {u.role === ROLES.TUTOR && u.verification_status === "UNVERIFIED" && (
                      <button className="btn-primary" onClick={() => verifyTutor(u.id)}>
                        {t("admin.verify", "Verify")}
                      </button>
                    )}
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      aria-label={t("admin.change_role", "Change Role")}
                    >
                      <option value={ROLES.USER}>USER</option>
                      <option value={ROLES.ADMIN}>ADMIN</option>
                      <option value={ROLES.SUPER_ADMIN}>SUPER_ADMIN</option>
                      <option value={ROLES.STUDENT}>STUDENT (legacy)</option>
                      <option value={ROLES.TUTOR}>TUTOR (legacy)</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={!!blockTarget}
        title={t("admin.block_confirm_title", "Block user?")}
        message={t("admin.block_confirm_message", "{{name}} will no longer be able to access the platform.", { name: blockTarget?.full_name })}
        confirmLabel={t("admin.block", "Block")}
        loading={actionLoading}
        onCancel={() => setBlockTarget(null)}
        onConfirm={() => blockUser(blockTarget.id)}
      />
    </>
  );
}
