# Probar la app en tu Mac (con Docker Desktop)

Esto te deja correr **toda la app en tu Mac** para probarla, **sin instalar
Node ni Postgres a mano** — todo va dentro de Docker. (Esto esquiva por completo
los problemas de instalación que tuviste antes: la construcción ocurre dentro de
un Linux limpio dentro del contenedor, no usa el Node de tu Mac.)

## 1. Instala Docker Desktop

- Descárgalo gratis de **docker.com → Docker Desktop for Mac**.
- Instálalo y **ábrelo**. Cuando esté listo verás el ícono de la **ballena** 🐳
  en la barra de arriba. Déjalo corriendo.

## 2. Trae el código a tu Mac

**Opción fácil (sin git):** en GitHub, dentro de la rama
`claude/busy-planck-pjr0ym`, botón verde **Code → Download ZIP**. Descomprime el
ZIP.

Abre la app **Terminal** (Cmd+Espacio → "Terminal") y entra a la carpeta
`fleet-decision-tool`. Por ejemplo, si lo descomprimiste en Descargas:

```bash
cd ~/Downloads/Pruebas1-claude-busy-planck-pjr0ym/fleet-decision-tool
```

(Tip: escribe `cd ` con un espacio y **arrastra la carpeta** a la Terminal para
que ponga la ruta sola.)

## 3. Crea la configuración

```bash
cp .env.example .env
```

Abre el archivo `.env` (`open -e .env`) y pon, como mínimo:

```
AUTH_SECRET="un-texto-largo-cualquiera-1234567890"
AUTH_URL="http://localhost"
SEED_ADMIN_EMAIL="admin@prueba.com"
SEED_ADMIN_PASSWORD="prueba1234"
```

Guarda y cierra.

## 4. Levántalo

```bash
docker compose up -d --build
```

La **primera vez tarda unos minutos** (descarga y arma todo). Cuando termine,
queda corriendo en segundo plano.

## 5. Ábrelo

En el navegador entra a **http://localhost** y haz login con el correo y
contraseña que pusiste en el paso 3.

## Apagarlo

```bash
docker compose down
```

(Si además quieres **borrar los datos de prueba** para empezar limpio:
`docker compose down -v`.)

## Si el puerto 80 está ocupado

A veces el puerto 80 ya lo usa otra cosa en la Mac. Solución:

1. En `docker-compose.yml`, en el servicio `proxy`, cambia `"80:80"` por
   `"8080:80"`.
2. En `.env`, pon `AUTH_URL="http://localhost:8080"`.
3. Vuelve a correr `docker compose up -d --build` y abre **http://localhost:8080**.

## Ver qué está pasando (si algo no abre)

```bash
docker compose ps          # estado de cada pieza
docker compose logs web    # registros de la app
docker compose logs db     # registros de la base de datos
```
