import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from pyquotex.stable_api import Quotex

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("quotex-sidecar")

QUOTEX_EMAIL = os.environ.get("QUOTEX_EMAIL")
QUOTEX_PASSWORD = os.environ.get("QUOTEX_PASSWORD")
QUOTEX_LANG = os.environ.get("QUOTEX_LANG", "en")
QUOTEX_ACCOUNT_MODE = os.environ.get("QUOTEX_ACCOUNT_MODE", "PRACTICE")  # PRACTICE | REAL

client: Quotex | None = None
_connect_lock = asyncio.Lock()
_last_connect_attempt = 0.0
_is_connected = False


def _require_credentials() -> None:
    if not QUOTEX_EMAIL or not QUOTEX_PASSWORD:
        raise RuntimeError(
            "QUOTEX_EMAIL / QUOTEX_PASSWORD are not set. This sidecar refuses to start "
            "without them rather than silently falling back to any other data source."
        )


async def _ensure_connected() -> None:
    """(Re)connects on demand. Read-only: only ever calls connect/get_candles, never buy/sell."""
    global client, _is_connected, _last_connect_attempt

    if _is_connected:
        return

    async with _connect_lock:
        if _is_connected:
            return

        now = time.monotonic()
        if now - _last_connect_attempt < 5:
            raise RuntimeError("Reconnect attempted too soon; backing off.")
        _last_connect_attempt = now

        _require_credentials()
        if client is None:
            client = Quotex(email=QUOTEX_EMAIL, password=QUOTEX_PASSWORD, lang=QUOTEX_LANG)

        ok, message = await client.connect()
        if not ok:
            raise RuntimeError(f"Quotex connect failed: {message}")

        client.change_account(QUOTEX_ACCOUNT_MODE)
        _is_connected = True
        logger.info("Connected to Quotex (%s account).", QUOTEX_ACCOUNT_MODE)


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        await _ensure_connected()
    except Exception as exc:  # noqa: BLE001 - startup must not crash the process; /health reports it
        logger.warning("Initial Quotex connect failed, will retry on demand: %s", exc)
    yield
    if client is not None:
        try:
            await client.close()
        except Exception:  # noqa: BLE001
            pass


app = FastAPI(title="FlexX Signal Quotex Sidecar", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok", "connectedToQuotex": _is_connected}


def _normalize_candle(raw: dict, period: int) -> dict:
    open_time = raw.get("time") or raw.get("from") or raw.get("t")
    return {
        "openTimeUnix": int(open_time),
        "open": float(raw.get("open")),
        "high": float(raw.get("high") or raw.get("max")),
        "low": float(raw.get("low") or raw.get("min")),
        "close": float(raw.get("close")),
        "volume": float(raw.get("volume") or 0),
        "periodSeconds": period,
    }


@app.get("/candles")
async def get_candles(
    asset: str = Query(...),
    period: int = Query(60, description="Candle period in seconds"),
    offsetSeconds: int = Query(3600, description="How far back to fetch, in seconds"),
):
    await _ensure_connected()
    try:
        raw_candles = await client.get_candles(asset, time.time(), offsetSeconds, period)
    except Exception as exc:  # noqa: BLE001
        global _is_connected
        _is_connected = False
        raise HTTPException(status_code=502, detail=f"Quotex candle fetch failed: {exc}") from exc

    candles = [_normalize_candle(c, period) for c in raw_candles if c.get("open") is not None]
    candles.sort(key=lambda c: c["openTimeUnix"])
    return {"asset": asset, "candles": candles}


@app.get("/candles/latest")
async def get_latest_candle(asset: str = Query(...), period: int = Query(60)):
    result = await get_candles(asset=asset, period=period, offsetSeconds=period * 3)
    if not result["candles"]:
        raise HTTPException(status_code=404, detail="No candles returned.")
    return {"asset": asset, "candle": result["candles"][-1]}
