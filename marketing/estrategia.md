# Estrategia de Marketing — Facebook e Instagram
## El Rincón de la Abuela · 6 productos, 6 campañas

> Documento maestro. La estrategia de CADA producto (persona, ángulo,
> diseño, copy, pricing, CAC) está en `marketing/productos/0X-*.md`.

---

## 1. Principio rector: una marca, seis negocios de anuncio

**Cada producto se vende solo, con su propia campaña, su propia audiencia y
su propio creativo.** Nunca se anuncian juntos ni se manda al cliente frío a
una página de catálogo: un producto por anuncio mantiene la percepción de
valor y deja medir qué funciona.

La marca "El Rincón de la Abuela" es el paraguas de **confianza** (mismo
WhatsApp, mismo sello visual, misma garantía), no el gancho de venta. El
catálogo completo solo aparece en dos lugares, y a propósito:

1. **Post-venta** (página final de cada PDF y seguimiento del bot): venderle
   el segundo producto a quien ya compró es la venta más barata del negocio.
2. **El perfil de la página de Facebook**, donde quien investiga ve que hay
   una casa editorial seria detrás.

## 2. El funnel (común a los seis)

```
Anuncio (clic a WhatsApp, CTW) → Bot "Lupita" responde en segundos
   → resuelve dudas + manda muestras → link Mercado Pago del producto
   → pago confirmado → PDF entregado al instante
   → días después: seguimiento y venta cruzada (plantilla Meta)
```

- **Sin página de por medio por defecto.** El anuncio CTW abre WhatsApp
  directo: menos pasos, menos fuga. La landing del recetario
  (`marketing/landing/`) es respaldo de confianza, no parte del funnel.
- **Atribución por producto:** cada campaña configura un mensaje prellenado
  distinto ("Hola, quiero informes del recetario 🌸" / "...de las sopas de
  letras"). Así el bot y la base de datos saben de qué anuncio vino cada
  conversación y cada venta. CAC real = gasto de la campaña ÷ ventas de ese
  producto en el periodo.

## 3. Economía base (hipótesis iniciales — se validan la semana 1)

Números de arranque para México, público 50+, anuncios CTW en Facebook.
**Son hipótesis para planear, no promesas**; la semana 1 los reemplaza con
datos reales del Administrador de Anuncios + la base del bot.

| Variable | Hipótesis inicial |
|---|---|
| CPM (costo por mil impresiones) | $40–80 MXN |
| CTR a WhatsApp | 1.5–3 % |
| Costo por conversación iniciada | $8–25 MXN (50+) · $15–35 (hijos 30–55) |
| Cierre del bot (conversación → venta) | 15–25 % |
| Comisión Mercado Pago | ≈ 4 % + IVA |
| Costo de IA + infra por venta | ≈ $3–5 MXN |

**Fórmulas que mandan:**
- `CAC real = gasto en anuncios ÷ ventas del producto`
- `Neto por venta = precio − comisión MP − $4 (IA/infra)`
- `Ganancia = Neto − CAC`

| Producto | Precio | Neto aprox. | CAC objetivo | CAC tope (parar/ajustar) |
|---|---|---|---|---|
| Recetario | $99 | ≈ $90 | ≤ $55 | $85 |
| Sopas de Letras | $79 | ≈ $71 | ≤ $40 | $65 |
| Cocina que Cuida | $149 | ≈ $138 | ≤ $75 | $125 |
| Devocional | $99 | ≈ $90 | ≤ $55 | $85 |
| WhatsApp sin Miedo | $129 | ≈ $119 | ≤ $65 | $110 |
| El Libro de Mi Vida | $149 | ≈ $138 | ≤ $75 | $125 |

**La verdad incómoda del ticket bajo:** con CAC de $55 sobre $99, la primera
venta deja ~$35. El negocio se vuelve bueno por la **segunda venta**: a la
lista de compradores se le ofrece otro producto con CAC ≈ $0 (plantilla de
seguimiento). Meta: que el 25–30 % de compradores haga una segunda compra en
60 días. Por eso las Sopas de Letras ($79) tienen rol principal de
**upsell**, no de adquisición fría.

## 4. Fases de lanzamiento y presupuesto

Presupuesto de aprendizaje sugerido: **$150 MXN/día** por campaña activa,
máximo 2 campañas a la vez al inicio.

- **Fase 1 (semanas 1–2): Recetario.** Es el producto validado por el
  mercado (el caso de tu mamá). Objetivo: aprender los números reales del
  funnel (costo/conversación, cierre del bot) con el producto más seguro.
- **Fase 2 (semanas 3–4): + El Libro de Mi Vida.** Audiencia distinta (los
  hijos, 35–60, compra emocional/regalo) → aprende de un segundo público
  sin canibalizar al primero. Si está cerca el 10 de mayo o Navidad,
  adelantar esta fase: es su temporada de oro.
- **Fase 3 (mes 2): + Devocional y WhatsApp sin Miedo.** El devocional al
  público directo; WhatsApp sin Miedo a los hijos.
- **Fase 4: Cocina que Cuida** (requiere el creativo más cuidadoso por las
  reglas de salud de Meta) **y Sopas como front-end** solo si el costo por
  conversación resultó muy barato; si no, se queda de upsell estrella.
- **Regla de paro general:** si una campaña lleva gastado 3× el CAC tope
  sin vender, se pausa y se cambia creativo o audiencia (no el precio, aún).
- **Regla de escala:** CAC ≤ objetivo durante 5–7 días → subir presupuesto
  +50 % cada 3 días (nunca duplicar de golpe: rompe el aprendizaje de Meta).

## 5. Estructura en el Administrador de Anuncios

Por cada producto:

```
Campaña: [Producto] — Mensajes de WhatsApp (objetivo "Interacción/Mensajes")
 ├─ Conjunto A — audiencia principal (la del archivo del producto)
 ├─ Conjunto B — audiencia secundaria (p. ej. los hijos) si aplica
 └─ (después) Conjunto C — Advantage+ amplio, cuando haya ~50 ventas
Cada conjunto: 2–3 anuncios (los copys del archivo del producto)
```

- **Ubicaciones:** feed de Facebook + Marketplace para público 55+ (ahí
  vive); agregar Instagram (feed + reels + stories) solo en campañas
  dirigidas a hijos 30–55.
- **Dispositivo:** Android domina en este público en México; no excluir
  iOS, pero los creativos se diseñan para pantalla de celular barato.
- **Pixel/datos:** el evento de conversión real vive en el bot (ventas en
  SQLite). El Administrador optimiza por conversaciones iniciadas; nosotros
  decidimos por CAC real calculado con ventas del bot.

## 6. Reglas de cumplimiento Meta (las que nos tocan)

1. **Nada de atributos personales.** Prohibido implicar que el usuario tiene
   una condición: ❌ "¿Tiene diabetes?" / ✅ "Menús bajitos en azúcar y sal".
   Aplica fuerte a Cocina que Cuida.
2. **Sin categorías sensibles en la segmentación.** Meta eliminó los
   intereses de salud y religión: Cocina que Cuida y el Devocional se
   segmentan amplio (edad/geo/género) y **el creativo hace la selección**.
3. **Sin miedo amarillista.** Para WhatsApp sin Miedo: tono protector y
   empoderador ("aprenda a reconocerlas"), no catastrofista ("¡lo van a
   vaciar!"). Meta penaliza el miedo excesivo.
4. **Testimonios solo reales** y sin promesas de resultado. Fotos propias,
   nunca de bancos con "señoras de stock" que huelen a anuncio.

## 7. Estacionalidad (México)

| Fecha | Producto que empuja |
|---|---|
| 10 de mayo (Madres) | El Libro de Mi Vida, Recetario (regalo) |
| Día del Padre (jun) | El Libro de Mi Vida, WhatsApp sin Miedo |
| 28 de agosto (Día del Abuelo) | Todos; el bot puede dar "combo del abuelo" post-compra |
| Cuaresma | Devocional; Recetario (capirotada, pescado) |
| Noviembre–Posadas | Recetario (tamales, ponche), Devocional, Memorias (regalo) |
| Enero ("año nuevo, vida sana") | Cocina que Cuida |

## 8. Boca en boca por WhatsApp (el canal gratis)

Cada producto necesita su **pieza reenviable**: una muestra en PDF de 2–4
páginas, bonita y con el WhatsApp del negocio al pie, que la clienta pueda
mandar a sus comadres ("mira qué bonito esto que compré"). Pendiente de
construir cuando haya número de WhatsApp (se generan de los mismos libros).
Regla: la muestra regala valor completo (una sopa de letras jugable, un día
del devocional, una receta), no un "teaser" mocho.

## 9. Protocolo de medición semanal (15 minutos)

1. Administrador de Anuncios: gasto y conversaciones por campaña.
2. Bot (SQLite): conversaciones nuevas y ventas por producto.
3. Calcular CAC real por producto → comparar contra objetivo/tope.
4. Decidir: escalar (+50 %), mantener, rotar creativo, o pausar.
5. Anotar el aprendizaje de la semana en este archivo (histórico).
