"use client";

import { useEffect, useState } from "react";

import { API_URL } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Strategy } from "@/types";

interface StrategySelectorProps {
  selectedCode: string | null;
  aiAutoEnabled: boolean;
  onSelectStrategy: (code: string) => void;
  onToggleAiAuto: (enabled: boolean) => void;
}

export function StrategySelector({
  selectedCode,
  aiAutoEnabled,
  onSelectStrategy,
  onToggleAiAuto,
}: StrategySelectorProps): React.ReactElement {
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const response = await fetch(`${API_URL}/api/v1/strategies`);
      if (!response.ok || cancelled) return;
      setStrategies(await response.json());
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onToggleAiAuto(!aiAutoEnabled)}
        className={cn(
          "w-full rounded-lg border px-4 py-3 text-left transition-colors",
          aiAutoEnabled
            ? "border-terminal-accent bg-terminal-accent/10"
            : "border-terminal-border bg-terminal-panel hover:bg-gray-800"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-100">AI Strategy Selector (Auto Mode)</span>
          <Badge tone={aiAutoEnabled ? "info" : "neutral"}>{aiAutoEnabled ? "ACTIVE" : "OFF"}</Badge>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Evaluates every enabled strategy, measures confluence, and only signals when the market genuinely supports it.
        </p>
      </button>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {strategies.map((strategy) => {
          const cfg = strategy.configuration_json as { risk_level?: string };
          const isSelected = !aiAutoEnabled && selectedCode === strategy.strategy_code;
          return (
            <Card
              key={strategy.id}
              onClick={() => !aiAutoEnabled && onSelectStrategy(strategy.strategy_code)}
              className={cn(
                "cursor-pointer transition-colors",
                isSelected && "border-terminal-accent ring-1 ring-terminal-accent",
                aiAutoEnabled && "cursor-not-allowed opacity-50"
              )}
            >
              <div className="flex items-start justify-between">
                <h4 className="font-semibold text-gray-100">{strategy.name}</h4>
                <Badge tone={strategy.is_enabled ? "call" : "neutral"}>
                  {strategy.is_enabled ? "Available" : "Disabled"}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-gray-400">{strategy.description}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-gray-500">
                <span>Expiries: {strategy.supported_expiries_json.join(", ")}s</span>
                <span>&middot;</span>
                <span>Risk: {cfg.risk_level ?? "medium"}</span>
                <span>&middot;</span>
                <span>v{strategy.version}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
