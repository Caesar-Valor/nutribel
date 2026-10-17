# Laboratorio 21st.dev: tarjeta de plato

Prueba aislada: **no se enlaza desde la web** (`robots.txt` bloquea `/laboratorio/` y la página lleva `noindex`).

| Archivo | Qué es |
|---|---|
| `dish-card.tsx` | Componente con el formato de 21st.dev: React + Tailwind + shadcn (`cn`) + `motion/react` + `lucide-react` |
| `vanilla/index.html`, `dish-card.css`, `dish-card.js` | La misma tarjeta en HTML, CSS y JavaScript puro, con los tokens de `css/base.css` y `js/vendor/motion.mjs` |

Para verla, arranca el servidor local y abre `/laboratorio/21st/vanilla/index.html`.

## Aviso importante

El MCP **Magic de 21st.dev no estaba disponible** en esta sesión:

- en `.mcp.json` la clave sigue siendo el marcador `"API_KEY": "TU_CLAVE"`;
- `claude mcp list` muestra el servidor `magic` como *Pending approval*.

Por eso `dish-card.tsx` está **escrito a mano imitando lo que suele generar Magic**. No es una salida real de la herramienta.

Para probar Magic de verdad:

1. Crea una clave en https://21st.dev/magic.
2. Pon la clave en `.mcp.json`, y mejor como variable de entorno que en un archivo que se sube a GitHub.
3. Abre `claude` y aprueba el servidor.
4. Pide `/ui tarjeta de plato…` y compara su salida con este archivo.

## Qué cambia al traducir de React a JS puro

| React (21st.dev) | JS puro |
|---|---|
| `whileInView` | `inView(el, …)` + `animate` |
| `whileHover` / `whileTap` | `pointerenter` / `pointerdown` + `animate` con resorte |
| `layoutId` (resaltado que se desliza) | se mide el botón (`offsetLeft`/`offsetWidth`) y se anima `transform` y el tamaño |
| `AnimatePresence mode="wait"` | animación de salida con `await`, cambio de texto y animación de entrada |
| Clases de Tailwind con hex sueltos | variables del sistema (`--olive`, `--r-lg`, `--sh-lg`, `--dur-*`) |
| `role="radiogroup"` sin teclado | flechas ←→ y `tabindex` itinerante añadidos a mano |

**Veredicto:** como referencia visual y de interacción sirve. Para esta web no compensa: trae React, Tailwind y shadcn, y repite colores sueltos en lugar de usar los tokens. Traducirlo cuesta casi lo mismo que escribirlo directamente sobre `base.css`.
