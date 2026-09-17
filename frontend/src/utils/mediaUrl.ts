/**
 * Нормализация URL медиа из R2 / S3.
 * R2 direct URLs вида https://pub-xxx.r2.dev/{key} возвращают 401 для приватного бакета.
 * Бэкенд прокси /api/v1/files/media/{key} читает из R2 по S3 API с креденшалами и работает всегда.
 * Эта функция конвертит любые прямые R2 URL в прокси, а также оставляет относительные /api/v1/files/media/ как есть.
 * Также резолвит относительные URL через backend base (для dev с vite proxy /api -> 8080).
 */

export function normalizeMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  // already proxy or relative local path
  if (trimmed.startsWith("/api/v1/files/media/")) return trimmed;
  // blob: for preview before upload
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return trimmed;
  // R2 direct: https://pub-xxx.r2.dev/... or https://xxx.r2.cloudflarestorage.com/bucket/...
  // extract key after domain
  try {
    const u = new URL(trimmed);
    const host = u.hostname.toLowerCase();
    if (host.includes("r2.dev") || host.includes("r2.cloudflarestorage.com")) {
      // pathname is /{key} or /bucket/{key}
      let pathname = u.pathname;
      // for r2.cloudflarestorage.com, URL is https://<account>.r2.cloudflarestorage.com/<bucket>/<key>
      // we need to strip bucket segment if present (known bucket = okututor)
      // pathname = /okututor/tutors/... -> /tutors/...
      if (host.includes("r2.cloudflarestorage.com")) {
        // remove first segment (bucket)
        const parts = pathname.split("/").filter(Boolean);
        if (parts.length > 1) {
          // first part is bucket name, drop it
          pathname = "/" + parts.slice(1).join("/");
        }
      }
      // ensure leading slash
      if (!pathname.startsWith("/")) pathname = "/" + pathname;
      return `/api/v1/files/media${pathname}`;
    }
    // other absolute URLs (https://cdn.example.com/...) — leave as is, but could also proxy if needed
    // if it's absolute and not R2, return as is (e.g., external CDN)
    return trimmed;
  } catch {
    // not a valid URL, treat as relative key
    if (trimmed.startsWith("tutors/") || trimmed.startsWith("users/") || trimmed.startsWith("courses/") || trimmed.startsWith("messages/")) {
      return `/api/v1/files/media/${trimmed}`;
    }
    return trimmed;
  }
}

export function resolveAvatarUrl(url?: string | null, fallback?: string | null): string | null {
  const normalized = normalizeMediaUrl(url);
  if (normalized) return normalized;
  if (fallback) return normalizeMediaUrl(fallback);
  return null;
}
