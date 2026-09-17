import { apiClient } from "../../../api/http";
import type { HttpResult } from "../../../api/client/responseParser";
import { COURSE_SUBJECTS } from "../../../constants/course";
import { MARKETPLACE_SUBJECTS } from "../../../constants/cities";

/**
 * Subjects marketplace API — backend-first, fallback to constants.
 * If backend does not have /api/v1/subjects, falls back to MARKETPLACE_SUBJECTS/COURSE_SUBJECTS.
 */
export const subjectApi = {
  list: async (): Promise<{ values: { value: string; labelKey: string; labelRu: string }[]; source: "api" | "fallback" }> => {
    try {
      const res: HttpResult<unknown> = await apiClient.get("/api/v1/subjects", false);
      if (res.response.ok && Array.isArray(res.data)) {
        const arr = (res.data as unknown[]).map((item) => {
          if (typeof item === "string") return { value: item, labelKey: `subject.${item.toLowerCase()}`, labelRu: item };
          if (item && typeof item === "object" && "name" in (item as Record<string, unknown>)) {
            const name = String((item as Record<string, unknown>)["name"] ?? "");
            return { value: name, labelKey: `subject.${name.toLowerCase()}`, labelRu: name };
          }
          return null;
        }).filter(Boolean) as { value: string; labelKey: string; labelRu: string }[];
        if (arr.length) return { values: arr, source: "api" };
      }
      if (res.response.ok && res.data && typeof res.data === "object" && Array.isArray((res.data as Record<string, unknown>)["content"])) {
        const content = (res.data as Record<string, unknown>)["content"] as unknown[];
        const arr = content.map((item) => {
          if (typeof item === "string") return { value: item, labelKey: `subject.${item.toLowerCase()}`, labelRu: item };
          if (item && typeof item === "object" && "name" in (item as Record<string, unknown>)) {
            const name = String((item as Record<string, unknown>)["name"] ?? "");
            return { value: name, labelKey: `subject.${name.toLowerCase()}`, labelRu: name };
          }
          return null;
        }).filter(Boolean) as { value: string; labelKey: string; labelRu: string }[];
        if (arr.length) return { values: arr, source: "api" };
      }
    } catch {
      // fallback
    }
    // marketplace 10 preferred, then course subjects for completeness
    const marketplace = MARKETPLACE_SUBJECTS.map((s) => ({ value: s.value, labelKey: s.labelKey, labelRu: s.labelRu }));
    if (marketplace.length) return { values: marketplace, source: "fallback" };
    return { values: COURSE_SUBJECTS.map((s) => ({ value: s.value, labelKey: s.labelKey, labelRu: s.value })), source: "fallback" };
  },
};
