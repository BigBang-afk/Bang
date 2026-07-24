import { NextRequest, NextResponse } from "next/server";
import { getOrderBook } from "@/lib/mexc/client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "50");

  try {
    const data = await getOrderBook(symbol.toUpperCase(), limit);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ detail: err instanceof Error ? err.message : "MEXC request failed" }, { status: 502 });
  }
}
