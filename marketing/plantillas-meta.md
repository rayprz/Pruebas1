# Plantillas de WhatsApp (Meta) — para crear cuando tengas la cuenta

Las **plantillas** son mensajes pre-aprobados por Meta que el negocio puede
mandar AUNQUE hayan pasado más de 24 h desde el último mensaje del cliente.
Se crean en **WhatsApp Manager → Plantillas de mensajes** y Meta tarda
minutos-horas en aprobarlas.

Nos hacen falta para 2 momentos del negocio:

---

## 1. `entrega_pedido` (categoría: Utility) — LA IMPORTANTE

Para entregar el PDF cuando alguien paga en OXXO días después y la ventana
de 24 h ya se cerró (hoy el bot te avisa para entrega manual; con esta
plantilla se podrá automatizar).

**Nombre:** `entrega_pedido` · **Idioma:** es_MX · **Categoría:** Utility

> ¡Buenas noticias, {{1}}! 🎉 Su pago de *{{2}}* quedó confirmado.
>
> Respóndanos con un "Listo" y le entregamos su libro aquí mismo en
> este chat. ¡Gracias por su compra! 🌸

(Variables: {{1}} nombre, {{2}} producto. El "respóndanos" reabre la
ventana de 24 h y el bot entrega el PDF automáticamente.)

---

## 2. `seguimiento_compra` (categoría: Marketing)

Para ofrecer el siguiente producto a quien ya compró, 4-5 días después.

**Nombre:** `seguimiento_compra` · **Idioma:** es_MX · **Categoría:** Marketing

> Hola {{1}} 🌸 Soy Lupita, de El Rincón de la Abuela. ¿Qué tal le ha
> caído su *{{2}}*? Nos encantaría saber qué le pareció.
>
> Y un secretito: a quienes ya son de la casa les tenemos *{{3}}* con un
> precio especial. Si le interesa, respóndame "Info" y le cuento. Si no,
> no le insistimos. ¡Bonito día!

(Variables: {{1}} nombre, {{2}} producto comprado, {{3}} producto sugerido.
Quien responda cae con el bot, que ya sabe qué compró.)

---

## Cómo conectarlas al bot (cuando estén aprobadas)

El código del bot ya tiene `whatsapp.py` con envío de mensajes; mandar
plantilla es el mismo endpoint con `"type": "template"`. Cuando las
plantillas estén aprobadas, pídele a Claude en una nueva sesión:
*"conecta las plantillas entrega_pedido y seguimiento_compra al bot"* —
es un cambio chico (el grueso ya está preparado).

## Pares producto → sugerencia (para el seguimiento)

| Compró | Sugerirle |
|---|---|
| recetario | sopas ("para ejercitar la mente entre guiso y guiso") |
| sopas | devocional o recetario |
| cocina-cuida | recetario ("los clásicos, para el gusto de la semana") |
| devocional | memorias ("su historia también es bendición") |
| whatsapp | sopas |
| memorias | devocional |
