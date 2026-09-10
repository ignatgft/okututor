import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { conversationApi } from "../api/conversation.api";
import useAuthStore from "../store/authStore";
import { saveContactIntent } from "../store/authIntentStore";

type State = "idle" | "loading" | "success" | "error";

export interface UseContactTutorOptions {
  source?: string;
}

export default function useContactTutor(options: UseContactTutorOptions = {}) {
  const { source = "tutor_card" } = options;
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (tutorId: string) => {
      const { response, data } = await conversationApi.createOrGetDirect(tutorId);
      if (!response.ok) {
        const msg = (data as Record<string, unknown>)?.["message"] as string || "Не удалось открыть чат";
        throw new Error(msg);
      }
      return data as { id: string; created: boolean };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      // analytics
      try {
        (window as unknown as Record<string, unknown>)["gtag"] && ((window as unknown as Record<string, unknown>)["gtag"] as (...args: unknown[]) => void)("event", "conversation_opened", { tutorId: data.id, created: data.created });
      } catch {}
    },
  });

  const contact = useCallback(
    async (tutor: Record<string, unknown>) => {
      const tutorId = String(tutor["userId"] ?? tutor["user_id"] ?? tutor["userId"] ?? tutor["id"] ?? "");
      const tutorSlug = String(tutor["slug"] ?? "");
      if (!tutorId) {
        setError("Tutor not found");
        return;
      }

      // analytics
      try {
        (window as unknown as Record<string, unknown>)["gtag"] && ((window as unknown as Record<string, unknown>)["gtag"] as (...args: unknown[]) => void)("event", "tutor_contact_clicked", { tutorId, source, isAuthenticated });
      } catch {}

      if (!isAuthenticated) {
        saveContactIntent({
          tutorId,
          tutorSlug,
          returnUrl: window.location.pathname + window.location.search,
          action: "OPEN_CHAT",
          source,
          createdAt: Date.now(),
        });
        setState("idle");
        return { needsAuth: true as const, tutorId, tutorSlug };
      }

      setState("loading");
      setError(null);
      try {
        const result = await mutation.mutateAsync(tutorId);
        setState("success");
        const convId = result.id;
        navigate(`/conversations/${convId}`);
        return { needsAuth: false as const, conversationId: convId };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Не удалось открыть чат";
        // 409 duplicate is not error - try to recover by listing conversations
        if (msg.includes("409") || msg.toLowerCase().includes("already exists")) {
          // fallback: try to find existing via list
          try {
            const { data } = await conversationApi.list(0, 20);
            const list = (data as Record<string, unknown>)?.["content"] as unknown[] || (Array.isArray(data) ? data : []);
            const found = (list as Record<string, unknown>[]).find((c) => String(c["otherParticipantId"] ?? c["participant"] ?? "").includes(tutorId));
            if (found) {
              const cid = String(found["id"] ?? "");
              if (cid) {
                navigate(`/conversations/${cid}`);
                setState("success");
                return { needsAuth: false as const, conversationId: cid };
              }
            }
          } catch {}
        }
        setError(msg);
        setState("error");
        return { needsAuth: false as const, error: msg };
      }
    },
    [isAuthenticated, mutation, navigate, source]
  );

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
  }, []);

  return {
    contact,
    state: mutation.isPending ? "loading" as State : state,
    error: (mutation.error as Error | null)?.message ?? error,
    isLoading: mutation.isPending,
    reset,
    mutation,
  };
}
