import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { Candle } from "../api/client";
import { getSocket } from "../ws/socket";

const CANDLE_INTERVAL_SEC = 60;

export function useLiveCandles(symbol: string) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [latestPrice, setLatestPrice] = useState<number | undefined>(undefined);
  const candlesRef = useRef<Candle[]>([]);

  useEffect(() => {
    let cancelled = false;
    setCandles([]);
    candlesRef.current = [];
    setLatestPrice(undefined);

    api.get(`/market/instruments/${encodeURIComponent(symbol)}/candles`).then(({ data }) => {
      if (cancelled) return;
      candlesRef.current = data.candles;
      setCandles([...data.candles]);
    });

    const socket = getSocket();
    function onPrice(tick: { symbol: string; price: number; ts: number }) {
      if (tick.symbol !== symbol) return;
      setLatestPrice(tick.price);

      const bucket = Math.floor(tick.ts / 1000 / CANDLE_INTERVAL_SEC) * CANDLE_INTERVAL_SEC;
      const list = candlesRef.current;
      const last = list[list.length - 1];
      if (last && last.time === bucket) {
        last.high = Math.max(last.high, tick.price);
        last.low = Math.min(last.low, tick.price);
        last.close = tick.price;
      } else {
        list.push({ time: bucket, open: tick.price, high: tick.price, low: tick.price, close: tick.price });
        if (list.length > 500) list.shift();
      }
      setCandles([...list]);
    }

    socket.on("price", onPrice);
    return () => {
      cancelled = true;
      socket.off("price", onPrice);
    };
  }, [symbol]);

  return { candles, latestPrice };
}
