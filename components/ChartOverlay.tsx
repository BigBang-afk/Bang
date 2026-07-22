"use client";

import { useEffect, useRef } from "react";
import type { AnalysisResult } from "@/lib/analysis/types";

interface ChartOverlayProps {
  imageUrl: string;
  result: AnalysisResult;
  showOverlay: boolean;
}

export default function ChartOverlay({ imageUrl, result, showOverlay }: ChartOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      const hasProjection = showOverlay && result.projection.length > 0;
      const projectionWidth = hasProjection
        ? Math.max(0, result.projection[result.projection.length - 1].xEnd - result.imageWidth) + 70
        : 0;

      // A projected move can extend above/below the chart's visible range —
      // pad the canvas so it never gets clipped at the edge.
      const projectedYs = hasProjection
        ? result.projection.flatMap((c) => [c.highY, c.lowY])
        : [];
      const topPadding = Math.max(0, -Math.min(0, ...projectedYs)) + (projectedYs.length ? 10 : 0);
      const bottomPadding =
        Math.max(0, ...projectedYs.map((y) => y - result.imageHeight)) + (projectedYs.length ? 10 : 0);

      canvas.width = result.imageWidth + projectionWidth;
      canvas.height = result.imageHeight + topPadding + bottomPadding;

      ctx.fillStyle = "#05070d";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(0, topPadding);
      ctx.drawImage(img, 0, 0, result.imageWidth, result.imageHeight);

      if (!showOverlay) {
        ctx.restore();
        return;
      }

      const patternIndices = new Set(result.patterns.map((p) => p.atIndex));

      const levelsToDraw = [...result.levels.levels]
        .filter((l) => l.score >= 30)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .sort((a, b) => a.priceY - b.priceY);

      let lastLabelY = -Infinity;
      for (const level of levelsToDraw) {
        ctx.beginPath();
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = level.isResistance
          ? "rgba(248, 113, 113, 0.7)"
          : "rgba(52, 211, 153, 0.7)";
        ctx.lineWidth = level.score >= 60 ? 2 : 1;
        ctx.moveTo(0, level.priceY);
        ctx.lineTo(canvas.width, level.priceY);
        ctx.stroke();
        ctx.setLineDash([]);

        if (level.priceY - lastLabelY >= 14) {
          ctx.fillStyle = level.isResistance ? "#f87171" : "#34d399";
          ctx.font = "11px sans-serif";
          ctx.fillText(
            `${level.isResistance ? "R" : "S"} ${Math.round(level.score)}%`,
            4,
            level.priceY - 4,
          );
          lastLabelY = level.priceY;
        }
      }

      for (const c of result.candles) {
        const isBullish = c.color === "bullish";
        const wickColor = isBullish ? "rgba(52,211,153,0.9)" : "rgba(248,113,113,0.9)";
        ctx.strokeStyle = wickColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(c.xCenter, c.highY);
        ctx.lineTo(c.xCenter, c.lowY);
        ctx.stroke();

        const highlighted = patternIndices.has(c.index);
        ctx.fillStyle = isBullish
          ? highlighted
            ? "rgba(16,185,129,0.55)"
            : "rgba(16,185,129,0.28)"
          : highlighted
            ? "rgba(239,68,68,0.55)"
            : "rgba(239,68,68,0.28)";
        const top = Math.min(c.bodyTopY, c.bodyBottomY);
        const height = Math.max(1, Math.abs(c.bodyBottomY - c.bodyTopY));
        ctx.fillRect(c.xStart, top, c.xEnd - c.xStart + 1, height);

        if (highlighted) {
          ctx.strokeStyle = "#facc15";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(c.xStart - 1, top - 1, c.xEnd - c.xStart + 3, height + 2);
        }
      }

      if (hasProjection) {
        // Divider between real data and the illustrative projection. Drawn
        // in translated space, so span the full visible canvas height by
        // undoing the topPadding offset at each end.
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(148,163,184,0.6)";
        ctx.lineWidth = 1;
        ctx.moveTo(result.imageWidth, -topPadding);
        ctx.lineTo(result.imageWidth, canvas.height - topPadding);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(148,163,184,0.9)";
        ctx.font = "10px sans-serif";
        ctx.fillText("projected →", result.imageWidth + 4, -topPadding + 12);

        for (const c of result.projection) {
          const isBullish = c.color === "bullish";
          const color = isBullish ? "rgba(52,211,153,0.9)" : "rgba(248,113,113,0.9)";

          ctx.strokeStyle = color;
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(c.xCenter, c.highY);
          ctx.lineTo(c.xCenter, c.lowY);
          ctx.stroke();

          const top = Math.min(c.bodyTopY, c.bodyBottomY);
          const height = Math.max(1, Math.abs(c.bodyBottomY - c.bodyTopY));
          ctx.strokeRect(c.xStart, top, c.xEnd - c.xStart + 1, height);
          ctx.setLineDash([]);
        }
      }

      ctx.restore();
    };
    img.src = imageUrl;
  }, [imageUrl, result, showOverlay]);

  return (
    <div>
      <canvas ref={canvasRef} className="w-full rounded-xl border border-slate-800 bg-black" />
      {result.projection.length > 0 && (
        <p className="mt-2 text-[11px] text-slate-500">
          Dashed outline candles are an illustrative sketch of the current signal drawn forward
          (same {result.confidence}% confidence read, not a separate or more certain forecast).{" "}
          {result.projection.map((c) => c.note).join(" ")}
        </p>
      )}
    </div>
  );
}
