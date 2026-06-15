# Deploying the Fleet Decision Tool internally

A self-contained, internally-hosted deployment: a Next.js app + PostgreSQL +
an nginx reverse proxy, all in Docker Compose. No external services, no public
hosting. Data lives in your Postgres database behind your firewall.

## Prerequisites

- A Linux host (VM or container platform) with **Docker** + **Docker Compose**,
  reachable only on your internal network / VPN.
- Outbound access to your container registry (Docker Hub or an internal mirror)
  to pull `node`, `postgres`, and `nginx` base images at build time.
- A TLS certificate for the internal hostname (from your internal CA), **or** a
  corporate load balancer that terminates TLS in front of this stack.

## Quick start (pilot)

```bash
cp .env.example .env
# Edit .env:
#   POSTGRES_PASSWORD  -> a strong password
#   AUTH_SECRET        -> openssl rand -base64 32
#   AUTH_URL           -> the URL users will hit, e.g. https://fleet.corp.local
#   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD -> the first admin account

docker compose up -d --build
```

Compose will: start Postgres, run database migrations and seed the first admin
user + sample data (one-shot `migrate` service), start the app, and put nginx
in front. Open the proxy URL and sign in with the seeded admin.

## Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Database credentials (used by the `db` service; the app's `DATABASE_URL` is derived from these inside compose). |
| `AUTH_SECRET` | Secret that signs session cookies. **Required.** `openssl rand -base64 32`. |
| `AUTH_URL` | Public URL the app is served from (for auth callbacks). |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | First admin account, created once by the seed. |

`AUTH_TRUST_HOST=true` is set for you (the app sits behind a proxy).

## TLS

Two supported models:

1. **nginx terminates TLS** (default-ready): put `fullchain.pem` and
   `privkey.pem` in `./certs`, uncomment the `443` block in `nginx.conf` and the
   `"443:443"` port in `docker-compose.yml`, then re-run `docker compose up -d`.
   HSTS is enabled in that block.
2. **Corporate load balancer terminates TLS**: leave nginx on `80`; the proxy
   already forwards `X-Forwarded-Proto`/`Host` so auth works behind the LB.

## Users & access control (RBAC)

- Roles: **viewer** (read-only), **editor** (edit), **admin** (edit + manage).
- Optional **scopes** restrict a user to specific **regions** or **quarries**
  (no scope = access to everything, subject to role).
- For the pilot, create users directly in the database (a small admin UI for
  user management is a fast follow). Passwords are hashed with bcrypt. Example:

```sql
-- a region-scoped editor (only sees/edits region "Norte")
INSERT INTO "User"(id,email,name,"passwordHash",role) VALUES
  (gen_random_uuid(),'ops.norte@corp.local','Ops Norte', '<bcrypt-hash>', 'EDITOR');
INSERT INTO "UserScope"(id,"userId",type,value)
  SELECT gen_random_uuid(), id, 'REGION', 'Norte' FROM "User" WHERE email='ops.norte@corp.local';
```

## Single Sign-On (SSO) — when ready

The app uses Auth.js and is **SSO-ready**: enabling Microsoft Entra ID, Okta or
Google (all OIDC) is adding one provider in `src/lib/auth.ts` and a few env
vars (`AUTH_OIDC_ISSUER`, `AUTH_OIDC_CLIENT_ID`, `AUTH_OIDC_CLIENT_SECRET`) —
no other code changes. The username/password login stays as a fallback.

## Backups & restore

- **Backup:** `docker compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql`
  (schedule via cron, or use your managed-Postgres backups). Retain per your
  data-classification policy.
- **Restore:** `cat backup.sql | docker compose exec -T db psql -U $POSTGRES_USER $POSTGRES_DB`.
- Users can also export any module to **Excel/CSV** from the UI as an ad-hoc
  backup, and re-import to bulk-load.

## Upgrades

```bash
git pull
docker compose up -d --build     # runs new migrations automatically
```

## Without Docker (local dev)

```bash
npm ci
# point DATABASE_URL at a local Postgres in .env
npx prisma migrate deploy && npx prisma db seed
npm run build && npm start
```

## Troubleshooting

- **`web` keeps restarting**: check `AUTH_SECRET` is set and `DATABASE_URL`
  resolves; `docker compose logs web`.
- **Can't reach DB**: `docker compose logs db`; confirm the `migrate` service
  completed (`docker compose ps`).
- **Login redirect loop / wrong host**: verify `AUTH_URL` matches the URL users
  actually use, and that the proxy forwards `X-Forwarded-Proto`/`Host`.
