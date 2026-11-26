/**
 * Token storage abstraction — hardened for P0 audit, reliability-fixed.
 *
 * Access token: sessionStorage (XSS mitigation — cleared on tab close).
 * Refresh token: localStorage — survives browser restarts and is shared
 * across tabs, so the session can be restored via the 401 → refresh flow.
 * Theft of a refresh token is mitigated server-side by rotation + reuse
 * detection (the whole token family is revoked on reuse outside grace).
 * Long-term target is HttpOnly Secure SameSite cookie — see USE_COOKIE flag.
 */

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

// When true, frontend expects backend to set refresh token as HttpOnly cookie
// and will not store it in JS storage. Enable via VITE_USE_HTTPONLY_REFRESH=true
// or VITE_AUTH_REFRESH_VIA_COOKIE=true (both checked for backwards compat).
const USE_COOKIE: boolean = (() => {
  try {
    const env = (import.meta as unknown as { env: Record<string, unknown> }).env ?? {};
    return (
      env["VITE_USE_HTTPONLY_REFRESH"] === "true" ||
      env["VITE_USE_HTTPONLY_REFRESH"] === true ||
      env["VITE_AUTH_REFRESH_VIA_COOKIE"] === "true" ||
      env["VITE_AUTH_REFRESH_VIA_COOKIE"] === true
    );
  } catch {
    return false;
  }
})();

function getSessionStorage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) return window.sessionStorage;
    if (typeof globalThis !== "undefined") {
      const g = globalThis as unknown as { sessionStorage?: Storage };
      if (g.sessionStorage) return g.sessionStorage;
    }
    // fallback to global sessionStorage (jsdom tests expose it globally)
    const maybe = (globalThis as unknown as Record<string, unknown>)["sessionStorage"];
    if (maybe && typeof (maybe as Storage).getItem === "function") return maybe as Storage;
    return null;
  } catch {
    return null;
  }
}

function getLocalStorage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
    const maybe = (globalThis as unknown as Record<string, unknown>)["localStorage"];
    if (maybe && typeof (maybe as Storage).getItem === "function") return maybe as Storage;
    return null;
  } catch {
    return null;
  }
}

// Refresh token lives in localStorage (survives restarts, shared across tabs).
// sessionStorage is kept as a read fallback for sessions created before this change.
const refreshStorage = (): Storage | null => {
  try {
    return USE_COOKIE ? null : getLocalStorage();
  } catch {
    return null;
  }
};

export function setTokens(accessToken: string | null, refreshToken: string | null): void {
  const session = getSessionStorage();
  const local = getLocalStorage();

  if (accessToken) {
    try {
      session?.setItem(ACCESS_TOKEN_KEY, accessToken);
    } catch {
      // ignore storage errors
    }
  } else {
    try {
      session?.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // ignore
    }
  }

  if (USE_COOKIE) {
    // In cookie mode, do not store refresh token in JS — backend sets HttpOnly cookie
    // Clean up any legacy storage
    try {
      local?.removeItem(REFRESH_TOKEN_KEY);
      session?.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // ignore
    }
    return;
  }

  const storage = refreshStorage();
  if (!storage) return;

  if (refreshToken) {
    try {
      storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch {
      // ignore
    }
    // Migrate: remove legacy sessionStorage copy now that localStorage is canonical
    try {
      if (storage !== session) session?.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // ignore
    }
  } else {
    try {
      storage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // ignore
    }
    try {
      session?.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // ignore
    }
  }
}

export function getAccessToken(): string | null {
  try {
    const session = getSessionStorage();
    return session?.getItem(ACCESS_TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  if (USE_COOKIE) return null;
  try {
    const storage = refreshStorage();
    if (storage) {
      const v = storage.getItem(REFRESH_TOKEN_KEY);
      if (v) return v;
    }
    // Fallback for sessions created before localStorage became canonical
    const session = getSessionStorage();
    return session?.getItem(REFRESH_TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  const session = getSessionStorage();
  const local = getLocalStorage();
  try {
    session?.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // ignore
  }
  try {
    session?.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
  try {
    local?.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
  try {
    local?.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * Checks that the stored tokens can still yield a session.
 * In cookie mode, only access token is checked.
 * Returns false only when NEITHER token exists. A refresh-only state
 * (e.g. new tab, browser restart) is recoverable: the next authenticated
 * request 401s and the refresh flow restores the access token.
 */
export function areTokensConsistent(): boolean {
  const access = !!getAccessToken();
  if (USE_COOKIE) return true;
  const refresh = !!getRefreshToken();
  return access || refresh;
}

export function isCookieRefreshEnabled(): boolean {
  return USE_COOKIE;
}
