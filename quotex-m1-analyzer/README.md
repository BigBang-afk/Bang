# Quotex AI Elite M1 Analyzer

A minimal web app: upload a Quotex 1-minute chart screenshot, and Gemini (with vision) analyzes it using an institutional SMC/ICT/Wyckoff framework and returns a structured trade signal (or `NO TRADE – WAIT` when the setup is weak).

The full analyzer system prompt lives in `systemPrompt.js` — it drives market structure, liquidity, order block, candlestick, and probability-scoring analysis exactly as specified, and only emits a BUY/SELL signal when the confluence score is 85/100 or higher.

Runs on Gemini's free tier (`gemini-3.6-flash`) — no billing required.

## Deploy it live (Vercel)

The app runs as a Vercel serverless function — `vercel.json` routes every request to `server.js`, which is exported as a handler (it only calls `app.listen()` when run directly, e.g. locally).

```bash
npm install -g vercel
cd quotex-m1-analyzer
vercel --prod
vercel env add GEMINI_API_KEY   # paste your key when prompted, then redeploy
```

Or from the [Vercel dashboard](https://vercel.com/new): import this repo, set the project root to `quotex-m1-analyzer`, and add `GEMINI_API_KEY` under Project Settings → Environment Variables before the first deploy.

Note: Vercel serverless functions cap request bodies at ~4.5MB, so the upload limit here is set to 4MB (see `server.js`).

## Local setup

```bash
npm install
cp .env.example .env
# edit .env and set GEMINI_API_KEY
npm start
```

Then open http://localhost:3000, upload a screenshot, and click **Analyze Chart**.

## Get a free Gemini API key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and sign in with a Google account.
2. Click **Create API key** — no credit card required for the free tier.
3. Copy the key and set it as `GEMINI_API_KEY`.

## How it works

- `server.js` — Express server. `POST /api/analyze` accepts a multipart image upload, sends it to Gemini (`gemini-3.6-flash` by default, overridable via `GEMINI_MODEL`) with the system prompt as vision input, and returns the structured analysis as plain text.
- `public/index.html` — single-page upload UI with drag-and-drop, image preview, and colorized BUY/SELL/WAIT output.
- `systemPrompt.js` — the exact analyzer instructions (market structure, S/R, liquidity, SMC, price action, candlestick patterns, Wyckoff, probability scoring, and output format).

The API key stays server-side — it is never sent to the browser.

## Notes

- This is an educational chart-reading tool, not financial advice. Trading involves risk.
- No user accounts, database, or persistence — each analysis is a single stateless request.
