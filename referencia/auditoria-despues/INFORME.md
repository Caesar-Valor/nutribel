# Informe: NutriBEL antes y después

Fecha: 17/10/2026.

**Material:**

- Capturas a 390 y 1366 px: `../auditoria-antes/capturas/` y `capturas/`.
- Informes de Lighthouse (HTML y JSON): `lighthouse/`.
- Comparativa limpia: `comparativa-3-pasadas.txt`.

## Puntuaciones (Lighthouse móvil, mediana de 3 pasadas)

Las dos versiones se midieron alternándose en el mismo equipo y en el mismo momento: el último commit (`3c28afe`) frente al trabajo actual. Una sola pasada variaba hasta 25 puntos en rendimiento.

| Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| index | 84 → **99** | 100 → 100 | 100 → 100 | 100 → 100 | 2,3 → **2,0 s** | 0,269 → **0,001** |
| menu | 69 → **93** | 100 → 100 | 100 → 100 | 100 → 100 | 3,2 → 3,1 s | 0,725 → **0,033** |
| bale | 93 → 94 | 96 → **100** | 100 → 100 | 100 → 100 | 2,5 → 2,5 s | 0 → 0 |

El SEO ya marcaba 100 porque Lighthouse solo revisa lo básico (título, descripción, enlaces). Lo nuevo (Open Graph, datos estructurados, sitemap, canonical) no sube esa cifra, pero sí cambia cómo se ve la web en Google y al compartirla por WhatsApp.

**Cuidado al leer las cifras:** el servidor local no envía caché. En GitHub Pages, "Use efficient cache lifetimes" mejora solo.

## Qué hizo cada herramienta y si vale la pena

| Herramienta | Qué hizo | ¿Vale la pena? |
|---|---|---|
| **Lighthouse + Puppeteer** (en una carpeta temporal, fuera del proyecto) | Capturas, puntuaciones y una batería de pruebas: carrito entre páginas, WhatsApp, delivery con dirección, power-bowl, plan preseleccionado, panel, modo oscuro, balé y reducir movimiento | **Sí, mucho.** Encontró dos fallos que ya existían: el salto de diseño del menú (CLS 0,73) y un contraste mal calculado en balé. También me avisó cuando yo mismo empeoré el LCP |
| **ui-ux-pro-max** (ejecutado desde su carpeta; el plugin está "disponible", no instalado) | `--design-system` y consultas `--domain ux` (toque, foco, animación, legibilidad) | **A medias.** Su paleta y sus fuentes eran genéricas (verde #059669, Playfair + Karla) y no se usaron. Sus reglas sí sirvieron: foco con 3:1, objetivos de 44 px, duraciones por contexto y `text-wrap: balance`. El resultado está en `design-system/nutribel/MASTER.md` y en los tokens de `css/base.css` |
| **Motion (skill /motion)** | Guía de buenas prácticas (local). Motion 14 para JS puro, empaquetado una vez en `js/vendor/motion.mjs`, más `js/motion.js` | **Sí**, para lo que CSS no hace bien: resortes que se pueden interrumpir (hover y toque), `inView`, `scroll` y el plato que vuela al pedido. Para el titular, **no**: ver más abajo |
| **MCP de Motion / Motion+** | No se usó: los dos están desactivados en `.claude/settings.local.json` | Sin la búsqueda de documentación, el generador de springs CSS y la auditoría MotionScore. La skill local fue suficiente |
| **21st.dev Magic** | No se pudo usar (ver abajo). La tarjeta de `laboratorio/21st/` está escrita a mano con su formato, junto a su traducción a HTML, CSS y JS puro | Como referencia, sí. Para esta web, **no**: trae React, Tailwind y shadcn, y traducirlo cuesta lo mismo que escribirlo sobre los tokens |

## Cambios principales

- **Sistema de diseño:** tokens de tipografía, espaciado, radios, sombras, duraciones y curvas en `:root`, y los estilos compartidos ya los usan. La paleta, las fuentes y el modo oscuro no cambian.
- **Accesibilidad:**
  - El foco pasa de lima (1,9:1) a `--leaf` (6:1); en oscuro y sobre fondos oliva sigue en lima.
  - El rosa de balé con texto blanco pasa de `#ED2F59` (4,1:1, no 4,7:1 como decía el CSS) a `#E0264F` (4,6:1).
  - Los días y las clases pasadas de balé se atenúan con color, no con opacidad.
  - El nombre accesible del botón Pedido y de los días del horario ahora coincide con el texto visible.
- **Toque:** botón Pedido, Agregar y cerrar a 44 px; botones a 48 px; chips a 40 px; tamaños y cantidades a 36 px (antes 28). Se añadieron estados de hover que faltaban en `.btn`.
- **Rendimiento:**
  - Se reserva el espacio de lo que llega por `fetch` (pasos de la portada, plato del día, pestañas).
  - Precarga de los JSON de cada página.
  - `srcset` en 480 y 800 px para platos, planes, local y balé (114 variantes).
  - Máscaras del logo en WebP (el anillo pasa de 123 KB a 66 KB).
- **Animación (todo con las variables `--dur-*` y `--ease-*`, y nada con `prefers-reduced-motion`):**
  - La cabecera toma sombra al hacer scroll.
  - Entrada de "¿Quiénes somos?", "Te presentamos el menú", el pie de servicios y el pie de página.
  - Resorte al pulsar botones y elevación de las tarjetas con el ratón.
  - La foto del plato vuela al botón Pedido y el contador rebota.
  - Las animaciones aprobadas del demo no se tocaron.
- **SEO:**
  - Título y descripción propios en cada página, `canonical`, Open Graph y Twitter Card, con imágenes de 1200×630 en `assets/img/og/`.
  - Datos estructurados `Restaurant` + `MedicalClinic` (dirección en La Vega, horario, teléfono, Instagram) en index y contacto, y `ExerciseGym` en balé.
  - `sitemap.xml`, `robots.txt` y `noindex` en el panel.

## Lo que no se pudo hacer (o se hizo distinto)

1. **21st.dev Magic:** `.mcp.json` tiene `"API_KEY": "TU_CLAVE"` y el servidor está *Pending approval*. El componente del laboratorio no es una salida real de Magic. Los pasos para activarlo están en `laboratorio/21st/README.md`.
2. **MCP de Motion:** está desactivado en `settings.local.json`, y la auditoría MotionScore además necesita Motion+.
3. **Titular de la portada con Motion:** lo hice primero con Motion (palabra por palabra con desenfoque) y el LCP de index subió de 2,3 a 4,4 s (rendimiento 69). Esperar al módulo y el filtro `blur` retrasaban la pintura. Ahora entra con **CSS usando los mismos tokens**, sin desenfoque, y index llega a 99.
4. **Dominio:** usé `https://caesar-valor.github.io/nutribel/` como URL base. `robots.txt` solo funciona en la raíz de un dominio, así que no tendrá efecto hasta tener dominio propio. Cuando lo haya, hay que cambiar la URL en las etiquetas, el sitemap y robots.
5. **JSON-LD fijo:** si el horario o el WhatsApp se cambian desde el panel (demo en el navegador), los datos estructurados no se actualizan solos.
6. **Fuentes de Google:** siguen bloqueando el render (unos 0,5–1,5 s en Lighthouse). Cargarlas sin bloquear causaría saltos de tipografía; alojarlas en el proyecto sería el siguiente paso.
7. **Sin probar en un iPhone ni en Safari reales:** todo se probó en Chrome de escritorio con emulación móvil.

## Mensaje de commit sugerido

```
Fase 2: sistema de diseño, Motion, SEO y auditoría Lighthouse

- Tokens de tipografía, espaciado, radios, sombras y animación en base.css
  (misma paleta, fuentes y modo oscuro); docs en design-system/nutribel/MASTER.md
- Accesibilidad: foco 6:1, rosa de balé con 4,6:1, días pasados sin opacidad,
  nombres accesibles = texto visible, objetivos táctiles de 36-48 px
- Motion 14 (JS puro, módulo ES en js/vendor): entradas al hacer scroll,
  hover/toque con resorte, plato que vuela al pedido, sombra de cabecera;
  titular de la portada con CSS (el blur retrasaba el LCP)
- Rendimiento: sin saltos de diseño en index y menú (CLS 0,27/0,73 -> 0,00/0,03),
  precarga de JSON, srcset 480/800, máscaras del logo en WebP
- SEO: títulos y descripciones, canonical, Open Graph, JSON-LD Restaurant,
  MedicalClinic y ExerciseGym, sitemap.xml y robots.txt
- Laboratorio 21st.dev (no enlazado) y auditorías antes/después en referencia/

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```
