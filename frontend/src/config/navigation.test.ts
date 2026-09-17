import { describe, it, expect } from "vitest";
import { getDashboardPath, getSectionPath, getPageTitle, SIDEBAR_ITEMS, BOTTOMNAV_ITEMS } from "./navigation";

describe("navigation", () => {
  it("getDashboardPath returns correct paths", () => {
    expect(getDashboardPath("ADMIN")).toBe("/admin");
    expect(getDashboardPath("SUPER_ADMIN")).toBe("/admin");
    // USER hub: /dashboard (USER остаётся USER, RESUME определяет обращения)
    expect(getDashboardPath("USER")).toBe("/dashboard");
    expect(getDashboardPath("TUTOR")).toBe("/dashboard");
    expect(getDashboardPath("STUDENT")).toBe("/dashboard");
    expect(getDashboardPath(undefined)).toBe("/");
    expect(getDashboardPath(null)).toBe("/");
  });

  it("getSectionPath returns correct sections", () => {
    expect(getSectionPath("ADMIN")).toBe("/admin");
    expect(getSectionPath("USER")).toBe("");
    expect(getSectionPath("TUTOR")).toBe("/tutor");
    expect(getSectionPath("STUDENT")).toBe("/student");
    expect(getSectionPath("UNKNOWN")).toBe("/student");
  });

  it("getPageTitle resolves known titles", () => {
    expect(getPageTitle("student", "/student/dashboard")).toBe("student_requests.title");
    expect(getPageTitle("tutor", "/tutor/dashboard")).toBe("tutor.application");
    expect(getPageTitle("admin", "/admin")).toBe("admin.dashboard");
    expect(getPageTitle("student", "/unknown/path")).toBe("");
    expect(getPageTitle("unknown", "/student/dashboard")).toBe("");
  });

  it("SIDEBAR_ITEMS has expected roles and structure", () => {
    expect(Array.isArray(SIDEBAR_ITEMS.user)).toBe(true);
    expect(Array.isArray(SIDEBAR_ITEMS.student)).toBe(true);
    expect(Array.isArray(SIDEBAR_ITEMS.tutor)).toBe(true);
    expect(Array.isArray(SIDEBAR_ITEMS.admin)).toBe(true);
    for (const item of SIDEBAR_ITEMS.user) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("path");
      expect(item).toHaveProperty("labelKey");
      expect(item).toHaveProperty("icon");
    }
  });

  it("BOTTOMNAV_ITEMS has expected roles", () => {
    expect(BOTTOMNAV_ITEMS.user.length).toBeGreaterThan(0);
    expect(BOTTOMNAV_ITEMS.student.length).toBeGreaterThan(0);
    expect(BOTTOMNAV_ITEMS.tutor.length).toBeGreaterThan(0);
    expect(BOTTOMNAV_ITEMS.admin.length).toBeGreaterThan(0);
  });
});
