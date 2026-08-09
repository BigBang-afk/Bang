# Bang — Personal Trading Journal, Risk Management & Wealth Tracker

A private, self-hosted command center for manually tracking your trades, controlling
risk, converting profit into PKR and 24K gold equivalents, managing withdrawals and
profit allocation, tracking a physical gold portfolio, and monitoring overall wealth.

This is **not** a broker and does not place trades. You enter everything manually.

## Tech Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) + **Tailwind CSS v4**
- **Prisma ORM** + **PostgreSQL** (works with Neon, Supabase, Vercel Postgres, or any Postgres instance)
- **Server Actions** for all mutations, with Zod validation
- **Recharts** for charts
- Session auth via signed JWT cookies (`jose`) + `bcryptjs` password hashing
- Screenshot uploads via **Vercel Blob** on Vercel, with a local-filesystem fallback for non-Vercel hosting

---

## 1. Windows Installation Guide

### 1.1 Required software

1. **Node.js 20.9 or later (LTS)** — download from [nodejs.org](https://nodejs.org/) and run the installer. This also installs `npm`.
2. **Git for Windows** (optional, only if cloning from a repository) — [git-scm.com](https://git-scm.com/download/win).
3. A code editor is optional (e.g. VS Code) — you can also just use a terminal.

Verify the install by opening **PowerShell** or **Command Prompt** and running:

```powershell
node --version
npm --version
```

You should see `v20.x` (or newer) and an npm version.

### 1.2 Get the project onto your computer

If you received this as a folder, open **PowerShell**, `cd` into it. If it's a Git
repository:

```powershell
git clone <your-repo-url> bang
cd bang
```

### 1.3 Install dependencies

```powershell
npm install
```

This installs Next.js, Prisma, and every other dependency listed in `package.json`.

### 1.4 Get a Postgres database

The app needs a Postgres database. The easiest option for local use is a free
[Neon](https://neon.tech) project (serverless Postgres, works great with Prisma) —
create one and copy its connection string. Any other Postgres instance works too
(local install, Supabase, Docker, etc.).

### 1.5 Configure environment variables

Copy the example env file:

```powershell
copy .env.example .env
```

Open `.env` in a text editor and set:

```
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://user:password@host:5432/dbname?sslmode=require"
SESSION_SECRET="a-long-random-string"
```

If your provider gives you both a pooled (e.g. PgBouncer/`-pooler`) and a direct
connection string, use the pooled one for `DATABASE_URL` and the direct one for
`DATABASE_URL_UNPOOLED` (used only for running migrations). If you only have one
connection string, use it for both.

Generate a strong random string for `SESSION_SECRET` (PowerShell):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output as the value of `SESSION_SECRET`.

### 1.6 Run migrations

```powershell
npx prisma migrate deploy
```

This applies the existing migration history in `prisma/migrations/` to your database.
(Use `npx prisma migrate dev` instead only if you're changing `schema.prisma` yourself
and need Prisma to generate a new migration.)

### 1.7 Create your first user

There's no separate CLI seed step — just start the app and register through the UI:

```powershell
npm run dev
```

Then open **http://localhost:3000** in your browser and click **Create your account**
on the login page. Registration is only available for the very first account (this is
a single-user personal app); afterwards, that page redirects to login.

After creating your account you'll be guided through a first-time setup wizard:

1. Trader name, starting balance, and main trading market
2. USD → PKR exchange rate
3. 24K gold price per gram (PKR)

### 1.8 Start the development server

```powershell
npm run dev
```

Open **http://localhost:3000** in your browser.

### 1.9 Creating a production build

```powershell
npm run build
npm run start
```

`npm run build` runs `prisma migrate deploy` automatically before building, so your
database schema stays in sync. `npm run start` serves the optimized production build,
by default also on port 3000. To run on a different port: `npm run start -- -p 4000`.

### 1.10 Backing up your database

Since the database is Postgres, use your provider's own backup/snapshot tools for a
full database-level backup (Neon and most managed Postgres providers do this
automatically). For a portable, human-readable snapshot you can move between
providers, use the in-app backup instead:

- Go to **Settings → Data → Export Backup (JSON)** to download a complete snapshot.
- Use **Settings → Data → Import Backup (JSON)** to restore it later (this replaces
  all current data after a confirmation prompt).

---

## 1a. Deploying to Vercel

This repo is already set up to deploy cleanly on Vercel:

1. Import the GitHub repo in the Vercel dashboard (or run `vercel link`).
2. Add a Postgres database to the project — the **Neon** integration under
   Storage/Marketplace is the simplest (`vercel integration add neon`), and it
   automatically sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for you.
3. Add a **Blob store** to the project (Storage → Blob, or `vercel blob create-store`)
   so screenshot uploads work — this sets `BLOB_READ_WRITE_TOKEN` automatically.
4. Set a `SESSION_SECRET` environment variable (Production, Preview, and Development)
   to a long random string.
5. Deploy. The build command (`prisma migrate deploy && next build`) applies any
   pending migrations before every build, so schema changes ship automatically.

Note: Vercel's serverless functions have a read-only filesystem, which is why this
app uses Postgres (not SQLite) and Vercel Blob (not local file writes) in that
environment — both are already wired up with automatic local-filesystem fallbacks
for non-Vercel hosting.

---

## 2. Everyday Usage

- **Dashboard** — balance, today's P&L (USD/PKR/gold), targets, wealth snapshot.
- **Today's Plan** — set daily target/loss limits and risk per trade; live progress
  bars and overtrading protection warnings.
- **Add Trade / Trades** — full trade journal with filters, CSV export, edit/duplicate/delete.
- **Trading Journal / Calendar** — daily reflections and a P&L calendar view.
- **Strategies** — per-strategy, per-session, and per-symbol performance breakdowns.
- **Analytics** — expectancy, profit factor, drawdown, equity curve and more, all charted.
- **Risk Management / Risk Calculator** — drawdown monitor, position sizing, compounding projections.
- **Withdrawals / Profit Allocation** — track money leaving the account and where profits are planned to go vs. actually transferred.
- **Gold Portfolio / Wealth** — physical gold holdings and a full net-worth view.
- **Expenses** — personal/business spending, separate from trading P&L.
- **Goals** — long-term and monthly targets tracked against your real recorded data.
- **Reports** — printable/exportable daily, weekly, monthly, yearly, strategy, gold,
  wealth, and expense reports, plus data-driven "smart insights."
- **Settings** — rates, trading defaults, risk thresholds, theme, password/PIN, and
  backup/restore/demo-data/reset tools.

### The core conversion, used everywhere

```
PKR Value    = USD Amount × USD→PKR Rate
Gold Grams   = PKR Value ÷ 24K Gold Price Per Gram (PKR)
```

Every trade and profit/loss entry stores the exchange rate and gold price **at the
time it was recorded**, so changing rates later in Settings never rewrites history.

### Demo data

New to the app? Go to **Settings → Data → Load Demo Data** to populate realistic
sample trades, gold purchases, and expenses so you can see every dashboard and report
in action. Remove it anytime with **Delete Demo Data** — it never touches your real
records.

---

## 3. Project Structure

```
prisma/schema.prisma        Database schema (PostgreSQL)
src/app/(auth)/…             Login / register pages
src/app/setup/…              First-time setup wizard
src/app/(app)/…               All authenticated app pages (protected layout)
src/app/api/…                 File upload, CSV export, backup export, search routes
src/lib/actions/…             Server Actions (all mutations)
src/lib/*.ts                  Core domain logic: money/gold conversion, risk math,
                               ledger, analytics, reports, demo data
src/components/ui/…           Reusable UI primitives
src/components/charts/…       Recharts wrappers
src/components/layout/…       Sidebar, header, mobile nav, quick-add, search
```

## 4. Security Notes

- Passwords are hashed with `bcryptjs`; never stored in plain text.
- Sessions are signed JWTs in an `httpOnly`, `SameSite=Lax` cookie.
- Login attempts are rate-limited (8 failed attempts per 15 minutes per email).
- This app is designed for **local/personal use**. If you deploy it somewhere
  reachable over the internet, put it behind HTTPS and keep `SESSION_SECRET` private.
