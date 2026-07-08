import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { settleOutcome } from "@/lib/engine/settle";
import { ExpiryKey, Pair } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pair = searchParams.get("pair");
  const expiry = searchParams.get("expiry");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

  const now = new Date();

  const pending = await prisma.signal.findMany({
    where: { result: "PENDING", expiryTime: { lte: now } },
    take: 100,
  });

  await Promise.all(
    pending.map(async (s) => {
      const result = settleOutcome(
        s.pair as Pair,
        s.expiry === "SEC15" ? "15s" : ("1m" as ExpiryKey),
        s.direction as "CALL" | "PUT",
        Math.floor(s.entryTime.getTime() / 1000),
        Math.floor(s.expiryTime.getTime() / 1000)
      );
      await prisma.signal.update({ where: { id: s.id }, data: { result } });
    })
  );

  const signals = await prisma.signal.findMany({
    where: {
      ...(pair ? { pair } : {}),
      ...(expiry ? { expiry: expiry === "15s" ? "SEC15" : "MIN1" } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ signals });
}
