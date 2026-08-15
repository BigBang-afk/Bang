# Nexara — AI Trading Platform

Next.js 16 + TypeScript + Tailwind CSS v4. Credentials auth via NextAuth v5, SQLite via Prisma, and live TradingView chart widgets.

## Getting started

```bash
npm install
cp .env.example .env   # then set a real AUTH_SECRET
npx prisma migrate dev
npm run db:seed        # creates admin@nexara.dev / Admin123!
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first account you register through `/register` is automatically promoted to `ADMIN`; every account after that is a regular `USER`.

## Stack

- `src/app` — App Router pages (marketing site, `/login`, `/register`, `/dashboard/*`, `/admin/*`)
- `src/auth.ts` / `src/auth.config.ts` — NextAuth v5 credentials provider; config is split so `src/proxy.ts` (route protection) stays edge-safe
- `prisma/schema.prisma` — `User` and `WatchlistItem` models (SQLite)
- `src/components/tradingview` — TradingView embed widgets (advanced chart, ticker tape, market overview, heatmap, technical analysis)

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run lint`
- `npm run db:seed` — seed the default admin account
