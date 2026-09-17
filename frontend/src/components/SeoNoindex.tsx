import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isPrivatePath } from "../utils/analytics";

const SITE_URL = "https://okututor.com";

function setMeta(attr: "name" | "property", key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Runtime SEO guard:
 *  - private/admin routes get <meta name="robots" content="noindex, nofollow">
 *    so authenticated app content never appears in Google results;
 *  - public routes get index,follow and a canonical URL;
 *  - document.title is synced from the page-title context via document.title
 *    (set by pages) — here we only manage robots/canonical.
 */
export default function SeoNoindex(): null {
  const location = useLocation();
  const isPrivate = isPrivatePath(location.pathname);
  // §19: не индексировать бесконечные filter URLs (many params / high page)
  const isFilterNoindex = (() => {
    const p = location.pathname;
    const qs = location.search;
    if (p === "/tutors" || p.startsWith("/repetitors") || p.startsWith("/tutors/")) {
      const sp = new URLSearchParams(qs);
      const page = Number(sp.get("page") || 0);
      // page > 2 → likely infinite pagination, noindex
      if (page > 2) return true;
      // too many filter combos without main subject → likely thin page
      const filterCount = ["subject","city","price_min","price_max","format","tutor_type","level","q"].filter((k) => sp.get(k)).length;
      if (filterCount >= 4 && !sp.get("subject") && !sp.get("q")) return true;
      if (qs.includes("price_min") && qs.includes("price_max") && filterCount >= 4) return true;
    }
    // marketplace tutor profile with /repetitor — keep index, but canonical is set via applyTutorSeo
    return false;
  })();

  const shouldNoindex = isPrivate || isFilterNoindex;

  useEffect(() => {
    setMeta("name", "robots", shouldNoindex ? "noindex, nofollow, noarchive" : "index, follow, max-image-preview:large");

    if (shouldNoindex) {
      // remove canonical on private pages so Google never sees a canonical pointing at private content
      // for filter noindex, keep canonical to main listing
      if (isPrivate) document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.remove();
      else {
        let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (!link) {
          link = document.createElement("link");
          link.rel = "canonical";
          document.head.appendChild(link);
        }
        link.href = SITE_URL + location.pathname;
      }
    } else {
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = SITE_URL + location.pathname;
    }
  }, [location.pathname, location.search, shouldNoindex, isPrivate]);

  return null;
}
