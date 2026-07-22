import { NextResponse } from "next/server";
import { analyzeChartImage } from "@/lib/analysis/analyze";
import { getNarrative, isNarrativeConfigured } from "@/lib/ai/narrative";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image uploaded." }, { status: 400 });
  }

  const wantsNarrative = formData.get("narrative") === "true";

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length === 0) {
    return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
  }
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (8MB max)." }, { status: 400 });
  }

  let result;
  try {
    result = await analyzeChartImage(buffer);
  } catch (err) {
    console.error("analyzeChartImage failed", err);
    return NextResponse.json(
      { error: "Couldn't read that image. Please upload a PNG/JPG screenshot of a candlestick chart." },
      { status: 400 },
    );
  }

  let narrative: string | undefined;
  let narrativeError: string | undefined;

  if (wantsNarrative && result.candleCount > 0) {
    if (!isNarrativeConfigured()) {
      narrativeError = "AI narrative isn't configured on this server (missing ANTHROPIC_API_KEY).";
    } else {
      try {
        narrative = await getNarrative(buffer, file.type || "image/png", result);
      } catch (err) {
        console.error("getNarrative failed", err);
        narrativeError = "AI narrative call failed. Showing the engine's signal only.";
      }
    }
  }

  return NextResponse.json({ ...result, narrative, narrativeError });
}
