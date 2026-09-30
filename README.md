# NutriBEL — web multipágina

Web de NutriBEL (La Vega, RD): clínica de nutrición de la Dra. Bielka Eusebio, restaurante saludable y balé (Barre, Ballet & Pilates). HTML, CSS y JS sin frameworks ni compilación.

## Probar en local

El contenido se carga desde `data/*.json` con `fetch`, así que **no funciona abriendo el archivo con doble clic**. Usa un servidor local desde la carpeta del proyecto:

```bash
npx serve .
```

y abre la dirección que indique (normalmente http://localhost:3000). También sirve la extensión Live Server de VS Code.

## Estructura

```
*.html            una página por módulo (index, metodo, menu, servicios, planes, bale, consulta, contacto, panel)
css/base.css      tokens claro/oscuro, tipografía, cabecera, navegación, botones, bandas, tarjetas, carrito
css/<pagina>.css  estilos propios de cada página
js/common.js      cabecera y navegación, modo oscuro, horario, WhatsApp, carrito compartido (API global NB)
js/<pagina>.js    lógica de cada página
data/*.json       contenido (lo que falta confirmar está en la lista "pendiente")
assets/img/       imágenes
referencia/       demo aprobado y bocetos (no se enlaza desde la web)
```

Cada página lleva `<body data-page="id">`, un `<header class="top" id="cabecera"></header>` vacío que rellena `common.js`, y en el `<head>` un script de una línea que aplica el modo oscuro antes de pintar.

## Datos guardados en el navegador

| Clave | Contenido |
|---|---|
| `nutribel-mode` | `dark` o `light` |
| `nutribel-pedido` | productos del pedido y modalidad de entrega (sin nombre, dirección ni notas) |
| `nutribel-panel` | cambios del panel demo: agotados, etiquetas, info nutricional, plato de la semana, datos del negocio |

Nunca se guardan ni se envían datos de salud desde la web.

## Publicar en GitHub Pages

Sube el repositorio y activa Pages en *Settings → Pages → Deploy from a branch* (rama `main`, carpeta raíz).
