# Bang — Jewelry Business Platform Architecture

Status: **Approved** (Phase 0 baseline + Phase 1 enhancements incorporated)
Last updated: 2026-08-16

## 1. System Shape

**Modular monolith.** One deployable backend service, one database, internally
partitioned into modules with explicit boundaries (own Prisma models, own
service layer, no reaching into another module's internals — cross-module
calls go through the other module's exported service/interface only).

Rationale: this is a single-store (initially) jewelry retail system. Running
it as microservices today would add operational cost (service discovery,
distributed transactions for a sale that touches inventory + pricing +
CRM + loyalty, network failure handling) with no corresponding benefit at
this scale. Module boundaries are kept clean specifically so that any module
*can* be peeled off into its own service later if the business grows
(multi-branch, high transaction volume, separate teams owning separate
modules) without a rewrite — only a redeployment of an already-isolated
module behind a network boundary.

**Enforcement of boundaries at this size is by convention + code review**,
not by separate processes: each module lives under `src/modules/<name>`,
exposes a `*.module.ts` with a small set of exported providers, and other
modules only import from that export surface (never deep-import a sibling
module's repository/service internals). Shared, cross-cutting concerns
(Prisma client, config, guards, decorators, logging) live under
`src/common`.

### Tech stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 22 + TypeScript | matches team familiarity, strong typing for a financial/inventory domain |
| Framework | NestJS | first-class module system maps directly onto "modular monolith with clear boundaries"; DI, guards, interceptors give us auth/audit/permission enforcement as cross-cutting concerns instead of copy-pasted checks |
| Database | PostgreSQL | relational integrity for money/inventory, JSONB for flexible metadata (media, pricing snapshots, document metadata), mature and battle-tested for financial data |
| ORM / migrations | Prisma | typed schema, explicit versioned migrations (required for auditability of a financial system) |
| Object storage | S3-compatible bucket (AWS S3 / MinIO for self-hosted) | binary media (photos, videos, certificates) never goes into Postgres rows — see §2 |
| Auth | JWT access tokens + rotating opaque refresh tokens, bcrypt password hashing, TOTP for MFA | stateless-verifiable access tokens, revocable sessions via refresh-token table, MFA path ready without forcing it on day one |
| Frontend (Phase 1) | Server-served static HTML/CSS/vanilla JS, "Luxury Gold + Black" theme | Phase 1 is Identity & Access only — no need for a full SPA framework yet. The design system (tokens, components) is established now so later modules build on it consistently. |

A richer frontend framework (React/Next) can be introduced in a later phase
once there's enough interactive surface (POS screens, dashboards) to justify
it; the module boundary between "API" and "UI" is already clean (UI talks to
the API purely over HTTP), so that swap doesn't touch backend modules.

### Module map (target — not all built yet)

```
identity-access   [PHASE 1 — this delivery]
product-master    [later]  products, media, certificates/documents
pricing           [later]  gold rate management, price calculation engine, price snapshots
sales-pos         [later]  guided sell flow, invoices, payments
inventory         [later]  stock, branch inventory, reservations, repairs
crm               [later]  customers, leads, appointments
marketing         [later]  campaigns, attribution
dashboard         [later]  owner executive dashboard (reads from other modules, writes nothing)
```

Each future module is designed below at the data-model level so Phase 1's
schema doesn't paint us into a corner (e.g. `AuditLog` and `User` are
designed to be referenced by every later module).

---

## 2. Enhancements incorporated into the baseline architecture

These eight requirements were reviewed and are now part of the target
architecture. None require a different system shape — all fit inside the
modular monolith. Only **Identity & Access** (Module 1) is implemented in
this delivery; the rest are captured here as the target data/behavior
contract for the modules that implement them later, so Phase 1's foundation
(especially `User`, `AuditLog`, permission model) doesn't need to change
shape underneath them.

### 2.1 Jewelry product photography (`product-master` module, later)

- `Product` has a `ProductMedia` child table: `mediaType` (IMAGE, VIDEO,
  AI_MARKETING_VIDEO, BEFORE_AFTER), `role` (PRIMARY, THUMBNAIL, GALLERY,
  HI_RES), `storageKey` (pointer into object storage — **never** a BLOB in
  Postgres), `status` (PENDING_UPLOAD, PROCESSING, READY, FAILED, ARCHIVED),
  `uploadedByUserId` (FK → `User`, from Module 1), `uploadedAt`, plus
  free-form `metadata` JSONB (dimensions, duration, checksum).
- Postgres stores only metadata rows + storage keys/URLs; actual bytes live
  in S3-compatible object storage. This keeps the database small, backups
  fast, and lets us front media with a CDN.
- Before/after pairs are modeled as two `ProductMedia` rows linked by a
  shared `pairId`, not a special-cased column.

### 2.2 Product pricing transparency (`pricing` + `sales-pos` modules, later)

- The **price calculation engine** is a pure function of
  `(weights, purity, gold rate, making/wastage rules, stone value, other
  charges, discount) → final price`, versioned as `PricingRuleVersion`.
- Every sold line item gets a `PriceSnapshot` row created at time of sale,
  storing every input and the result verbatim: gross weight, stone weight,
  net gold weight, purity, fine gold weight, gold rate used, gold value,
  making charge, wastage, stone value, other charges, discount, final
  selling price, and which `PricingRuleVersion`/gold rate record produced
  it.
- Invoices render from `PriceSnapshot`, never by re-running the calculator
  against current rates. Changing today's gold rate or a pricing rule
  **cannot** alter a historical invoice — the snapshot is immutable
  (insert-only, no update path in the service layer).

### 2.3 Jewelry certificate / document management (`product-master` module, later)

- `ProductDocument`: `documentType` (DIAMOND_CERTIFICATE,
  GEMSTONE_CERTIFICATE, PURCHASE_DOCUMENT, SUPPLIER_DOCUMENT, OTHER),
  `documentNumber`, `issuingOrganization`, `issueDate`, `expiryDate`
  (nullable), `fileStorageKey` (object storage, same as media),
  `verificationStatus` (UNVERIFIED, VERIFIED, REJECTED) — **defaults to
  `UNVERIFIED`**. The UI must never render a "Verified" / "Genuine" badge
  unless a staff member with the appropriate permission has explicitly set
  `verificationStatus = VERIFIED` (recorded with `verifiedByUserId` +
  `verifiedAt`, audit-logged). No automatic or inferred verification.

### 2.4 Customer experience — appointments (`crm` module, later)

- `Appointment`: `consultationType` (GENERAL, BRIDAL, CUSTOM_JEWELRY,
  PRODUCT_VIEWING), `requestedAt`, `preferredDateTime`, `status`
  (REQUESTED → CONFIRMED → ARRIVED → COMPLETED, or CANCELLED / NO_SHOW),
  linked to `Customer` or `Lead` (see 2.5 — a request can come in before
  the person is a known customer), optional `assignedUserId`.
- Status transitions are staff-driven and audit-logged; the customer-facing
  request flow only ever creates a `REQUESTED` appointment.

### 2.5 Lead management (`crm` module, later)

- `crm` distinguishes `Customer` (transacted at least once, or explicitly
  onboarded) from `Lead` (not yet converted). A `Lead` converts into a
  `Customer` via an explicit `convertedToCustomerId` link — history is
  preserved, not overwritten.
- `Lead`: `source` (INSTAGRAM, FACEBOOK, TIKTOK, WHATSAPP, WEBSITE, PHONE,
  WALK_IN, REFERRAL), `productInterestedIn` (FK → `Product`, nullable),
  `estimatedValue`, `status` (NEW → CONTACTED → QUALIFIED → APPOINTMENT →
  STORE_VISIT → NEGOTIATION → WON/LOST), `assignedUserId`, `lastContactAt`,
  `nextFollowUpAt`, `conversionStatus`.

### 2.6 Marketing analytics (`marketing` + `crm` modules, later)

- Attribution chain is modeled explicitly as foreign keys, not inferred:
  `Campaign 1→N Lead 1→1 Customer(optional) 1→N Appointment 1→N StoreVisit
  1→N Sale`. Every link is a nullable FK set by an explicit event (a lead
  was created *from* a campaign; a sale's invoice was created *for* a
  customer who *has* a lead with a campaign link).
- Reporting (leads/campaign, cost/lead, appointments, store visits,
  conversion rate, revenue/profit per campaign) is computed by walking
  those FKs. **Revenue is only attributed to a campaign when that FK chain
  actually exists end-to-end** — there is no heuristic/last-touch guessing
  in v1. A sale with no traceable lead→campaign link is simply unattributed
  revenue, reported as such, not silently assigned to a campaign.

### 2.7 Owner executive dashboard (`dashboard` module, later)

- Read-only aggregation module. It queries the other modules' data (sales,
  inventory, CRM, marketing) through their exported read services / views —
  it never writes, and never becomes the source of truth for anything.
- Because the underlying figures (profit, inventory value, CLV, marketing
  ROI) are expensive aggregates, the dashboard module owns its own
  materialized/cached summary tables refreshed on a schedule or on
  relevant writes — but always clearly derived data, rebuildable from the
  source modules at any time.

### 2.8 Owner-first experience

- This is a UX/workflow requirement, not a new subsystem: every module
  exposes both a full CRUD API (for power users / integrations) and one or
  more **guided flows** (wizard-style, one decision per screen) for the
  operations the owner and staff do every day:
  - `UPDATE GOLD RATE` — a single-screen guided flow in `pricing`.
  - `ADD PRODUCT` — an 11-step wizard in `product-master` (info → category
    → weight → purity → stone → making → cost → selling price → photo →
    barcode → save).
  - `SELL PRODUCT` — a 6-step guided flow in `sales-pos` (scan/search →
    customer → verify price → payment → confirm → invoice).
  These guided flows are thin orchestration on top of the same underlying
  service APIs — no parallel business logic — so the "simple mode" and the
  "power user" API path never drift apart or disagree.

---

## 3. Cross-cutting foundations Phase 1 must establish

Because every later module depends on them, Module 1 (Identity & Access)
deliberately builds these as reusable, not bespoke to auth:

- **`User`** — referenced by every future "who did this" field
  (`uploadedByUserId`, `assignedUserId`, `verifiedByUserId`,
  `actorUserId`, ...).
- **`AuditLog`** — a single, generic, append-only audit table
  (`actorUserId`, `action`, `targetType`, `targetId`, `metadata` JSONB,
  `ipAddress`, `userAgent`, `createdAt`). Every module writes to it through
  one shared `AuditService`; nobody invents a second audit mechanism.
- **RBAC (`Role`, `Permission`)** — permission codes are namespaced by
  module (e.g. `identity-access.users.create`,
  `product-master.certificates.verify`) so later modules register their
  own permissions into the same table/guard mechanism instead of building
  a parallel authorization system.

---

## 4. Phase Plan

- **Phase 1 (this delivery): Identity & Access.** Users, roles,
  permissions, authentication (login/logout/refresh/reset), MFA-ready
  (TOTP), audit logging, initial Luxury Gold + Black UI shell (login,
  password reset, MFA setup, dashboard placeholder, user/role
  administration). No POS, inventory, sales, or marketing.
- **Phase 2:** Product Master (catalog, media, pricing engine, price
  snapshots, certificates/documents).
- **Phase 3:** Sales/POS + Inventory.
- **Phase 4:** CRM (customers, leads, appointments).
- **Phase 5:** Marketing attribution.
- **Phase 6:** Owner executive dashboard.

Each phase is additive at the module level and reuses the Phase 1
foundations (`User`, `AuditLog`, RBAC) rather than re-implementing them.
