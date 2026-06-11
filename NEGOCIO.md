# El Rincón de la Abuela — Plan de negocio

Infoproductos digitales (PDF) de ticket bajo para el adulto mayor hispano
(México + comunidad latina en USA), vendidos con anuncios de Facebook/Instagram
y un funnel de WhatsApp atendido por bot. Operación casi 100 % automática.

## El cliente

Mujer u hombre de 55–75 años, hispanohablante, usuario activo de Facebook y
WhatsApp. Le interesan la cocina, la salud, la fe, su familia y entretenerse.
Desconfía de las páginas web complicadas, pero confía en WhatsApp y en las
marcas con rostro humano. A veces el comprador es su hijo/hija (35–50 años).

**Insight central:** todos los nichos del catálogo apuntan al MISMO cliente.
No son negocios separados: es una marca con un catálogo. La lista de WhatsApp
de compradores es el activo principal — cada producto nuevo se le ofrece a la
lista sin pagar publicidad de nuevo.

## La marca

**Nombre de trabajo:** El Rincón de la Abuela *(cambiable; debe sonar cálido,
familiar y confiable)*.

Personaje de marca: "la Abuela" — voz cálida que firma los productos.
Es un personaje de marca (como Betty Crocker), no una persona real:
**nunca** se inventan testimonios; los testimonios se recolectan de
compradores reales.

## Catálogo y orden de lanzamiento

| # | Producto | Nicho | Precio MX | Precio USA | Estado |
|---|----------|-------|-----------|------------|--------|
| 1 | "La Cocina de Antaño" — 50 recetas, 64 págs. ilustradas | Cocina | $99 MXN | $5.99 USD | ✅ **Listo** (`productos/01.../recetario.pdf`) |
| 2 | "Sopas de Letras Gigantes" — 100 juegos + soluciones, 129 págs. | Juegos | $79 MXN | $4.99 USD | ✅ **Listo** (`productos/02.../sopas-de-letras.pdf`) |
| 3 | "Cocina que Cuida" — 28 días de menús + 20 recetas bajas en azúcar/sal | Salud | $149 MXN | $8.99 USD | ✅ **Listo** (`productos/03.../cocina-que-cuida.pdf`) |
| 4 | "Un Momento con Dios" — devocional 30 días + oraciones | Fe | $99 MXN | $5.99 USD | ✅ **Listo** (`productos/04.../un-momento-con-dios.pdf`) |
| 5 | "WhatsApp sin Miedo" — 12 lecciones + guía antifraudes | Tecnología | $129 MXN | $7.99 USD | ✅ **Listo** (`productos/05.../whatsapp-sin-miedo.pdf`) |
| 6 | "El Libro de Mi Vida" — memorias para llenar (regalo de hijos) | Legado | $149 MXN | $8.99 USD | ✅ **Listo** (`productos/06.../el-libro-de-mi-vida.pdf`) |
| 7 | Guías de trámites (pensión MX / ciudadanía USA) | Trámites | — | — | Futuro (requiere mantenimiento) |

El bot de WhatsApp ya conoce y vende el catálogo completo (link de pago y
entrega automática por producto).

**Marketing (en `marketing/`):** cada producto se anuncia por separado, con
su propia campaña, audiencia y creativo — nunca como catálogo (una página
con todo abarata la percepción). La estrategia maestra (funnel, economía,
CAC objetivo/tope por producto, fases de lanzamiento, reglas de Meta) está
en `marketing/estrategia.md`; el plan de cada producto (persona para
Facebook, ángulo, diseño del anuncio, copys, pricing) en
`marketing/productos/0X-*.md`. La landing (`marketing/landing/`) es solo
del recetario, como respaldo de confianza.

Bundles: "2 por $149" / "3 por $199" como upsell inmediato post-compra.

Nicho descartado por decisión del dueño: tejido/bordado/manualidades.

## El funnel

1. **Anuncio** en Facebook/Instagram (video corto o carrusel mostrando páginas
   del PDF) con botón "Enviar mensaje de WhatsApp".
2. **Bot de WhatsApp** saluda, muestra fotos del producto, responde dudas
   (incluye notas de voz: las transcribe y contesta) y manda el link de pago.
3. **Pago con confirmación automática:**
   - México: link de Mercado Pago (tarjeta, SPEI y pago en OXXO — todo
     confirma solo, sin revisar depósitos a mano).
   - USA: link de Stripe (tarjeta); Zelle como respaldo manual.
4. **Entrega inmediata:** el bot envía el PDF por WhatsApp y por correo.
5. **Post-venta automática:** a los 3–5 días el bot pregunta qué le pareció,
   pide reseña y ofrece el siguiente producto del catálogo con descuento.
6. **Escalamiento a humano:** si el bot detecta enojo, confusión o solicitud
   de reembolso, notifica al dueño. Supervisión esperada: ~15 min/día.

## Principios (éticos y de negocio)

- Contenido 100 % original y con valor real. Nada copiado.
- Entrega inmediata y garantía de devolución de 7 días sin preguntas.
- Cero claims médicos ("menús ricos y balanceados", nunca "cura la diabetes").
- Testimonios solo reales. Letra grande en todo. Trato paciente y digno:
  es un público vulnerable a estafas — ser el vendedor legítimo ES la ventaja
  competitiva.

## Estructura del repo

```
NEGOCIO.md                  ← este plan
productos/
  01-recetario-cocina-de-antano/
    src/                    ← fragmentos HTML del libro + estilos e ilustraciones
    build.py                ← genera el PDF con WeasyPrint
    recetario.pdf           ← producto final
bot-whatsapp/               ← bot vendedor 24/7 (FastAPI + Claude + Mercado Pago)
  README.md                 ← guía de cuentas, deploy y pruebas
  app/                      ← webhook WhatsApp, cerebro, pagos, entrega del PDF
```

## Siguientes pasos

- [x] Productos 1–6: los seis PDFs del catálogo, terminados e ilustrados
- [x] Bot de WhatsApp multi-producto: ventas, muestras, link de pago por
      producto, entrega automática del PDF correcto, escalamiento a humano
- [x] Página de confianza (`marketing/landing/`) — falta poner el número real
- [x] Textos de anuncios listos para pegar (`marketing/anuncios.md`)
- [x] Textos de plantillas de Meta (`marketing/plantillas-meta.md`)

Pendiente (requiere al dueño):
- [ ] Validación: enseñar el recetario a una lectora real (mamá) y ajustar
- [ ] Abrir cuentas: WhatsApp Business (Meta), Mercado Pago, Anthropic, hosting
- [ ] Desplegar el bot (guía en `bot-whatsapp/README.md`) y venta de prueba
- [ ] Reemplazar `[WhatsApp del negocio]` en los PDFs (una línea en cada
      cierre) y el número en la landing, cuando exista el número
- [ ] Crear las 2 plantillas en WhatsApp Manager cuando haya cuenta
- [ ] Primeros anuncios con presupuesto chico ($100–150 MXN/día) y medir

