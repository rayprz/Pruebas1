"""Servidor del bot: webhook de WhatsApp + webhook de pagos de Mercado Pago.

Flujo completo:
  anuncio → WhatsApp → bot (Claude) → link de Mercado Pago → webhook de pago
  → entrega automática del PDF → aviso al dueño.
"""
import base64
import hashlib
import hmac

from fastapi import FastAPI, Query, Request, Response

from . import brain, config, db, payments, whatsapp

app = FastAPI(title="Bot El Rincón de la Abuela")


@app.on_event("startup")
def _startup() -> None:
    db.init()


@app.get("/")
def salud() -> dict:
    return {"ok": True, "negocio": config.MARCA}


# ───────────────────────── WhatsApp ─────────────────────────

@app.get("/webhook")
def verificar_webhook(
    modo: str = Query("", alias="hub.mode"),
    token: str = Query("", alias="hub.verify_token"),
    reto: str = Query("", alias="hub.challenge"),
):
    """Verificación inicial del webhook (Meta manda un GET al registrarlo)."""
    if modo == "subscribe" and token == config.VERIFY_TOKEN:
        return Response(content=reto, media_type="text/plain")
    return Response(status_code=403)


@app.post("/webhook")
async def webhook_whatsapp(request: Request):
    cuerpo = await request.body()

    # Firma de Meta (opcional pero recomendada)
    if config.META_APP_SECRET:
        firma = request.headers.get("x-hub-signature-256", "")
        esperada = "sha256=" + hmac.new(
            config.META_APP_SECRET.encode(), cuerpo, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(esperada, firma):
            return Response(status_code=403)

    datos = await request.json() if not cuerpo else __import__("json").loads(cuerpo)
    for entry in datos.get("entry", []):
        for cambio in entry.get("changes", []):
            valor = cambio.get("value", {})
            for msg in valor.get("messages", []):
                _procesar_mensaje(msg, valor)
    return {"status": "ok"}


def _procesar_mensaje(msg: dict, valor: dict) -> None:
    wa_id = msg.get("from", "")
    if not wa_id:
        return

    contactos = valor.get("contacts", [{}])
    nombre = contactos[0].get("profile", {}).get("name", "") if contactos else ""
    db.upsert_cliente(wa_id, nombre)
    whatsapp.marcar_leido(msg.get("id", ""))

    # Conversación escalada: el bot se hace a un lado y reenvía al dueño
    fila = db.cliente(wa_id)
    if fila and fila["escalado"]:
        texto = msg.get("text", {}).get("body", f"[{msg.get('type')}]")
        db.add_mensaje(wa_id, "user", texto)
        whatsapp.notify_owner(f"💬 {nombre or wa_id} (escalado): {texto}\nhttps://wa.me/{wa_id}")
        return

    tipo = msg.get("type")
    if tipo == "text":
        brain.responder(wa_id, msg["text"]["body"])

    elif tipo == "image":
        # El cliente mandó una foto (muchas veces, un comprobante de pago):
        # Claude la ve y responde con contexto.
        try:
            contenido, mime = whatsapp.download_media(msg["image"]["id"])
            bloques = [{
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": mime if mime.startswith("image/") else "image/jpeg",
                    "data": base64.standard_b64encode(contenido).decode(),
                },
            }, {
                "type": "text",
                "text": msg["image"].get("caption")
                or "(El cliente envió esta imagen sin texto.)",
            }]
            brain.responder(wa_id, bloques)
        except Exception as e:
            print(f"⚠️  No se pudo procesar imagen de {wa_id}: {e}")
            brain.responder(wa_id, "(El cliente envió una imagen que no se pudo abrir.)")

    elif tipo == "audio":
        # La API de Claude no transcribe audio: respuesta amable pidiendo texto.
        whatsapp.send_text(
            wa_id,
            "¡Hola! 🌸 Disculpe, los mensajes de voz todavía no los puedo "
            "escuchar. ¿Me lo podría escribir en un mensajito? Si prefiere, "
            "escriba PERSONA y le paso con alguien del equipo.",
        )
        db.add_mensaje(wa_id, "user", "[nota de voz]")
        db.add_mensaje(wa_id, "assistant", "[pedí que lo escribiera en texto]")

    else:
        whatsapp.send_text(
            wa_id,
            "Disculpe, ese tipo de mensaje no lo puedo leer 🙏 "
            "¿Me lo puede escribir en texto?",
        )


# ─────────────────────── Mercado Pago ───────────────────────

@app.post("/mercadopago")
async def webhook_mercadopago(request: Request):
    """Pago confirmado → entrega automática del PDF al WhatsApp del cliente."""
    try:
        datos = await request.json()
    except Exception:
        datos = {}
    params = dict(request.query_params)

    tipo = datos.get("type") or params.get("type") or params.get("topic") or ""
    payment_id = str(
        (datos.get("data") or {}).get("id") or params.get("data.id") or params.get("id") or ""
    )
    if tipo != "payment" or not payment_id:
        return {"status": "ignorado"}

    firma_ok = payments.firma_valida(
        request.headers.get("x-signature", ""),
        request.headers.get("x-request-id", ""),
        params.get("data.id", payment_id),
    )
    if not firma_ok:
        print(f"⚠️  Firma inválida en webhook MP (payment {payment_id})")
        # Seguimos: la consulta directa a la API de MP es la fuente de verdad.

    try:
        pago = payments.obtener_pago(payment_id)
    except Exception as e:
        print(f"⚠️  No se pudo consultar el pago {payment_id}: {e}")
        return Response(status_code=500)  # MP reintentará

    if pago.get("status") != "approved":
        return {"status": pago.get("status", "desconocido")}

    wa_id = str(pago.get("external_reference") or "")
    monto = float(pago.get("transaction_amount") or 0)

    if not db.registrar_pago(payment_id, wa_id, monto, "approved"):
        return {"status": "ya-procesado"}  # idempotencia: no entregar dos veces

    if wa_id:
        _entregar_pdf(wa_id)
        db.marcar_pagado(wa_id)
        whatsapp.notify_owner(f"💰 ¡Venta! ${monto:.0f} {config.MONEDA} — cliente {wa_id}")
    else:
        whatsapp.notify_owner(
            f"⚠️ Pago {payment_id} aprobado pero sin WhatsApp de referencia. "
            f"Revísalo en Mercado Pago y entrega manual."
        )
    db.pago_entregado(payment_id)
    return {"status": "entregado"}


def _entregar_pdf(wa_id: str) -> None:
    try:
        media_id = whatsapp.media_id_cacheado("recetario-pdf", config.PDF_PATH)
        whatsapp.send_text(
            wa_id,
            "¡Su pago fue confirmado! 🎉 Muchísimas gracias por su compra. "
            "Aquí le va su recetario; guárdelo, es suyo para siempre 🌸",
        )
        whatsapp.send_document(
            wa_id, media_id,
            filename="La Cocina de Antano - El Rincon de la Abuela.pdf",
            caption="50 recetas tradicionales con letra grande. ¡Provecho!",
        )
        db.add_mensaje(wa_id, "assistant", "[pago confirmado: PDF entregado]")
    except Exception as e:
        # Caso típico: pagó en OXXO >24 h después del último mensaje y la
        # ventana de WhatsApp se cerró. El dueño entrega a mano.
        print(f"❌ Entrega automática falló para {wa_id}: {e}")
        whatsapp.notify_owner(
            f"⚠️ Pago confirmado de {wa_id} pero la entrega automática falló "
            f"(probablemente ventana de 24 h cerrada). Mándale el PDF a mano: "
            f"https://wa.me/{wa_id}"
        )
