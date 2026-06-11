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

# Rutas
PDF_PATH = Path(_env(
    "PDF_PATH",
    str(BASE_DIR.parent / "productos/01-recetario-cocina-de-antano/recetario.pdf"),
))
ASSETS_DIR = BASE_DIR / "assets"
DB_PATH = _env("DB_PATH", str(BASE_DIR / "rincon.db"))

# Modo simulador: imprime en consola en lugar de llamar a WhatsApp
SIMULADOR = _env("SIMULADOR") == "1"
