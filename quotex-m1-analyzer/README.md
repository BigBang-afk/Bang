# Quotex AI Elite M1 Analyzer

A minimal web app: upload a Quotex 1-minute chart screenshot, and Claude (with vision) analyzes it using an institutional SMC/ICT/Wyckoff framework and returns a structured trade signal (or `NO TRADE – WAIT` when the setup is weak).

The full analyzer system prompt lives in `systemPrompt.js` — it drives market structure, liquidity, order block, candlestick, and probability-scoring analysis exactly as specified, and only emits a BUY/SELL signal when the confluence score is 85/100 or higher.

## Deploy it live (Render, one click)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/BigBang-afk/Bang/tree/claude/quotex-m1-analyzer-bhz9bx)

1. Click the button above (or go to [Render](https://dashboard.render.com/blueprints) → **New Blueprint Instance** → point it at this repo).
2. Render reads `render.yaml` at the repo root and provisions the `quotex-m1-analyzer` web service automatically (`rootDir: quotex-m1-analyzer`, free plan).
3. When prompted, paste your **`ANTHROPIC_API_KEY`** (get one at [console.anthropic.com](https://console.anthropic.com/)) — it's the only value you need to supply. It's stored as a Render secret and never exposed to the browser.
4. Wait for the build to finish, then open the `.onrender.com` URL Render gives you. That's your live site.

The free plan spins down after 15 minutes of inactivity and takes ~30–60s to wake back up on the next request — upgrade the plan in Render if you want it always-on.

## Local setup

```bash
npm install
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY
npm start
```

Then open http://localhost:3000, upload a screenshot, and click **Analyze Chart**.

## How it works

- `server.js` — Express server. `POST /api/analyze` accepts a multipart image upload, sends it to Claude (`claude-opus-4-8`) with the system prompt as vision input, and returns the structured analysis as plain text.
- `public/index.html` — single-page upload UI with drag-and-drop, image preview, and colorized BUY/SELL/WAIT output.
- `systemPrompt.js` — the exact analyzer instructions (market structure, S/R, liquidity, SMC, price action, candlestick patterns, Wyckoff, probability scoring, and output format).

The API key stays server-side — it is never sent to the browser.

## Notes

- This is an educational chart-reading tool, not financial advice. Trading involves risk.
- No user accounts, database, or persistence — each analysis is a single stateless request.
