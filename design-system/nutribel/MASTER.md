# Sistema de diseño de NutriBEL (MASTER)

La fuente de verdad es `css/base.css` (bloque `:root`). Este documento explica las decisiones. Se revisó con **ui-ux-pro-max** (`search.py --design-system` y consultas `--domain ux`). Su paleta y sus fuentes genéricas (verde #059669, Playfair + Karla) **no se aplicaron**, porque la identidad ya está aprobada por la clienta. Sí se aplicaron sus reglas de accesibilidad, de toque, de animación y de tipografía.

## Identidad (sin cambios)

| Rol | Claro | Oscuro |
|---|---|---|
| Base | `--olive #3F4D2B`, `--leaf #56643C`, `--lime #A6C24F` | `#B3CB7A`, `#8FA85A`, `#B5D163` |
| Fondo / tarjeta | `--cream #FAF8F2` / `--paper #FFF` | `#161a11` / `#1f2419` |
| Texto | `--ink #1F2617`, `--muted #5E6452` (5,8:1 sobre crema) | `#eef0e2`, `#b4b9a3` |
| Acción | `--cta #C0581E` (4,5:1 con blanco) | `#D9703A` con texto `#161a11` |
| Clínica / planes | `--plum #5B3480` / `--orange #C0581E` | `#C9A8E8` / `#EE9A62` |
| Bandas | `--sage`, `--lav`, `--peach` | versiones oscuras |

Fuentes: Fraunces (titulares, `SOFT 60`, palabra clave en cursiva `--leaf`) y Plus Jakarta Sans (texto). El modo oscuro solo se activa con el botón.

## Tokens nuevos

- **Tipografía:** `--fs-xs 13`, `--fs-sm 14.5`, `--fs-base 16`, `--fs-lg 19`, `--fs-h3`, `--fs-h2`, `--fs-title` y `--fs-display` (fluidos con `clamp`). Interlineado: `--lh-tight 1.02` (titulares), `--lh-head 1.1` y `--lh-body 1.6` (la regla es 1,5–1,75). Los titulares usan `text-wrap: balance` y los párrafos `text-wrap: pretty`.
- **Espaciado (base 4):** `--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 24 · `--sp-6` 32 · `--sp-7` 48 · `--sp-8` 64 · `--sp-9` 96.
- **Radios:** `--r-xs 6`, `--r-sm 10`, `--r-md 14` (botones), `--r-lg 22` (tarjetas), `--r-xl 28` (recuadros), `--r-pill`.
- **Sombras con tinte oliva:** `--sh-sm` (reposo, hover de botón), `--sh-md` (cabecera al hacer scroll), `--sh-lg` (tarjeta en hover, cajón, aviso). En oscuro son negras y más densas.
- **Animación:**
  - Duraciones: `--dur-instant 100ms`, `--dur-fast 150ms` (color y toque), `--dur-base 250ms` (estado), `--dur-slow 450ms` (cajón, hover de tarjeta), `--dur-reveal 650ms` (entradas) y `--dur-theme 650ms` (círculo del modo oscuro).
  - Curvas: `--ease-out` (entradas), `--ease-in` (salidas), `--ease-in-out` (cambio de tema), `--ease-spring` (rebote breve).
  - Resorte y escalonado: `--spring-bounce .25` para los resortes de Motion y `--stagger 70ms`.
- **Interacción:** `--tap 44px` como mínimo para el dedo, y `--ring` para el foco: `--leaf` en claro (6:1, el lima solo daba 1,9:1), `--lime` en oscuro y sobre fondos oliva.

## Reglas aplicadas (ui-ux-pro-max)

1. **Contraste AA.** Foco visible con al menos 3:1. En balé, el rosa de los rellenos con texto blanco pasa de `#ED2F59` (4,1:1) a `#E0264F` (4,6:1). Los días pasados del horario se atenúan con color, no con opacidad.
2. **Toque.** Botones de al menos 44 px (pedido, agregar, cerrar), chips de 40 px, tamaños y cantidades de 36 px y al menos 8 px entre ellos.
3. **Animación con significado.** Cada animación muestra un cambio de estado, una relación entre elementos o la respuesta a una acción. Las entradas son más lentas que las salidas, y con `prefers-reduced-motion` no hay movimiento.
4. **Rendimiento.** Solo se animan `transform`, `opacity`, `filter` y `clip-path`. Las fotos son WebP con `srcset` (480 y 800 px) y `loading="lazy"`, y se reserva el espacio del contenido que llega por `fetch` (CLS).
5. **Estados.** Todo lo que se puede tocar tiene estados de hover, foco y pulsado.
