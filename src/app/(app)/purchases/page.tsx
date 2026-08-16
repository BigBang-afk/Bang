import { Truck } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function PurchasesPage() {
  return (
    <ComingSoon
      icon={Truck}
      title="Purchases"
      description="Supplier purchases and incoming stock. Arriving in the next phase."
    />
  );
}
