import { NextRequest, NextResponse } from "next/server";
import { getTickerPrice } from "@/lib/mexc/client";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await params;
    const data = await getTickerPrice(symbol.toUpperCase());
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ detail: err instanceof Error ? err.message : "MEXC request failed" }, { status: 502 });
  }
}
