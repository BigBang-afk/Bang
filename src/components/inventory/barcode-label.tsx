import { BarcodeSvg } from "@/components/inventory/barcode-svg";
import { formatCurrency, formatWeight } from "@/lib/format";
import { PURITY_LABELS, type GoldPurity } from "@/types/gold";

export type BarcodeLabelData = {
  barcodeCode: string;
  productName: string;
  purity: GoldPurity;
  grossWeight: string;
  sellingPrice: string;
};

/**
 * A single print-ready label. Dimensions are CSS custom properties
 * (--zj-label-width/height) with sensible 50mm x 30mm defaults so a future
 * settings screen can make them configurable per label-printer model
 * without touching this component — see BARCODE-SYSTEM.md.
 */
export function BarcodeLabel({ data }: { data: BarcodeLabelData }) {
  return (
    <div
      className="flex flex-col items-center gap-1 border border-border bg-white p-2 text-center text-black"
      style={{
        width: "var(--zj-label-width, 50mm)",
        height: "var(--zj-label-height, 30mm)",
      }}
    >
      <p className="text-[9px] font-bold uppercase tracking-wide">Zarghoon Jewellers</p>
      <p className="truncate text-[10px] font-medium leading-tight">{data.productName}</p>
      <p className="text-[9px] leading-tight">{PURITY_LABELS[data.purity]}</p>
      <BarcodeSvg value={data.barcodeCode} width={1.4} height={32} fontSize={9} className="max-w-full" />
      <div className="flex w-full justify-between text-[8px] leading-tight">
        <span>Gross: {formatWeight(data.grossWeight)}</span>
        <span>{formatCurrency(data.sellingPrice)}</span>
      </div>
    </div>
  );
}
