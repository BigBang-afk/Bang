import { Receipt } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function SalesPage() {
  return (
    <ComingSoon
      icon={Receipt}
      title="Sales"
      description="Sales history and professional invoicing. Arriving in the next phase."
    />
  );
}
