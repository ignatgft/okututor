import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

/**
 * Локализация OkuTutor — ru primary (Кыргызстан), en secondary, ky/ky tertiary.
 * RU bundled INLINE чтобы избежать FOUC для 80% аудитории.
 * KY lazy — грузится по требованию.
 *
 * Автоподбор: localStorage → navigator.languages (с учётом navigator.languages) → htmlTag → fallback ru.
 * kg (устаревший код для кыргызского) алиасится → ky на уровне детекции + пост-обработки.
 */

import translationEN from "./locales/en/translation.json";
import translationRU from "./locales/ru/translation.json";

const localeLoaders: Record<string, () => Promise<{ default: object }>> = {
  en: () => import("./locales/en/translation.json"),
  ru: () => import("./locales/ru/index.ts"),
  ky: () => import("./locales/kg/index.ts"),
  // kg alias → ky loader
  kg: () => import("./locales/kg/index.ts"),
};

const loadedLngs = new Set<string>(["en", "ru"]); // en+ru bundled, считаем загруженными

export async function loadLocale(lng: string): Promise<void> {
  const base = normalizeLang(lng);
  const loader = localeLoaders[base] ?? localeLoaders.ru;
  if (!loadedLngs.has(base)) {
    const { default: resources } = await loader();
    i18n.addResourceBundle(base, "translation", resources, true, true);
    loadedLngs.add(base);
  }
}

function normalizeLang(code: string): string {
  const base = code.split("-")[0].toLowerCase();
  if (base === "kg") return "ky";
  if (base === "ky") return "ky";
  if (base === "ru") return "ru";
  if (base === "en") return "en";
  return base;
}

function detectInitialLang(): string {
  try {
    const stored = localStorage.getItem("i18nextLng");
    if (stored) return normalizeLang(stored);
  } catch { /* ignore storage */ }
  try {
    const navLangs: string[] = (navigator.languages as string[] | undefined) ?? (navigator.language ? [navigator.language] : []);
    for (const raw of navLangs) {
      const n = normalizeLang(raw);
      if (["ru", "ky", "en"].includes(n)) return n;
      // ru-RU, en-US, ky-KG already normalized above
    }
  } catch { /* ignore */ }
  const htmlLang = document.documentElement.getAttribute("lang");
  if (htmlLang) {
    const h = normalizeLang(htmlLang);
    if (["ru", "ky", "en"].includes(h)) return h;
  }
  return "ru";
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: translationEN },
      ru: { translation: translationRU },
    },
    partialBundledLanguages: true,
    supportedLngs: ["ru", "ky", "en", "kg"],
    nonExplicitSupportedLngs: true,
    fallbackLng: "ru",
    load: "languageOnly",
    cleanCode: true,
    lowerCaseLng: true,
    pluralSeparator: "_",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
      checkWhitelist: true,
      convertDetectedLanguage: (lng: string) => normalizeLang(lng),
    },
  });

// Алиас kg → ky на уровне languageUtils (двойная страховка)
if (typeof i18n.services?.languageUtils?.formatLanguageCode === "function") {
  const orig = i18n.services.languageUtils.formatLanguageCode.bind(i18n.services.languageUtils);
  i18n.services.languageUtils.formatLanguageCode = (code: string) => (code === "kg" ? "ky" : orig(code));
}

// Синхронно выставляем корректный язык до первого рендера (без FOUC)
const detected = detectInitialLang();
if (i18n.language !== detected && i18n.resolvedLanguage !== detected) {
  // changeLanguage is async, but we can set html lang sync and preload ky if needed
  document.documentElement.setAttribute("lang", detected);
  if (detected === "ky" && !loadedLngs.has("ky")) {
    void loadLocale(detected).then(() => {
      void i18n.changeLanguage(detected);
    });
  } else {
    void i18n.changeLanguage(detected);
  }
} else {
  document.documentElement.setAttribute("lang", normalizeLang(i18n.resolvedLanguage || i18n.language || detected));
}

// Подгрузка ky чанка при первом выборе кыргызского
i18n.on("languageChanged", (lng) => {
  const n = normalizeLang(lng);
  document.documentElement.setAttribute("lang", n);
  // Persist normalized code (avoid "kg" in storage)
  try { localStorage.setItem("i18nextLng", n); } catch { /* ignore */ }
  void loadLocale(n);
});

export default i18n;
