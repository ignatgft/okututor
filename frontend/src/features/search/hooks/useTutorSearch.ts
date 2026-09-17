import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { tutorApi } from "../../tutors/api/tutorApi";
import type { UserDTO } from "../../../types/api";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (isRecord(err) && typeof err["message"] === "string") return err["message"] as string;
  return String(err);
}

export interface TutorSearchFilters {
  subject: string;
  city: string;
  price_min: string;
  price_max: string;
  format: string; // online/offline/'' 
  tutor_type: string; // TEACHER/PROFESSIONAL_TUTOR/STUDENT_TUTOR/''
  level: string;
  sort: string;
  page: number;
}

export interface UseTutorSearchReturn {
  tutors: UserDTO[];
  searchQuery: string;
  error: string;
  loading: boolean;
  totalPages: number;
  totalResults: number;
  filters: TutorSearchFilters;
  handlers: {
    handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSearchSubmit: (e: React.FormEvent) => void;
    setSearchQuery: (v: string) => void;
    applyFilters: (updater: Partial<TutorSearchFilters> | ((prev: TutorSearchFilters) => Partial<TutorSearchFilters>)) => void;
    handlePageChange: (newPage: number) => void;
  };
}

const parseFilters = (sp: URLSearchParams): TutorSearchFilters => ({
  subject: sp.get("subject") || sp.get("q") || "",
  city: sp.get("city") || "",
  price_min: sp.get("price_min") || sp.get("min_price") || "",
  price_max: sp.get("price_max") || sp.get("max_price") || "",
  format: sp.get("format") || sp.get("location_type") || "",
  tutor_type: sp.get("tutor_type") || sp.get("type") || "",
  level: sp.get("level") || "",
  sort: sp.get("sort") || "recommended",
  page: Number(sp.get("page")) || 0,
});

/**
 * Marketplace tutor search — supports fuzzy queries: математика/матем/питон/python/англ/ОРТ
 * Uses tutorApi.search (GET /api/v1/search/tutors) with fallback to users.tutors
 */
export function useTutorSearch(pageSize = 20): UseTutorSearchReturn {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(location.search);
  const [searchQuery, setSearchQuery] = useState<string>(urlParams.get("q") || urlParams.get("subject") || "");
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const [filters, setFilters] = useState<TutorSearchFilters>(() => parseFilters(urlParams));
  const [tutors, setTutors] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [searchTrigger, setSearchTrigger] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  // keep filters in sync when navigating (e.g. from homepage hero)
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const next = parseFilters(sp);
    const q = sp.get("q") || "";
    setSearchQuery(q || next.subject || "");
    setFilters(next);
  }, [location.search]);

  const syncUrl = useCallback((next: TutorSearchFilters, q: string) => {
    const params = new URLSearchParams();
    const qq = q.trim();
    if (qq) params.set("q", qq);
    if (next.subject && next.subject !== qq) params.set("subject", next.subject);
    if (next.city) params.set("city", next.city);
    if (next.price_min) params.set("price_min", next.price_min);
    if (next.price_max) params.set("price_max", next.price_max);
    if (next.format) params.set("format", next.format);
    if (next.tutor_type) params.set("tutor_type", next.tutor_type);
    if (next.level) params.set("level", next.level);
    if (next.sort && next.sort !== "recommended") params.set("sort", next.sort);
    if (next.page > 0) params.set("page", String(next.page));
    params.set("size", String(pageSize));
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
  }, [navigate, location.pathname, pageSize]);

  const applyFilters = useCallback((updater: Partial<TutorSearchFilters> | ((prev: TutorSearchFilters) => Partial<TutorSearchFilters>)) => {
    setFilters((prev) => {
      const nextPatch = typeof updater === "function" ? (updater as (p: TutorSearchFilters) => Partial<TutorSearchFilters>)(prev) : updater;
      const merged = { ...prev, ...nextPatch } as TutorSearchFilters;
      // reset page if any filter except page changed
      const changedKeys = Object.keys(nextPatch).filter((k) => k !== "page");
      if (changedKeys.length > 0) merged.page = 0;
      return merged;
    });
  }, []);

  const fetchTutors = useCallback(async (currentFilters: TutorSearchFilters, q: string, pageNum: number) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const params: Record<string, unknown> = {};
      const query = (q || currentFilters.subject || "").trim();
      if (query) params["q"] = query;
      if (currentFilters.city) params["city"] = currentFilters.city;
      if (currentFilters.price_min) params["price_min"] = currentFilters.price_min;
      if (currentFilters.price_max) params["price_max"] = currentFilters.price_max;
      if (currentFilters.format) params["format"] = currentFilters.format;
      if (currentFilters.tutor_type) params["tutor_type"] = currentFilters.tutor_type;
      if (currentFilters.level) params["level"] = currentFilters.level;
      params["page"] = String(pageNum);
      params["size"] = String(pageSize);

      const { response, data } = await tutorApi.search(params, controller.signal);
      if (controller.signal.aborted) return;
      if (response.ok) {
        if (Array.isArray(data)) {
          const arr = data as UserDTO[];
          setTutors(arr);
          setTotalResults(arr.length);
          setTotalPages(arr.length < pageSize ? pageNum + 1 : pageNum + 2);
        } else if (data && isRecord(data) && Array.isArray((data as Record<string, unknown>)["content"])) {
          const content = (data as Record<string, unknown>)["content"] as UserDTO[];
          setTutors(content);
          const totalEl = ((data as Record<string, unknown>)["total_elements"] as number | undefined) ?? ((data as Record<string, unknown>)["totalElements"] as number | undefined) ?? content.length;
          const totalPg = ((data as Record<string, unknown>)["total_pages"] as number | undefined) ?? ((data as Record<string, unknown>)["totalPages"] as number | undefined) ?? 0;
          setTotalResults(totalEl);
          setTotalPages(totalPg);
        } else if (data && isRecord(data) && Array.isArray((data as Record<string, unknown>)["tutors"])) {
          const arr = (data as Record<string, unknown>)["tutors"] as UserDTO[];
          setTutors(arr);
          setTotalResults(arr.length);
          setTotalPages(1);
        } else {
          setTutors([]);
          setTotalResults(0);
          setTotalPages(0);
        }
      } else {
        const rec = isRecord(data) ? (data as Record<string, unknown>) : null;
        const msg = (rec?.["message"] as string | undefined) ?? (rec?.["error"] as string | undefined) ?? t("search.error_loading_courses", "Failed to load tutors");
        setError(String(msg));
        setTutors([]);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(`${t("search.error_loading_courses", "Failed to load tutors")}: ${getErrorMessage(err)}`);
      setTutors([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [pageSize, t]);

  // sync URL when filters/searchQuery change (without triggering double fetch)
  const filtersKey = JSON.stringify({ ...filters, page: filters.page });
  const searchKey = searchQuery.trim();

  useEffect(() => {
    syncUrl(filters, searchQueryRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filtersKey stringifies filters
  }, [filtersKey, searchKey, syncUrl]);

  useEffect(() => {
    void fetchTutors(filters, searchQuery, filters.page);
    return () => { abortRef.current?.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by stringified filters
  }, [filtersKey, searchKey, searchTrigger, pageSize]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = e.target.value;
    setSearchQuery(v);
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setSearchTrigger((n) => n + 1);
      applyFilters(() => ({ page: 0 }));
    }, 450);
  }, [applyFilters]);

  const handleSearchSubmit = useCallback((e: React.FormEvent): void => {
    e.preventDefault();
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    setSearchTrigger((n) => n + 1);
    applyFilters(() => ({ page: 0 }));
  }, [applyFilters]);

  const handlePageChange = useCallback((newPage: number): void => {
    applyFilters(() => ({ page: newPage }));
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /* ignore */ }
  }, [applyFilters]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    tutors,
    searchQuery,
    error,
    loading,
    totalPages,
    totalResults,
    filters,
    handlers: {
      handleSearchChange,
      handleSearchSubmit,
      setSearchQuery,
      applyFilters,
      handlePageChange,
    },
  };
}
