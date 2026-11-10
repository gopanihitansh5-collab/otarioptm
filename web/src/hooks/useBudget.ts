"use client";

import { useEffect, useRef, useState } from "react";
import { activityWebSocketUrl } from "@/lib/api";
import type { ActivityEvent, BudgetSnapshot } from "@/lib/types";

const MAX_EVENTS = 100;
const PING_INTERVAL_MS = 15000;

export function useBudget(): {
  snapshot: BudgetSnapshot | null;
  events: ActivityEvent[];
  connected: boolean;
  reconnects: number;
} {
  const [snapshot, setSnapshot] = useState<BudgetSnapshot | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [reconnects, setReconnects] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let mounted = true;
    let ws: WebSocket | null = null;
    let attempt = 0;
    let reconnectTimer: number | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    function clearTimers() {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
    }

    function scheduleReconnect() {
      if (!mounted || reconnectTimer !== null) return;
      const delay = Math.min(5000, 1000 * Math.pow(2, attempt));
      attempt += 1;
      setReconnects((r) => r + 1);
      reconnectTimer = window.setTimeout(connect, delay);
    }

    function connect() {
      if (!mounted) return;
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

    connect();

    return () => {
      mounted = false;
      clearTimers();
      if (ws) {
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
    };
  }, []);

  return { snapshot, events, connected, reconnects };
}
