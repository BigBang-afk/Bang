import WebSocket from "ws";
import { config } from "../config";
import { INSTRUMENTS } from "./instruments";
import { feedManager } from "./feedManager";
import { proxyAwareWsOptions } from "./wsAgent";

const RECONNECT_DELAY_MS = 3000;

export function startBinanceFeed() {
  const streams = INSTRUMENTS.filter((i) => i.binanceSymbol).map((i) => `${i.binanceSymbol}@trade`);
  if (streams.length === 0) return;

  const url = `${config.binanceWsUrl}?streams=${streams.join("/")}`;
  connect(url);
}

function connect(url: string) {
  const ws = new WebSocket(url, proxyAwareWsOptions());

  ws.on("open", () => {
    console.log("[binance] connected");
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const data = msg.data;
      if (!data || data.e !== "trade") return;
      const binanceSymbol = (data.s as string).toLowerCase();
      const instrument = INSTRUMENTS.find((i) => i.binanceSymbol === binanceSymbol);
      if (!instrument) return;
      const price = Number(data.p);
      feedManager.ingest(instrument.symbol, price, data.T ?? Date.now());
    } catch (err) {
      console.error("[binance] failed to parse message", err);
    }
  });

  ws.on("close", () => {
    console.warn("[binance] disconnected, reconnecting...");
    setTimeout(() => connect(url), RECONNECT_DELAY_MS);
  });

  ws.on("error", (err) => {
    console.error("[binance] socket error", err.message);
    ws.close();
  });
}
