import { formatCurrency } from "@/lib/format";

/**
 * Always the derived Payable/Receivable pair — never a single ambiguous
 * signed balance. See CASH-MANAGEMENT.md.
 */
export function CashPositionDisplay({ payable, receivable }: { payable: string; receivable: string }) {
  const hasPayable = Number(payable) > 0;
  const hasReceivable = Number(receivable) > 0;

  if (!hasPayable && !hasReceivable) {
    return <span className="text-sm text-muted-foreground">Settled</span>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {hasPayable && (
        <span className="text-sm font-medium text-danger">Payable: {formatCurrency(payable)}</span>
      )}
      {hasReceivable && (
        <span className="text-sm font-medium text-success">Receivable: {formatCurrency(receivable)}</span>
      )}
    </div>
  );
}
