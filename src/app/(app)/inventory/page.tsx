import { Boxes } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function InventoryPage() {
  return (
    <ComingSoon
      icon={Boxes}
      title="Inventory"
      description="Jewelry stock, ZJ barcoding, and item-level gold valuation. Arriving in the next phase."
    />
  );
}
