import { connection } from "next/server";
import { listPendingFollowUps } from "@/lib/leads";
import { today } from "@/lib/dates";
import { FollowUpItem, type FollowUpItemData } from "@/components/FollowUpItem";
import { EmptyState } from "@/components/EmptyState";

export const metadata = { title: "Follow-ups · AI Lead Assistant" };

export default async function FollowUpsPage() {
  await connection();
  const todayStr = today();
  const all = listPendingFollowUps();
  const groups: { title: string; items: FollowUpItemData[]; tone: string }[] = [
    { title: "Overdue", items: all.filter((f) => f.due_date < todayStr), tone: "text-red-600" },
    { title: "Due today", items: all.filter((f) => f.due_date === todayStr), tone: "text-amber-700" },
    { title: "Upcoming", items: all.filter((f) => f.due_date > todayStr), tone: "text-slate-900" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Follow-ups</h1>
        <p className="text-sm text-slate-500">
          Open a lead to copy the drafted message, send it from your phone or email, then mark it as sent.
        </p>
      </div>
      {all.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No follow-ups scheduled"
            description="Follow-ups are scheduled automatically when you mark a first response as sent, or you can add one on any lead."
            action={{ href: "/", label: "Go to leads" }}
          />
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.title} className="card">
            <h2 className={`border-b border-slate-200 px-4 py-3 text-sm font-semibold ${g.tone}`}>
              {g.title} <span className="font-normal text-slate-400">({g.items.length})</span>
            </h2>
            {g.items.length === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-500">Nothing here.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {g.items.map((f) => (
                  <FollowUpItem key={f.id} item={f} todayStr={todayStr} />
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </div>
  );
}
