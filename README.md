# Quotex Signal Scanner

Upload a screenshot of a 1-minute candlestick chart and get a structured
CALL/PUT/WAIT read with an honest confidence score, built from:

- **Candle extraction** — server-side pixel analysis (`sharp`) detects each
  candle's body/wick geometry directly from the screenshot, no manual data
  entry.
- **Candlestick patterns** — doji, hammer/hanging man, shooting
  star/inverted hammer, engulfing, harami, piercing line/dark cloud cover,
  morning/evening star, marubozu, three soldiers/crows.
- **Support & resistance** — pivot-based level detection with touch-count
  strength scoring (same approach as `SupportResistance_VolumeSignals.pine`,
  adapted to work from a single chart image).
- **Trend/momentum** — short vs. long moving-average bias, candle-color
  streaks, expanding/contracting body size.
- **Confidence scoring** — every factor above contributes weighted points;
  conflicting signals pull confidence back down toward a `WAIT` result
  instead of forcing a call. Confidence is capped below 100% on purpose.
- **Optional AI commentary** — if `ANTHROPIC_API_KEY` is set, Claude vision
  reviews the screenshot as a sanity check (not the signal source itself).

Read the risk note in the app: 1-minute expiries are dominated by noise, and
no chart-reading method — automated or manual — can reliably predict them.
This is a technical-analysis aid, not a guarantee.

## Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY` to enable the
optional AI commentary. Everything else works without it.

## How it works

1. `lib/imaging/extractCandles.ts` decodes the image and classifies pixels as
   bullish (green) / bearish (red) using HSV hue thresholds, groups
   contiguous colored columns into candles, and derives each candle's
   open/high/low/close as pixel-y coordinates.
2. `lib/analysis/patterns.ts`, `levels.ts`, and `trend.ts` run pattern
   detection, support/resistance clustering, and trend analysis on that
   series.
3. `lib/analysis/signal.ts` combines all of it into weighted factors and a
   final signal + confidence.
4. `app/api/analyze/route.ts` wires it together and optionally calls Claude
   vision for supplementary commentary.
5. The UI (`app/page.tsx` + `components/`) uploads the image, renders a
   detection overlay so you can see exactly what the engine read, and keeps
   a local scan history in the browser.
