# Bang Options

A binary options trading platform: users deposit crypto, trade fixed-time
up/down contracts settled against **real live market prices**, and withdraw
on-chain. No house-controlled or synthetic outcomes anywhere — every trade is
opened and settled against a genuinely live price feed, and if a feed goes
stale the trade is refunded (never guessed).

## Before you accept a single real deposit

Operating a platform that takes real money for binary options / CFD-style
contracts is a **regulated financial activity** in essentially every
jurisdiction:

- Binary options are banned for retail customers outright in the EU/UK/EEA.
- In the US and most other countries, offering this to the public requires a
  broker-dealer, derivatives, or gaming license, plus KYC/AML compliance.
- Accepting and moving customer crypto deposits may also trigger
  money-transmitter licensing requirements independent of the trading product
  itself.

This repo gives you working software. It does not give you a license. Get
qualified legal advice for your jurisdiction before turning this on for real
users with real money.

## Architecture

```
backend/   Express + TypeScript + Prisma/Postgres API
  ├─ priceFeed/   Binance WS (crypto, free) + Twelve Data WS (forex/stocks, paid key required)
  ├─ trades/      Trade engine — opens/settles only against live prices
  ├─ wallet/      HD-derived Ethereum deposit addresses, Etherscan-based deposit
  │               monitor, admin-approved on-chain withdrawals
  ├─ admin/       Admin-only routes (users, deposits, withdrawal approval)
  └─ ws/          Socket.io: live price ticks + private trade-settlement events

frontend/  React + Vite + TypeScript
  ├─ pages/       Login, Register, Trade (chart + open/history), Wallet, Admin
  └─ components/  Candlestick chart (lightweight-charts), nav, route guards
```

### Why some things are deliberately conservative

- **No fabricated prices, ever.** `feedManager.getLivePrice()` throws if a
  feed is down or a tick is older than 15s. Opening a trade requires a live
  price. Settlement retries for ~60s past expiry if the feed hiccups, then
  refunds the stake rather than settling against a stale price.
- **Withdrawals require admin approval** before broadcasting on-chain
  (`PENDING_REVIEW → APPROVED → BROADCAST`). Fully automated hot-wallet
  payouts with no human in the loop is how exchanges get drained; add
  automation later once you have real fraud controls.
- **Forex/stocks stay offline until you configure a real-time data key.**
  Free-tier forex/stock quotes are typically delayed 15+ minutes, which is
  unacceptable for settling a real-money contract. Crypto works out of the
  box via Binance's public, no-key market-data stream.

## Setup

### 1. Database

```bash
docker run -d --name binary-options-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=binary_options -p 5432:5432 postgres:16-alpine
```

(or point `DATABASE_URL` at any Postgres 14+ instance)

### 2. Backend

```bash
cd backend
cp .env.example .env   # then fill in the values below
npm install
npm run prisma:migrate
npm run dev             # http://localhost:4000
```

Required/important env vars (see `.env.example` for the full list):

| Var | Needed for | Notes |
|---|---|---|
| `DATABASE_URL` | everything | Postgres connection string |
| `JWT_SECRET` | auth | long random string, keep secret |
| `BINANCE_WS_URL` | crypto prices | defaults to the free public market-data endpoint, no key |
| `TWELVE_DATA_API_KEY` | forex/stock prices | get a **real-time** plan key at twelvedata.com; without it those instruments just stay offline |
| `ETH_RPC_URL` | withdrawals | your own Alchemy/Infura endpoint |
| `ETHERSCAN_API_KEY` | deposit detection | etherscan.io API key |
| `HD_WALLET_MNEMONIC` | deposits + withdrawals | BIP39 mnemonic; **store in a real secrets manager/KMS in production, never in a plain `.env` on a shared host** — whoever holds this phrase controls every user's on-chain funds |
| `USDT_CONTRACT_ADDRESS` | USDT deposits/withdrawals | defaults to mainnet USDT |

Without the wallet/Etherscan vars set, the app still runs — deposit address
creation and deposit detection are simply disabled (registration and trading
still work; useful for local development).

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL, defaults to http://localhost:4000
npm install
npm run dev             # http://localhost:5173
```

## Operational notes on crypto deposits/withdrawals

- Each user gets one Ethereum address, deterministically derived from
  `HD_WALLET_MNEMONIC` at `m/44'/60'/0'/0/{userId}`. It accepts both ETH and
  USDT (ERC20) since ERC20 tokens live at the same address as the ETH account.
- A poller checks Etherscan every 30s for incoming transfers to every user
  address and credits the USD-equivalent balance once confirmations clear
  `DEPOSIT_MIN_CONFIRMATIONS`.
- Withdrawals are signed from the **same per-user derived key**, so gas for
  an ERC20 (USDT) withdrawal must already be sitting at that address (it
  typically is, from the user's own prior ETH deposits). If gas is
  insufficient, the withdrawal fails safely and the balance is refunded —
  it does not silently disappear.
- Only ETH and USDT (Ethereum mainnet) are supported. Adding more chains
  means adding another `hdWallet`/`etherscan`-equivalent module per chain.

## Making an admin user

There's no signup flow for admins by design — promote a user directly in the
database:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```
