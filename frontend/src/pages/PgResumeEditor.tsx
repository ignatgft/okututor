import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Wallet, Phone, Globe, ChevronDown, Check, X } from "lucide-react";
import { usePageTitle } from "../components/pageTitleContext";
import { useDashboardResume } from "../features/dashboard/hooks/useDashboardResume";
import { tutorProfileMarketplaceApi } from "../api/marketplace/tutorProfileMarketplace.api";
import { useToast } from "../components/ui/Toast";
import ResumeExpiryTimer from "../components/ResumeExpiryTimer";
import PhotoDropzone from "../components/photo/PhotoDropzone";
import { apiClient } from "../api/http";
import { TUTOR_LANGUAGES } from "../constants/course";
import "../styles/ResumeEditor.css";
import "../components/photo/PhotoDropzone.css";
import "../components/photo/PhotoCropModal.css";

export default function PgResumeEditor(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeSection = searchParams.get("section");
  const setPageTitle = usePageTitle();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: existing, isLoading, refetch } = useDashboardResume(true);

  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [photoPending, setPhotoPending] = useState<File | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const initializedFor = useRef<string | null>(null);

  useEffect(() => { setPageTitle(t("tutor.edit_resume", "Редактирование резюме") as string); }, [setPageTitle, t]);

  const stripPhonePrefix = (raw: string): string => {
    if (!raw) return "";
    let s = raw.trim();
    // remove leading +996, 996, 00996, + etc
    s = s.replace(/^(\+?996[\s\-]*)/, "");
    return s.trim();
  };

  // helper: pick first existing key (handles camel/snake + alternative names)
  const pick = (rec: Record<string, unknown>, ...keys: string[]): unknown => {
    for (const k of keys) if (rec[k] !== undefined && rec[k] !== null) return rec[k];
    // also try lowercased
    for (const k of keys) {
      const found = Object.keys(rec).find((rk) => rk.toLowerCase() === k.toLowerCase());
      if (found) return rec[found];
    }
    return undefined;
  };

  useEffect(() => {
    if (existing && initializedFor.current !== existing.id) {
      initializedFor.current = existing.id;
      const rec = existing as unknown as Record<string, unknown>;
      // robust extraction: handles both camelCase and snake_case from backend/legacy
      const firstName = (pick(rec, "firstName", "first_name") as string) ?? existing.firstName ?? "";
      const lastName = (pick(rec, "lastName", "last_name") as string) ?? existing.lastName ?? "";
      const title = (pick(rec, "title") as string) ?? existing.title ?? "";
      const shortDescription = (pick(rec, "shortDescription", "short_description") as string) ?? existing.shortDescription ?? "";
      const about = (pick(rec, "about") as string) ?? existing.about ?? "";
      const tutorType = (pick(rec, "tutorType", "tutor_type") as string) ?? existing.tutorType ?? "STUDENT_TUTOR";
      const education = (pick(rec, "education") as string) ?? existing.education ?? "";
      const university = (pick(rec, "university") as string) ?? existing.university ?? "";
      const educationDetails = (pick(rec, "educationDetails", "education_details") as string) ?? "";
      const experienceYears = pick(rec, "experienceYears", "experience_years") ?? "";
      const priceFrom = pick(rec, "priceFrom", "price_from") ?? "";
      const priceTo = pick(rec, "priceTo", "price_to") ?? "";
      const currency = (pick(rec, "currency") as string) || "KGS";
      const online = pick(rec, "online");
      const offline = pick(rec, "offline");
      const cityObj = pick(rec, "city", "cityId") as Record<string, unknown> | null;
      const districtObj = pick(rec, "district", "districtId") as Record<string, unknown> | null;
      const phone = (pick(rec, "phone") as string) ?? "";
      const languagesArr = pick(rec, "languages") as string[] | string | undefined;
      const languagesStr = Array.isArray(languagesArr) ? languagesArr.join(", ") : typeof languagesArr === "string" ? languagesArr : "";
      const photoUrl = (pick(rec, "photoUrl", "photo_url", "photoURL", "avatarUrl", "avatar_url") as string) || "";

      setForm({
        firstName,
        lastName: lastName || "",
        title: title || "",
        shortDescription: shortDescription || "",
        about: about || "",
        tutorType: tutorType || "STUDENT_TUTOR",
        education: education || "",
        university: university || "",
        educationDetails: educationDetails || "",
        experienceYears: experienceYears as string | number ?? "",
        priceFrom: priceFrom as string | number ?? "",
        priceTo: priceTo as string | number ?? "",
        currency: currency || "KGS",
        online: online ?? true,
        offline: offline ?? false,
        cityId: (cityObj as Record<string, unknown> | null)?.["id"] as string || (typeof cityObj === "string" ? cityObj : "") || "",
        districtId: (districtObj as Record<string, unknown> | null)?.["id"] as string || (typeof districtObj === "string" ? districtObj : "") || "",
        phone: stripPhonePrefix(phone || ""),
        languages: languagesStr,
        photoUrl: photoUrl || "",
      });
    }
    // also update photoUrl when it changes externally (e.g., after photo upload via separate endpoint)
    if (existing && initializedFor.current === existing.id) {
      const rec = existing as unknown as Record<string, unknown>;
      const currentPhoto = form["photoUrl"] as string | undefined;
      const remotePhoto = (pick(rec, "photoUrl", "photo_url", "photoURL", "avatarUrl") as string) || "";
      // if remote has photo and local is empty (initial) or remote changed and not a blob preview, sync
      if (remotePhoto && remotePhoto !== currentPhoto && !String(currentPhoto || "").startsWith("blob:")) {
        setForm((prev) => ({ ...prev, photoUrl: remotePhoto }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  // close lang dropdown on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    if (langOpen) window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [langOpen]);

  const set = (k: string, v: unknown) => setForm((prev) => ({ ...prev, [k]: v }));

  const handlePhotoChange = async (file: File, previewUrl: string) => {
    set("photoUrl", previewUrl);
    setPhotoPending(file);
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      const res = await apiClient.request<Record<string, unknown>>("POST", "/api/v1/tutors/me/photo", fd as unknown as Record<string, unknown>);
      const url = (res.data?.["photoUrl"] as string) || (res.data?.["photo_url"] as string) || (res.data?.["url"] as string) || previewUrl;
      set("photoUrl", url);
      setPhotoPending(null);
      toast.success(t("tutor.photo_uploaded", "Фото загружено") as string);
    } catch {
      // keep previewUrl, will retry on save
      toast.error(t("tutor.photo_error", "Ошибка загрузки фото") as string);
    }
  };

  const handlePhotoRemove = async () => {
    set("photoUrl", "");
    setPhotoPending(null);
    try {
      await apiClient.request("DELETE", "/api/v1/tutors/me/photo");
      toast.success("Фото удалено");
    } catch { /* ignore */ }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form["firstName"] || String(form["firstName"]).trim() === "") {
      toast.error(t("validation.firstName_required", "Имя обязательно") as string);
      return;
    }
    // if photo pending but not yet uploaded, upload now
    let finalPhotoUrl = form["photoUrl"] as string | undefined;
    if (photoPending && finalPhotoUrl && finalPhotoUrl.startsWith("blob:")) {
      try {
        const fd = new FormData();
        fd.append("file", photoPending, photoPending.name);
        const r = await apiClient.request<Record<string, unknown>>("POST", "/api/v1/tutors/me/photo", fd as unknown as Record<string, unknown>);
        finalPhotoUrl = (r.data?.["photoUrl"] as string) || (r.data?.["photo_url"] as string) || finalPhotoUrl;
      } catch { /* keep blob preview, backend will reject but we show error */ }
    }

    setSaving(true);
    try {
      // normalize phone: UI shows +996 prefix separately, store with country code
      let phoneToSave: string | null = null;
      const rawPhone = form["phone"] ? String(form["phone"]).trim() : "";
      if (rawPhone) {
        if (rawPhone.startsWith("+")) phoneToSave = rawPhone;
        else {
          // strip non-digits and prepend +996
          const digits = rawPhone.replace(/\D/g, "");
          phoneToSave = digits ? `+996 ${digits}` : rawPhone;
        }
      }
      const payload: Record<string, unknown> = {
        firstName: String(form["firstName"]).trim(),
        lastName: form["lastName"] ? String(form["lastName"]).trim() : null,
        title: form["title"] ? String(form["title"]).trim() : null,
        shortDescription: form["shortDescription"] ? String(form["shortDescription"]).trim() : null,
        about: form["about"] ? String(form["about"]).trim() : null,
        tutorType: form["tutorType"] ? String(form["tutorType"]) : "STUDENT_TUTOR",
        education: form["education"] ? String(form["education"]).trim() : null,
        university: form["university"] ? String(form["university"]).trim() : null,
        educationDetails: form["educationDetails"] ? String(form["educationDetails"]).trim() : null,
        experienceYears: form["experienceYears"] ? Number(form["experienceYears"]) : null,
        priceFrom: form["priceFrom"] !== "" && form["priceFrom"] != null ? Number(form["priceFrom"]) : null,
        priceTo: form["priceTo"] !== "" && form["priceTo"] != null ? Number(form["priceTo"]) : null,
        currency: form["currency"] ? String(form["currency"]) : "KGS",
        online: Boolean(form["online"]),
        offline: Boolean(form["offline"]),
        cityId: form["cityId"] ? String(form["cityId"]) : null,
        districtId: form["districtId"] ? String(form["districtId"]) : null,
        phone: phoneToSave,
        languages: form["languages"] ? String(form["languages"]).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        photoUrl: finalPhotoUrl || null,
      };
      let res;
      if (existing) {
        res = await tutorProfileMarketplaceApi.updateMe(payload);
      } else {
        res = await tutorProfileMarketplaceApi.create(payload);
      }
      if ((res as unknown as Record<string, unknown>)?.["error"] || (res as unknown as { response?: { ok: boolean } })?.response?.ok === false) {
        throw new Error(((res as unknown as Record<string, unknown>)?.["data"] as Record<string, unknown>)?.["message"] as string || "Ошибка сохранения");
      }
      toast.success(t("dashboard.resume_saved", "Резюме сохранено") as string);
      // Invalidate all resume-related caches so changes propagate to dashboard, public profile, admin
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tutorProfile"] }),
        queryClient.invalidateQueries({ queryKey: ["tutorSearch"] }),
        queryClient.invalidateQueries({ queryKey: ["tutorPublicList"] }),
        queryClient.invalidateQueries({ queryKey: ["tutorProfiles"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "tutorProfiles"] }),
        refetch(),
      ]);
      navigate("/app/resumes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (activeSection) {
      const el = document.getElementById(`section-${activeSection}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeSection]);

  if (isLoading) return <div style={{ padding: 24, textAlign: "center" }}>{t("common.loading") as string}</div>;

  const isSectionActive = (id: string) => !activeSection || activeSection === id;
  const titleLen = String(form["title"] ?? "").length;
  const shortLen = String(form["shortDescription"] ?? "").length;
  const aboutLen = String(form["about"] ?? "").length;
  const eduDetailsLen = String(form["educationDetails"] ?? "").length;

  const languagesValue = String(form["languages"] ?? "");
  const selectedLangs = languagesValue.split(",").map((s) => s.trim()).filter(Boolean);
  // map display to Russian labels if known
  const langDisplayRu = selectedLangs.map((v) => {
    const found = TUTOR_LANGUAGES.find((l) => l.value.toLowerCase() === v.toLowerCase() || l.value === v);
    if (found) return t(found.labelKey, found.value) as string;
    return v;
  }).join(", ") || "Кыргызский, Русский, Английский (B1)";

  return (
    <div className="resume-editor-page">
      <div className="resume-editor-header">
        <h1>{existing ? t("tutor.edit_resume", "Редактирование резюме") : t("tutor.create_resume", "Создание резюме")}</h1>
        <p>Обновите информацию о себе и настройках резюме</p>
      </div>

      {activeSection && (
        <div style={{ marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={() => navigate("/app/resumes/edit")} className="btn btn-ghost" style={{ fontSize: 13 }}>← {t("common.all_sections", "Все разделы") as string}</button>
          <span style={{ fontSize: 13, color: "var(--color-text-muted)", textTransform: "capitalize" }}>{activeSection}</span>
        </div>
      )}

      {existing && ((existing as unknown as Record<string, unknown>)["expiresAt"] || (existing as unknown as Record<string, unknown>)["expires_at"]) && (
        <div style={{ marginBottom: 16, padding: 12, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12 }}>
          <ResumeExpiryTimer
            expiresAt={((existing as unknown as Record<string, unknown>)["expiresAt"] || (existing as unknown as Record<string, unknown>)["expires_at"]) as string}
            publishedAt={((existing as unknown as Record<string, unknown>)["publishedAt"] || (existing as unknown as Record<string, unknown>)["published_at"]) as string}
          />
        </div>
      )}

      <form onSubmit={handleSave} className="resume-editor-card">
        {/* Фото */}
        <div id="section-photo" style={{ display: isSectionActive("media") || isSectionActive("photo") ? "block" : "none" }}>
          <div className="resume-editor-section-title"><Camera size={18} /> Фото для резюме</div>
          <div style={{ marginTop: 10 }}>
            <PhotoDropzone
              value={form["photoUrl"] as string | null}
              onChange={handlePhotoChange}
              onRemove={handlePhotoRemove}
              required
              compact
              hint={form["photoUrl"] ? "Фото загружено" : undefined}
            />
          </div>
        </div>

        {/* Имя Фамилия */}
        <div id="section-main" style={{ display: isSectionActive("main") ? "block" : "none" }}>
          <div className="resume-editor-grid2">
            <div className="resume-field">
              <label>Имя <span className="req">*</span></label>
              <input value={String(form["firstName"] ?? "")} onChange={(e) => set("firstName", e.target.value)} required maxLength={100} placeholder="Введите имя" />
            </div>
            <div className="resume-field">
              <label>Фамилия</label>
              <input value={String(form["lastName"] ?? "")} onChange={(e) => set("lastName", e.target.value)} maxLength={100} placeholder="Введите фамилию" />
            </div>
          </div>

          <div className="resume-field" style={{ marginTop: 12 }}>
            <label>Заголовок (до 200)</label>
            <input value={String(form["title"] ?? "")} onChange={(e) => set("title", e.target.value)} maxLength={200} placeholder="ОРТ" />
            <div className="resume-counter" style={{ color: titleLen > 200 ? "var(--color-danger)" : undefined }}>{titleLen}/200</div>
          </div>

          <div className="resume-field" style={{ marginTop: 4 }}>
            <label>Краткое описание (до 300)</label>
            <textarea value={String(form["shortDescription"] ?? "")} onChange={(e) => set("shortDescription", e.target.value)} maxLength={300} rows={2} placeholder="Репетитор по математике и физике для школьников и студентов." />
            <div className="resume-counter">{shortLen}/300</div>
          </div>

          <div className="resume-field" style={{ marginTop: 4 }}>
            <label>О себе (до 5000)</label>
            <textarea value={String(form["about"] ?? "")} onChange={(e) => set("about", e.target.value)} maxLength={5000} rows={4} placeholder="Студент 3 курса, увлечённый точными науками и объясняю сложные темы простым языком. Индивидуальный подход и помощь в достижении целей." />
            <div className="resume-counter">{aboutLen}/5000</div>
          </div>
        </div>

        {/* Образование */}
        <div id="section-education" style={{ display: isSectionActive("education") ? "block" : "none" }}>
          <div className="resume-editor-grid2">
            <div className="resume-field">
              <label>Тип репетитора</label>
              <select value={String(form["tutorType"] ?? "STUDENT_TUTOR")} onChange={(e) => set("tutorType", e.target.value)}>
                <option value="STUDENT_TUTOR">{t("tutor.type_student", "Студент") as string}</option>
                <option value="TEACHER">{t("tutor.type_teacher", "Преподаватель") as string}</option>
                <option value="PROFESSIONAL_TUTOR">{t("tutor.type_pro", "Профи") as string}</option>
              </select>
            </div>
            <div className="resume-field">
              <label>Опыт (лет)</label>
              <input type="number" min={0} max={80} value={String(form["experienceYears"] ?? "")} onChange={(e) => set("experienceYears", e.target.value)} placeholder="Введите опыт в годах" />
            </div>
          </div>

          <div className="resume-editor-grid2" style={{ marginTop: 12 }}>
            <div className="resume-field">
              <label>Образование</label>
              <input value={String(form["education"] ?? "")} onChange={(e) => set("education", e.target.value)} maxLength={500} placeholder="Например: Бакалавриат" />
            </div>
            <div className="resume-field">
              <label>ВУЗ</label>
              <input value={String(form["university"] ?? "")} onChange={(e) => set("university", e.target.value)} maxLength={200} placeholder="Например: КРСУ" />
            </div>
          </div>

          <div className="resume-field" style={{ marginTop: 12 }}>
            <label>Детали образования</label>
            <textarea value={String(form["educationDetails"] ?? "")} onChange={(e) => set("educationDetails", e.target.value)} maxLength={1000} rows={2} placeholder="Кыргызско-Российский Славянский университет (КРСУ)&#10;Факультет математики, информатики и естественных наук" />
            <div className="resume-counter">{eduDetailsLen}/1000</div>
          </div>
        </div>

        {/* Цена занятий */}
        <div id="section-price" style={{ display: isSectionActive("price") ? "block" : "none" }}>
          <div className="resume-editor-section-title"><Wallet size={18} /> Цена занятий</div>
          <div className="resume-editor-grid3" style={{ marginTop: 10 }}>
            <div className="resume-field">
              <label>Цена от</label>
              <div className="resume-price-wrap">
                <input type="number" min={0} value={String(form["priceFrom"] ?? "")} onChange={(e) => set("priceFrom", e.target.value)} placeholder="500" />
                <span className="resume-price-suffix">₽</span>
              </div>
            </div>
            <div className="resume-field">
              <label>Цена до</label>
              <div className="resume-price-wrap">
                <input type="number" min={0} value={String(form["priceTo"] ?? "")} onChange={(e) => set("priceTo", e.target.value)} placeholder="1000" />
                <span className="resume-price-suffix">₽</span>
              </div>
            </div>
            <div className="resume-field">
              <label>Валюта</label>
              <select value={String(form["currency"] ?? "KGS")} onChange={(e) => set("currency", e.target.value)}>
                <option value="KGS">KGS</option>
                <option value="RUB">RUB</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="resume-field" style={{ marginTop: 12 }}>
            <label>Формат занятий</label>
            <div className="resume-checkbox-row">
              <label className="resume-checkbox">
                <input type="checkbox" checked={Boolean(form["online"])} onChange={(e) => set("online", e.target.checked)} />
                Онлайн
              </label>
              <label className="resume-checkbox">
                <input type="checkbox" checked={Boolean(form["offline"])} onChange={(e) => set("offline", e.target.checked)} />
                Офлайн
              </label>
            </div>
          </div>
        </div>

        {/* Контакты */}
        <div id="section-location" style={{ display: isSectionActive("location") ? "block" : "none" }}>
          <div className="resume-editor-section-title"><Phone size={16} /> Контактный телефон</div>
          <div className="resume-field" style={{ marginTop: 10 }}>
            <div className="resume-phone-wrap">
              <span className="resume-phone-prefix">+996</span>
              <input value={String(form["phone"] ?? "")} onChange={(e) => set("phone", e.target.value)} maxLength={40} placeholder="Введите номер телефона" />
            </div>
          </div>
        </div>

        {/* Языки */}
        <div id="section-subjects" style={{ display: isSectionActive("subjects") ? "block" : "none" }}>
          <div className="resume-editor-section-title"><Globe size={16} /> Языки</div>
          <div className="resume-field" style={{ marginTop: 10, position: "relative" }} ref={langRef}>
            <button type="button" className="resume-lang-trigger" onClick={() => setLangOpen((v) => !v)}>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{langDisplayRu}</span>
              <ChevronDown size={16} style={{ flexShrink: 0, transform: langOpen ? "rotate(180deg)" : undefined, transition: "transform 160ms" }} />
            </button>
            {langOpen && (
              <div className="resume-lang-dropdown">
                {TUTOR_LANGUAGES.map((l) => {
                  const checked = selectedLangs.some((v) => v.toLowerCase() === l.value.toLowerCase());
                  return (
                    <label key={l.value} className="resume-lang-option">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const vals = new Set(selectedLangs.map((v) => v.toLowerCase()));
                          if (e.target.checked) vals.add(l.value);
                          else vals.delete(l.value.toLowerCase());
                          // keep original casing for selected? map back to value
                          const out: string[] = [];
                          for (const v of vals) {
                            const found = TUTOR_LANGUAGES.find((x) => x.value.toLowerCase() === v);
                            out.push(found ? found.value : v);
                          }
                          // also keep any custom entered langs not in list
                          for (const v of selectedLangs) {
                            if (!TUTOR_LANGUAGES.some((x) => x.value.toLowerCase() === v.toLowerCase()) && !out.some((x) => x.toLowerCase() === v.toLowerCase())) {
                              out.push(v);
                            }
                          }
                          set("languages", out.join(", "));
                        }}
                      />
                      <span>{t(l.labelKey, l.value) as string}</span>
                    </label>
                  );
                })}
                <div style={{ display: "flex", gap: 8, marginTop: 6, paddingTop: 8, borderTop: "1px solid var(--color-border-light)" }}>
                  <input
                    placeholder="Добавить язык вручную"
                    style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 13 }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          const cur = selectedLangs.slice();
                          if (!cur.some((v) => v.toLowerCase() === val.toLowerCase())) {
                            cur.push(val);
                            set("languages", cur.join(", "));
                          }
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>Через запятую: например, Кыргызский, Русский, Английский</p>
          </div>
        </div>

        <div className="resume-footer">
          <button type="button" onClick={() => navigate("/app/resumes")} className="btn btn-secondary">
            <X size={16} /> Отмена
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ opacity: saving ? 0.7 : 1 }}>
            {saving ? (t("common.saving", "Сохранение...") as string) : (t("common.save", "Сохранить") as string)} <Check size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
