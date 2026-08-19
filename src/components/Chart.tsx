import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CandlestickData,
  CandlestickSeriesPartialOptions,
  ColorType,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  createChart,
} from "lightweight-charts";
import type { Candle, Prediction } from "../types";
import type { RealtimeCandleEngine } from "../engine/realtimeCandleEngine";

interface ChartProps {
  engine: RealtimeCandleEngine;
  predictions: [Prediction, Prediction] | null;
  sessionKey: string;
}

const REAL_OPTIONS: CandlestickSeriesPartialOptions = {
  upColor: "#26a69a",
  downColor: "#ef5350",
  borderVisible: false,
  wickUpColor: "#26a69a",
  wickDownColor: "#ef5350",
  priceLineVisible: true,
  lastValueVisible: true,
};

const PREDICTION_OPTIONS: CandlestickSeriesPartialOptions = {
  upColor: "rgba(41, 182, 246, 0.14)",
  downColor: "rgba(255, 138, 101, 0.12)",
  borderVisible: true,
  borderUpColor: "#29b6f6",
  borderDownColor: "#ff8a65",
  wickUpColor: "#29b6f6",
  wickDownColor: "#ff8a65",
  priceLineVisible: false,
  lastValueVisible: false,
};

function toBar(c: Candle): CandlestickData {
  return { time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close };
}

function predToBar(p: Prediction): CandlestickData {
  return { time: p.time as UTCTimestamp, open: p.open, high: p.high, low: p.low, close: p.close };
}

export default function Chart({ engine, predictions, sessionKey }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const realSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const predSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [overlayPositions, setOverlayPositions] = useState<{ x: number; top: number; bottom: number }[]>([]);

  // Create the chart once.
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0b0e14" },
        textColor: "#c7ccd6",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.045)" },
        horzLines: { color: "rgba(255,255,255,0.045)" },
      },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      timeScale: {
        borderColor: "rgba(255,255,255,0.1)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
      },
      autoSize: true,
    });

    const realSeries = chart.addCandlestickSeries(REAL_OPTIONS);
    const predSeries = chart.addCandlestickSeries(PREDICTION_OPTIONS);

    chartRef.current = chart;
    realSeriesRef.current = realSeries;
    predSeriesRef.current = predSeries;

    const reposition = () => recomputeOverlay();
    chart.timeScale().subscribeVisibleTimeRangeChange(reposition);

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(reposition);
      chart.remove();
      chartRef.current = null;
      realSeriesRef.current = null;
      predSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function recomputeOverlay() {
    const chart = chartRef.current;
    const predSeries = predSeriesRef.current;
    if (!chart || !predSeries || !predictions) {
      setOverlayPositions([]);
      return;
    }
    const ts = chart.timeScale();
    const next = predictions.map((p) => {
      const x = ts.timeToCoordinate(p.time as UTCTimestamp);
      const topY = predSeries.priceToCoordinate(p.high);
      const bottomY = predSeries.priceToCoordinate(p.low);
      return { x: x ?? -9999, top: topY ?? 0, bottom: bottomY ?? 0 };
    });
    setOverlayPositions(next);
  }

  // Full reload whenever symbol/interval changes.
  useEffect(() => {
    const real = engine.store.getAllReal();
    realSeriesRef.current?.setData(real.map(toBar));
    predSeriesRef.current?.setData([]);

    const unsub = engine.store.subscribe((event, payload) => {
      if (!payload) return;
      if (event === "tick" || event === "closed") {
        realSeriesRef.current?.update(toBar(payload));
      } else if (event === "reset") {
        realSeriesRef.current?.setData(engine.store.getAllReal().map(toBar));
      }
      recomputeOverlay();
    });

    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, sessionKey]);

  // Redraw predictions when they change.
  useEffect(() => {
    if (!predSeriesRef.current) return;
    predSeriesRef.current.setData(predictions ? predictions.map(predToBar) : []);
    recomputeOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictions]);

  return (
    <div className="chart-wrapper" ref={(el) => void el}>
      <div ref={containerRef} className="chart-canvas" />
      <div className="chart-overlay">
        {predictions &&
          overlayPositions.map((pos, i) => {
            const p = predictions[i];
            if (pos.x < 0) return null;
            return (
              <div
                key={p.time}
                className={`prediction-label ${p.direction === "BULLISH" ? "bullish" : "bearish"}`}
                style={{ left: pos.x, top: Math.max(8, Math.min(pos.top, pos.bottom) - 74) }}
              >
                <div className="prediction-label-title">FUTURE {i + 1}</div>
                <div className="prediction-label-direction">
                  {p.direction === "BULLISH" ? "↑ BULLISH" : "↓ BEARISH"}
                </div>
                <div className={`prediction-label-signal ${p.signal.toLowerCase()}`}>{p.signal}</div>
                <div className="prediction-label-confidence">Confidence: {p.confidence}%</div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
