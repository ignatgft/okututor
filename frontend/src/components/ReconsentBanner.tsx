import { useEffect, useState } from "react";
import { consentApi } from "../api/legal.api";
import useAuthStore from "../store/authStore";

export default function ReconsentBanner(): JSX.Element | null {
  const { isAuthenticated } = useAuthStore();
  const [required, setRequired] = useState<Record<string, unknown>[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    consentApi.requiring().then(({ response, data }) => {
      if (response.ok && Array.isArray(data) && data.length > 0) {
        setRequired(data as Record<string, unknown>[]);
        setVisible(true);
      }
    }).catch(() => {});
  }, [isAuthenticated]);

  if (!visible || required.length === 0) return null;

  const first = required[0];
  const docType = String(first["document"] ? (first["document"] as Record<string, unknown>)["type"] ?? first["consentType"] : first["consentType"] ?? "PRIVACY");

  return (
    <div style={{ position: "fixed", top: 64, left: 16, right: 16, maxWidth: 640, margin: "0 auto", background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 12, padding: 16, zIndex: 55, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Мы обновили {docType === "PRIVACY" ? "Политику конфиденциальности" : docType}</div>
      <div style={{ fontSize: 13, color: "#92400e", marginBottom: 12 }}>Пожалуйста, ознакомьтесь с новой версией, чтобы продолжить использование сервиса.</div>
      <div style={{ display: "flex", gap: 8 }}>
        <a href={`/legal/${docType.toLowerCase().replace("_", "-")}`} target="_blank" rel="noreferrer" className="btn-primary" style={{ textDecoration: "none", padding: "8px 16px", borderRadius: 8, background: "#f59e0b", color: "#fff", fontWeight: 600 }}>Ознакомиться и продолжить</a>
        <button type="button" className="btn-secondary" onClick={() => setVisible(false)}>Позже</button>
      </div>
    </div>
  );
}
