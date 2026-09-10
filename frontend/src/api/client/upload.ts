import { buildApiUrl } from "../config";
import { getAccessToken } from "../token";
import type { HttpResult } from "./responseParser";
import { ApiRequestError, normalizeApiError } from "./errorMapper";
import { isRefreshInProgress, refreshAccessToken, waitForRefresh } from "./refreshManager";

interface UploadParams {
  endpoint: string;
  file: File;
  fieldName?: string;
  method?: string;
  onProgress?: (percent: number) => void;
}

interface XhrResponse {
  ok: boolean;
  status: number;
  headers: { get: (name: string) => string | null };
}

/**
 * Multipart upload via XMLHttpRequest with progress reporting.
 * Resolves with the same `{ response, data }` shape used across the API
 * layer (`response.ok`, `response.status`, parsed `data`).
 */
export function uploadFile<T = unknown>({
  endpoint,
  file,
  fieldName = "file",
  method = "POST",
  onProgress,
}: UploadParams): Promise<HttpResult<T>> {
  return new Promise<HttpResult<T>>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append(fieldName, file, file.name);

    xhr.open(method, buildApiUrl(endpoint));

    const token = getAccessToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Accept", "application/json");

    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable && typeof onProgress === "function") {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onerror = (): void =>
      reject(new ApiRequestError(normalizeApiError({ status: 0, message: "Network error", cause: { name: "NetworkError" } })));
    xhr.onabort = (): void =>
      reject(new ApiRequestError(normalizeApiError({ status: 0, message: "Upload aborted", cause: { name: "AbortError" } })));
    xhr.ontimeout = (): void =>
      reject(new ApiRequestError(normalizeApiError({ status: 0, message: "Upload timed out", cause: { name: "TimeoutError" } })));

    xhr.onload = (): void => {
      const contentType = xhr.getResponseHeader("content-type") ?? "";
      let data: unknown = null;
      try {
        data = contentType.includes("application/json")
          ? (JSON.parse(xhr.responseText || "null") as unknown)
          : (xhr.responseText as unknown);
      } catch {
        data = xhr.responseText as unknown;
      }
      const response: XhrResponse = {
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        headers: { get: (name: string): string | null => xhr.getResponseHeader(name) },
      };
      if (xhr.status === 401) {
        // Try refresh once for XHR (reuse httpClient logic), don't logout on network
        const doLogout = (): void => {
          try {
            window.dispatchEvent(new CustomEvent("auth:logout", { detail: { reason: "session_expired" } }));
          } catch {
            // ignore
          }
        };
        void (async () => {
          try {
            if (!isRefreshInProgress()) await refreshAccessToken();
            else await waitForRefresh();
            // Retry once with new token
            const retryToken = getAccessToken();
            const retryXhr = new XMLHttpRequest();
            retryXhr.open(method, buildApiUrl(endpoint));
            if (retryToken) retryXhr.setRequestHeader("Authorization", `Bearer ${retryToken}`);
            retryXhr.setRequestHeader("Accept", "application/json");
            retryXhr.onload = (): void => {
              let retryData: unknown = null;
              try {
                const ct2 = retryXhr.getResponseHeader("content-type") ?? "";
                retryData = ct2.includes("application/json")
                  ? JSON.parse(retryXhr.responseText || "null")
                  : retryXhr.responseText;
              } catch {
                retryData = retryXhr.responseText;
              }
              const retryResp: XhrResponse = {
                ok: retryXhr.status >= 200 && retryXhr.status < 300,
                status: retryXhr.status,
                headers: { get: (n: string): string | null => retryXhr.getResponseHeader(n) },
              };
              if (retryXhr.status === 401) doLogout();
              resolve({ response: retryResp as unknown as Response, data: retryData as T });
            };
            retryXhr.onerror = (): void =>
              reject(new ApiRequestError(normalizeApiError({ status: 0, message: "Network error" })));
            retryXhr.send(form);
          } catch {
            doLogout();
            resolve({ response: response as unknown as Response, data: data as T });
          }
        })();
        return;
      }
      resolve({ response: response as unknown as Response, data: data as T });
    };

    xhr.send(form);
  });
}
