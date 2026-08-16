# Zarghoon Jewellers ERP

Full system design: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

This repository currently contains **Phase 1: Identity & Access** —
authentication, RBAC, branch-access foundation, and audit logging. No
Product Master, Inventory, POS, Sales, CRM, Gold Rates, Finance, Marketing,
Website, or AI yet; see the architecture doc's phase plan.

- [`backend/`](./backend/README.md) — NestJS + PostgreSQL + Redis API
- [`frontend/`](./frontend/README.md) — React + TypeScript client

## Quick start

```bash
# Terminal 1 — API
cd backend
cp .env.example .env   # edit DATABASE_URL / REDIS_URL / secrets
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev

# Terminal 2 — UI
cd frontend
npm install
npm run dev
```

Requires a running PostgreSQL 14+ and Redis 6+ (see each package's README
for exact configuration). Open `http://localhost:5173` and sign in with the
bootstrap owner account created by the seed script.
