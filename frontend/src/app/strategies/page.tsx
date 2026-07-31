"use client";

import { useEffect, useState } from "react";

import { API_URL } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Strategy } from "@/types";

export default function PublicStrategiesPage(): React.ReactElement {
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  useEffect(() => {
    void fetch(`${API_URL}/api/v1/strategies`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setStrategies);
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-100">The 10 Strategies</h1>
      <p className="mt-2 text-sm text-gray-400">
        Plus an AI Strategy Selector that evaluates all of them together and only signals on genuine confluence.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {strategies.map((s) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-100">{s.name}</h3>
              <Badge tone={s.is_enabled ? "call" : "neutral"}>{s.is_enabled ? "Available" : "Disabled"}</Badge>
            </div>
            <p className="mt-1 text-sm text-gray-400">{s.description}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
