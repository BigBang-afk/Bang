import * as signalR from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/authStore";

const hubUrl = import.meta.env.VITE_HUB_URL || "http://localhost:5080/hubs/signals";

let sharedConnection: signalR.HubConnection | null = null;

function getConnection(): signalR.HubConnection {
  if (!sharedConnection) {
    sharedConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => useAuthStore.getState().accessToken || "" })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();
  }
  return sharedConnection;
}

/** Ensures the shared SignalR connection is started, and joins the public "signals" group. */
export function useSignalRConnection() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const conn = getConnection();
    let cancelled = false;

    async function start() {
      if (conn.state === signalR.HubConnectionState.Disconnected) {
        try {
          await conn.start();
          await conn.invoke("JoinSignalsGroup");
          if (!cancelled) setConnected(true);
        } catch {
          if (!cancelled) setConnected(false);
        }
      } else if (conn.state === signalR.HubConnectionState.Connected) {
        setConnected(true);
      }
    }

    start();
    conn.onreconnected(() => setConnected(true));
    conn.onclose(() => setConnected(false));

    return () => {
      cancelled = true;
    };
  }, []);

  return { connection: getConnection(), connected };
}

/** Subscribes to a hub event for the lifetime of the component. */
export function useHubEvent<T = unknown>(eventName: string, handler: (payload: T) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const conn = getConnection();
    const wrapped = (payload: T) => handlerRef.current(payload);
    conn.on(eventName, wrapped);
    return () => {
      conn.off(eventName, wrapped);
    };
  }, [eventName]);
}
