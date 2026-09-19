import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "../../../api/token";
import { API_BASE_URL } from "../../../api/config";
import type { ChatMessage } from "../../../api/chat.api";

type PresencePayload = { type: "presence"; userId: string; status: "online" | "offline" };
type TypingPayload = { type: "typing"; conversationId: string; userId: string; isTyping: boolean };
type MessagePayload = { type: "message"; conversationId: string; message?: ChatMessage; body?: string; senderId?: string; [k: string]: unknown };
type RawPayload = PresencePayload | TypingPayload | MessagePayload | { type: string; [k: string]: unknown };

function wsUrl(): string | null {
  const base = API_BASE_URL || window.location.origin;
  try {
    const u = new URL(base, window.location.origin);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    // backend endpoint is /ws or /ws/chat
    const token = getAccessToken();
    if (!token) return null;
    u.pathname = "/ws";
    u.search = `token=${encodeURIComponent(token)}`;
    return u.toString();
  } catch {
    const token = getAccessToken();
    if (!token) return null;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
  }
}

export function useChatWebSocket(enabled = true) {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingByConv, setTypingByConv] = useState<Record<string, string | null>>({});
  const typingTimeouts = useRef<Record<string, number>>({});

  const isOnline = useCallback((userId?: string | null) => {
    if (!userId) return false;
    return onlineUsers.has(String(userId));
  }, [onlineUsers]);

  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try { ws.send(JSON.stringify({ type: "typing", conversationId, isTyping })); } catch {}
  }, []);

  const sendMessageWs = useCallback((conversationId: string, body: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(JSON.stringify({ type: "message", conversationId, body }));
      return true;
    } catch { return false; }
  }, []);

  const markReadWs = useCallback((conversationId: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try { ws.send(JSON.stringify({ type: "read", conversationId })); } catch {}
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!getAccessToken()) return;
    let ws: WebSocket | null = null;
    let pingTimer: number | null = null;
    let reconnectTimer: number | null = null;
    let closedByUs = false;
    let attempts = 0;

    const connect = () => {
      const url = wsUrl();
      if (!url) return;
      try { ws = new WebSocket(url); wsRef.current = ws; } catch { return; }

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as RawPayload;
          if (data.type === "presence") {
            const p = data as PresencePayload;
            setOnlineUsers((prev) => {
              const next = new Set(prev);
              if (p.status === "online") next.add(p.userId);
              else next.delete(p.userId);
              return next;
            });
          } else if (data.type === "typing") {
            const t = data as TypingPayload;
            const key = String(t.conversationId);
            if (t.isTyping) {
              setTypingByConv((prev) => ({ ...prev, [key]: String(t.userId) }));
              if (typingTimeouts.current[key]) window.clearTimeout(typingTimeouts.current[key]);
              typingTimeouts.current[key] = window.setTimeout(() => {
                setTypingByConv((prev) => ({ ...prev, [key]: null }));
              }, 3000);
            } else {
              setTypingByConv((prev) => ({ ...prev, [key]: null }));
              if (typingTimeouts.current[key]) { window.clearTimeout(typingTimeouts.current[key]); delete typingTimeouts.current[key]; }
            }
          } else if (data.type === "message") {
            const m = data as MessagePayload;
            const convId = String(m.conversationId || (m as unknown as Record<string,unknown>)["conversation_id"] || (m as unknown as Record<string,unknown>)["conversationId"] || "");
            if (convId) {
              // optimistic: invalidate to refetch, but also push into cache for instant
              void qc.invalidateQueries({ queryKey: ["messages", convId] });
              void qc.invalidateQueries({ queryKey: ["conversations"] });
              void qc.invalidateQueries({ queryKey: ["unreadCount"] });
            } else {
              void qc.invalidateQueries({ queryKey: ["conversations"] });
            }
          } else if (data.type === "connected") {
            const online = (data as unknown as Record<string, unknown>)["online"] as string[] | undefined;
            if (Array.isArray(online)) setOnlineUsers(new Set(online.map(String)));
          } else if ((data as unknown as Record<string, unknown>)["type"] === "pong") {
            // heartbeat ok
          }
        } catch {}
      };
      ws.onclose = (ev) => {
        if (pingTimer) { window.clearInterval(pingTimer); pingTimer = null; }
        // 1008 policy violation (auth failed) or 4401 custom -> do not reconnect
        if ((ev as CloseEvent).code === 1008 || (ev as CloseEvent).code === 4401) return;
        if (!closedByUs) {
          attempts += 1;
          if (attempts > 10) return;
          const delay = Math.min(3000 * Math.pow(1.5, attempts - 1), 30000);
          reconnectTimer = window.setTimeout(connect, delay);
        }
      };
      ws.onerror = () => {
        try { ws?.close(); } catch {}
      };
      ws.onopen = () => {
        attempts = 0;
        // heartbeat
        pingTimer = window.setInterval(() => {
          try { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" })); } catch {}
        }, 30000);
      };
    };

    connect();
    return () => {
      closedByUs = true;
      if (pingTimer) window.clearInterval(pingTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      Object.values(typingTimeouts.current).forEach((id) => window.clearTimeout(id));
      typingTimeouts.current = {};
      try { ws?.close(); } catch {}
      wsRef.current = null;
    };
  }, [enabled, qc]);

  const getTypingUser = useCallback((conversationId: string) => typingByConv[String(conversationId)] || null, [typingByConv]);

  return { isOnline, onlineUsers, sendTyping, sendMessageWs, markReadWs, getTypingUser, typingByConv };
}
