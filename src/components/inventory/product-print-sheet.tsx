import Image from "next/image";
import { BarcodeSvg } from "@/components/inventory/barcode-svg";
import { formatCurrency, formatDate, formatRatePerGram, formatWeight } from "@/lib/format";
import { formatBarcodeCode } from "@/lib/barcode-code";
import { PURITY_LABELS } from "@/types/gold";
import type { InventoryItemDetail } from "@/services/inventory-item.service";

export function ProductPrintSheet({ item }: { item: InventoryItemDetail }) {
  const barcodeCode = item.barcode ? formatBarcodeCode(item.barcode.sequence) : "—";

  return (
    <div className="w-full max-w-xl border border-border bg-white p-8 text-black">
      <div className="mb-6 flex items-center justify-between border-b border-black/20 pb-4">
        <div>
          <p className="text-lg font-bold uppercase tracking-wide">Zarghoon Jewellers</p>
          <p className="text-xs text-black/60">Product Information Sheet</p>
        </div>
        <p className="text-xs text-black/60">{formatDate(new Date())}</p>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden border border-black/10 bg-black/5">
          {item.product.imageUrl ? (
            <Image
              src={item.product.imageUrl}
              alt={item.product.name}
              width={112}
              height={112}
              className="size-28 object-cover"
            />
          ) : (
            <span className="text-[10px] text-black/40">No image</span>
          )}
        </div>
        <div className="flex-1">
          <p className="text-xl font-semibold">{item.product.name}</p>
          <p className="text-sm text-black/60">{item.product.category.name}</p>
          <div className="mt-2">
            <BarcodeSvg value={barcodeCode} width={1.6} height={40} fontSize={11} />
          </div>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <tbody>
          <Row label="Purity" value={PURITY_LABELS[item.purity]} />
          <Row label="Net Weight" value={formatWeight(item.netWeight.toString())} />
          <Row
            label="Wastage"
            value={
              item.wastagePercent
                ? `${item.wastagePercent.toString()}% (${formatWeight(item.wastageWeight.toString())})`
                : formatWeight(item.wastageWeight.toString())
            }
          />
          <Row label="Gross Weight" value={formatWeight(item.grossWeight.toString())} />
          <Row label="Gold Rate" value={formatRatePerGram(item.goldRatePerGram.toString())} />
          <Row label="Gold Value" value={formatCurrency(item.goldValue.toString())} />
          <Row label="Making Charges" value={formatCurrency(item.makingCharge.toString())} />
          <Row label="Stone Charges" value={formatCurrency(item.stoneCharge.toString())} />
          <Row label="Other Charges" value={formatCurrency(item.otherCharge.toString())} />
          <Row label="Selling Price" value={formatCurrency(item.sellingPrice.toString())} strong />
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr className="border-b border-black/10">
      <td className="py-1.5 text-black/60">{label}</td>
      <td className={`py-1.5 text-right ${strong ? "font-semibold" : ""}`}>{value}</td>
    </tr>
  );
}
