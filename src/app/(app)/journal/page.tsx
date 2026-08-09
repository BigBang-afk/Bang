import Link from "next/link";
import { requireAccount } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { formatDate, todayDateInputValue } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";

export default async function JournalListPage() {
  const { account } = await requireAccount();
  const entries = await prisma.dailyJournal.findMany({
    where: { tradingAccountId: account.id },
    orderBy: { date: "desc" },
    take: 60,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Trading Journal</h1>
          <p className="text-sm text-muted">Daily reflections, discipline scores and lessons learned.</p>
        </div>
        <LinkButton href={`/journal/${todayDateInputValue()}`} size="sm">
          <Plus size={16} /> Today&apos;s Entry
        </LinkButton>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {entries.map((e) => (
          <Link key={e.id} href={`/journal/${e.date.toISOString().slice(0, 10)}`}>
            <Card className="flex items-center justify-between p-4 hover:bg-surface-hover">
              <div className="min-w-0">
                <p className="text-sm font-medium">{formatDate(e.date, { weekday: "long" })}</p>
                <p className="mt-1 truncate text-xs text-muted">
                  {e.whatWentWell || e.todaysGoal || e.mistakes || "No summary yet"}
                </p>
                {e.overallScore && (
                  <p className="mt-1 text-[11px] text-muted">Overall score: {e.overallScore}/10</p>
                )}
              </div>
              <ChevronRight size={16} className="shrink-0 text-muted-2" />
            </Card>
          </Link>
        ))}
        {entries.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted md:col-span-2">
            No journal entries yet. Start with today&apos;s entry.
          </Card>
        )}
      </div>
    </div>
  );
}
