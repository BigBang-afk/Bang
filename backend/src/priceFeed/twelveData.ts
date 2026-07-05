import WebSocket from "ws";
import { config } from "../config";
import { INSTRUMENTS } from "./instruments";
import { feedManager } from "./feedManager";
import { proxyAwareWsOptions } from "./wsAgent";

const RECONNECT_DELAY_MS = 5000;

/**
 * Forex/stock prices require a paid real-time provider — free tiers are
 * delayed (commonly 15+ minutes) which is unacceptable for settling
 * real-money trades against. This feed is a no-op until TWELVE_DATA_API_KEY
 * is configured, so forex/stock instruments simply won't go "live" (and the
 * trade engine refuses to open trades on a dead feed) rather than settling
 * against stale or fabricated prices.
 */
export function startTwelveDataFeed() {
  const symbols = INSTRUMENTS.filter((i) => i.twelveDataSymbol).map((i) => i.twelveDataSymbol!);
  if (symbols.length === 0) return;

  if (!config.twelveDataApiKey) {
    console.warn(
      "[twelvedata] TWELVE_DATA_API_KEY not set — forex/stock instruments will stay offline. " +
        "Get a real-time key at https://twelvedata.com to enable them."
    );
    return;
  }

  connect(symbols);
}

function connect(symbols: string[]) {
  const url = `${config.twelveDataWsUrl}?apikey=${config.twelveDataApiKey}`;
  const ws = new WebSocket(url, proxyAwareWsOptions());

  ws.on("open", () => {
    console.log("[twelvedata] connected");
    ws.send(JSON.stringify({ action: "subscribe", params: { symbols: symbols.join(",") } }));
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.event !== "price") return;
      const instrument = INSTRUMENTS.find((i) => i.twelveDataSymbol === msg.symbol);
      if (!instrument) return;
      const price = Number(msg.price);
      feedManager.ingest(instrument.symbol, price, msg.timestamp ? msg.timestamp * 1000 : Date.now());
    } catch (err) {
      console.error("[twelvedata] failed to parse message", err);
    }
  });

  ws.on("close", () => {
    console.warn("[twelvedata] disconnected, reconnecting...");
    setTimeout(() => connect(symbols), RECONNECT_DELAY_MS);
  });

  ws.on("error", (err) => {
    console.error("[twelvedata] socket error", err.message);
    ws.close();
  });
}
