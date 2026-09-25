import Link from "next/link";
import { connection } from "next/server";
import { getDashboardStats, listLeads, listPendingFollowUps } from "@/lib/leads";
import { today } from "@/lib/dates";
import { LeadTable, type LeadFilter } from "@/components/LeadTable";
import { FollowUpItem } from "@/components/FollowUpItem";
import { isDemoMode } from "@/lib/ai/provider";

const FILTERS: LeadFilter[] = ["all", "new", "due", "active", "won"];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await connection();
  const { filter } = await searchParams;
  const initialFilter = FILTERS.includes(filter as LeadFilter) ? (filter as LeadFilter) : "all";

  const todayStr = today();
  const stats = getDashboardStats(todayStr);
  const leads = listLeads();
  const due = listPendingFollowUps(todayStr);

  const cards = [
    { label: "Total leads", value: stats.total, filter: "all", hint: "All time" },
    { label: "New leads", value: stats.new, filter: "new", hint: "Not contacted yet" },
    { label: "Follow-up due", value: stats.followUpDue, filter: "due", hint: "Today or overdue", highlight: stats.followUpDue > 0 },
    { label: "Contacted", value: stats.contacted, filter: "active", hint: "Active conversations" },
    { label: "Converted", value: stats.converted, filter: "won", hint: "Won deals" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Reply fast, follow up consistently, close more.</p>
        </div>
        {isDemoMode() && (
          <p className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800 ring-1 ring-amber-200">
            Demo AI mode: add an API key in <code>.env.local</code> for real AI messages.
          </p>
        )}
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.filter === "all" ? "/" : `/?filter=${c.filter}`}
            className={`card p-4 transition hover:border-slate-300 ${c.highlight ? "border-amber-300 bg-amber-50/40" : ""}`}
          >
            <p className="text-xs font-medium text-slate-500">{c.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${c.highlight ? "text-amber-700" : "text-slate-900"}`}>{c.value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{c.hint}</p>
          </Link>
        ))}
      </section>

      <section className="card">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="section-title">Follow-ups due today</h2>
          <Link href="/follow-ups" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View all
          </Link>
        </div>
        {due.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">You&apos;re all caught up. No follow-ups due today.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {due.slice(0, 5).map((f) => (
              <FollowUpItem key={f.id} item={f} todayStr={todayStr} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="section-title mb-3">Leads</h2>
        {/* key resets the table's local filter when a stat card is clicked */}
        <LeadTable key={initialFilter} leads={leads} todayStr={todayStr} initialFilter={initialFilter} />
      </section>
    </div>
  );
}
