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
      canvas.width = result.imageWidth;
      canvas.height = result.imageHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (!showOverlay) return;

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
    };
    img.src = imageUrl;
  }, [imageUrl, result, showOverlay]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl border border-slate-800 bg-black"
    />
  );
}
