"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { createFollowUpTasksFromRecommendationsAction } from "@/lib/actions/follow-up.actions";
import type { ContactRecommendation } from "@/services/follow-up.service";

const PRIORITY_VARIANT = { HIGH: "danger", MEDIUM: "warning", LOW: "neutral" } as const;

export function CustomersToContactList({ recommendations }: { recommendations: ContactRecommendation[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleCreateTasks() {
    startTransition(async () => {
      const result = await createFollowUpTasksFromRecommendationsAction({ customerIds: [...selected] });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.data.created} follow-up task(s) created.`);
      setSelected(new Set());
      router.refresh();
    });
  }

  if (recommendations.length === 0) {
    return <p className="text-sm text-muted-foreground">No customers currently need a follow-up.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{recommendations.length} customers ranked by business engagement priority.</p>
        <Button onClick={handleCreateTasks} disabled={pending || selected.size === 0}>
          Create Follow-Up Task{selected.size !== 1 ? "s" : ""} ({selected.size})
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Customer</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recommendations.map((r) => (
            <TableRow key={r.customerId}>
              <TableCell>
                <input type="checkbox" checked={selected.has(r.customerId)} onChange={() => toggle(r.customerId)} />
              </TableCell>
              <TableCell>
                <Link href={`/customers/${r.customerId}`} className="font-medium text-gold hover:underline">
                  {r.name}
                </Link>
                <p className="text-xs text-muted-foreground">{r.phone}</p>
              </TableCell>
              <TableCell>
                <Badge variant={PRIORITY_VARIANT[r.priority]}>{r.priority}</Badge>
              </TableCell>
              <TableCell className="max-w-md text-sm">{r.reason}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
