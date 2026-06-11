# Bot de WhatsApp — El Rincón de la Abuela

Vendedor automático 24/7: atiende WhatsApp con IA (Claude), responde dudas,
manda muestras del recetario, genera el link de pago de Mercado Pago y, al
confirmarse el pago, **entrega el PDF solo**. Escala a humano (te avisa a tu
WhatsApp) cuando hay enojo, reembolsos o problemas.

```
Anuncio de Facebook ──▶ WhatsApp del negocio
                              │
                        ┌─────▼─────┐   pregunta/duda → responde Claude
                        │    BOT    │   "quiero comprar" → link Mercado Pago
                        └─────┬─────┘   enojo/reembolso → te avisa a ti
                              │
        Mercado Pago confirma el pago (webhook)
                              │
                   PDF entregado por WhatsApp 🎉
```

## Qué hace el bot

- **Vende con calidez**: persona "Lupita", español de México, de usted, mensajes
  cortos pensados para clientela de 60+.
- **Manda muestras**: 3 páginas reales del recetario cuando piden ver el libro.
- **Cobra**: link personal de Mercado Pago (tarjeta, SPEI, OXXO) ligado al
  WhatsApp del cliente (`external_reference`), para entregar automático.
- **Entrega solo**: webhook de MP → verifica el pago contra la API → manda el PDF.
- **Ve imágenes**: si mandan captura del comprobante, Claude la interpreta.
- **Notas de voz**: la API de Claude no transcribe audio; el bot pide con cariño
  que se lo escriban (o escala a humano si piden PERSONA).
- **Escala a humano**: te llega un WhatsApp con el motivo y el link directo al
  cliente; desde ese momento el bot se hace a un lado en esa conversación.
- **Idempotente**: un pago jamás se entrega dos veces.

## Requisitos (cuentas que debes crear)

| Cuenta | Para qué | Dónde |
|---|---|---|
| Meta Business + App de WhatsApp | El número del negocio y la API | developers.facebook.com |
| Mercado Pago (aplicación) | Cobrar con confirmación automática | mercadopago.com.mx/developers |
| Anthropic | El cerebro del bot | console.anthropic.com |
| Railway / Render (u otro) | Hospedar el bot (~$5 USD/mes) | railway.app / render.com |

## Configuración paso a paso

### 1. WhatsApp Business Cloud API (Meta)

1. En [developers.facebook.com](https://developers.facebook.com) crea una app
   de tipo **Business** y agrega el producto **WhatsApp**.
2. Agrega y verifica el **número de teléfono** del negocio (uno nuevo; no puede
   estar activo en la app normal de WhatsApp).
3. Crea un **usuario de sistema** en Meta Business Suite y genera un **token
   permanente** con permisos `whatsapp_business_messaging` y
   `whatsapp_business_management` → es tu `WHATSAPP_TOKEN`.
4. Copia el **Phone number ID** (no el número, el ID) → `WHATSAPP_PHONE_ID`.
5. El webhook se registra en el paso 4, ya con el bot desplegado.

### 2. Mercado Pago

1. En [mercadopago.com.mx/developers](https://www.mercadopago.com.mx/developers)
   crea una **aplicación** (modelo: pagos en línea / Checkout Pro).
2. Copia el **Access Token de producción** → `MP_ACCESS_TOKEN`.
3. En la sección **Webhooks** de la app configura la URL
   `https://TU-APP/mercadopago` para eventos de **Pagos**, y copia la
   **clave secreta** → `MP_WEBHOOK_SECRET`.

### 3. Anthropic

1. En [console.anthropic.com](https://console.anthropic.com) crea una API key
   → `ANTHROPIC_API_KEY`.
2. Modelo: por defecto usa `claude-opus-4-8` (la mejor calidad de conversación).
   Si quieres bajar el costo ~5×, pon `ANTHROPIC_MODEL=claude-haiku-4-5`
   (calidad muy digna para FAQs; prueba ambos en el simulador y decide).

### 4. Desplegar (Railway o Render)

1. Conecta este repo; **directorio raíz**: `bot-whatsapp/`.
2. Comando de inicio: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   (el `Procfile` ya lo trae).
3. Carga todas las variables de `.env.example` con tus valores reales,
   incluida `PUBLIC_URL` con la URL pública que te asignen.
4. **Registra el webhook de WhatsApp**: en la app de Meta → WhatsApp →
   Configuración → Webhook: URL `https://TU-APP/webhook`, token de verificación
   = tu `VERIFY_TOKEN`, y suscríbete al campo **messages**.
5. Manda "hola" al número del negocio y mira la magia. 🌸

> **Nota:** el PDF del recetario vive en este mismo repo, así que el deploy ya
> lo incluye. Si lo regeneras, vuelve a desplegar (el bot lo re-sube a WhatsApp
> y cachea el nuevo `media_id`).

## Probar sin desplegar (simulador)

```bash
cd bot-whatsapp
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
python3 -m app.simulador
```

Chateas con "Lupita" en la terminal; los envíos de WhatsApp y el link de pago
se imprimen en pantalla en lugar de mandarse de verdad. Pruebas sin red:
`python3 tests/test_smoke.py`.

## Costos aproximados de operación

- **Claude**: una conversación de venta (~10 mensajes) cuesta ≈ $0.10–0.15 USD
  con Opus 4.8, ≈ $0.02–0.03 USD con Haiku 4.5. A 99 MXN por venta, el margen
  aguanta cualquiera de los dos; empieza con Opus y baja si quieres optimizar.
- **WhatsApp**: las conversaciones de *servicio* (el cliente te escribe primero,
  que es justo nuestro funnel) tienen capa gratuita amplia por mes.
- **Mercado Pago**: comisión por venta (~4% según método). Revisa tarifas vigentes.
- **Hosting**: ~$5 USD/mes.

## Limitaciones conocidas (v1)

1. **Ventana de 24 h de WhatsApp**: si alguien paga en OXXO días después de su
   último mensaje, WhatsApp puede rechazar la entrega automática. El bot
   detecta el fallo y **te avisa para entrega manual**. Solución definitiva:
   crear una *plantilla* de entrega aprobada por Meta (mejora futura).
2. **Notas de voz**: no se transcriben (la API de Claude no acepta audio). El
   bot pide el mensaje por escrito. Mejora futura: integrar un servicio de
   transcripción.
3. **Seguimiento post-venta** (ofrecer el producto 2 a los compradores):
   requiere plantillas de Meta; pendiente para cuando exista el producto 2.
4. **USA/Stripe**: este v1 cobra en MXN con Mercado Pago. Para vender en USD el
   plan es agregar links de Stripe (estructura ya preparada en `payments.py`).
