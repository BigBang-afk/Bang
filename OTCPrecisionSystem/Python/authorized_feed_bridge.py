#!/usr/bin/env python3
"""
authorized_feed_bridge.py
OTC Precision Signal System

Bridges a DOCUMENTED, AUTHORIZED market-data API into the CSV file format
consumed by OTCFeedImporter.mq5 (MQL5 custom-symbol importer).

This script:
  * Never hardcodes an API endpoint, API key, or secret. The endpoint and
    credentials must be supplied by the user via environment variables.
  * Never scrapes a website, drives a browser, bypasses authentication, or
    reverse engineers any private/undocumented API. It only ever calls the
    authorized endpoint YOU configure, using the documented connection
    method YOU are entitled to use.
  * Ships with a MOCK mode that generates synthetic data locally, so the
    rest of the pipeline (CSV output, MT5 import, indicator/EA testing)
    can be developed and validated without any live data source.
  * Writes ticks to the output CSV atomically (write-to-temp + os.replace)
    so a concurrently running MT5 import script never observes a partial
    write.

Where to plug in your authorized provider
------------------------------------------
Search for the block marked:

    # >>> AUTHORIZED PROVIDER CONNECTION CODE GOES HERE >>>
    ...
    # <<< END AUTHORIZED PROVIDER CONNECTION CODE <<<

inside `AuthorizedFeedSource.fetch_batch()` below, and replace the
placeholder HTTP GET with the exact, documented call your data provider's
API reference specifies (REST, WebSocket, SDK, etc). Do not invent an
endpoint path or payload shape - use only what your provider documents.

Environment variables
----------------------
  OTC_FEED_API_URL        Required in --mode live. Full URL of the
                           documented authorized endpoint.
  OTC_FEED_API_KEY        Optional. Sent as a bearer/header credential -
                           never logged, never written to disk.
  OTC_FEED_API_SECRET     Optional. Same handling as OTC_FEED_API_KEY.
  OTC_FEED_OUTPUT_DIR     Optional. Overrides --output-dir.

Requirements (see README.md "Python Bridge" section for the full list):
  Python 3.11+
  requests>=2.31

Usage
-----
  python authorized_feed_bridge.py --mode mock --symbol EURUSD
  OTC_FEED_API_URL="https://your-authorized-provider/api/ticks" \\
      python authorized_feed_bridge.py --mode live --symbol EURUSD
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import logging
import os
import random
import sys
import tempfile
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

if sys.version_info < (3, 11):
    sys.stderr.write("authorized_feed_bridge.py requires Python 3.11 or newer.\n")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Structured logging
# ---------------------------------------------------------------------------

class StructuredFormatter(logging.Formatter):
    """Emits one JSON object per log line for easy downstream parsing."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "component": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        extra = getattr(record, "extra_fields", None)
        if extra:
            payload.update(extra)
        return json.dumps(payload, ensure_ascii=False)


def build_logger(name: str, level: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(level.upper())
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredFormatter())
        logger.addHandler(handler)
    return logger


log = build_logger("otc_feed_bridge", os.environ.get("OTC_FEED_LOG_LEVEL", "INFO"))


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclasses.dataclass(frozen=True)
class Tick:
    timestamp: datetime  # always timezone-aware, UTC
    bid: float
    ask: float
    volume: float = 0.0

    def to_csv_row(self) -> str:
        ts = self.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        return f"{ts},{self.bid:.8f},{self.ask:.8f},{self.volume:.4f}"


class ValidationError(ValueError):
    pass


def parse_timestamp(raw: object) -> datetime:
    """Accepts an ISO-8601 string, or an epoch seconds/milliseconds number,
    and returns a timezone-aware UTC datetime. Raises ValidationError on
    anything else."""
    if isinstance(raw, (int, float)):
        # Heuristic: treat values above 10^12 as milliseconds since epoch.
        seconds = raw / 1000.0 if raw > 1e12 else float(raw)
        try:
            return datetime.fromtimestamp(seconds, tz=timezone.utc)
        except (OverflowError, OSError, ValueError) as exc:
            raise ValidationError(f"Invalid numeric timestamp: {raw!r}") from exc

    if isinstance(raw, str):
        text = raw.strip().replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(text)
        except ValueError as exc:
            raise ValidationError(f"Invalid timestamp string: {raw!r}") from exc
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    raise ValidationError(f"Unsupported timestamp type: {type(raw)!r}")


def validate_message(payload: dict) -> Tick:
    """Validates a single JSON tick message and converts it into a Tick.
    Expected minimal shape (adapt only if your authorized provider's
    documented schema genuinely differs - do not guess field names):

        {"timestamp": "2026-08-02T12:34:56Z", "bid": 1.08423, "ask": 1.08431, "volume": 1.0}
    """
    if not isinstance(payload, dict):
        raise ValidationError(f"Message is not a JSON object: {payload!r}")

    missing = [k for k in ("timestamp", "bid", "ask") if k not in payload]
    if missing:
        raise ValidationError(f"Message missing required field(s): {missing}")

    timestamp = parse_timestamp(payload["timestamp"])

    try:
        bid = float(payload["bid"])
        ask = float(payload["ask"])
    except (TypeError, ValueError) as exc:
        raise ValidationError(f"bid/ask are not numeric: {payload!r}") from exc

    if bid <= 0.0 or ask <= 0.0:
        raise ValidationError(f"bid/ask must be positive: bid={bid} ask={ask}")
    if ask < bid:
        raise ValidationError(f"ask ({ask}) is below bid ({bid})")

    volume_raw = payload.get("volume", 0.0)
    try:
        volume = float(volume_raw)
    except (TypeError, ValueError) as exc:
        raise ValidationError(f"volume is not numeric: {volume_raw!r}") from exc
    if volume < 0.0:
        raise ValidationError(f"volume cannot be negative: {volume}")

    return Tick(timestamp=timestamp, bid=bid, ask=ask, volume=volume)


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

class DuplicateTickFilter:
    """Rejects ticks whose (timestamp, bid, ask) triple has already been
    seen, keeping only a bounded recent-history window in memory."""

    def __init__(self, max_history: int = 5000):
        self._max_history = max_history
        self._seen: set[tuple[str, float, float]] = set()
        self._order: list[tuple[str, float, float]] = []

    def is_duplicate(self, tick: Tick) -> bool:
        key = (tick.timestamp.isoformat(), tick.bid, tick.ask)
        if key in self._seen:
            return True
        self._seen.add(key)
        self._order.append(key)
        if len(self._order) > self._max_history:
            oldest = self._order.pop(0)
            self._seen.discard(oldest)
        return False


# ---------------------------------------------------------------------------
# Atomic CSV writer (MT5-compatible: yyyy-mm-dd hh:mi:ss,bid,ask,volume)
# ---------------------------------------------------------------------------

class AtomicCsvWriter:
    def __init__(self, target_path: Path):
        self.target_path = target_path
        self.target_path.parent.mkdir(parents=True, exist_ok=True)

    def append(self, ticks: list[Tick]) -> None:
        if not ticks:
            return

        existing = ""
        if self.target_path.exists():
            existing = self.target_path.read_text(encoding="ascii", errors="strict")

        new_rows = "\n".join(t.to_csv_row() for t in ticks)
        combined = existing
        if combined and not combined.endswith("\n"):
            combined += "\n"
        combined += new_rows + "\n"

        fd, tmp_name = tempfile.mkstemp(
            dir=str(self.target_path.parent), prefix=".otcfeed_", suffix=".tmp"
        )
        try:
            with os.fdopen(fd, "w", encoding="ascii", newline="") as f:
                f.write(combined)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp_name, self.target_path)  # atomic on POSIX and Windows (same volume)
        except Exception:
            if os.path.exists(tmp_name):
                os.remove(tmp_name)
            raise


# ---------------------------------------------------------------------------
# Feed sources
# ---------------------------------------------------------------------------

class FeedSource(ABC):
    @abstractmethod
    def fetch_batch(self) -> list[dict]:
        """Return a list of raw (unvalidated) JSON tick messages."""
        raise NotImplementedError


class MockFeedSource(FeedSource):
    """Generates a synthetic, locally-computed random-walk price series.
    Used for development and pipeline testing ONLY - it is not connected
    to any real market data and must never be presented as live data."""

    def __init__(self, symbol: str, base_price: float = 1.08000, spread: float = 0.00020):
        self._symbol = symbol
        self._price = base_price
        self._spread = spread
        self._rng = random.Random(hash(symbol) & 0xFFFFFFFF)

    def fetch_batch(self) -> list[dict]:
        batch = []
        for _ in range(self._rng.randint(1, 4)):
            step = self._rng.gauss(0, 1) * 0.00006
            self._price = max(0.0001, self._price + step)
            bid = round(self._price, 5)
            ask = round(self._price + self._spread, 5)
            batch.append(
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "bid": bid,
                    "ask": ask,
                    "volume": round(self._rng.uniform(0.1, 5.0), 2),
                }
            )
        return batch


class AuthorizedFeedSource(FeedSource):
    """Template for a real, authorized, documented data provider.

    The URL and credentials come ONLY from environment variables set by
    the user - nothing here is hardcoded or guessed.
    """

    def __init__(self, symbol: str, api_url: str, api_key: Optional[str], api_secret: Optional[str]):
        self._symbol = symbol
        self._api_url = api_url
        self._api_key = api_key
        self._api_secret = api_secret
        try:
            import requests  # imported lazily so mock mode has no hard dependency
        except ImportError as exc:
            raise RuntimeError(
                "The 'requests' package is required for --mode live. Install it with: pip install requests"
            ) from exc
        self._requests = requests
        self._session = requests.Session()

    def fetch_batch(self) -> list[dict]:
        # >>> AUTHORIZED PROVIDER CONNECTION CODE GOES HERE >>>
        #
        # Replace this generic GET request with the exact call documented
        # by your authorized data provider (headers, auth scheme, request
        # body, pagination/cursor handling, WebSocket subscribe message,
        # SDK call, etc). Do not invent field names or endpoints not
        # present in your provider's own API documentation.
        headers = {}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        params = {"symbol": self._symbol}

        response = self._session.get(self._api_url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        # Expected: either a single message dict or a list of message dicts.
        if isinstance(data, dict):
            return [data]
        if isinstance(data, list):
            return data
        raise ValidationError(f"Unexpected response payload shape: {type(data)!r}")
        # <<< END AUTHORIZED PROVIDER CONNECTION CODE <<<


# ---------------------------------------------------------------------------
# Reconnect / backoff loop
# ---------------------------------------------------------------------------

class ExponentialBackoff:
    def __init__(self, base_seconds: float = 1.0, max_seconds: float = 60.0, jitter: float = 0.25):
        self._base = base_seconds
        self._max = max_seconds
        self._jitter = jitter
        self._attempt = 0

    def reset(self) -> None:
        self._attempt = 0

    def next_delay(self) -> float:
        delay = min(self._max, self._base * (2 ** self._attempt))
        self._attempt += 1
        jitter_amount = delay * self._jitter
        return max(0.0, delay + random.uniform(-jitter_amount, jitter_amount))


def run_bridge(
    source: FeedSource,
    writer: AtomicCsvWriter,
    dedup: DuplicateTickFilter,
    poll_interval: float,
    max_iterations: Optional[int] = None,
) -> None:
    backoff = ExponentialBackoff()
    iterations = 0

    while max_iterations is None or iterations < max_iterations:
        iterations += 1
        try:
            raw_batch = source.fetch_batch()
            backoff.reset()
        except Exception as exc:  # network/provider errors -> reconnect with backoff
            delay = backoff.next_delay()
            log.warning(
                "Feed fetch failed, backing off",
                extra={"extra_fields": {"error": str(exc), "retry_in_seconds": round(delay, 2)}},
            )
            time.sleep(delay)
            continue

        valid_ticks: list[Tick] = []
        rejected = 0
        duplicates = 0

        for raw in raw_batch:
            try:
                tick = validate_message(raw)
            except ValidationError as exc:
                rejected += 1
                log.warning("Rejected malformed message", extra={"extra_fields": {"error": str(exc)}})
                continue

            if dedup.is_duplicate(tick):
                duplicates += 1
                continue

            valid_ticks.append(tick)

        if valid_ticks:
            writer.append(valid_ticks)

        log.info(
            "Batch processed",
            extra={
                "extra_fields": {
                    "received": len(raw_batch),
                    "written": len(valid_ticks),
                    "rejected": rejected,
                    "duplicates": duplicates,
                }
            },
        )

        time.sleep(poll_interval)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="OTC Precision Signal System - authorized feed bridge")
    parser.add_argument("--mode", choices=["mock", "live"], default="mock",
                         help="mock = synthetic local data for development; live = authorized provider")
    parser.add_argument("--symbol", required=True, help="Symbol name, e.g. EURUSD")
    parser.add_argument("--output-dir", default=os.environ.get("OTC_FEED_OUTPUT_DIR", "./OTCFeed"),
                         help="Directory to write the MT5-compatible CSV feed file into")
    parser.add_argument("--poll-interval", type=float, default=1.0, help="Seconds between fetch cycles")
    parser.add_argument("--max-iterations", type=int, default=None,
                         help="Optional cap on fetch cycles (useful for testing)")
    return parser


def main(argv: Optional[list[str]] = None) -> int:
    args = build_arg_parser().parse_args(argv)

    output_path = Path(args.output_dir) / f"{args.symbol}_feed.csv"
    writer = AtomicCsvWriter(output_path)
    dedup = DuplicateTickFilter()

    if args.mode == "mock":
        log.info("Starting in MOCK mode - synthetic data only, not a real market feed",
                  extra={"extra_fields": {"symbol": args.symbol, "output": str(output_path)}})
        source: FeedSource = MockFeedSource(args.symbol)
    else:
        api_url = os.environ.get("OTC_FEED_API_URL")
        if not api_url:
            log.error("OTC_FEED_API_URL is not set. --mode live requires a documented, authorized API URL "
                      "supplied via the environment - none is built in.")
            return 2
        api_key = os.environ.get("OTC_FEED_API_KEY")
        api_secret = os.environ.get("OTC_FEED_API_SECRET")
        log.info("Starting in LIVE mode", extra={"extra_fields": {"symbol": args.symbol, "output": str(output_path)}})
        source = AuthorizedFeedSource(args.symbol, api_url, api_key, api_secret)

    try:
        run_bridge(source, writer, dedup, args.poll_interval, args.max_iterations)
    except KeyboardInterrupt:
        log.info("Stopped by user (KeyboardInterrupt)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
