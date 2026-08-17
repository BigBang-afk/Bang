"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { searchSuppliersAction } from "@/lib/actions/suppliers.actions";
import type { SupplierRow } from "@/services/supplier.service";

export function SupplierPicker({
  selected,
  onSelect,
}: {
  selected: SupplierRow | null;
  onSelect: (supplier: SupplierRow) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SupplierRow[]>([]);
  const [pending, startTransition] = useTransition();

  function handleChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      const result = await searchSuppliersAction(value);
      setResults(result.ok ? result.data : []);
    });
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border bg-surface-elevated px-3 py-2">
        <div>
          <p className="text-sm font-medium text-foreground">{selected.name}</p>
          <p className="text-xs text-muted-foreground">
            {selected.supplierCode} · {selected.phone}
          </p>
        </div>
        <button
          type="button"
          className="text-xs text-gold hover:underline"
          onClick={() => {
            onSelect(null as unknown as SupplierRow);
            setQuery("");
          }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        placeholder="Search supplier by name, phone, or code..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
      />
      {query.trim() && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-surface shadow-lg">
          {pending ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No suppliers found.</p>
          ) : (
            results.map((supplier) => (
              <button
                key={supplier.id}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-hover"
                onClick={() => {
                  onSelect(supplier);
                  setQuery("");
                  setResults([]);
                }}
              >
                <span className="font-medium text-foreground">{supplier.name}</span>{" "}
                <span className="text-muted-foreground">
                  · {supplier.supplierCode} · {supplier.phone}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
