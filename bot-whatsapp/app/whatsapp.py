"""Cliente de la WhatsApp Business Cloud API (Meta).

Con SIMULADOR=1 no llama a Meta: imprime en consola (para probar local).
"""
import mimetypes

import httpx

from . import config, db


def _post(payload: dict) -> dict:
    if config.SIMULADOR:
        print(f"\n📱 [WhatsApp → {payload.get('to', '?')}] {_resumen(payload)}")
        return {"simulado": True}
    r = httpx.post(
        f"{config.GRAPH_URL}/{config.WHATSAPP_PHONE_ID}/messages",
        json=payload,
        headers={"Authorization": f"Bearer {config.WHATSAPP_TOKEN}"},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def _resumen(p: dict) -> str:
    t = p.get("type")
    if t == "text":
        return p["text"]["body"]
    if t == "document":
        return f"[documento: {p['document'].get('filename')}]"
    if t == "image":
        return "[imagen de muestra]"
    return f"[{t}]"


def send_text(to: str, body: str) -> None:
    # WhatsApp limita el cuerpo a 4096 caracteres
    _post({
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": body[:4000], "preview_url": True},
    })


def send_document(to: str, media_id: str, filename: str, caption: str = "") -> None:
    doc = {"id": media_id, "filename": filename}
    if caption:
        doc["caption"] = caption[:1024]
    _post({"messaging_product": "whatsapp", "to": to, "type": "document", "document": doc})


def send_image(to: str, media_id: str) -> None:
    _post({"messaging_product": "whatsapp", "to": to, "type": "image", "image": {"id": media_id}})


def marcar_leido(message_id: str) -> None:
    """Palomitas azules: el cliente ve que su mensaje fue leído."""
    if config.SIMULADOR:
        return
    try:
        httpx.post(
            f"{config.GRAPH_URL}/{config.WHATSAPP_PHONE_ID}/messages",
            json={"messaging_product": "whatsapp", "status": "read", "message_id": message_id},
            headers={"Authorization": f"Bearer {config.WHATSAPP_TOKEN}"},
            timeout=15,
        )
    except Exception:
        pass  # no es crítico


def upload_media(path, mime: str | None = None) -> str:
    """Sube un archivo a WhatsApp y devuelve su media_id."""
    if config.SIMULADOR:
        return f"media-simulado-{path}"
    mime = mime or mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    with open(path, "rb") as f:
        r = httpx.post(
            f"{config.GRAPH_URL}/{config.WHATSAPP_PHONE_ID}/media",
            data={"messaging_product": "whatsapp", "type": mime},
            files={"file": (str(getattr(path, "name", path)), f, mime)},
            headers={"Authorization": f"Bearer {config.WHATSAPP_TOKEN}"},
            timeout=120,
        )
    r.raise_for_status()
    return r.json()["id"]


def media_id_cacheado(clave: str, path) -> str:
    """Sube el archivo una sola vez y reutiliza el media_id (caché en SQLite)."""
    mid = db.kv_get(f"media:{clave}")
    if mid:
        return mid
    mid = upload_media(path)
    db.kv_set(f"media:{clave}", mid)
    return mid


def download_media(media_id: str) -> tuple[bytes, str]:
    """Descarga un medio recibido (imagen/audio). Devuelve (bytes, mime)."""
    auth = {"Authorization": f"Bearer {config.WHATSAPP_TOKEN}"}
    meta = httpx.get(f"{config.GRAPH_URL}/{media_id}", headers=auth, timeout=30)
    meta.raise_for_status()
    info = meta.json()
    archivo = httpx.get(info["url"], headers=auth, timeout=60)
    archivo.raise_for_status()
    return archivo.content, info.get("mime_type", "application/octet-stream")


def notify_owner(texto: str) -> None:
    """Aviso al dueño por WhatsApp (mejor esfuerzo: nunca tumba el flujo)."""
    if not config.OWNER_WHATSAPP:
        return
    try:
        send_text(config.OWNER_WHATSAPP, texto)
    except Exception as e:
        print(f"⚠️  No se pudo avisar al dueño: {e}")
