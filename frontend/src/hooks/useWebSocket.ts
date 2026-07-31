"use client";

import { useEffect, useRef, useState } from "react";

interface UseWebSocketOptions {
  onMessage: (data: unknown) => void;
  enabled?: boolean;
}

const MAX_BACKOFF_MS = 30_000;

/** Generic WebSocket subscriber with automatic reconnection and exponential
 * backoff. Used for market/signals/countdown/system-time channels. */
export function useWebSocket(url: string | null, { onMessage, enabled = true }: UseWebSocketOptions): {
  connected: boolean;
} {
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!url || !enabled) return;

    let socket: WebSocket | null = null;
    let backoff = 1000;
    let stopped = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect(): void {
      if (stopped) return;
      socket = new WebSocket(url as string);

      socket.onopen = () => {
        backoff = 1000;
        setConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          onMessageRef.current(JSON.parse(event.data));
        } catch {
          onMessageRef.current(event.data);
        }
      };

      socket.onclose = () => {
        setConnected(false);
        if (!stopped) {
          reconnectTimer = setTimeout(connect, backoff);
          backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
        }
      };

      socket.onerror = () => {
        socket?.close();
      };
    }

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [url, enabled]);

  return { connected };
}
