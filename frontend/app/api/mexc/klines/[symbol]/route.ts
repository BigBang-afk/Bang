import { NextRequest, NextResponse } from "next/server";
import { getKlines } from "@/lib/mexc/client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const interval = req.nextUrl.searchParams.get("interval") ?? "60m";
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "300");

  try {
    const data = await getKlines(symbol.toUpperCase(), interval, limit);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ detail: err instanceof Error ? err.message : "MEXC request failed" }, { status: 502 });
  }
}
