# Security overview — Fleet Decision Tool (internal deployment)

For IT / Security review. Describes the data flow, the controls in place, and
the residual risks of the internally-hosted, centralized version.

## Architecture & data flow

```
Browser ──TLS──> nginx (security headers, TLS) ──> Next.js app (Auth.js)
                                                        │
                                                        └──> PostgreSQL
```

- All application data lives in **PostgreSQL inside your network**. Nothing is
  sent to any third party; there is no external/SaaS dependency at runtime.
- The browser only talks to the app over your network; the app is the only
  thing that talks to the database.
- Excel/CSV import & export happen through the authenticated API.

## Authentication

- **Auth.js (NextAuth)** with a username/password provider; passwords are
  hashed with **bcrypt** (cost 12). Sessions are stateless **JWTs** stored in a
  **HTTP-only, SameSite** cookie (Secure under TLS) — not readable by JavaScript.
- Page access is gated by server-side middleware (`proxy.ts`): unauthenticated
  requests are redirected to `/login`. API requests without a valid session get
  **401**.
- **SSO-ready**: an OIDC provider (Entra/Okta/Google) can be enabled with a
  config change; identity then comes from the corporate IdP.

## Authorization (RBAC)

- Roles: **viewer / editor / admin**, enforced **server-side in every API
  route** (the client is never trusted).
- **Data scoping** by region/quarry: a scoped user can only read and modify data
  for their regions/quarries. Verified behaviors:
  - viewer → reads allowed, writes `403`;
  - region-scoped editor → sees only their quarries; in-scope edits `200`,
    out-of-scope edits and bulk operations `403`.

## Auditing

- Every mutating operation writes an **audit-log row** (who, when, entity, id,
  action, before/after). This is the system of record for "who changed what".

## Data protection

- **In transit:** TLS (terminated by nginx or a corporate load balancer); HSTS
  when nginx terminates TLS.
- **At rest:** managed by your database/disk encryption (host volume or
  managed-Postgres encryption per your standards). No business data is stored in
  the browser anymore (only non-sensitive UI preferences in localStorage).
- **Secrets:** `AUTH_SECRET` and DB credentials come from environment variables
  / `.env` (git-ignored), never committed.

## Hardening headers (nginx)

`Content-Security-Policy`, `X-Frame-Options: DENY` / `frame-ancestors 'none'`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and
`Strict-Transport-Security` (under TLS). Input is validated server-side with
zod on every write.

## Residual risks / hardening backlog

- **CSP uses `'unsafe-inline'`** for styles (Tailwind/Recharts inline styles)
  and scripts (Next hydration). Hardening path: nonce-based CSP via the app's
  SSR — a config change, test carefully against Recharts.
- **User management** is currently done via SQL/seed; a guarded admin UI for
  users/roles/scopes is a fast follow.
- **Rate limiting / WAF**: add at the nginx/LB layer per corporate standards.
- **Dependency CVEs**: `npm audit` reports advisories (notably in the `xlsx`
  parser used for import/export); review and pin/replace per policy before
  handling the most sensitive data.
- **Backups & retention** must be scheduled and tested (see DEPLOY.md) to meet
  your data-classification requirements.
- **MFA** comes "for free" once SSO/OIDC is enabled against the corporate IdP.

## Data classification

Confirm internally whether the fleet/cost data triggers specific encryption,
retention, or audit mandates, and align the database encryption + backup
retention accordingly before loading production data.
