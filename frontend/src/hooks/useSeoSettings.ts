import { useEffect, useState } from "react";
import { seoApi, type SeoSettings } from "../api/seo.api";

export default function useSeoSettings() {
  const [seo, setSeo] = useState<SeoSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { response, data } = await seoApi.getSettings();
        if (!cancelled && response.ok && data) {
          setSeo(data as SeoSettings);
          applySeoToHead(data as SeoSettings);
        }
      } catch {
        // fallback to static index.html meta
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { seo, loading };
}

function applySeoToHead(seo: SeoSettings) {
  if (!seo) return;
  if (seo.siteTitle) document.title = seo.siteTitle;
  updateMeta("description", seo.siteDescription);
  updateMeta("keywords", seo.siteKeywords);
  updateMetaProperty("og:title", seo.siteTitle);
  updateMetaProperty("og:description", seo.siteDescription);
  updateMetaProperty("og:image", seo.ogImageUrl);
  updateLink("canonical", seo.canonicalBaseUrl);
}

function updateMeta(name: string, content: string) {
  if (!content) return;
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}
function updateMetaProperty(property: string, content: string) {
  if (!content) return;
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.content = content;
}
function updateLink(rel: string, href: string) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}
