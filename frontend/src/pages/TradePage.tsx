import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Instrument, Trade } from "../api/client";
import { getSocket } from "../ws/socket";
import { useAuth } from "../auth/AuthContext";
import { useLiveCandles } from "../hooks/useLiveCandles";
import { PriceChart } from "../components/PriceChart";

const EXPIRY_LABELS: Record<number, string> = { 30: "30s", 60: "1m", 300: "5m", 900: "15m" };

export function TradePage() {
  const { user, refreshMe } = useAuth();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [symbol, setSymbol] = useState<string>("BTC/USDT");
  const [expirySeconds, setExpirySeconds] = useState(60);
  const [stake, setStake] = useState(10);
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [history, setHistory] = useState<Trade[]>([]);
  const [placing, setPlacing] = useState<"UP" | "DOWN" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const { candles, latestPrice } = useLiveCandles(symbol);
  const instrument = instruments.find((i) => i.symbol === symbol);

  useEffect(() => {
    api.get<Instrument[]>("/market/instruments").then(({ data }) => setInstruments(data));
    const id = setInterval(() => {
      api.get<Instrument[]>("/market/instruments").then(({ data }) => setInstruments(data));
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    loadTrades();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    function onSettled() {
      loadTrades();
      refreshMe();
    }
    socket.on("trade:settled", onSettled);
    return () => {
      socket.off("trade:settled", onSettled);
    };
  }, [refreshMe]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function loadTrades() {
    const { data } = await api.get<Trade[]>("/trades");
    setOpenTrades(data.filter((t) => t.status === "OPEN"));
    setHistory(data.filter((t) => t.status !== "OPEN").slice(0, 20));
  }

  async function placeTrade(direction: "UP" | "DOWN") {
    setError(null);
    setPlacing(direction);
    try {
      await api.post("/trades", { symbol, direction, stakeCents: Math.round(stake * 100), expirySeconds });
      await loadTrades();
      await refreshMe();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Could not place trade");
    } finally {
      setPlacing(null);
    }
  }

  return (
    <div className="trade-page">
      <div className="chart-column">
        <div className="instrument-bar">
          {instruments.map((i) => (
            <button
              key={i.symbol}
              className={`instrument-btn ${i.symbol === symbol ? "active" : ""} ${i.live ? "" : "offline"}`}
              onClick={() => setSymbol(i.symbol)}
              title={i.live ? "Live" : "Feed offline"}
            >
              {i.symbol}
              <span className="dot" />
            </button>
          ))}
        </div>
        <div className="price-header">
          <span className="symbol">{symbol}</span>
          <span className="price">{latestPrice ? latestPrice.toFixed(instrument?.assetClass === "CRYPTO" ? 2 : 4) : "—"}</span>
          {instrument && <span className="payout">{Math.round(instrument.payoutRatio * 100)}% payout</span>}
        </div>
        <PriceChart candles={candles} />

        <h3>Open positions</h3>
        <table className="trades-table">
          <tbody>
            {openTrades.length === 0 && (
              <tr><td colSpan={5}>No open positions</td></tr>
            )}
            {openTrades.map((t) => {
              const remaining = Math.max(0, Math.round((new Date(t.expiryAt).getTime() - now) / 1000));
              return (
                <tr key={t.id}>
                  <td>{t.symbol}</td>
                  <td className={t.direction === "UP" ? "up" : "down"}>{t.direction}</td>
                  <td>${(Number(t.stakeCents) / 100).toFixed(2)}</td>
                  <td>entry {t.entryPrice}</td>
                  <td>{remaining}s</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h3>History</h3>
        <table className="trades-table">
          <tbody>
            {history.length === 0 && (
              <tr><td colSpan={5}>No trades yet</td></tr>
            )}
            {history.map((t) => (
              <tr key={t.id} className={t.status.toLowerCase()}>
                <td>{t.symbol}</td>
                <td className={t.direction === "UP" ? "up" : "down"}>{t.direction}</td>
                <td>${(Number(t.stakeCents) / 100).toFixed(2)}</td>
                <td>{t.status}</td>
                <td>{t.payoutCents !== null ? `$${(Number(t.payoutCents) / 100).toFixed(2)}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="trade-panel">
        <h3>Place trade</h3>
        <label>
          Expiry
          <div className="expiry-options">
            {Object.entries(EXPIRY_LABELS).map(([sec, label]) => (
              <button
                key={sec}
                className={Number(sec) === expirySeconds ? "active" : ""}
                onClick={() => setExpirySeconds(Number(sec))}
              >
                {label}
              </button>
            ))}
          </div>
        </label>
        <label>
          Stake (USD)
          <input type="number" min={1} step={1} value={stake} onChange={(e) => setStake(Number(e.target.value))} />
        </label>
        {instrument && (
          <p className="payout-preview">
            Win pays ${(stake * (1 + instrument.payoutRatio)).toFixed(2)} (+{Math.round(instrument.payoutRatio * 100)}%)
          </p>
        )}
        {error && <div className="error">{error}</div>}
        {!instrument?.live && <div className="warning">Market feed is offline for this instrument.</div>}
        <button
          className="up-btn"
          disabled={!instrument?.live || placing !== null || !user}
          onClick={() => placeTrade("UP")}
        >
          UP
        </button>
        <button
          className="down-btn"
          disabled={!instrument?.live || placing !== null || !user}
          onClick={() => placeTrade("DOWN")}
        >
          DOWN
        </button>
      </div>
    </div>
  );
}
