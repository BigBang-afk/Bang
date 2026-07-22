import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisResult } from "../analysis/types";

export function isNarrativeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function summarizeForPrompt(result: AnalysisResult): string {
  const patternLines = result.patterns
    .map((p) => `- ${p.name} (${p.direction}, strength ${p.strength}/100)`)
    .join("\n") || "- none detected";

  const supportLine = result.levels.nearestSupport
    ? `support ~${result.levels.distanceToSupportPct?.toFixed(1)}% below, ${result.levels.nearestSupport.touches} touches`
    : "none nearby";
  const resistanceLine = result.levels.nearestResistance
    ? `resistance ~${result.levels.distanceToResistancePct?.toFixed(1)}% above, ${result.levels.nearestResistance.touches} touches`
    : "none nearby";

  return `Deterministic engine output (already computed from the chart image, not from you):
- Candles detected: ${result.candleCount}
- Patterns near the latest candle:\n${patternLines}
- Support/resistance: ${supportLine}; ${resistanceLine}
- Trend bias: ${result.trend.slopeDirection}, streak of ${result.trend.streak.length} ${result.trend.streak.color} candle(s)
- Engine signal: ${result.signal} at ${result.confidence}% confidence`;
}

const SYSTEM_PROMPT = `You are a supplementary reviewer for a candlestick chart signal tool used on 1-minute binary-option style charts (e.g. Quotex screenshots). A deterministic image-processing engine already extracted the candles and computed a signal — you are NOT generating the signal yourself. Your job is a quick visual sanity check: does the screenshot actually look like a readable candlestick chart, do the engine's claimed patterns/levels look plausible from the image, and is there anything visually important the engine likely missed (e.g. an obvious larger trend, an approaching news-looking spike, a level right at the edge of the image)?

Be direct and brief (2-4 sentences). Do not state a confidence percentage or tell the user to trade — that is the engine's job. Never claim certainty; 1-minute expiries are dominated by noise and no chart-reading method is reliable at that timeframe. If the image doesn't look like a candlestick chart at all, say so plainly.`;

export async function getNarrative(
  imageBuffer: Buffer,
  mediaType: string,
  result: AnalysisResult,
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const safeMediaType = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mediaType)
    ? (mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif")
    : "image/png";

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: safeMediaType,
              data: imageBuffer.toString("base64"),
            },
          },
          {
            type: "text",
            text: summarizeForPrompt(result),
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock && "text" in textBlock ? textBlock.text.trim() : "";
}
