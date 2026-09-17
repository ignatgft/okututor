import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { getContactIntent, clearContactIntent } from "../store/authIntentStore";
import { conversationApi } from "../api/conversation.api";

export default function RestoreContactIntent(): null {
  const navigate = useNavigate();
  const { isAuthenticated, status } = useAuthStore();
  const didRun = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !isAuthenticated) return;
    if (didRun.current) return;
    const intent = getContactIntent();
    if (!intent) return;
    didRun.current = true;
    // small delay to let UI settle after login
    const t = setTimeout(async () => {
      try {
        const { response, data } = await conversationApi.createOrGetDirect(intent.tutorId);
        if (response.ok && data) {
          const convId = (data as Record<string, unknown>)["id"] as string;
          clearContactIntent();
          if (convId) {
            navigate(`/conversations/${convId}`);
            return;
          }
        }
        // fallback to returnUrl
        clearContactIntent();
        navigate(intent.returnUrl || `/tutor/${intent.tutorSlug || intent.tutorId}`);
      } catch {
        clearContactIntent();
        navigate(intent.returnUrl || "/tutors");
      }
    }, 300);
    return () => clearTimeout(t);
  }, [isAuthenticated, status, navigate]);

  return null;
}
