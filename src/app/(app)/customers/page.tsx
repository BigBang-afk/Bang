import { Users } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function CustomersPage() {
  return (
    <ComingSoon
      icon={Users}
      title="Customers"
      description="Customer CRM, ledgers, and loyalty tracking. Arriving in the next phase."
    />
  );
}
