# Zarghoon Jewellers ERP — Architecture

Status: **Approved** (Phase 0 baseline + enhancements incorporated; Phase 1 delivered)
Last updated: 2026-08-16

## 1. System Shape

**Modular monolith.** One deployable backend service, one database, internally
partitioned into modules with explicit boundaries (own Prisma models, own
service layer, no reaching into another module's internals — cross-module
calls go through the other module's exported service/interface only).

Rationale: this is a single-store (initially) jewelry retail system, going
multi-branch as it grows. Running it as microservices today would add
operational cost (service discovery, distributed transactions for a sale that
touches inventory + pricing + CRM + loyalty, network failure handling) with
no corresponding benefit at this scale. Module boundaries are kept clean
specifically so that any module *can* be peeled off into its own service
later if the business grows (many branches, high transaction volume,
separate teams owning separate modules) without a rewrite — only a
redeployment of an already-isolated module behind a network boundary.

**Enforcement of boundaries at this size is by convention + code review**,
not by separate processes: each module lives under `backend/src/modules/<name>`,
exposes a `*.module.ts` with a small set of exported providers, and other
modules only import from that export surface (never deep-import a sibling
module's repository/service internals). Shared, cross-cutting concerns
(Prisma client, config, guards, decorators) live under `backend/src/common`.
The database mirrors this: each module's tables live in their own Postgres
**schema** (`identity`, later `audit` gets company — `product`, `inventory`,
`sales`, ...), so a future service split doesn't need a data migration, just
a connection-string change.

### Tech stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 22 + TypeScript | strong typing for a financial/inventory domain |
| Backend framework | NestJS | first-class module system maps directly onto "modular monolith with clear boundaries"; DI, guards, interceptors give us auth/audit/permission enforcement as cross-cutting concerns instead of copy-pasted checks |
| Database | PostgreSQL (schema-per-module) | relational integrity for money/inventory, JSONB for flexible metadata, mature and battle-tested for financial data |
| ORM / migrations | Prisma | typed schema, explicit versioned migrations (required for auditability of a financial system) |
| Cache / rate-limit store | Redis | shared, process-independent store for login rate limiting today; available for sessions/background jobs as later modules need them |
| Object storage | S3-compatible bucket (AWS S3 / MinIO) | binary media (photos, videos, certificates) never goes into Postgres rows — Phase 2 |
| Auth | JWT access tokens + rotating opaque refresh tokens ("sessions"), bcrypt password hashing, TOTP for MFA | stateless-verifiable access tokens, revocable sessions via a DB-backed session table, MFA path ready without forcing it on day one |
| Frontend | React + TypeScript (Vite), "Luxury Gold + Black" design system | a real SPA from Phase 1 since the spec calls for it explicitly; the design tokens (colors, type, components) are established now so later modules build on them consistently |
| API convention | `/api/v1/...`, versioned from day one | lets the API evolve without breaking whatever else ends up calling it (POS terminals, a future mobile app) |

### Module map (target — not all built yet)

```
identity-access   [PHASE 1 — delivered]  users, roles, permissions, branches, sessions, audit
product-master    [later]  products, media, certificates/documents
pricing           [later]  gold rate management, price calculation engine, price snapshots
sales-pos         [later]  guided sell flow, invoices, payments
inventory         [later]  stock, branch inventory, reservations, repairs, karigar/work-orders
crm               [later]  customers, leads, appointments
finance           [later]  expenses, ledgers, receivables/payables
marketing         [later]  campaigns, attribution
dashboard         [later]  owner executive dashboard (reads from other modules, writes nothing)
```

Each future module is designed at the data-model level so Phase 1's schema
doesn't paint us into a corner (e.g. `User`, `AuditLog`, and `Branch` are
designed to be referenced by every later module).

---

## 2. Cross-cutting foundations Phase 1 establishes

Because every later module depends on them, Identity & Access deliberately
builds these as reusable, not bespoke to auth:

- **`User`** (`identity.users`) — referenced by every future "who did this"
  field (`assignedUserId`, `verifiedByUserId`, `actorUserId`, ...). Supports
  username, email, and phone as alternate login identifiers (a person only
  needs one), an `employeeCode` staff reference distinct from the internal
  UUID, and soft `createdBy`/`updatedBy` stamps.
- **`AuditLog`** (`audit.audit_logs`) — a single, generic, append-only audit
  table (`actorUserId`, `action`, `entityType`, `entityId`, `result`
  [SUCCESS/FAILURE], `metadata` JSONB, `ipAddress`, `userAgent`,
  `createdAt`). Every module writes to it through one shared `AuditService`;
  nobody invents a second audit mechanism, and nothing in the application
  ever updates or deletes a row — inserts only.
- **RBAC (`Role`, `Permission`, `UserRole`, `RolePermission`)** — permission
  codes are plain, module-prefixed strings (`users.read`, `products.create`,
  `sales.reverse`, ...) recorded once in a shared catalog. A role is just a
  named set of these codes; **authorization is never decided by role name**,
  only by permission membership, so a later module only needs to register
  its own codes and guard its routes — it never touches the auth mechanism
  itself. See §4 for the specific role set and how privilege escalation is
  prevented.
- **`Branch` / `UserBranch`** (`identity.branches`, `identity.user_branches`)
  — a deliberately minimal branch reference (code, name) with a
  `branchAccessType` on `User` (`SINGLE` / `MULTIPLE` / `ALL`) and a join
  table for the explicit grants. The full Branch/Warehouse module (address,
  contacts, operating hours, per-branch settings) is a later phase; this is
  only the identity-side relationship so branch-scoped modules (inventory,
  sales) can filter on it from day one without a schema change.

---

## 3. Product & business-domain design (target for later phases)

Captured here so Phase 1's foundation doesn't need to change shape
underneath them once they're built.

### 3.1 Jewelry product photography (`product-master`, later)
`Product` has a `ProductMedia` child table: `mediaType` (IMAGE, VIDEO,
AI_MARKETING_VIDEO, BEFORE_AFTER), `role` (PRIMARY, THUMBNAIL, GALLERY,
HI_RES), `storageKey` (object storage — never a BLOB in Postgres), `status`,
`uploadedByUserId`, `uploadedAt`, free-form `metadata` JSONB.

### 3.2 Product pricing transparency (`pricing` + `sales-pos`, later)
The price calculator is a pure function of `(weights, purity, gold rate,
making/wastage rules, stone value, other charges, discount) → final price`.
Every sold line item gets an immutable `PriceSnapshot` row at time of sale
recording every input and the result. Invoices render from the snapshot,
never by re-running the calculator — changing today's gold rate cannot
alter a historical invoice. Money and jewelry weights are stored as fixed-
point/decimal types, never floating point.

### 3.3 Certificate / document management (`product-master`, later)
`ProductDocument`: `documentType` (DIAMOND_CERTIFICATE, GEMSTONE_CERTIFICATE,
PURCHASE_DOCUMENT, SUPPLIER_DOCUMENT, OTHER), `documentNumber`,
`issuingOrganization`, `issueDate`, `expiryDate`, `fileStorageKey`,
`verificationStatus` (UNVERIFIED default, VERIFIED, REJECTED). The UI must
never render a "Verified" badge unless a permitted staff member has
explicitly set it, recorded with `verifiedByUserId`/`verifiedAt` and
audit-logged.

### 3.4 Appointments & leads (`crm`, later)
`Appointment` (consultation type, requested/preferred time, status
REQUESTED→CONFIRMED→ARRIVED→COMPLETED or CANCELLED/NO_SHOW). `crm`
distinguishes `Customer` from `Lead` (source: Instagram/Facebook/TikTok/
WhatsApp/Website/Phone/Walk-in/Referral; status NEW→CONTACTED→QUALIFIED→
APPOINTMENT→STORE_VISIT→NEGOTIATION→WON/LOST), converting explicitly via a
`convertedToCustomerId` link that preserves history.

### 3.5 Marketing attribution (`marketing` + `crm`, later)
Attribution is explicit foreign keys only — `Campaign → Lead → Customer? →
Appointment → StoreVisit → Sale` — never inferred. Revenue is attributed to
a campaign only when that FK chain exists end-to-end; unattributed sales
are reported as unattributed, not guessed at.

### 3.6 Owner executive dashboard (later)
Read-only aggregation module. Queries other modules' data through their
exported read services — never writes, never becomes a source of truth.

### 3.7 Owner-first guided flows
Every module exposes a full CRUD API plus one or more guided, wizard-style
flows for the operations staff do every day (`UPDATE GOLD RATE` as a single
screen; `ADD PRODUCT` as an 11-step wizard; `SELL PRODUCT` as a 6-step
scan→customer→verify price→payment→confirm→invoice flow). These are thin
orchestration on top of the same service APIs, never parallel business
logic.

---

## 4. Identity & Access — as delivered (Phase 1)

### Roles

Six roles, seeded as system roles (cannot be deleted; a system role's
*permission set* also cannot be edited, only its name/description — see
"privilege escalation" below):

| Role | Intent |
|---|---|
| `OWNER` | Full system access |
| `BRANCH_MANAGER` | Full operational access within their branch(es) — product, inventory, sales, customers, reports; no user/role/settings administration |
| `CASHIER` | POS-related permissions only (products read, sales, customers) |
| `KARIGAR_COORDINATOR` | Karigar/work-order-adjacent permissions (products, inventory, reports) |
| `ACCOUNTANT` | Finance, reports, and read access to sales/customers |
| `MARKETING` | Product content read + marketing management |

### Preventing privilege escalation

- Authorization is permission-based, never role-name-based (§2).
- Assigning a role to a user requires `roles.manage`, not merely
  `users.update` — granting permissions is gated by the same permission
  that governs role definitions themselves, not by general "can edit
  users."
- A user can never assign roles to *themselves*, even as OWNER — enforced
  server-side regardless of what permission they hold.
- A system role's permission set is immutable through the API (name/
  description can still be edited); only new custom roles can have their
  permissions changed, and only by someone holding `roles.manage`.

### Sessions, tokens, and CSRF

- Access tokens are short-lived signed JWTs (roles + permission codes
  embedded, so a guard never needs a DB round-trip to authorize a request).
- Refresh tokens ("sessions", `identity.sessions`) are opaque random values;
  only their SHA-256 hash is stored. They live in an httpOnly, `SameSite=Lax`
  cookie scoped to `/api/v1/auth`, and rotate on every use — presenting an
  already-rotated token is treated as token theft and revokes every session
  for that user.
- A non-httpOnly, JS-readable CSRF cookie is issued alongside the refresh
  cookie at login/refresh. `POST /auth/refresh` and `POST /auth/logout` —
  the two endpoints that act purely on the ambient refresh cookie — require
  a matching `X-CSRF-Token` header (double-submit pattern): a cross-site
  request can't read the cookie to also send it as a header.
- Password change and password reset both revoke every existing session for
  that user, not just issue a new token for the current one.

### Rate limiting

Login and password-reset-request are throttled to 5 requests/minute per IP
(on top of a general 100/minute default), backed by Redis so the limit
holds across multiple API instances, not just one process's memory.

---

## 5. Phase Plan

- **Phase 1 (delivered): Identity & Access.** Users (username/email/phone
  login, employee code, status ACTIVE/INACTIVE/LOCKED), roles, permissions,
  branch-access foundation, authentication (login/logout/refresh/reset),
  MFA-ready (TOTP), account lockout, audit logging, React + TypeScript
  "Luxury Gold + Black" UI (login, forgot/reset password, MFA setup,
  dashboard placeholder, user/role administration). No Product Master, Gold
  Rates, Pricing, Inventory, POS, Sales, Purchases, Customers, CRM, Karigar,
  Old Gold/Exchange, Finance, Marketing, Website, or AI.
- **Phase 2:** Product Master (catalog, media, pricing engine, price
  snapshots, certificates/documents).
- **Phase 3:** Sales/POS + Inventory.
- **Phase 4:** CRM (customers, leads, appointments).
- **Phase 5:** Marketing attribution.
- **Phase 6:** Owner executive dashboard.

Each phase is additive at the module level and reuses the Phase 1
foundations (`User`, `AuditLog`, RBAC, `Branch`) rather than
re-implementing them.
