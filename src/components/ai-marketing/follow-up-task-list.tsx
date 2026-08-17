"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { updateFollowUpTaskStatusAction } from "@/lib/actions/follow-up.actions";

type FollowUpTaskRow = {
  id: string;
  reason: string;
  priority: string;
  status: string;
  source: string;
  dueDate: Date | null;
  customer: { id: string; name: string; phone: string };
  assignedTo: { id: string; name: string } | null;
};

const PRIORITY_VARIANT = { HIGH: "danger", MEDIUM: "warning", LOW: "neutral" } as const;

export function FollowUpTaskList({ tasks }: { tasks: FollowUpTaskRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function updateStatus(taskId: string, status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED") {
    startTransition(async () => {
      const result = await updateFollowUpTaskStatusAction({ taskId, status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (tasks.length === 0) return <p className="text-sm text-muted-foreground">No follow-up tasks.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell>
              <Link href={`/customers/${task.customer.id}`} className="font-medium text-gold hover:underline">
                {task.customer.name}
              </Link>
            </TableCell>
            <TableCell className="max-w-sm text-sm">{task.reason}</TableCell>
            <TableCell>
              <Badge variant={PRIORITY_VARIANT[task.priority as keyof typeof PRIORITY_VARIANT] ?? "neutral"}>{task.priority}</Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{task.source}</TableCell>
            <TableCell>
              <Badge variant={task.status === "COMPLETED" ? "success" : task.status === "CANCELLED" ? "neutral" : "default"}>{task.status}</Badge>
            </TableCell>
            <TableCell>
              {task.status === "OPEN" && (
                <Button size="sm" variant="secondary" onClick={() => updateStatus(task.id, "IN_PROGRESS")} disabled={pending}>
                  Start
                </Button>
              )}
              {(task.status === "OPEN" || task.status === "IN_PROGRESS") && (
                <>
                  <Button size="sm" onClick={() => updateStatus(task.id, "COMPLETED")} disabled={pending} className="ml-2">
                    Complete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateStatus(task.id, "CANCELLED")} disabled={pending} className="ml-2">
                    Cancel
                  </Button>
                </>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
