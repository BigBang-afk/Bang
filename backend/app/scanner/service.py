"""Continuous market scanner: ranks every USDT pair by volume, relative
volume, momentum, and volatility to surface the highest-probability /
highest-volatility opportunities."""

from __future__ import annotations

from datetime import datetime, timezone

from app.core.config import settings
from app.core.logging import get_logger
from app.core.redis import cache_get_json, cache_set_json
from app.indicators.engine import analyze, build_dataframe
from app.mexc.client import get_mexc_client
from app.signals.generator import generate_signal

logger = get_logger(__name__)

SCANNER_CACHE_KEY = "scanner:tickers"
OPPORTUNITIES_CACHE_KEY = "scanner:opportunities"
SIGNALS_CACHE_KEY = "scanner:signals"
DEEP_SCAN_TOP_N = 25


def _safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


async def scan_all_tickers() -> list[dict]:
    """Pull the 24hr ticker snapshot for every USDT spot pair in one call
    and compute a composite volatility/opportunity score."""
    client = get_mexc_client()
    raw = await client.spot_ticker_24hr()
    if not isinstance(raw, list):
        raw = [raw]

    ranked: list[dict] = []
    for t in raw:
        symbol = t.get("symbol", "")
        if not symbol.endswith(settings.QUOTE_ASSET):
            continue
        change_pct = _safe_float(t.get("priceChangePercent")) * 100
        volume = _safe_float(t.get("volume"))
        quote_volume = _safe_float(t.get("quoteVolume"))
        high, low = _safe_float(t.get("highPrice")), _safe_float(t.get("lowPrice"))
        last = _safe_float(t.get("lastPrice"))
        range_pct = ((high - low) / low * 100) if low > 0 else 0

        # Composite opportunity score: blends momentum, range expansion and liquidity.
        score = abs(change_pct) * 0.4 + range_pct * 0.35 + min(quote_volume / 1_000_000, 100) * 0.25

        ranked.append(
            {
                "symbol": symbol,
                "price": last,
                "change_percent": round(change_pct, 3),
                "volume": volume,
                "quote_volume": round(quote_volume, 2),
                "high_24h": high,
                "low_24h": low,
                "range_percent": round(range_pct, 3),
                "opportunity_score": round(score, 3),
            }
        )

    ranked.sort(key=lambda x: x["opportunity_score"], reverse=True)
    await cache_set_json(SCANNER_CACHE_KEY, ranked, ttl=30)
    return ranked


async def deep_scan_top_movers(timeframe: str = "15m") -> list[dict]:
    """Runs full indicator analysis + signal generation on the top-N most
    volatile pairs and updates the 'high volatility opportunities' panel and
    live signal feed."""
    ranked = await cache_get_json(SCANNER_CACHE_KEY) or await scan_all_tickers()
    top = ranked[:DEEP_SCAN_TOP_N]
    client = get_mexc_client()

    opportunities = []
    signals = []
    for entry in top:
        symbol = entry["symbol"]
        try:
            klines = await client.spot_klines(symbol, interval=timeframe, limit=200)
            if len(klines) < 60:
                continue
            df = build_dataframe(klines)
            analysis = analyze(df)

            htf_klines = await client.spot_klines(symbol, interval="1h", limit=200)
            htf_analysis = analyze(build_dataframe(htf_klines)) if len(htf_klines) >= 60 else None

            opportunities.append(
                {
                    **entry,
                    "atr": analysis["volatility"]["atr"],
                    "atr_expanding": analysis["volatility"]["regime"]["atr_expanding"],
                    "volatility_regime": analysis["volatility"]["regime"]["regime"],
                    "adx": analysis["volatility"]["adx"],
                    "order_book_bias": None,
                    "trend_direction": analysis["trend"]["direction"],
                    "rsi": analysis["momentum"]["rsi"],
                    "patterns": analysis["patterns"],
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            )

            signal = generate_signal(symbol, timeframe, analysis, htf_analysis)
            if signal:
                signal["updated_at"] = datetime.now(timezone.utc).isoformat()
                signals.append(signal)
        except Exception as exc:  # noqa: BLE001 - continue scanning other symbols
            logger.warning("deep_scan_symbol_failed", symbol=symbol, error=str(exc))
            continue

    opportunities.sort(key=lambda x: x["opportunity_score"], reverse=True)
    signals.sort(key=lambda x: x["confidence_score"], reverse=True)

    await cache_set_json(OPPORTUNITIES_CACHE_KEY, opportunities, ttl=60)
    await cache_set_json(SIGNALS_CACHE_KEY, signals, ttl=60)
    return signals
