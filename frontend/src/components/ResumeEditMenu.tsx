import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FileText, GraduationCap, Banknote, BookOpen, MapPin, Image as ImageIcon, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import ConfirmModal from "./ui/ConfirmModal";
import { useToast } from "./ui/Toast";

interface Props {
  onClose?: () => void;
  resumeId?: string;
}

const SECTIONS = [
  { id: "main", labelKey: "resume_edit.main", fallback: "Основное", Icon: FileText, desc: "Имя, заголовок, описание" },
  { id: "education", labelKey: "resume_edit.education", fallback: "Образование", Icon: GraduationCap, desc: "ВУЗ, специальность, опыт" },
  { id: "price", labelKey: "resume_edit.price", fallback: "Цена и формат", Icon: Banknote, desc: "Стоимость, онлайн/офлайн" },
  { id: "subjects", labelKey: "resume_edit.subjects", fallback: "Предметы и уровни", Icon: BookOpen, desc: "Предметы, уровни, языки" },
  { id: "location", labelKey: "resume_edit.location", fallback: "Локация", Icon: MapPin, desc: "Город, район, телефон" },
  { id: "media", labelKey: "resume_edit.media", fallback: "Фото и достижения", Icon: ImageIcon, desc: "Аватар, достижения" },
] as const;

export default function ResumeEditMenu({ onClose, resumeId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 340 });

  const updateCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 340;
    const menuHeight = 520; // estimate for flip check
    // center under trigger
    let left = rect.left + rect.width / 2 - menuWidth / 2;
    if (left + menuWidth > window.innerWidth - 12) left = window.innerWidth - menuWidth - 12;
    if (left < 12) left = 12;
    let top = rect.bottom + 8;
    // flip above if would go off bottom
    if (top + menuHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - menuHeight - 8);
    }
    setCoords({ top, left, width: menuWidth });
  };

  useLayoutEffect(() => {
    if (open) updateCoords();
  }, [open]);

  // precise flip after menu renders (measure actual height)
  useLayoutEffect(() => {
    if (!open || !menuRef.current || !triggerRef.current) return;
    const menuH = menuRef.current.getBoundingClientRect().height;
    const trig = triggerRef.current.getBoundingClientRect();
    let top = trig.bottom + 8;
    if (top + menuH > window.innerHeight - 12) {
      top = Math.max(12, trig.top - menuH - 8);
      if (top !== coords.top) setCoords((c) => ({ ...c, top }));
    }
  }, [open, coords.left, coords.width, coords.top]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => updateCoords();
    const onScroll = () => updateCoords();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const handleSelect = (section: string) => {
    const base = resumeId ? `/app/resumes/edit?section=${section}` : `/app/resumes/edit?section=${section}`;
    navigate(base);
    onClose?.();
    setOpen(false);
  };

  const triggerButton = (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="btn btn-secondary"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-2)",
        minHeight: "var(--touch-target)",
        fontWeight: "var(--font-weight-semibold)",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        color: "var(--color-primary)",
        borderRadius: "var(--radius-lg)",
        width: "100%",
        whiteSpace: "nowrap",
      }}
      aria-haspopup="menu"
      aria-expanded={open}
    >
      <span aria-hidden>✎</span> {t("common.edit", "Редактировать")} <span style={{ fontSize: 10, opacity: 0.6 }}>{open ? "▴" : "▾"}</span>
    </button>
  );

  if (!open) {
    return triggerButton;
  }

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        width: coords.width,
        maxWidth: "calc(100vw - 24px)",
        maxHeight: "min(78vh, 620px)",
        overflowY: "auto",
        overflowX: "hidden",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-xl)",
        padding: "var(--space-2)",
        zIndex: 9999,
        animation: "slideUp 220ms var(--ease-out)",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
      }}
    >
        <div style={{ padding: "var(--space-2) var(--space-3) var(--space-3)", borderBottom: "1px solid var(--color-border-light)", marginBottom: "var(--space-2)" }}>
          <div style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-base)", color: "var(--color-text)" }}>{t("resume_edit.choose_section", "Что хотите изменить?")}</div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>{t("resume_edit.hint", "Выберите раздел — откроется редактор")}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              role="menuitem"
              onClick={() => handleSelect(s.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid transparent",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                transition: "background var(--transition-fast), border-color var(--transition-fast)",
                width: "100%",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface-hover)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
              }}
            >
              <span style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "var(--color-primary-light)", color: "var(--color-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><s.Icon size={18} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: "var(--font-weight-medium)", fontSize: "var(--font-size-sm)", color: "var(--color-text)" }}>{t(s.labelKey, s.fallback)}</span>
                <span style={{ display: "block", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", lineHeight: 1.3 }}>{s.desc}</span>
              </span>
              <span style={{ color: "var(--color-text-muted)", fontSize: 14 }} aria-hidden>›</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: "var(--space-2)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--color-border-light)", display: "flex", gap: "var(--space-2)" }}>
          <button type="button" onClick={() => { navigate("/app/resumes/edit"); onClose?.(); }} className="btn btn-ghost" style={{ flex: 1, fontSize: "var(--font-size-sm)", minHeight: 36 }}>
            {t("resume_edit.full_editor", "Полный редактор")}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary" style={{ flex: 1, fontSize: "var(--font-size-sm)", minHeight: 36 }}>
            {t("common.close", "Закрыть")}
          </button>
        </div>

        <div style={{ marginTop: "var(--space-2)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--color-border-light)" }}>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", width: "100%", padding: "var(--space-3)", borderRadius: "var(--radius-lg)", border: "1px solid transparent", background: "transparent", color: "var(--color-danger)", cursor: "pointer", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", transition: "background var(--transition-fast)" }}
            onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.background = "var(--color-danger-soft)"}
            onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
          >
            <Trash2 size={16} /> {t("dashboard.delete_resume", "Удалить резюме")}
          </button>
        </div>
      </div>
  );

  return (
    <>
      {triggerButton}
      {typeof document !== "undefined" ? createPortal(menu, document.body) : null}
      <div
        role="presentation"
        onClick={() => setOpen(false)}
        style={{ position: "fixed", inset: 0, zIndex: 9998, background: "transparent" }}
        aria-hidden
      />
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={t("dashboard.delete_confirm_title", "Удалить резюме?")}
        message={t("dashboard.delete_confirm_message", "Вы действительно хотите удалить резюме? Оно исчезнет из поиска, а восстановить его будет невозможно.")}
        confirmLabel={t("common.delete", "Удалить")}
        cancelLabel={t("common.cancel", "Отмена")}
        danger
        loading={deleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            const { apiClient } = await import("../api/http");
            const res = await apiClient.delete("/api/v1/tutors/me");
            if (res.response.ok) {
              toast.success(t("dashboard.deleted", "Резюме удалено"));
              setShowDeleteConfirm(false);
              setOpen(false);
              onClose?.();
              try { queryClient.invalidateQueries({ queryKey: ["tutorProfile", "me"] }); } catch {}
              try { queryClient.removeQueries({ queryKey: ["tutorProfile", "me"] }); } catch {}
              navigate("/app/resumes");
            } else {
              const msg = (res.data as Record<string, unknown>)?.["message"] as string | undefined
                  ?? (res.data as Record<string, unknown>)?.["error"] as string | undefined
                  ?? t("common.error", "Ошибка");
              if (res.response.status === 404 || (typeof msg === "string" && msg.toLowerCase().includes("not found"))) {
                toast.success(t("dashboard.deleted", "Резюме удалено"));
                setShowDeleteConfirm(false);
                setOpen(false);
                onClose?.();
                try { queryClient.invalidateQueries({ queryKey: ["tutorProfile", "me"] }); } catch {}
                try { queryClient.removeQueries({ queryKey: ["tutorProfile", "me"] }); } catch {}
                navigate("/app/resumes");
              } else {
                toast.error(msg);
              }
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.toLowerCase().includes("not found") || msg.includes("404")) {
              toast.success(t("dashboard.deleted", "Резюме удалено"));
              setShowDeleteConfirm(false);
              setOpen(false);
              onClose?.();
              try { queryClient.invalidateQueries({ queryKey: ["tutorProfile", "me"] }); } catch {}
              navigate("/app/resumes");
            } else {
              toast.error(msg);
            }
          } finally {
            setDeleting(false);
          }
        }}
      />
    </>
  );
}
