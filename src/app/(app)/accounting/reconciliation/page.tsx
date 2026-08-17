import { RunReconciliationButton } from "@/components/accounting/run-reconciliation-button";

export const metadata = { title: "Financial Reconciliation | Zarghoon Jewellers" };

export default function FinancialReconciliationPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Financial Reconciliation</h1>
        <p className="text-sm text-muted-foreground">
          Cross-checks cached balances against their own ledgers&apos; independently-computed sums — sales, customer
          ledger, supplier/karigar cash ledgers, cash balance, gold ledger, and inventory sold-status consistency.
          This is distinct from Gold/Cash Reconciliation under Gold Ledger and Cash Management, which compare the
          system against a physical count — these checks compare two independent computations of the same fact,
          catching a data-integrity bug rather than a till-count mismatch.
        </p>
      </div>

      <RunReconciliationButton />
    </div>
  );
}
