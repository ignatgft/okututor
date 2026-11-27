import { endpoints } from "./endpoints";
import { apiClient } from "./http";
import { buildApiUrl } from "./config";
import { clearTokens, setTokens, getRefreshToken, isCookieRefreshEnabled } from "./token";
import { ROLES } from "../constants/roles";
import type { UserDTO, LoginResponse } from "../types/api";
import type { HttpResult } from "./client/responseParser";

export const EMAIL_ERROR_CODES = {
  INVALID_CODE: "INVALID_CODE",
  VERIFICATION_CODE_EXPIRED: "VERIFICATION_CODE_EXPIRED",
  TOO_MANY_ATTEMPTS: "TOO_MANY_ATTEMPTS",
  RATE_LIMITED: "RATE_LIMITED",
  NETWORK: "NETWORK",
} as const;

export type EmailErrorCode = (typeof EMAIL_ERROR_CODES)[keyof typeof EMAIL_ERROR_CODES];

interface AuthErrorData {
  error?: unknown;
  code?: unknown;
  message?: unknown;
}

function hasCodeOrName(value: unknown): value is { name?: string; code?: string } {
  return isRecord(value) && ("name" in value || "code" in value);
}

function mapAuthError(err: unknown, data: unknown): EmailErrorCode | null {
  const d = isRecord(data) ? (data as AuthErrorData) : null;
  const raw = String(d?.error ?? d?.code ?? d?.message ?? (err instanceof Error ? err.message : "") ?? "").toUpperCase();
  if (raw.includes("INVALID_CODE") || raw.includes("INVALID")) return EMAIL_ERROR_CODES.INVALID_CODE;
  if (raw.includes("EXPIRED")) return EMAIL_ERROR_CODES.VERIFICATION_CODE_EXPIRED;
  if (raw.includes("TOO_MANY")) return EMAIL_ERROR_CODES.TOO_MANY_ATTEMPTS;
  if (raw.includes("RATE_LIMIT") || raw.includes("429")) return EMAIL_ERROR_CODES.RATE_LIMITED;
  if (hasCodeOrName(err) && err.name === "ApiRequestError" && err.code === "NETWORK_ERROR") return EMAIL_ERROR_CODES.NETWORK;
  return null;
}

export interface AuthApiResponse {
  access_token?: string;
  refresh_token?: string;
  user?: unknown;
  message?: string;
  error?: string;
  status?: string;
  code?: string;
  email?: string;
  requires_verification?: boolean;
  [key: string]: unknown;
}

export const authApi = {
  login: (email: string, password: string): Promise<HttpResult<AuthApiResponse>> =>
    apiClient.post<AuthApiResponse>(endpoints.auth.login, { email, password }, false),

  register: (payload: Record<string, unknown>): Promise<HttpResult<AuthApiResponse>> =>
    apiClient.post<AuthApiResponse>(endpoints.auth.register, payload, false),

  refresh: (refreshToken: string): Promise<HttpResult<AuthApiResponse>> =>
    apiClient.post<AuthApiResponse>(endpoints.auth.refresh, { refresh_token: refreshToken }, false),

  logout: (refreshToken: string): Promise<HttpResult<unknown>> =>
    apiClient.post(endpoints.auth.logout, { refresh_token: refreshToken }, false),

  me: (): Promise<HttpResult<unknown>> => apiClient.get(endpoints.auth.me),

  forgotPassword: (email: string): Promise<HttpResult<unknown>> =>
    apiClient.post(endpoints.auth.forgotPassword, { email }, false),

  resetPassword: (payload: Record<string, unknown>): Promise<HttpResult<unknown>> =>
    apiClient.post(endpoints.auth.resetPassword, payload, false),

  async verifyEmail(email: string, code: string): Promise<HttpResult<unknown>> {
    const result = await apiClient.post<Record<string, unknown>>(endpoints.auth.verifyEmail, { email, code }, false);
    if (!result.response.ok) {
      const code2 = mapAuthError(null, result.data);
      const msg =
        isRecord(result.data) && typeof result.data["message"] === "string"
          ? (result.data["message"] as string)
          : "Verification failed";
      if (code2) throw Object.assign(new Error(msg), { code: code2 });
    }
    return result as HttpResult<unknown>;
  },

  async resendVerification(email: string): Promise<HttpResult<unknown>> {
    return apiClient.post(endpoints.auth.resendVerification, { email }, false);
  },

  async verifyResetCode(email: string, code: string): Promise<HttpResult<unknown>> {
    const result = await apiClient.post<Record<string, unknown>>(endpoints.auth.verifyResetCode, { email, code }, false);
    if (!result.response.ok) {
      const code2 = mapAuthError(null, result.data);
      const msg =
        isRecord(result.data) && typeof result.data["message"] === "string"
          ? (result.data["message"] as string)
          : "Verification failed";
      if (code2) throw Object.assign(new Error(msg), { code: code2 });
    }
    return result as HttpResult<unknown>;
  },

  async changeEmail(newEmail: string): Promise<HttpResult<unknown>> {
    return apiClient.post(endpoints.auth.changeEmail, { email: newEmail });
  },

  async resendResetCode(email: string): Promise<HttpResult<unknown>> {
    return apiClient.post(endpoints.auth.resendVerification, { email }, false);
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function buildGoogleOAuthUrl(role?: string): string {
  const env = (import.meta as unknown as { env: Record<string, unknown> }).env ?? {};
  const baseEnv = env["VITE_GOOGLE_OAUTH_URL"] as string | undefined;
  const base = baseEnv ?? buildApiUrl("/oauth2/authorization/google");
  return role ? `${base}?role=${encodeURIComponent(role)}` : base;
}

export interface LoginResult {
  user?: UserDTO;
  emailNotVerified?: boolean;
  email?: string;
}

export interface RegisterResult {
  user?: UserDTO;
  emailVerificationRequired?: boolean;
  email?: string;
}

/**
 * Login result shapes:
 *   { user }                         — success, email verified
 *   { emailNotVerified: true, email } — EMAIL_NOT_VERIFIED from backend
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const { response, data } = await apiClient.post<LoginResponse>(endpoints.auth.login, { email, password }, false);
  if (!response.ok) {
    const d = isRecord(data) ? (data as Record<string, unknown>) : null;
    const msg =
      (d?.["message"] as string | undefined) ??
      (d?.["error"] as string | undefined) ??
      "Login failed";
    throw new Error(msg);
  }
  if (data.status === "EMAIL_NOT_VERIFIED" || data.error === "EMAIL_NOT_VERIFIED") {
    return { emailNotVerified: true, email: (data.email as string | undefined) ?? email };
  }
  if (data.access_token) setTokens(data.access_token, (data.refresh_token as string | null | undefined) ?? null);
  return { user: (data.user as UserDTO | undefined) ?? (data as unknown as UserDTO) };
}

/**
 * Register result shapes:
 *   { user }                              — success (legacy, already verified)
 *   { emailVerificationRequired: true, email } — needs email verification
 */
export async function register(
  email: string,
  password: string,
  repeatPassword: string,
  fullName: string,
  role: (typeof ROLES)[keyof typeof ROLES] = ROLES.USER,
  opts: { termsAccepted?: boolean; privacyAccepted?: boolean } = {}
): Promise<RegisterResult> {
  const { response, data } = await apiClient.post<LoginResponse>(
    endpoints.auth.register,
    {
      email,
      password,
      repeat_password: repeatPassword,
      full_name: fullName,
      role,
      termsAccepted: opts.termsAccepted ?? true,
      privacyAccepted: opts.privacyAccepted ?? true,
    },
    false
  );
  if (!response.ok) {
    const d = isRecord(data) ? (data as Record<string, unknown>) : null;
    const msg =
      (d?.["message"] as string | undefined) ??
      (d?.["error"] as string | undefined) ??
      "Registration failed";
    const err = new Error(msg) as Error & { fieldErrors?: Record<string, string>; status?: number };
    const fieldErrors = (d?.["errors"] as Record<string, string> | undefined) ?? (d?.["fieldErrors"] as Record<string, string> | undefined);
    if (fieldErrors) err.fieldErrors = fieldErrors;
    err.status = response.status;
    throw err;
  }
  if (data.status === "EMAIL_VERIFICATION_REQUIRED" || (data as Record<string, unknown>)["requires_verification"]) {
    return { emailVerificationRequired: true, email: (data.email as string | undefined) ?? email };
  }
  if (data.access_token) setTokens(data.access_token, (data.refresh_token as string | null | undefined) ?? null);
  return { user: (data.user as UserDTO | undefined) ?? (data as unknown as UserDTO) };
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await apiClient.post(endpoints.auth.logout, { refresh_token: refreshToken }, false).catch((): void => {});
  } else if (isCookieRefreshEnabled()) {
    // HttpOnly cookie flow: still invalidate server session via cookie
    await apiClient.post(endpoints.auth.logout, {}, false).catch((): void => {});
  }
  clearTokens();
}

function isRetryableError(e: unknown): boolean {
  if (!isRecord(e)) return false;
  if (e["retryable"] === true) return true;
  const code = e["code"];
  return code === "NETWORK_ERROR" || code === "TIMEOUT" || code === "SERVER_ERROR" || code === "RATE_LIMIT";
}

export async function getCurrentUser(): Promise<UserDTO | null> {
  try {
    const { response, data } = await apiClient.get<unknown>(endpoints.users.me, true);
    if (response.ok) return data as UserDTO;
    // 401/403/404 mean not authenticated or not found -> return null without throwing
    if (response.status === 401 || response.status === 403 || response.status === 404) return null;
    return null;
  } catch (e: unknown) {
    // Network/timeout/server errors are retryable -> propagate to caller (authStore) so it doesn't clear tokens
    if (isRetryableError(e)) {
      throw e;
    }
    const asRecord = isRecord(e) ? (e as Record<string, unknown>) : null;
    if (
      asRecord?.["code"] === "NETWORK_ERROR" ||
      asRecord?.["code"] === "TIMEOUT" ||
      asRecord?.["code"] === "SERVER_ERROR"
    ) {
      throw e;
    }
    return null;
  }
}
