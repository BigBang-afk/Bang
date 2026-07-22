"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateBusinessHoursAction } from "@/app/admin/(protected)/settings/actions";
import type { BusinessHour } from "@/types/database";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function BusinessHoursForm({ hours }: { hours: BusinessHour[] }) {
  const [isPending, startTransition] = useTransition();
  const byDay = new Map(hours.map((h) => [h.day_of_week, h]));

  return (
    <form
      action={(formData) => startTransition(async () => {
        await updateBusinessHoursAction(formData);
        toast.success("Business hours updated");
      })}
      className="space-y-3"
    >
      {DAY_NAMES.map((name, day) => {
        const h = byDay.get(day);
        return (
          <div key={day} className="grid grid-cols-2 items-center gap-3 border-b border-charcoal/5 pb-3 sm:grid-cols-4">
            <span className="text-sm font-medium">{name}</span>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name={`is_closed_${day}`} defaultChecked={h?.is_closed ?? false} /> Closed
            </label>
            <input type="time" name={`open_time_${day}`} defaultValue={h?.open_time?.slice(0, 5) ?? ""} className="rounded-sm border border-charcoal/20 px-2 py-1.5 text-sm" />
            <input type="time" name={`close_time_${day}`} defaultValue={h?.close_time?.slice(0, 5) ?? ""} className="rounded-sm border border-charcoal/20 px-2 py-1.5 text-sm" />
          </div>
        );
      })}
      <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save Business Hours"}</Button>
    </form>
  );
}
