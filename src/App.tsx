import { useEffect, useRef, useState } from "react";
import Chart from "./components/Chart";
import Toolbar from "./components/Toolbar";
import { RealtimeCandleEngine } from "./engine/realtimeCandleEngine";
import { generatePredictions } from "./engine/predictionEngine";
import type { Candle, FeedStatus, Interval, Prediction, SymbolInfo } from "./types";
import { INTERVAL_SECONDS } from "./types";

const SYMBOLS: SymbolInfo[] = [
  { symbol: "BTC/USD", label: "BTC / USD" },
  { symbol: "ETH/USD", label: "ETH / USD" },
  { symbol: "SOL/USD", label: "SOL / USD" },
  { symbol: "XRP/USD", label: "XRP / USD" },
  { symbol: "LTC/USD", label: "LTC / USD" },
];

export default function App() {
  const [symbol, setSymbol] = useState(SYMBOLS[0].symbol);
  const [interval, setIntervalTf] = useState<Interval>("1m");
  const [status, setStatus] = useState<FeedStatus>("idle");
  const [statusDetail, setStatusDetail] = useState<string | undefined>();
  const [predictions, setPredictions] = useState<[Prediction, Prediction] | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [prevClose, setPrevClose] = useState<number | null>(null);

  const engineRef = useRef<RealtimeCandleEngine | null>(null);
  if (!engineRef.current) engineRef.current = new RealtimeCandleEngine();
  const engine = engineRef.current;

  const sessionKey = `${symbol}:${interval}`;

  useEffect(() => {
    setPredictions(null);
    setPrice(null);
    setPrevClose(null);
    setStatusDetail(undefined);

    function recomputePredictions() {
      const closed = engine.store.getClosed() as Candle[];
      const live = engine.store.getLive();
      const anchor = live ?? closed[closed.length - 1];
      if (!anchor) {
        setPredictions(null);
        return;
      }
      setPredictions(generatePredictions(closed, anchor.time, INTERVAL_SECONDS[interval]));
    }

    function updateReference() {
      const closed = engine.store.getClosed();
      const live = engine.store.getLive();
      if (live && closed.length >= 1) {
        setPrevClose(closed[closed.length - 1].close);
      } else if (closed.length >= 2) {
        setPrevClose(closed[closed.length - 2].close);
      }
    }

    const unsubStatus = engine.onStatus((s, detail) => {
      setStatus(s);
      setStatusDetail(detail);
    });

    const unsubStore = engine.store.subscribe((event, payload) => {
      if (event === "reset") {
        const all = engine.store.getAllReal();
        if (all.length) setPrice(all[all.length - 1].close);
        updateReference();
        recomputePredictions();
      } else if (event === "tick") {
        if (payload) setPrice(payload.close);
      } else if (event === "closed") {
        if (payload) setPrice(payload.close);
        updateReference();
        recomputePredictions();
      }
    });

    engine.start(symbol, interval);

    return () => {
      unsubStatus();
      unsubStore();
      engine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval]);

  return (
    <div className="app">
      <Toolbar
        symbols={SYMBOLS}
        symbol={symbol}
        onSymbolChange={setSymbol}
        interval={interval}
        onIntervalChange={setIntervalTf}
        price={price}
        prevClose={prevClose}
        status={status}
      />
      {status === "error" && (
        <div className="error-banner">
          Live market data unavailable{statusDetail ? `: ${statusDetail}` : ""}. No simulated or invented candles will
          be shown.
        </div>
      )}
      <Chart engine={engine} predictions={predictions} sessionKey={sessionKey} />
      <div className="legend">
        <span className="legend-item">
          <span className="swatch real" /> Real market candles
        </span>
        <span className="legend-item">
          <span className="swatch pred" /> Predicted (Future 1 / Future 2) — forecast only, not live data
        </span>
      </div>
    </div>
  );
}
