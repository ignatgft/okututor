/**
 * SEO helpers for tutor marketplace
 * - title/description/canonical/OG/structured data
 */

export interface TutorSeoData {
  name: string;
  subject?: string;
  city?: string;
  bio?: string;
  price?: number | null;
  currency?: string;
  avatar?: string | null;
  slug: string;
  tutorType?: string;
  noindex?: boolean;
  /** BCP-47 lang for localized meta templates (ru/en/ky). Default ru. */
  lang?: string;
}

const SITE_URL = "https://okututor.com";

function seoLang(lang?: string): "ru" | "en" | "kg" {
  const b = String(lang || "").split("-")[0].toLowerCase();
  if (b === "en") return "en";
  if (b === "ky" || b === "kg") return "kg";
  return "ru";
}

export function buildTutorTitle(tutor: TutorSeoData): string {
  const parts = [tutor.name];
  if (tutor.subject) parts.push(tutor.subject);
  if (tutor.city) parts.push(tutor.city);
  return `${parts.join(" — ")} | OkuTutor`;
}

const TUTOR_DESC_TEMPLATES = {
  ru: (name: string, subj: string, city: string) =>
    `Репетитор ${name}${subj}${city} на OkuTutor — анкета, цена, отзывы. Свяжитесь и начните занятия онлайн или офлайн.`,
  en: (name: string, subj: string, city: string) =>
    `Tutor ${name}${subj}${city} on OkuTutor — profile, pricing, reviews. Get in touch and start learning online or in person.`,
  kg: (name: string, subj: string, city: string) =>
    `OkuTutor'до репетитор ${name}${subj}${city} — анкета, баасы, пикирлер. Байланышып, онлайн же жүзмө-жүз сабак баштаңыз.`,
} as const;

const SEO_PREP = {
  ru: { subjectPrep: " по ", cityPrep: " в ", defaultCity: " в Кыргызстане", tutor: "Репетитор" },
  en: { subjectPrep: " — ", cityPrep: " in ", defaultCity: " in Kyrgyzstan", tutor: "Tutor" },
  kg: { subjectPrep: " боюнча ", cityPrep: " ", defaultCity: " Кыргызстанда", tutor: "Репетитор" },
} as const;

export function buildTutorDescription(tutor: TutorSeoData): string {
  if (tutor.bio && tutor.bio.trim().length > 40) return tutor.bio.trim().slice(0, 160);
  const lang = seoLang(tutor.lang);
  const prep = SEO_PREP[lang];
  const subj = tutor.subject ? `${prep.subjectPrep}${tutor.subject}` : "";
  const city = tutor.city ? `${prep.cityPrep}${tutor.city}` : prep.defaultCity;
  return TUTOR_DESC_TEMPLATES[lang](tutor.name, subj, city);
}

export function buildTutorCanonical(tutor: TutorSeoData): string {
  const subj = tutor.subject ? `/${slugifySubject(tutor.subject)}` : "";
  return `${SITE_URL}/repetitor${subj}/${tutor.slug}`;
}

function slugifySubject(subject: string): string {
  return subject
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function buildTutorJsonLd(tutor: TutorSeoData) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: tutor.name,
    description: buildTutorDescription(tutor),
    url: buildTutorCanonical(tutor),
    image: tutor.avatar || undefined,
    jobTitle: tutor.tutorType || (seoLang(tutor.lang) === "en" ? "Tutor" : "Репетитор"),
    address: tutor.city ? { "@type": "PostalAddress", addressLocality: tutor.city, addressCountry: "KG" } : undefined,
    offers: tutor.price
      ? {
          "@type": "Offer",
          price: String(tutor.price),
          priceCurrency: tutor.currency || "KGS",
          availability: "https://schema.org/InStock",
        }
      : undefined,
  };
}

export function applyTutorSeo(tutor: TutorSeoData): void {
  if (typeof document === "undefined") return;
  if (tutor.noindex) setMeta("name", "robots", "noindex, nofollow, noarchive");
  else setMeta("name", "robots", "index, follow, max-image-preview:large");
  const title = buildTutorTitle(tutor);
  const desc = buildTutorDescription(tutor);
  const canonicalUrl = buildTutorCanonical(tutor);
  const jsonLd = buildTutorJsonLd(tutor);

  document.title = title;

  setMeta("name", "description", desc);
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", desc);
  setMeta("property", "og:url", canonicalUrl);
  setMeta("property", "og:type", "profile");
  if (tutor.avatar) setMeta("property", "og:image", tutor.avatar);

  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = canonicalUrl;

  // JSON-LD
  let script = document.head.querySelector<HTMLScriptElement>('script[data-seo="tutor-jsonld"]');
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seo = "tutor-jsonld";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(jsonLd);
}

export function clearTutorSeo(): void {
  if (typeof document === "undefined") return;
  document.head.querySelector<HTMLScriptElement>('script[data-seo="tutor-jsonld"]')?.remove();
  setMeta("property", "og:type", "website");
  setMeta("property", "og:image", `${SITE_URL}/og-cover.png`);
  setMeta("property", "og:title", "OkuTutor — найдите репетитора онлайн");
  setMeta("property", "og:description", "Образовательная платформа: репетиторы по математике, языкам и IT. Онлайн-занятия с опытными педагогами.");
  setMeta("property", "og:url", `${SITE_URL}/`);
  setMeta("name", "description", "OkuTutor — образовательная платформа: найдите репетитора по математике, языкам и IT, записывайтесь на онлайн-занятия и учитесь с опытными педагогами.");
}

function setMeta(attr: "name" | "property", key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
