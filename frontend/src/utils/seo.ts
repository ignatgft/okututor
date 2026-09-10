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
}

const SITE_URL = "https://okututor.com";

export function buildTutorTitle(tutor: TutorSeoData): string {
  const parts = [tutor.name];
  if (tutor.subject) parts.push(tutor.subject);
  if (tutor.city) parts.push(tutor.city);
  return `${parts.join(" — ")} | OkuTutor`;
}

export function buildTutorDescription(tutor: TutorSeoData): string {
  if (tutor.bio && tutor.bio.trim().length > 40) return tutor.bio.trim().slice(0, 160);
  const subj = tutor.subject ? ` по ${tutor.subject}` : "";
  const city = tutor.city ? ` в ${tutor.city}` : " в Кыргызстане";
  return `Репетитор ${tutor.name}${subj}${city} на OkuTutor — анкета, цена, отзывы. Свяжитесь и начните занятия онлайн или офлайн.`;
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
    jobTitle: tutor.tutorType || "Репетитор",
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
