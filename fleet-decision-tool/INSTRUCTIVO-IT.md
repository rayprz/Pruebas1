# Instructivo para IT — Fleet Decision Tool (interno)

> App web de apoyo a decisiones de flota. Corre **100% dentro de la red de la
> empresa**: la app + una base de datos PostgreSQL + un proxy nginx, todo en
> contenedores Docker. **No usa servicios externos.** Los datos viven en la base
> de datos interna, detrás del firewall.

## Qué se necesita

- Un servidor o VM **Linux interno** (detrás del firewall) con **Docker** y
  **Docker Compose** instalados.
- Que ese servidor pueda descargar imágenes base (`node`, `postgres`, `nginx`)
  de Docker Hub o de un espejo interno (solo la primera vez, para construir).
- Opcional pero recomendado: un **certificado TLS** del CA interno, o un
  balanceador corporativo que termine TLS al frente.

## Pasos para levantarlo (piloto)

**1. Obtener el código** (rama `claude/busy-planck-pjr0ym`) y entrar a la carpeta:

```bash
git clone <URL-del-repo>
cd <repo>/fleet-decision-tool
git checkout claude/busy-planck-pjr0ym
```

**2. Crear la configuración:**

```bash
cp .env.example .env
```

Editar `.env` y definir:

| Variable | Qué poner |
|---|---|
| `POSTGRES_PASSWORD` | una contraseña fuerte para la base de datos |
| `AUTH_SECRET` | generar con `openssl rand -base64 32` |
| `AUTH_URL` | la URL donde los usuarios entrarán (ej. `https://fleet.corp.local`) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | el primer usuario administrador |

**3. Encenderlo:**

```bash
docker compose up -d --build
```

**4. Abrir** la URL en el navegador y entrar con el usuario administrador.

## Qué va a pasar

- La **primera vez tarda unos minutos** (construye las imágenes).
- Automáticamente, en orden: enciende la base de datos → prepara las tablas y
  crea el admin + datos de ejemplo → enciende la app → enciende el proxy de
  seguridad. No hay que configurar nada más a mano.

## Operación diaria

| Acción | Comando |
|---|---|
| Apagar | `docker compose down` |
| Encender de nuevo | `docker compose up -d` |
| Ver estado | `docker compose ps` |
| Ver registros (logs) | `docker compose logs web` |
| Actualizar a nueva versión | `git pull && docker compose up -d --build` |
| Respaldar la base | `docker compose exec db pg_dump -U fleet fleet > respaldo.sql` |

## Decisiones y detalles

- **TLS / dónde hospedar / SSO corporativo / clasificación de datos:** ver
  **`DEPLOY.md`** (técnico) y **`SECURITY.md`** (revisión de seguridad).
- **Usuarios y permisos:** roles consulta / edición / administración, con
  alcance opcional por región o cantera. En el piloto se crean por SQL (ejemplo
  en `DEPLOY.md`); el login por SSO se habilita con un cambio de configuración.

## Si algo falla

Ver la sección **Troubleshooting** de `DEPLOY.md` (causas comunes: falta
`AUTH_SECRET`, la base no levantó, o `AUTH_URL` no coincide con la URL real).
