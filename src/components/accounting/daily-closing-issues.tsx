import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { PURITY_LABELS } from "@/types/gold";
import type { UnresolvedClosingIssues } from "@/services/daily-closing.service";

export function DailyClosingIssues({ issues }: { issues: UnresolvedClosingIssues }) {
  if (!issues.hasIssues) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
        <CheckCircle2 className="size-4" />
        No unresolved issues — this day can close cleanly.
      </div>
    );
  }

  const lines: string[] = [];
  if (issues.pendingCashReconciliation) lines.push("Cash reconciliation is pending or last flagged a mismatch.");
  for (const purity of issues.pendingGoldReconciliationPurities) {
    lines.push(`Gold reconciliation for ${PURITY_LABELS[purity]} is pending or last flagged a mismatch.`);
  }
  if (issues.openReturnsCount > 0) lines.push(`${issues.openReturnsCount} return(s) awaiting approval.`);
  if (issues.unpaidBalancesCount) lines.push(`${issues.unpaidBalancesCount} customer/party balance(s) still outstanding.`);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-warning">
        <AlertTriangle className="size-4" />
        Unresolved issues — review before closing
      </div>
      <ul className="list-inside list-disc text-sm text-foreground">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
