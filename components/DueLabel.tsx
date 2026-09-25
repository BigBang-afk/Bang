import { describeDueDate, today } from "@/lib/dates";

export function DueLabel({ date, todayStr = today() }: { date: string | null; todayStr?: string }) {
  if (!date) return <span className="text-slate-400">—</span>;
  const overdue = date < todayStr;
  const isToday = date === todayStr;
  return (
    <span
      className={`whitespace-nowrap text-sm ${
        overdue ? "font-medium text-red-600" : isToday ? "font-medium text-amber-700" : "text-slate-600"
      }`}
    >
      {describeDueDate(date, todayStr)}
    </span>
  );
}
