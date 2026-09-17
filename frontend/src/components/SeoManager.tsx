import { useEffect } from "react";
import useSeoSettings from "../hooks/useSeoSettings";

export default function SeoManager() {
  const { seo } = useSeoSettings();

  useEffect(() => {
    if (seo?.structuredData) {
      let el = document.getElementById("seo-structured-data") as HTMLScriptElement | null;
      if (!el) {
        el = document.createElement("script");
        el.id = "seo-structured-data";
        el.type = "application/ld+json";
        document.head.appendChild(el);
      }
      el.textContent = seo.structuredData;
    }
  }, [seo]);

  return null;
}
