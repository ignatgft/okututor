/**
 * Google Analytics 4 (gtag.js) infrastructure.
 *
 * Enabled only when VITE_GA_MEASUREMENT_ID is set at build time.
 * Tracking is disabled on private areas (admin, dashboard, student/tutor
 * zones, lesson rooms) so that no user activity from authenticated app
 * sections is reported — only public marketing pages are tracked.
 *
 * No personal data (emails, names, ids) is ever sent.
 */

const GA_ID: string | undefined = import.meta.env?.VITE_GA_MEASUREMENT_ID as string | undefined;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const PRIVATE_PREFIXES = [
  "/admin",
  "/student",
  "/dashboard",
  "/profile",
  "/settings",
  "/messages",
  "/notifications",
  "/schedule",
  "/lesson",
  "/progress",
  "/support",
  "/verify-email",
  "/reset-password",
  "/oauth",
];

// Public marketplace: /tutors, /repetitors, /repetitor, /tutor/:slug are public
// PRIVATE check must not mark /tutor/:id as private when it's marketplace profile.
// Only /tutor/dashboard, /tutor/requests, /tutor/profile, /tutor/courses, /tutor/schedule etc are private.
const PUBLIC_TUTOR_PROFILE_RE = /^\/tutor\/[^/]+$/;
const PUBLIC_REPETITOR_RE = /^\/repetitor\/[^/]+\/[^/]+$/;

export const isPrivatePath = (path: string): boolean => {
  const clean = path.split("?")[0].split("#")[0];
  if (PUBLIC_TUTOR_PROFILE_RE.test(clean) || PUBLIC_REPETITOR_RE.test(clean)) {
    // /tutor/:slug and /repetitor/:subject/:slug are public marketplace profiles
    // Do not treat as private even though they start with /tutor
    // But /tutor/dashboard, /tutor/requests, /tutor/profile remain private
    if (clean === "/tutor" || clean.startsWith("/tutor/") && ["/tutor/dashboard","/tutor/requests","/tutor/profile","/tutor/courses","/tutor/schedule","/tutor/lessons","/tutor/messages","/tutor/application","/tutor/students","/tutor/settings","/tutor/progress"].some((p) => clean === p || clean.startsWith(p + "/"))) {
      return true;
    }
    return false;
  }
  if (clean === "/tutor" || clean.startsWith("/tutor/")) return true; // fallback private
  if (clean.startsWith("/tutors") || clean.startsWith("/repetitors") || clean.startsWith("/repetitor")) return false;
  return PRIVATE_PREFIXES.some((p) => clean === p || clean.startsWith(`${p}/`));
};

export const isAnalyticsEnabled = (): boolean => Boolean(GA_ID);

let loaded = false;

/** Inject gtag.js once. Safe to call repeatedly; no-op without GA_ID. */
export function initAnalytics(): void {
  if (!GA_ID || loaded || typeof window === "undefined") return;
  loaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  // IP anonymization + no ad signals: privacy-safe configuration.
  window.gtag("config", GA_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    send_page_view: false, // page_view is sent manually per public route
  });

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

/** Send a page_view for a public route (called from router on path change). */
export function trackPageView(path: string, title?: string): void {
  if (!GA_ID || typeof window?.gtag !== "function") return;
  if (isPrivatePath(path)) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title,
    page_location: window.location.origin + path,
  });
}

/** Generic event (e.g. search, enroll_click). Ignored on private paths. */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (!GA_ID || typeof window?.gtag !== "function") return;
  if (isPrivatePath(window.location.pathname)) return;
  window.gtag("event", name, params);
}
