# AI Lead Assistant

A simple CRM for real-estate agents with AI built in. It has one job:
**help an agent reply to and follow up with property leads faster and more consistently.**

You enter a lead, click **Generate AI Follow-Up**, and get:

1. An immediate response
2. A follow-up for 1 day later
3. A follow-up for 3 days later
4. A short lead summary
5. A suggested next action

You copy each message (or open it straight in WhatsApp / SMS / email), send it yourself, and click
**Mark as sent**. The app then schedules the next follow-ups and shows you who is due each day.

> The repository also contains an unrelated file, `SupportResistance_VolumeSignals.pine`. The app does not use it.

---

## Features (MVP)

| Area | What it does |
| --- | --- |
| **Dashboard** | Total / New / Follow-up due / Contacted / Converted counts (click to filter), today's follow-ups, searchable lead table (cards on mobile). |
| **Add / edit lead** | Name, phone, email, property interest (required: name, property interest, and phone or email), plus budget, location, type, requirements, source, notes. |
| **Lead detail** | Lead info, notes, AI messages, follow-up schedule, status, and an activity timeline with quick notes. |
| **AI Assistant** | One click drafts all five outputs. Flags any price, time or number the AI mentions that you never entered. Lists missing information. |
| **Statuses** | New → Contacted → Interested → Viewing Scheduled → Negotiating → Won / Lost. |
| **Follow-ups** | Copy button, WhatsApp/SMS/Email shortcuts, Mark as sent, schedule/reschedule/skip/done. Follow-ups page grouped into Overdue / Today / Upcoming. |

### How the follow-up flow works

1. **Generate AI Follow-Up** creates three draft messages.
2. Send the **Immediate response** yourself, then click **Mark as sent**:
   - the lead moves from *New* to *Contacted*
   - a 1-day and a 3-day follow-up are scheduled automatically.
3. When a follow-up is due, it shows on the Dashboard and Follow-ups page. Send it, then click **Mark as sent** (or **Mark done**).
4. Marking a lead **Won** or **Lost** cancels its pending follow-ups.
5. You can add a manual follow-up with any date and note.

Regenerating replaces unsent drafts only. Messages you already sent stay in the history.

---

## Tech stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS 4**
- **SQLite** via `better-sqlite3`: a single file on disk, no database server, no cost
- **Zod** for input and AI-output validation
- **Anthropic Claude** via the official `@anthropic-ai/sdk`, behind a small provider abstraction
- **Vitest** for tests

The app has 6 runtime dependencies and no paid infrastructure.

---

## Installation

Requirements: **Node.js 20 or newer** (check with `node -v`). Download it from https://nodejs.org if needed.

```bash
git clone <your-repo-url>
cd Bang
npm install
cp .env.example .env.local     # then edit .env.local (see below)
npm run dev
```

Open http://localhost:3000. The first start creates the database and loads 10 fictional demo leads.

---

## Environment variables

Put these in `.env.local`. That file is git-ignored, so **never commit it**.

| Variable | Required | Description |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | For real AI | Your key from https://console.anthropic.com/settings/keys. Without it the app runs in **demo mode**. |
| `AI_PROVIDER` | No | `anthropic` or `demo`. Default: `anthropic` if a key is set, otherwise `demo`. |
| `AI_MODEL` | No | Claude model. Default `claude-opus-5`. Cheaper options: `claude-sonnet-5`, `claude-haiku-4-5`. |
| `AGENT_NAME` | Recommended | Your name, used to sign messages. Read when the database is **first created**. |
| `AGENCY_NAME` | No | Your agency name. |
| `DB_PATH` | No | Database file location. Default `data/leads.db`. |
| `SEED_DEMO_DATA` | No | `true` (default) loads demo leads into a new database. Set `false` for a clean start. |
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` | If online | Password-protects the whole app. **Set these before putting the app on the internet.** |

Restart `npm run dev` after changing `.env.local`.

---

## Running locally

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app for development at http://localhost:3000 |
| `npm run build` then `npm start` | Production build and start |
| `npm test` | Run the automated tests |
| `npm run lint` | Type-check the code |
| `npm run db:reset` | Delete the local database. It is recreated on next start. |

---

## How AI generation works

1. **One central prompt** lives in [`lib/ai/prompt.ts`](lib/ai/prompt.ts). It tells the model to use ONLY the facts you provide, never invent availability, prices, amenities, viewing times, addresses, promises or lead details, and to list what is missing instead of guessing.
2. **Minimal personal data:** only the lead's **first name** plus the property details and notes are sent. **Phone numbers and email addresses are never sent** to the AI provider.
3. **Structured output:** the model must return JSON matching a fixed schema ([`lib/ai/schema.ts`](lib/ai/schema.ts)).
4. **Validation:** the JSON is checked with Zod (required fields, lengths, control characters stripped). Invalid output is rejected with a friendly error and never shown.
5. **Fact check:** [`lib/ai/factCheck.ts`](lib/ai/factCheck.ts) flags any price, clock time or number in a message that doesn't appear in the lead's data. The message then shows a yellow "Double-check before sending" box.
6. **Safe display:** everything is rendered as plain text (React escapes it). No HTML from the AI is ever injected.

**Providers** ([`lib/ai/providers/`](lib/ai/providers)):
- `anthropic.ts`: Claude via the official SDK, with low effort (fast and cheap for short messages) and server-side fallback if the model declines a request.
- `demo.ts`: free, offline, template-based messages built only from the lead's fields, so you can demo without an API key.

To add another provider (e.g. OpenAI), create a file that implements the `AIProvider` interface in `types.ts` and add a case in `lib/ai/provider.ts`.

**Cost:** one generation is a short request, typically about 1–2 thousand tokens in and out. Set `AI_MODEL=claude-haiku-4-5` to minimise cost. Check real usage in the Anthropic console.

---

## Database

SQLite file at `data/leads.db`, created automatically on first run. There's nothing to install.

| Table | Purpose |
| --- | --- |
| `users` | The agent (one row in the MVP; becomes real accounts in Phase 2). |
| `leads` | Contact info, property interest (type, budget, location, requirements), source, notes, status, latest AI summary/next action. |
| `messages` | AI drafts and sent messages (`immediate`, `follow_up_1d`, `follow_up_3d`) with fact-check warnings. |
| `follow_ups` | Scheduled follow-ups with due date, status (`pending`/`done`/`cancelled`) and note. |
| `activities` | Timeline: created, edits, status changes, AI generations, sent messages, notes. |

**Why no separate `properties` table?** In the MVP the property a lead wants is stored on the lead itself, and confirmed facts (price, availability, viewing time) go in **Notes**, the only place the AI may take them from. A real `properties` table arrives with property matching in Phase 2.

**Backups:** copy `data/leads.db` somewhere safe (e.g. weekly). That file is all your data.

---

## Security

- API keys are read on the server only, never sent to the browser and never logged.
- All input is validated on the server (Zod) and on the client for fast feedback.
- AI output is validated before it is stored or displayed and rendered as plain text.
- Phone numbers and emails are not sent to the AI provider.
- Security headers (no framing, no MIME sniffing, strict referrer).
- Optional HTTP Basic Auth for the whole app (`BASIC_AUTH_PASSWORD`).
- Errors shown to users are friendly and don't leak internals.

---

## Known limitations

- **Single user, no login.** Anyone who can open the app can see all leads. Keep it on your own computer, or set `BASIC_AUTH_PASSWORD` before hosting it.
- **No automatic sending.** You send messages yourself (copy, or the WhatsApp/SMS/Email buttons) and click *Mark as sent*.
- **SQLite = one server.** Serverless hosts like Vercel don't keep files, so the database would be lost there. Run it locally or on a host with a persistent disk (e.g. a small VPS, Railway or Render with a volume).
- Dates use the server's timezone.
- The fact check is a heuristic: it catches invented numbers, prices and times, but not every invented word. **Always read drafts before sending.**
- Demo mode messages are simple templates, not real AI.

---

## Roadmap (not built yet)

**Phase 2**
- Authentication
- Multiple agents / teams
- Cloud database (e.g. Postgres or Turso)
- Automated email sending
- WhatsApp integration
- AI lead scoring
- Property matching (properties table + listing import)
- Analytics (response time, conversion by source)
- Subscription billing

**Phase 3**
- Autonomous follow-up agent
- CRM integrations
- Website lead-capture form / API
- Facebook & Instagram lead ads integration
- Voice AI
- Multi-agent workflows

---

## Project structure

```
app/                  Pages and API routes (Next.js App Router)
  page.tsx            Dashboard
  follow-ups/         Follow-ups page
  leads/new, [id], [id]/edit
  api/                JSON API used by the UI
components/           UI components (lead/ = lead detail page pieces)
lib/
  db.ts               SQLite connection + schema
  seed.ts             Fictional demo data
  leads.ts            All database reads/writes and follow-up rules
  validation.ts       Input validation
  ai/                 Prompt, output schema, fact check, providers
proxy.ts              Optional password protection
tests/                Automated tests (npm test)
```
