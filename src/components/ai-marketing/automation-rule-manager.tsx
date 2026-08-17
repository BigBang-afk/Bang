"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createAutomationRuleAction, setAutomationRuleStatusAction, runAutomationRuleAction } from "@/lib/actions/automation.actions";
import { AUTOMATION_TRIGGERS, AUTOMATION_ACTIONS } from "@/types/marketing";

type AutomationRuleRow = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  status: string;
  conditions: unknown;
  lastRunAt: Date | null;
  createdBy: { name: string };
};

const STATUS_VARIANT = { DRAFT: "neutral", ACTIVE: "success", PAUSED: "warning", DISABLED: "danger" } as const;

export function AutomationRuleManager({ rules }: { rules: AutomationRuleRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<(typeof AUTOMATION_TRIGGERS)[number]>("CUSTOMER_INACTIVE");
  const [action, setAction] = useState<(typeof AUTOMATION_ACTIONS)[number]>("CREATE_FOLLOW_UP_TASK");
  const [inactiveDays, setInactiveDays] = useState("90");
  const [daysAhead, setDaysAhead] = useState("7");

  function handleCreate() {
    startTransition(async () => {
      const conditions = trigger === "CUSTOMER_INACTIVE" ? { inactiveDays: Number(inactiveDays) } : { daysAhead: Number(daysAhead) };
      const result = await createAutomationRuleAction({ name, trigger, action, conditions });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Automation rule created as DRAFT.");
      setOpen(false);
      setName("");
      router.refresh();
    });
  }

  function toggleStatus(ruleId: string, status: "ACTIVE" | "PAUSED" | "DISABLED") {
    startTransition(async () => {
      const result = await setAutomationRuleStatusAction({ ruleId, status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function runNow(ruleId: string) {
    startTransition(async () => {
      const result = await runAutomationRuleAction({ ruleId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Created ${result.data.followUpTasksCreated} follow-up task(s) and ${result.data.campaignDraftsCreated} campaign draft(s).`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> New Automation Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">No automation rules yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  {rule.name}
                  <Badge variant={STATUS_VARIANT[rule.status as keyof typeof STATUS_VARIANT] ?? "neutral"}>{rule.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <p className="text-muted-foreground">
                  IF {rule.trigger.replace(/_/g, " ")} THEN {rule.action.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rule.lastRunAt ? `Last run: ${new Date(rule.lastRunAt).toLocaleString()}` : "Never run"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {rule.status !== "ACTIVE" && (
                    <Button size="sm" onClick={() => toggleStatus(rule.id, "ACTIVE")} disabled={pending}>
                      Enable
                    </Button>
                  )}
                  {rule.status === "ACTIVE" && (
                    <Button size="sm" variant="secondary" onClick={() => toggleStatus(rule.id, "PAUSED")} disabled={pending}>
                      Pause
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => toggleStatus(rule.id, "DISABLED")} disabled={pending}>
                    Disable
                  </Button>
                  {rule.status === "ACTIVE" && (
                    <Button size="sm" variant="secondary" onClick={() => runNow(rule.id)} disabled={pending}>
                      <Play className="size-3.5" /> Run Now
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Automation Rule</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="rule-name">Name</Label>
              <Input id="rule-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rule-trigger">Trigger</Label>
              <Select value={trigger} onValueChange={(v) => setTrigger(v as typeof trigger)}>
                <SelectTrigger id="rule-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTOMATION_TRIGGERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {trigger === "CUSTOMER_INACTIVE" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="rule-inactive-days">Inactive Days Threshold</Label>
                <Input id="rule-inactive-days" type="number" min={1} value={inactiveDays} onChange={(e) => setInactiveDays(e.target.value)} />
              </div>
            ) : (
              <div className="grid gap-1.5">
                <Label htmlFor="rule-days-ahead">Days Ahead</Label>
                <Input id="rule-days-ahead" type="number" min={1} value={daysAhead} onChange={(e) => setDaysAhead(e.target.value)} />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="rule-action">Action</Label>
              <Select value={action} onValueChange={(v) => setAction(v as typeof action)}>
                <SelectTrigger id="rule-action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTOMATION_ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A rule never sends a message itself — it only creates follow-up tasks or draft campaigns for a human to
                review.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={pending || !name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
