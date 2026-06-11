"""Integración con Mercado Pago: links de pago y verificación de webhooks.

El link se crea por cliente con external_reference = su WhatsApp, para que
al confirmarse el pago sepamos a quién entregarle el PDF automáticamente.
Acepta tarjeta, SPEI y efectivo en OXXO — todo con confirmación automática.
"""
import hashlib
import hmac

import httpx

from . import config

MP_API = "https://api.mercadopago.com"


def _headers() -> dict:
    return {"Authorization": f"Bearer {config.MP_ACCESS_TOKEN}"}


def crear_link(wa_id: str, producto_id: str | None = None) -> str:
    producto_id = producto_id if producto_id in config.CATALOGO else config.PRODUCTO_DEFAULT
    prod = config.CATALOGO[producto_id]
    if config.SIMULADOR:
        return f"https://mpago.la/SIMULADO-{producto_id}-{wa_id}"
    payload = {
        "items": [{
            "title": f"{prod['nombre']} — {config.MARCA}",
            "quantity": 1,
            "unit_price": prod["precio"],
            "currency_id": config.MONEDA,
        }],
        # wa_id|producto: al confirmarse el pago sabemos a quién y qué entregar
        "external_reference": f"{wa_id}|{producto_id}",
        "statement_descriptor": "RINCONABUELA",
    }
    if config.PUBLIC_URL:
        payload["notification_url"] = f"{config.PUBLIC_URL}/mercadopago"
    r = httpx.post(f"{MP_API}/checkout/preferences", json=payload,
                   headers=_headers(), timeout=30)
    r.raise_for_status()
    return r.json()["init_point"]


def obtener_pago(payment_id: str) -> dict:
    """Consulta el pago directo a la API de MP — nunca confiamos en el webhook."""
    r = httpx.get(f"{MP_API}/v1/payments/{payment_id}", headers=_headers(), timeout=30)
    r.raise_for_status()
    return r.json()


def firma_valida(x_signature: str, x_request_id: str, data_id: str) -> bool:
    """Valida la firma HMAC del webhook de Mercado Pago (si hay secreto).

    Aun sin secreto el flujo es seguro: el pago siempre se re-consulta a la
    API de MP con nuestro token antes de entregar nada.
    """
    if not config.MP_WEBHOOK_SECRET:
        return True
    try:
        partes = dict(p.split("=", 1) for p in x_signature.split(","))
        ts, v1 = partes["ts"].strip(), partes["v1"].strip()
        manifest = f"id:{data_id};request-id:{x_request_id};ts:{ts};"
        esperado = hmac.new(config.MP_WEBHOOK_SECRET.encode(),
                            manifest.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(esperado, v1)
    except Exception:
        return False
