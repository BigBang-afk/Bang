# Zarghoon Jewellers ERP — Frontend (Phase 1)

React + TypeScript (Vite) client for the Identity & Access module. See
`/ARCHITECTURE.md` at the repo root for the overall system design, and
`../backend/README.md` for the API this talks to.

## Run it locally

```bash
cd frontend
npm install
npm run dev
```

Opens on `http://localhost:5173` by default. It expects the backend API at
`http://localhost:3000/api/v1` (see `../backend/README.md` to start it) —
override with `VITE_API_URL` in a `.env.local` file (copy `.env.example`)
if it runs elsewhere.

## Quality gates

```bash
npx tsc -b       # TypeScript project build/typecheck
npx oxlint       # lint
npm run build    # production build (tsc -b && vite build)
```

## What's here

- `src/api/client.ts` — the API client. The access token lives only in
  memory (never localStorage) and is restored on page load via
  `/auth/refresh`, which relies on the backend's httpOnly refresh cookie. A
  separate, JS-readable CSRF cookie is echoed back as a header on
  refresh/logout (double-submit CSRF protection).
- `src/auth/` — `AuthContext` (session state) and `ProtectedRoute` (route
  guard). Route guarding here is a UX convenience only — the backend
  independently re-checks every permission, since hiding a button is never
  the real security boundary.
- `src/pages/LoginPage.tsx` — username/email/phone + password, show/hide
  password, MFA step, loading/error states.
- `src/pages/ForgotPasswordPage.tsx` / `ResetPasswordPage.tsx` — password
  reset flow.
- `src/pages/DashboardPage.tsx` — placeholder for the Phase 6 owner
  dashboard, plus the current session's account summary.
- `src/pages/UsersPage.tsx` — user list/create/disable, role
  view/create/edit/delete, and the audit log, each gated on the matching
  permission (`users.read`, `users.create`, `roles.manage`, `audit.read`).
- `src/pages/SecurityPage.tsx` — change password, TOTP MFA enroll/disable
  with QR code.
- `src/index.css` — the "Luxury Gold + Black" design tokens shared across
  every page.
