import { describe, it, expect, beforeEach } from "vitest";
import {
  setTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  isAuthenticated,
} from "./token";

describe("token storage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("stores and retrieves both tokens", () => {
    setTokens("a1", "r1");
    expect(getAccessToken()).toBe("a1");
    expect(getRefreshToken()).toBe("r1");
    expect(isAuthenticated()).toBe(true);
    // access is short-lived (sessionStorage), refresh survives restarts (localStorage)
    expect(sessionStorage.getItem("access_token")).toBe("a1");
    expect(localStorage.getItem("refresh_token")).toBe("r1");
  });

  it("setTokens clears tokens when null is passed (prevents stale tokens)", () => {
    setTokens("a1", "r1");
    setTokens(null, null);
    expect(getAccessToken()).toBe(null);
    expect(getRefreshToken()).toBe(null);
  });

  it("clearTokens removes both tokens", () => {
    setTokens("a1", "r1");
    clearTokens();
    expect(getAccessToken()).toBe(null);
    expect(getRefreshToken()).toBe(null);
    expect(isAuthenticated()).toBe(false);
  });

  it("migrates legacy sessionStorage refresh token", () => {
    sessionStorage.setItem("refresh_token", "legacy");
    expect(getRefreshToken()).toBe("legacy");
    setTokens("a2", "new");
    expect(localStorage.getItem("refresh_token")).toBe("new");
    expect(sessionStorage.getItem("refresh_token")).toBe(null);
  });
});
