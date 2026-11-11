"use client";

import { useEffect, useState } from "react";
import { activityWebSocketUrl, getActivitySnapshot, getHealth } from "@/lib/api";
import type { ActivityEvent, BudgetSnapshot } from "@/lib/types";

const MAX_EVENTS = 100;
const PING_INTERVAL_MS = 15000;
const POLL_INTERVAL_MS = 4000;
/** Failed WS connects before falling back to snapshot polling. */
const WS_MAX_ATTEMPTS = 3;

export type BudgetTransport = "ws" | "poll" | null;

/**
 * Live budget + activity feed. Locally this rides the /api/v1/activity
 * WebSocket. Where WebSockets cannot stay open (Vercel serverless), the
 * gateway advertises activity_transport: "poll" via /api/v1/health and this
 * hook polls the GET /api/v1/activity snapshot instead - the truthful
 * transport for that runtime, never a fake live socket. If the socket fails
 * repeatedly it also degrades to polling.
 */
export function useBudget(): {
  snapshot: BudgetSnapshot | null;
  events: ActivityEvent[];
  connected: boolean;
  reconnects: number;
  transport: BudgetTransport;
} {
  const [snapshot, setSnapshot] = useState<BudgetSnapshot | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [reconnects, setReconnects] = useState(0);
  const [transport, setTransport] = useState<BudgetTransport>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let mounted = true;
    let ws: WebSocket | null = null;
    let attempt = 0;
    let polling = false;
    let reconnectTimer: number | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    function clearTimers() {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    function closeSocket() {
      if (!ws) return;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;
      try {
        ws.close();
      } catch {
        /* already closed */
      }
      ws = null;
    }

    async function pollOnce() {
      try {
        const data = await getActivitySnapshot();
        if (!mounted) return;
        setConnected(true);
        if (data.budget) setSnapshot(data.budget);
        const raw = Array.isArray(data.events) ? data.events : [];
        const evs: ActivityEvent[] = raw
          .filter((e) => e && typeof e === "object" && typeof (e as { event?: unknown }).event === "string")
          .map((e) => ({
            ...(e as Record<string, unknown>),
            event: (e as { event: string }).event,
            ts: typeof (e as { ts?: unknown }).ts === "number" ? (e as { ts: number }).ts : Date.now(),
          })) as ActivityEvent[];
        setEvents(evs.slice(-MAX_EVENTS).reverse());
      } catch {
        if (mounted) setConnected(false);
      }
    }

    function startPolling() {
      if (!mounted || polling) return;
      polling = true;
      closeSocket();
      clearTimers();
      setTransport("poll");
      void pollOnce();
      pollTimer = setInterval(() => {
        void pollOnce();
      }, POLL_INTERVAL_MS);
    }

    function scheduleReconnect() {
      if (!mounted || reconnectTimer !== null || polling) return;
      const delay = Math.min(5000, 1000 * Math.pow(2, attempt));
      attempt += 1;
      if (attempt >= WS_MAX_ATTEMPTS) {
        // Socket cannot stay open here: degrade to the snapshot transport.
        startPolling();
        return;
      }
      setReconnects((r) => r + 1);
      reconnectTimer = window.setTimeout(connect, delay);
    }

    function connect() {
      if (!mounted || polling) return;
      reconnectTimer = null;
      try {
        ws = new WebSocket(activityWebSocketUrl());
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        if (!mounted) return;
        attempt = 0;
        setReconnects(0);
        setTransport("ws");
        setConnected(true);
        pingTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            try {
              ws.send("ping");
            } catch {
              /* socket closing */
            }
          }
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        if (!mounted) return;
        let data: unknown;
        try {
          data = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (!data || typeof data !== "object") return;
        const obj = data as Record<string, unknown>;
        const isPong = obj.type === "pong" || obj.event === "pong";
        if (isPong) {
          // A pong carries the budget snapshot but is not an activity event.
          if ("cap" in obj && "spent" in obj) {
            setSnapshot(obj as unknown as BudgetSnapshot);
          }
          return;
        }
        if ("event" in obj && typeof obj.event === "string") {
          const activity: ActivityEvent = {
            ...obj,
            event: obj.event,
            ts: typeof obj.ts === "number" ? obj.ts : Date.now(),
          };
          setEvents((prev) => [activity, ...prev].slice(0, MAX_EVENTS));
        } else if ("cap" in obj && "spent" in obj) {
          setSnapshot(obj as unknown as BudgetSnapshot);
        }
      };

      ws.onclose = () => {
        if (!mounted) return;
        setConnected(false);
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }
        scheduleReconnect();
      };

      ws.onerror = () => {
        if (!mounted) return;
        setConnected(false);
      };
    }

    // The gateway says which transport this runtime supports; trust it when
    // it says poll (serverless), otherwise try the socket first.
    void getHealth()
      .then((h) => {
        if (!mounted) return;
        if (h.activity_transport === "poll") {
          startPolling();
        } else {
          connect();
        }
      })
      .catch(() => {
        if (mounted) connect();
      });

    return () => {
      mounted = false;
      clearTimers();
      closeSocket();
    };
  }, []);

  return { snapshot, events, connected, reconnects, transport };
}
