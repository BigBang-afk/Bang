import { ShoppingCart } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function PosPage() {
  return (
    <ComingSoon
      icon={ShoppingCart}
      title="Point of Sale"
      description="Fast, gold-rate-aware billing for the counter. Arriving in the next phase."
    />
  );
}
