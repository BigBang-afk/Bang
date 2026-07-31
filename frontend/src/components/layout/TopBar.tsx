"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { WS_URL } from "@/lib/config";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useServerTimeStore } from "@/store/serverTime";
import { Badge } from "@/components/ui/badge";

export function TopBar(): React.ReactElement {
  const [utcLabel, setUtcLabel] = useState("--:--:--");
  const setServerTime = useServerTimeStore((s) => s.setServerTime);
  const getServerNow = useServerTimeStore((s) => s.getServerNow);

  const { connected } = useWebSocket(`${WS_URL}/ws/system-time`, {
    onMessage: (data) => {
      const msg = data as { type: string; server_time: string };
      if (msg.type === "server_time") setServerTime(msg.server_time);
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setUtcLabel(new Date(getServerNow()).toISOString().slice(11, 19));
    }, 1000);
    return () => clearInterval(interval);
  }, [getServerNow]);

  return (
    <header className="glass-panel sticky top-0 z-20 flex items-center justify-between px-4 py-3">
      <Link href="/" className="font-bold tracking-tight text-gray-100">
        Quotex <span className="text-terminal-accent">AI Signals</span>
      </Link>
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
          {connected ? "Live" : "Reconnecting..."}
        </span>
        <span className="font-mono">{utcLabel} UTC</span>
        <Badge tone="warning">Demo/Live signals never guarantee profit</Badge>
      </div>
    </header>
  );
}
