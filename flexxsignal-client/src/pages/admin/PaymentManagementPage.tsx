import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SubscriptionsApi } from "../../api/endpoints";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { LoadingSkeleton, EmptyState } from "../../components/ui/States";
import { useToastStore } from "../../store/uiStore";
import type { PaymentRecordDto } from "../../types/domain";

export default function PaymentManagementPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const { data: payments, isLoading } = useQuery({ queryKey: ["pending-payments"], queryFn: SubscriptionsApi.pendingPayments });

  const review = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => SubscriptionsApi.reviewPayment(id, { approve }),
    onSuccess: () => {
      pushToast("Payment reviewed.", "success");
      queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
    },
  });

  const columns: Column<PaymentRecordDto>[] = [
    { header: "User", render: (p) => p.userEmail },
    { header: "Amount", render: (p) => `${p.amount} ${p.currency}` },
    { header: "Method", render: (p) => p.paymentMethod },
    { header: "Reference", render: (p) => p.referenceCode },
    { header: "Submitted", render: (p) => new Date(p.createdAtUtc).toLocaleString() },
    {
      header: "Actions",
      render: (p) => (
        <div className="flex gap-2">
          <button className="text-xs text-signal-up hover:underline" onClick={() => review.mutate({ id: p.id, approve: true })}>Approve</button>
          <button className="text-xs text-signal-down hover:underline" onClick={() => review.mutate({ id: p.id, approve: false })}>Reject</button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-heading">Payment Management</h1>
      <p className="text-sm text-slate-400">Manual, development-safe review workflow — no payment gateway is connected.</p>
      {isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : !payments || payments.length === 0 ? (
        <EmptyState title="No pending payments" />
      ) : (
        <DataTable columns={columns} rows={payments} keyOf={(p) => p.id} />
      )}
    </div>
  );
}
