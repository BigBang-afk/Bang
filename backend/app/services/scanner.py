"""Market scanner: iterates USDT trading pairs, pulls candles/order book/trades from MEXC,
runs the signal engine, and yields high-confidence signals. Designed to run as a background
asyncio task (see app.main lifespan) with a bounded concurrency to stay within MEXC rate limits.
"""
from __future__ import annotations

import asyncio
import logging

import pandas as pd

from app.services.mexc_client import MexcClient, MexcApiError
from app.services.signal_engine import SignalResult, generate_signal, should_notify

logger = logging.getLogger(__name__)

TRADING_MODE_TIMEFRAMES = {
    "scalping": {"primary": "5m", "higher": "15m"},
    "intraday": {"primary": "60m", "higher": "4h"},
}


def _klines_to_dataframe(klines: list[list]) -> pd.DataFrame:
    """MEXC kline row: [open_time, open, high, low, close, volume, close_time, ...]"""
    df = pd.DataFrame(klines, columns=[
        "open_time", "open", "high", "low", "close", "volume", "close_time",
        "quote_volume", "trades", "taker_buy_base", "taker_buy_quote", "ignore",
    ][: len(klines[0])] if klines else [])
    for col in ("open", "high", "low", "close", "volume"):
        df[col] = df[col].astype(float)
    df.index = pd.to_datetime(df["open_time"], unit="ms")
    return df


async def scan_symbol(client: MexcClient, symbol: str, trading_mode: str) -> list[SignalResult]:
    tf = TRADING_MODE_TIMEFRAMES[trading_mode]
    try:
        klines, htf_klines, order_book, trades = await asyncio.gather(
            client.get_klines(symbol, tf["primary"], limit=300),
            client.get_klines(symbol, tf["higher"], limit=300),
            client.get_order_book(symbol, limit=50),
            client.get_recent_trades(symbol, limit=200),
        )
    except MexcApiError:
        logger.warning("MEXC API error scanning %s", symbol, exc_info=True)
        return []

    if not klines or not htf_klines:
        return []

    df = _klines_to_dataframe(klines)
    htf_df = _klines_to_dataframe(htf_klines)
    trade_prints = [{"price": t.get("price"), "qty": t.get("qty"), "side": "buy" if t.get("isBuyerMaker") is False else "sell"} for t in trades]

    signals: list[SignalResult] = []
    for direction in ("long", "short"):
        signal = generate_signal(
            symbol=symbol,
            direction=direction,
            df=df,
            htf_df=htf_df,
            order_book=order_book,
            trades=trade_prints,
            trading_mode=trading_mode,
            timeframe=tf["primary"],
        )
        if should_notify(signal):
            signals.append(signal)
    return signals


async def scan_market(client: MexcClient, symbols: list[str], trading_mode: str, concurrency: int = 5) -> list[SignalResult]:
    semaphore = asyncio.Semaphore(concurrency)

    async def bounded_scan(symbol: str) -> list[SignalResult]:
        async with semaphore:
            return await scan_symbol(client, symbol, trading_mode)

    results = await asyncio.gather(*(bounded_scan(s) for s in symbols))
    return [signal for batch in results for signal in batch]
