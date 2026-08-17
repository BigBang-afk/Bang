"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/**
 * Renders a real, machine-scannable CODE128 barcode symbol for `value`
 * (the ZJ code itself is the scan payload — see BARCODE-SYSTEM.md for why
 * there isn't a separate numeric barcode value). The human-readable text
 * is rendered by JsBarcode below the bars automatically.
 */
export function BarcodeSvg({
  value,
  width = 2,
  height = 60,
  fontSize = 14,
  className,
}: {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    JsBarcode(svgRef.current, value, {
      format: "CODE128",
      width,
      height,
      fontSize,
      margin: 8,
      displayValue: true,
      background: "transparent",
      lineColor: "#000000",
    });
  }, [value, width, height, fontSize]);

  return <svg ref={svgRef} role="img" aria-label={`Barcode ${value}`} className={className} />;
}
