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
| 1 | Recetario "La Cocina de Antaño" (~50 recetas tradicionales) | Cocina | $99 MXN | $5.99 USD | **En producción** |
| 2 | Sopas de letras y juegos mentales letra GIGANTE (100+) | Juegos | $79 MXN | $4.99 USD | Pendiente (generable por código) |
| 3 | Menús semanales y recetas para diabéticos e hipertensos | Salud | $149 MXN | $8.99 USD | Pendiente |
| 4 | Devocional de 30 días + libro de oraciones | Fe | $99 MXN | $5.99 USD | Pendiente |
| 5 | "WhatsApp sin miedo" + guía antifraudes digitales | Tecnología | $129 MXN | $7.99 USD | Pendiente |
| 6 | "El libro de mi vida" (memorias para llenar) — se vende también a los hijos | Legado | $149 MXN | $8.99 USD | Pendiente |
| 7 | Guías de trámites (pensión MX / ciudadanía USA) | Trámites | — | — | Futuro (requiere mantenimiento) |

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

- [x] Producto 1: recetario (contenido + diseño + ilustraciones + PDF)
- [x] Bot de WhatsApp: ventas, muestras, link de pago, entrega automática,
      escalamiento a humano (ver `bot-whatsapp/README.md`)
- [ ] Validación: mostrarlo a una lectora real del público objetivo
- [ ] Cuentas: WhatsApp Business, Mercado Pago, Anthropic, hosting, Meta Ads
- [ ] Desplegar el bot y hacer la primera venta de prueba (tarjeta propia)
- [ ] Producto 2: generador de sopas de letras letra gigante (código)
- [ ] Plantillas de Meta: entrega fuera de 24 h + seguimiento post-venta
- [ ] Página simple de confianza (garantía, contacto) para enlazar en anuncios
- [ ] Primeros anuncios con presupuesto chico ($100–150 MXN/día) y medir

