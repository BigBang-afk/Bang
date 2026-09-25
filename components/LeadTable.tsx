"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LEAD_STATUSES, CLOSED_STATUSES, ACTIVE_STATUSES, type LeadStatus } from "@/lib/constants";
import { StatusBadge } from "./StatusBadge";
import { DueLabel } from "./DueLabel";
import { EmptyState } from "./EmptyState";

export interface LeadTableRow {
  id: number;
  name: string;
  property_interest: string;
  budget: string | null;
  location: string | null;
  status: LeadStatus;
  next_follow_up: string | null;
}

export type LeadFilter = "all" | "new" | "due" | "active" | "won" | LeadStatus;

const QUICK_FILTERS: { value: LeadFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "due", label: "Follow-up due" },
  { value: "active", label: "Contacted" },
  { value: "won", label: "Won" },
];

export function LeadTable({
  leads,
  todayStr,
  initialFilter = "all",
}: {
  leads: LeadTableRow[];
  todayStr: string;
  initialFilter?: LeadFilter;
}) {
  const [filter, setFilter] = useState<LeadFilter>(initialFilter);
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (filter === "new" && l.status !== "New") return false;
      if (filter === "won" && l.status !== "Won") return false;
      if (filter === "active" && !ACTIVE_STATUSES.includes(l.status)) return false;
      if (filter === "due" && !(l.next_follow_up && l.next_follow_up <= todayStr && !CLOSED_STATUSES.includes(l.status))) return false;
      if ((LEAD_STATUSES as readonly string[]).includes(filter) && l.status !== filter) return false;
      if (!q) return true;
      return [l.name, l.property_interest, l.location ?? "", l.budget ?? ""].some((v) => v.toLowerCase().includes(q));
    });
  }, [leads, filter, query, todayStr]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter leads">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
                filter === f.value ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
          <select
            aria-label="Filter by status"
            value={(LEAD_STATUSES as readonly string[]).includes(filter) ? filter : ""}
            onChange={(e) => setFilter((e.target.value || "all") as LeadFilter)}
            className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-inset ring-slate-200"
          >
            <option value="">Any status</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <input
          type="search"
          placeholder="Search name, property, location…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input sm:ml-auto sm:max-w-xs"
          aria-label="Search leads"
        />
      </div>

      {leads.length === 0 ? (
        <EmptyState
          title="No leads yet"
          description="Add your first lead and let the assistant draft your first reply and follow-ups."
          action={{ href: "/leads/new", label: "Add your first lead" }}
        />
      ) : visible.length === 0 ? (
        <EmptyState title="No leads match" description="Try a different filter or search term." />
      ) : (
        <>
          {/* Desktop table */}
          <table className="hidden w-full text-left text-sm md:table">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Property</th>
                <th className="px-4 py-2.5 font-medium">Budget</th>
                <th className="px-4 py-2.5 font-medium">Location</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Next follow-up</th>
                <th className="px-4 py-2.5 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/leads/${l.id}`} className="hover:text-brand-600">
                      {l.name}
                    </Link>
                  </td>
                  <td className="max-w-[16rem] truncate px-4 py-3 text-slate-600" title={l.property_interest}>
                    {l.property_interest}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l.budget ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3 text-slate-600">{l.location ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="px-4 py-3">
                    <DueLabel date={l.next_follow_up} todayStr={todayStr} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/leads/${l.id}`} className="btn-secondary btn-sm">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {visible.map((l) => (
              <li key={l.id}>
                <Link href={`/leads/${l.id}`} className="block p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-slate-900">{l.name}</span>
                    <StatusBadge status={l.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{l.property_interest}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {l.budget && <span>{l.budget}</span>}
                    {l.location && <span>{l.location}</span>}
                    {l.next_follow_up && (
                      <span>
                        Follow-up: <DueLabel date={l.next_follow_up} todayStr={todayStr} />
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
