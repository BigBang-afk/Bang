"use client";

import { useEffect, useState } from "react";

import { API_URL } from "@/lib/config";
import type { Asset } from "@/types";

interface AssetSelectorProps {
  selected: string;
  onSelect: (symbol: string) => void;
}

export function AssetSelector({ selected, onSelect }: AssetSelectorProps): React.ReactElement {
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const response = await fetch(`${API_URL}/api/v1/assets`);
      if (!response.ok || cancelled) return;
      setAssets(await response.json());
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <select
      value={selected}
      onChange={(e) => onSelect(e.target.value)}
      className="rounded-md border border-terminal-border bg-terminal-panel px-3 py-2 text-sm text-gray-100"
    >
      {assets.map((asset) => (
        <option key={asset.id} value={asset.symbol}>
          {asset.symbol} - {asset.display_name}
        </option>
      ))}
    </select>
  );
}
