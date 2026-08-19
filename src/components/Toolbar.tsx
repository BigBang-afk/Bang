import type { FeedStatus, Interval, SymbolInfo } from "../types";
import { DATA_PROVIDER } from "../data/krakenFeed";

interface ToolbarProps {
  symbols: SymbolInfo[];
  symbol: string;
  onSymbolChange: (s: string) => void;
  interval: Interval;
  onIntervalChange: (i: Interval) => void;
  price: number | null;
  prevClose: number | null;
  status: FeedStatus;
}

const INTERVALS: Interval[] = ["1m", "5m"];

function statusLabel(status: FeedStatus): string {
  switch (status) {
    case "connected":
      return "LIVE";
    case "connecting":
      return "CONNECTING";
    case "reconnecting":
      return "RECONNECTING";
    case "error":
      return "FEED ERROR";
    default:
      return "IDLE";
  }
}

export default function Toolbar({ symbols, symbol, onSymbolChange, interval, onIntervalChange, price, prevClose, status }: ToolbarProps) {
  const change = price !== null && prevClose !== null && prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : null;
  const up = change !== null && change >= 0;

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <select className="selector" value={symbol} onChange={(e) => onSymbolChange(e.target.value)}>
          {symbols.map((s) => (
            <option key={s.symbol} value={s.symbol}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="tf-group">
          {INTERVALS.map((tf) => (
            <button key={tf} className={`tf-btn ${tf === interval ? "active" : ""}`} onClick={() => onIntervalChange(tf)}>
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-center">
        {price !== null ? (
          <>
            <span className={`price ${up ? "up" : "down"}`}>{price.toFixed(price < 10 ? 5 : 2)}</span>
            {change !== null && (
              <span className={`price-change ${up ? "up" : "down"}`}>
                {up ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
              </span>
            )}
          </>
        ) : (
          <span className="price muted">—</span>
        )}
      </div>

      <div className="toolbar-right">
        <span className={`status-dot status-${status}`} />
        <span className="status-text">{statusLabel(status)}</span>
        <span className="provider-label">Data: {DATA_PROVIDER}</span>
      </div>
    </div>
  );
}
