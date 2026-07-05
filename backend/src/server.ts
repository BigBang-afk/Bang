import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { createServer } from "http";
import { config } from "./config";
import { HttpError } from "./util/httpError";
import authRoutes from "./auth/routes";
import priceFeedRoutes from "./priceFeed/routes";
import tradeRoutes from "./trades/routes";
import walletRoutes from "./wallet/routes";
import adminRoutes from "./admin/routes";
import { startBinanceFeed } from "./priceFeed/binance";
import { startTwelveDataFeed } from "./priceFeed/twelveData";
import { startDepositMonitor } from "./wallet/depositMonitor";
import { recoverPendingTrades } from "./trades/tradeEngine";
import { attachSocket } from "./ws/socket";

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/market", priceFeedRoutes);
app.use("/trades", tradeRoutes);
app.use("/wallet", walletRoutes);
app.use("/admin", adminRoutes);

// Centralized error handler — HttpError carries its own status code,
// anything else (bugs, zod validation errors) is a 500/400 with a message
// but never leaks stack traces to the client.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err && typeof err === "object" && "issues" in err) {
    return res.status(400).json({ error: "Invalid request", details: (err as { issues: unknown }).issues });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const httpServer = createServer(app);
attachSocket(httpServer);

startBinanceFeed();
startTwelveDataFeed();
startDepositMonitor();
recoverPendingTrades().catch((err) => console.error("[trades] failed to recover pending trades", err));

httpServer.listen(config.port, () => {
  console.log(`API listening on :${config.port}`);
});
