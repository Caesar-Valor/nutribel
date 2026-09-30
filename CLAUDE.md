# NutriBEL — web multipágina

Web para NutriBEL (La Vega, República Dominicana): clínica de nutrición de la Dra. Bielka Eusebio + restaurante de comida saludable + balé, el estudio de Barre, Ballet & Pilates de su hija (mismo edificio).

La dueña aprueba todo el contenido y tiene los derechos de todas las fotos.

## Punto de partida

`referencia/demo-completo-aprobado.html` es la versión de una sola página que el cliente ya vio y aprobó. **Respeta su diseño, textos, colores, animaciones y comportamiento.** La tarea es separarlo en páginas independientes con CSS y JS compartidos, cargar los datos desde `data/*.json` y usar las imágenes de `assets/img/` como archivos (en el demo están incrustadas en base64).

Las imágenes de `referencia/` son páginas del PDF del menú y bocetos del cliente: úsalas como guía visual.

## Páginas (un HTML por módulo)

| Archivo | Contenido |
|---|---|
| `index.html` | Presentación: 4 pasos en píldoras de color, logo animado en el centro, la doctora a la derecha. Debajo: ¿Quiénes somos? y Nuestra fundadora (títulos UCATECI e INTEC). Referencia: `referencia/pdf-pagina-presentacion.png` |
| `metodo.html` | "Crea tu menú personalizado con el método del 1 al 6". Usa `assets/img/metodo/titulo-crea-tu-menu.png` y los íconos `paso-1..6.png`, cada paso con su color (ver `referencia/pdf-pagina-metodo.png`). Incluye "¿Por qué 6 pasos?" y "Nosotros nos encargamos del resto" |
| `menu.html` | Plato del día (Nutrialmuerzo de lunes a viernes), pestañas por sección, filtros (alto en proteína, keto, sin gluten, ligero), fotos, tamaños, opciones, armador de power-bowl, carrito |
| `servicios.html` | Servicios de consulta: nutrición y bienestar + seguimiento de condiciones de salud. Aviso: la consulta no sustituye al médico tratante |
| `planes.html` | 13 planes con filtros; los de temporada muestran "Disponible ahora" según la fecha; botón "Consultar con la doctora" lleva a `consulta.html?plan=...` con el plan preseleccionado |
| `bale.html` | balé — Barre, Ballet & Pilates. Ver sección propia abajo |
| `consulta.html` | Formulario de cita → WhatsApp. Motivo con grupos (consulta, condición, planes). Bloquea domingos. Aviso de no escribir diagnósticos |
| `contacto.html` | Horario con indicador abierto/cerrado, fachada + interior, dirección, Cómo llegar, WhatsApp, Instagram |
| `panel.html` | Panel del negocio (demo): datos del negocio, Nutrialmuerzo de la semana, info nutricional, etiquetas, agotado hoy |

Barra de navegación igual en todas las páginas, marcando la página actual.

## Arquitectura

```
css/base.css      tokens, tipografía, cabecera, navegación, botones, bandas, modo oscuro, transición
css/<pagina>.css  estilos propios de cada página si hacen falta
js/common.js      cabecera y navegación, modo oscuro, carrito compartido, WhatsApp, horario abierto/cerrado
js/<pagina>.js    lógica de cada página
data/*.json       contenido
assets/img/...    imágenes
```

- **Carrito compartido:** debe persistir entre páginas en `localStorage`, para poder agregar desde el menú o desde el plato del día y enviar desde cualquier página. Incluye la modalidad de entrega (recoger, en el local, delivery cercano RD$75, zona retirada RD$150 con campo de dirección). Los precios `null` se muestran como "Precio por confirmar" y no suman al total.
- **Datos:** cárgalos con `fetch`. Esto no funciona abriendo el archivo directamente, así que usa un servidor local (`npx serve` o Live Server).
- **Despliegue:** GitHub Pages, sin frameworks ni compilación.

## Sistema de diseño (ya aprobado)

**Colores (modo claro, por defecto):**
- **Base:** `--olive #3F4D2B`, `--leaf #56643C`, `--lime #A6C24F`, `--cream #FAF8F2` (fondo), `--paper #FFFFFF`, `--ink #1F2617`, `--muted #5E6452`, `--line #E4DFD2`.
- **Acentos:** `--cta #C0581E` (solo botones de acción principal), `--orange #C0581E` (planes), `--plum #5B3480` (parte clínica: servicios y consulta). El naranja se ajustó desde `#C45A1F` para llegar a 4,5:1 con texto blanco; en modo oscuro el texto sobre el naranja es oscuro (`#161a11`).
- **Bandas de sección:** `--sage #E8EDDD`, `--lav #F1EBF6`, `--peach #FBEDE1`.
- **Pasos del servicio:** `#D9822B`, `#E6B422`, `#8FAE36`, `#5B3480`.

**Modo oscuro:** solo con el botón luna/sol, nunca automático por el sistema. Usa el atributo propio `data-mode="dark"` en `<html>`, no `data-theme`. Se recuerda en `localStorage`. La transición es un círculo que se expande desde el botón con `document.startViewTransition` y `clip-path` (650 ms). Si el navegador no lo soporta, hace un fundido de colores; con `prefers-reduced-motion`, el cambio es instantáneo. Copia los tokens del modo oscuro del demo.

**Tipografía (Google Fonts):**
- **Fraunces** para titulares, nombres de platos y planes: peso 500–600, `font-variation-settings: "SOFT" 60`. Las palabras clave van en cursiva y color `--leaf` (ej.: "Come *sano*").
- **Plus Jakarta Sans** para texto, botones y pestañas.

**Tarjetas:** fondo blanco, borde de 1.5px `--line`, franja superior de 6px del color de la sección y foto arriba (proporción 16:10) cuando hay imagen.

## Logo animado (index)

Hay dos máscaras PNG blancas sobre transparente del mismo tamaño y centradas entre sí: `marca/anillo-vegetales-mascara.png` y `marca/manzana-mascara.png`. Se colorean con `background:#A6C24F` y `mask-image`, dentro de un círculo verde `#3F4D2B`.

- **Entrada:** el círculo escala, el anillo entra girando y la manzana salta con rebote.
- **Después:** el anillo gira despacio (70 s por vuelta) y la manzana flota suave. Un borde punteado exterior gira en sentido contrario. Al pasar el ratón, el anillo gira más rápido.

Ver `referencia/boceto-logo-animado.png` y `referencia/boceto-anillo-animado.png`.

## balé (bale.html)

Es una submarca con identidad propia; su logo usa una serif fina sobre crema. Colores sugeridos a partir del logo: fondo `#F3E4D8`, texto espresso `#2E2723`, y un acento rosado suave del demo (`#7A3E5C`, fondo `#F7E6E8`). Mantén la misma cabecera de NutriBEL para no perder la navegación.

- **Identidad (aprobada):** tipografía propia — Cormorant Garamond (titulares, serif fina como el logo) y Montserrat (textos, etiquetas espaciadas) —, solo en esta página. La cabecera es la de NutriBEL (misma navegación) pero teñida con la paleta de balé; favicon propio (`assets/img/bale/bale-favicon.png`).
- **Entrada:** al abrir la página aparece un telón de terciopelo rosa con el logo de balé en crema y una cinta que se dibuja; el telón se abre hacia los lados (≈2,2 s). Se salta con un clic o una tecla y no aparece con `prefers-reduced-motion`. Todas las animaciones de la página terminan (nada en bucle).
- **Textos:** arriba "Barre, Ballet & Pilates"; la firma es "El estudio de la hija de la Dra. Bielka Eusebio". No mencionar que está en el mismo edificio hasta que se confirme.

- **Horario interactivo:** tómalo de `data/bale.json`, con filtros por día y por tipo de clase (Ballet niñas, Hot Barre, Barre Flex, Barre Flow, Reformer). Marca la clase de hoy y muestra la instructora y las notas ("Solo nivel avanzado", "Exclusiva para miembros", "First class session").
- **Reserva:** botón "Reservar" por clase que abre WhatsApp con el mensaje ya redactado (clase, día y hora). De momento usa el WhatsApp de NutriBEL hasta tener el de balé.
- **Descripción:** Barre integra ballet, yoga y Pilates usando una barra de ballet como apoyo, para todos los niveles.
- **Referencias:** `assets/img/bale/bale-horario.png` es la imagen original del horario.

## Reglas

- Todo el texto de la web va en español.
- Nunca guardar datos de salud de pacientes en el navegador ni enviarlos por formularios de la web.
- Accesibilidad: `alt` en todas las fotos, foco visible, contraste AA y `aria-label` en botones de ícono.
- Responsive desde 360px, sin scroll horizontal. Respeta las áreas seguras de iOS como en el demo.
- Imágenes en WebP con `loading="lazy"` fuera de la primera pantalla.

## Pendiente de confirmar con el cliente

Revisa la lista `pendiente` en `data/negocio.json` y `data/bale.json`. No inventes precios: muéstralos como "Precio por confirmar".
