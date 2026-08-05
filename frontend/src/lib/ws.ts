"use client";

import { useEffect, useRef } from "react";

export type WsMessage = { type: string; channel?: string; data: unknown };

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

export function useMarketSocket(onMessage: (msg: WsMessage) => void) {
  const socketRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let closedByClient = false;

    function connect() {
      const ws = new WebSocket(WS_URL);
      socketRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as WsMessage;
          onMessageRef.current(parsed);
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        if (!closedByClient) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      closedByClient = true;
      clearTimeout(reconnectTimer);
      socketRef.current?.close();
    };
  }, []);

  return socketRef;
}
