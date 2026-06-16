# Despliegue en Vercel + Neon (nube administrada)

La versión centralizada (Next.js + Postgres + login) en **Vercel**, con la base
de datos en **Neon** (Postgres administrado), y tu **dominio en Cloudflare**
apuntando a Vercel. Sin servidores que mantener.

- App → **Vercel**
- Base de datos → **Neon** (Postgres serverless)
- Dominio → **Cloudflare DNS → Vercel**
- Login / permisos / auditoría → ya vienen incluidos.

---

## 1. Crear la base de datos (Neon)

1. Entra a **neon.tech**, crea cuenta y un **New Project** (elige una región
   cercana a tus usuarios).
2. Abre **Connection Details**. Necesitas **DOS** cadenas de conexión:
   - **Pooled** (el host trae `-pooler`) → para la app.
   - **Direct** (sin `-pooler`) → para las migraciones.
   Ambas se ven así: `postgresql://usuario:clave@host/db?sslmode=require`.
   (Si solo ves una, activa el switch "Pooled connection" para ver la otra.)

## 2. Crear el proyecto en Vercel

1. **vercel.com → Add New → Project** → importa el repo de GitHub `rayprz/Pruebas1`.
   - Tip: crea un proyecto **nuevo** para no afectar tu demo estático actual.
2. **Root Directory**: ponlo en `fleet-decision-tool` (la app vive en esa subcarpeta).
3. **Production Branch** (Settings → Git): `claude/busy-planck-pjr0ym`
   (la versión centralizada).
4. **Build Command** (Settings → Build): `npm run vercel-build`
   (genera Prisma, aplica migraciones, siembra el admin **una sola vez**, y compila).

## 3. Variables de entorno (Settings → Environment Variables, en Production)

| Nombre | Valor |
|---|---|
| `DATABASE_URL` | la cadena **Pooled** de Neon |
| `DIRECT_URL` | la cadena **Direct** de Neon |
| `AUTH_SECRET` | genera con `openssl rand -base64 32` |
| `AUTH_URL` | tu URL final (ej. `https://fleet.rrlenergy.com`); usa la `*.vercel.app` mientras configuras el dominio |
| `AUTH_TRUST_HOST` | `true` |
| `SEED_ADMIN_EMAIL` | correo del primer administrador |
| `SEED_ADMIN_PASSWORD` | contraseña del primer administrador |

## 4. Desplegar

- Lanza un deploy (push o "Redeploy"). El build **aplica las migraciones y
  siembra** el admin + datos de ejemplo **la primera vez** (los siguientes
  deploys se saltan la siembra automáticamente).
- Abre la URL del deployment y entra con el admin.

## 5. Dominio propio (sigue en Cloudflare)

1. **Vercel → Settings → Domains** → agrega `fleet.rrlenergy.com`. Vercel te
   mostrará un registro DNS a crear.
2. En **Cloudflare → DNS**, agrega un **CNAME**:
   - Name: `fleet` → Target: el valor que da Vercel (ej. `cname.vercel-dns.com`).
   - **Proxy status: DNS only (nube gris)** — deja que Vercel maneje TLS/CDN.
     (Si lo dejas proxied/naranja, pon el modo SSL/TLS de Cloudflare en
     "Full (strict)".)
3. Cambia la variable `AUTH_URL` a `https://fleet.rrlenergy.com` y redeploya.

---

## Día a día

- **Código nuevo** → haces push → Vercel redeploya solo (las migraciones se
  aplican automáticamente).
- **Usuarios / roles / alcances** → desde el editor SQL de Neon (ejemplos en
  `DEPLOY.md`), o una futura pantalla de administración.
- **Resembrar datos de ejemplo** (borra y recarga) → localmente con la URL de Neon:
  `SEED_FORCE=true DATABASE_URL=<neon-direct> DIRECT_URL=<neon-direct> npx tsx prisma/seed.ts`
- **Respaldos** → Neon tiene restauración a un punto en el tiempo y "branching";
  configura la retención según tu política.

## Notas

- Serverless + Postgres requiere *pooling*: por eso `DATABASE_URL` es la cadena
  **pooled** de Neon y `DIRECT_URL` la **direct** (solo para migraciones).
- Tu **demo estático** actual (rama `main`) no se toca; esto es un despliegue
  aparte, autenticado. Cuando quieras que la versión centralizada sea la app
  "oficial", apunta producción a la rama centralizada (o fusiónala a `main`).
