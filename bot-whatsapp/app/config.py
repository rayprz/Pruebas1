"""Configuración central del bot (todo sale de variables de entorno)."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent  # bot-whatsapp/


def _env(nombre: str, default: str = "") -> str:
    return os.environ.get(nombre, default).strip()


# WhatsApp Cloud API
WHATSAPP_TOKEN = _env("WHATSAPP_TOKEN")
WHATSAPP_PHONE_ID = _env("WHATSAPP_PHONE_ID")
VERIFY_TOKEN = _env("VERIFY_TOKEN", "rincon-abuela-2026")
META_APP_SECRET = _env("META_APP_SECRET")
GRAPH_URL = _env("GRAPH_URL", "https://graph.facebook.com/v23.0").rstrip("/")

# Anthropic
ANTHROPIC_MODEL = _env("ANTHROPIC_MODEL", "claude-opus-4-8")

# Mercado Pago
MP_ACCESS_TOKEN = _env("MP_ACCESS_TOKEN")
MP_WEBHOOK_SECRET = _env("MP_WEBHOOK_SECRET")

# Negocio
OWNER_WHATSAPP = _env("OWNER_WHATSAPP")
PRECIO_MXN = float(_env("PRECIO_MXN", "99"))
MONEDA = _env("MONEDA", "MXN")
PUBLIC_URL = _env("PUBLIC_URL").rstrip("/")

MARCA = "El Rincón de la Abuela"
PRODUCTO = "Recetario digital “La Cocina de Antaño” (PDF)"
PRODUCTO_DETALLE = (
    "64 páginas, 50 recetas tradicionales mexicanas con letra grande, "
    "ilustrado, en 8 secciones: desayunos, sopas, guisados, antojitos, "
    "platillos de fiesta, postres, bebidas y básicos (salsas, arroz, frijoles)."
)

# Catálogo completo (id → datos del producto). El recetario es el producto
# estrella de los anuncios; los demás se ofrecen a quien pregunta o recompra.
_PROD = BASE_DIR.parent / "productos"
CATALOGO = {
    "recetario": {
        "nombre": "Recetario “La Cocina de Antaño” (PDF)",
        "precio": float(_env("PRECIO_MXN", "99")),
        "pdf": _PROD / "01-recetario-cocina-de-antano/recetario.pdf",
        "archivo": "La Cocina de Antano - El Rincon de la Abuela.pdf",
        "caption": "50 recetas tradicionales con letra grande. ¡Provecho!",
    },
    "sopas": {
        "nombre": "Sopas de Letras Gigantes — 100 juegos (PDF)",
        "precio": 79.0,
        "pdf": _PROD / "02-sopas-de-letras-gigantes/sopas-de-letras.pdf",
        "archivo": "Sopas de Letras Gigantes - El Rincon de la Abuela.pdf",
        "caption": "100 sopas de letras con letra gigante y soluciones.",
    },
    "cocina-cuida": {
        "nombre": "Cocina que Cuida — menús bajos en azúcar y sal (PDF)",
        "precio": 149.0,
        "pdf": _PROD / "03-cocina-que-cuida/cocina-que-cuida.pdf",
        "archivo": "Cocina que Cuida - El Rincon de la Abuela.pdf",
        "caption": "4 semanas de menús y 20 recetas que cuidan.",
    },
    "devocional": {
        "nombre": "Un Momento con Dios — devocional de 30 días (PDF)",
        "precio": 99.0,
        "pdf": _PROD / "04-un-momento-con-dios/un-momento-con-dios.pdf",
        "archivo": "Un Momento con Dios - El Rincon de la Abuela.pdf",
        "caption": "30 días de lecturas y las oraciones de toda la vida.",
    },
    "whatsapp": {
        "nombre": "WhatsApp sin Miedo + guía antifraudes (PDF)",
        "precio": 129.0,
        "pdf": _PROD / "05-whatsapp-sin-miedo/whatsapp-sin-miedo.pdf",
        "archivo": "WhatsApp sin Miedo - El Rincon de la Abuela.pdf",
        "caption": "12 lecciones pacientes y las 10 estafas al descubierto.",
    },
    "memorias": {
        "nombre": "El Libro de Mi Vida — memorias para llenar (PDF)",
        "precio": 149.0,
        "pdf": _PROD / "06-el-libro-de-mi-vida/el-libro-de-mi-vida.pdf",
        "archivo": "El Libro de Mi Vida - El Rincon de la Abuela.pdf",
        "caption": "Para escribir su historia y heredarla a la familia.",
    },
}
PRODUCTO_DEFAULT = "recetario"

# Rutas
PDF_PATH = Path(_env(
    "PDF_PATH",
    str(_PROD / "01-recetario-cocina-de-antano/recetario.pdf"),
))
ASSETS_DIR = BASE_DIR / "assets"
DB_PATH = _env("DB_PATH", str(BASE_DIR / "rincon.db"))

# Modo simulador: imprime en consola en lugar de llamar a WhatsApp
SIMULADOR = _env("SIMULADOR") == "1"
