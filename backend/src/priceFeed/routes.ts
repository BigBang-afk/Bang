import { Router } from "express";
import { INSTRUMENTS } from "./instruments";
import { feedManager } from "./feedManager";

const router = Router();

router.get("/instruments", (_req, res) => {
  res.json(
    INSTRUMENTS.map((i) => ({
      symbol: i.symbol,
      assetClass: i.assetClass,
      payoutRatio: i.payoutRatio,
      live: feedManager.isLive(i.symbol),
    }))
  );
});

router.get("/instruments/:symbol/candles", (req, res) => {
  const symbol = decodeURIComponent(req.params.symbol);
  res.json({ symbol, candles: feedManager.getCandles(symbol) });
});

export default router;
