from fastapi import APIRouter

from app.core.redis import cache_get_json
from app.scanner.service import OPPORTUNITIES_CACHE_KEY, SCANNER_CACHE_KEY, deep_scan_top_movers, scan_all_tickers

router = APIRouter(prefix="/scanner", tags=["scanner"])


@router.get("/tickers")
async def tickers():
    data = await cache_get_json(SCANNER_CACHE_KEY)
    if data is None:
        data = await scan_all_tickers()
    return {"count": len(data), "results": data}


@router.get("/opportunities")
async def opportunities():
    data = await cache_get_json(OPPORTUNITIES_CACHE_KEY)
    if data is None:
        await deep_scan_top_movers()
        data = await cache_get_json(OPPORTUNITIES_CACHE_KEY) or []
    return {"count": len(data), "results": data}


@router.post("/refresh")
async def refresh():
    ranked = await scan_all_tickers()
    signals = await deep_scan_top_movers()
    return {"tickers_scanned": len(ranked), "signals_generated": len(signals)}
