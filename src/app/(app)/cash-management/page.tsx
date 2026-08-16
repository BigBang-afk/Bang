import { Wallet } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function CashManagementPage() {
  return (
    <ComingSoon
      icon={Wallet}
      title="Cash Management"
      description="Cash in/out, till reconciliation, and expenses. Arriving in the next phase."
    />
  );
}
