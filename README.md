# Bang — Personal Trading Journal, Risk Management & Wealth Tracker

A private, self-hosted command center for manually tracking your trades, controlling
risk, converting profit into PKR and 24K gold equivalents, managing withdrawals and
profit allocation, tracking a physical gold portfolio, and monitoring overall wealth.

This is **not** a broker and does not place trades. You enter everything manually.

## Tech Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) + **Tailwind CSS v4**
- **Prisma ORM** + **SQLite** (file-based, easy to back up; can migrate to PostgreSQL later)
- **Server Actions** for all mutations, with Zod validation
- **Recharts** for charts
- Session auth via signed JWT cookies (`jose`) + `bcryptjs` password hashing

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

### 1.4 Configure environment variables

Copy the example env file:

```powershell
copy .env.example .env
```

Open `.env` in a text editor and set:

```
DATABASE_URL="file:./dev.db"
SESSION_SECRET="a-long-random-string"
```

Generate a strong random string for `SESSION_SECRET` (PowerShell):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output as the value of `SESSION_SECRET`.

### 1.5 Create the database and run migrations

```powershell
npx prisma migrate dev
```

This creates `prisma/dev.db` (a SQLite file) and applies the schema. You'll be
prompted for a migration name the first time only if the migration folder doesn't
already exist — press Enter to accept the default, or the migration will already be
present if you cloned this repo as-is.

### 1.6 Create your first user

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

### 1.7 Start the development server

```powershell
npm run dev
```

Open **http://localhost:3000** in your browser.

### 1.8 Creating a production build

```powershell
npm run build
npm run start
```

`npm run start` serves the optimized production build, by default also on port 3000.
To run on a different port: `npm run start -- -p 4000`.

### 1.9 Backing up your database

Your entire dataset lives in one file: `prisma/dev.db`. To back it up manually, just
copy that file somewhere safe while the app is not actively writing to it (stop the
dev server first, or use the in-app backup described below).

**Recommended:** use the in-app backup instead — it's portable and human-readable:

- Go to **Settings → Data → Export Backup (JSON)** to download a complete snapshot.
- Use **Settings → Data → Import Backup (JSON)** to restore it later (this replaces
  all current data after a confirmation prompt).

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
prisma/schema.prisma        Database schema (SQLite, migrate-friendly to Postgres)
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
