import { NextRequest, NextResponse } from "next/server";
import { generateLiveSignal } from "@/lib/engine/signalEngine";
import { ExpiryKey, Pair, PAIRS } from "@/lib/types";
import { prisma } from "@/lib/db/prisma";

const VALID_EXPIRIES: ExpiryKey[] = ["15s", "1m"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pair = searchParams.get("pair") as Pair | null;
  const expiry = searchParams.get("expiry") as ExpiryKey | null;
  const persist = searchParams.get("persist") === "true";

  if (!pair || !PAIRS.includes(pair)) {
    return NextResponse.json({ error: "Invalid or missing pair" }, { status: 400 });
  }
  if (!expiry || !VALID_EXPIRIES.includes(expiry)) {
    return NextResponse.json({ error: "Invalid or missing expiry" }, { status: 400 });
  }

  const signal = generateLiveSignal(pair, expiry);

  if (persist) {
    try {
      await prisma.signal.create({
        data: {
          pair: signal.pair,
          expiry: signal.expiry === "15s" ? "SEC15" : "MIN1",
          direction: signal.direction,
          confidence: signal.confidence,
          signalStrength: signal.signalStrength,
          riskLevel: signal.riskLevel,
          trendDirection: signal.trendDirection,
          candlePressure: signal.candlePressure,
          reason: signal.reason,
          entryTime: new Date(signal.entryTime * 1000),
          expiryTime: new Date(signal.expiryTime * 1000),
          source: "LIVE",
        },
      });
    } catch (err) {
      // Persisting history is best-effort; the signal itself is still returned.
      console.error("Failed to persist signal", err);
    }
  }

  return NextResponse.json(signal);
}
