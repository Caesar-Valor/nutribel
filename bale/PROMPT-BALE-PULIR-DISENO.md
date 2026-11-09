# Encargo Balé: la sala real en la reserva y pulir el diseño (de "bien hecho" a "memorable")

Para Claude Code, en el repo **`nutribel`**, solo la carpeta **`bale/`**. Las páginas se escriben en `bale/_fuente/` y se compilan con `node bale/_fuente/construir.mjs`.

**Trabaja de corrido, sin pedir confirmación.** Las decisiones van en `bale-sistema/DECISIONES.md`, con su número siguiente.

## Reglas

- **NO hagas commits ni push. Nunca añadas "Co-Authored-By" ni "Generated with Claude Code".** Al final dame la lista de archivos y los mensajes de commit sugeridos, sin coautor.
- **Sin migraciones ni cambios en Supabase.** Esto es solo diseño, textos y front.
- **No cambies la lógica** de reservas, sala, pagos (CardNET, "Ya transferí"), Mi cuenta, comunidad ni el área del estudio (`estudio.html`). Las pruebas web siguen en verde.
- **Identidad fija:** Montserrat y los tokens de `css/base.css` (`--b-bg`, `--b-ink`, `--blush`, `--pink`, `--brown`, `--paper`, `--muted`, `--line` y sus versiones oscuras). Sin colores de marca nuevos.
- **Se mantiene lo de Marifer:**
  - fotos con el mat beige y sin hombres;
  - Ballet niñas por WhatsApp;
  - medias obligatorias;
  - RD$300 por cancelar el mismo día;
  - CardNET a nombre de NutriBEL;
  - Marifer "CEO".
- **Cambio respecto a encargos anteriores:** la reserva **ya no usa el dibujo de dos barras de 8**. Usa la **imagen oficial "Ubicación de espacios"** del estudio (sección 2.0). La sala real tiene **otra distribución**.
- **No inventes contenido:** ni testimonios, ni cifras, ni premios. Si una sección necesita algo que no existe, deja el hueco preparado y apagado, y anótalo para Marifer.

## 0. Herramientas: úsalas si están disponibles y anota cuáles usaste

1. **Skills:**
   - `frontend-design`: plan, revisión contra el brief, construcción y autocrítica;
   - `design-skills:design-critique` o `design:design-critique`: evaluación heurística página por página, antes y después;
   - `design-skills:accessibility-audit` o `design:accessibility-review`: WCAG 2.2 AA;
   - `design-skills:ux-writing` o `design:ux-copy`: textos y botones;
   - `design-skills:interaction-design`: estados y microinteracciones;
   - `ui-ux-pro-max`: dominios `ux` y `gsap` para movimiento y accesibilidad. **No adoptes sus paletas ni sus letras.**
2. **Taste Engine (conector):**
   - `lookup_slop` para revisar cada decisión de diseño contra los patrones de "diseño genérico de IA";
   - opcional: `extract_website` de `https://caesar-valor.github.io/nutribel/bale/` para tener el sistema actual medido. **Gasta créditos:** úsalo una sola vez, como mucho.

   **Referencias de tono** (wellness boutique, editorial, cálido; para inspirarse, no para copiar): lifetime.life, thisisaire.ch, thebeautychef.com y core-plus.com.
3. **Figma (conector),** si está: al terminar, sube Inicio, Clases y Reservar (móvil y escritorio) a un archivo de Figma con `figma-generate-design`, para que Marifer comente. Si no está, capturas.
4. **Playwright** para las capturas y pruebas (390, 768 y 1366 px; claro y oscuro).

## 1. Diagnóstico (lo que vi en la web en vivo, 6/11)

**Lo que está bien y se conserva:**
- la portada con el logo grande sobre el video;
- las fotos en arco;
- la sala de reserva;
- el horario por días;
- los precios;
- el equipo;
- la paleta;
- sin errores de consola ni desbordes.

**Lo que hace que se vea "de plantilla":**

1. **Todas las secciones siguen el mismo molde:** una etiqueta pequeña en mayúsculas espaciadas encima de cada título ("EL ESTUDIO", "PRECIOS", "EL EQUIPO"…), una rayita de color debajo, un párrafo y una fila de tarjetas iguales. Las bandas alternan color sin variar ritmo ni peso. Taste Engine lo marca como "Section Layouts: template-based" y "Conventional Elements: Title/Body/CTA" rígido.
2. **Todos los botones van en mayúsculas espaciadas,** y los enlaces llevan "→". Todas las tarjetas tienen el mismo radio y relleno, sea de clase, de precio, de comunidad o de equipo.
3. **Encabezado:** el patrón estándar logo / enlaces / botón, con mucho aire; se puede afinar en una cinta más fina, con el logo y el texto alineados.
4. **Clases (inicio):** 5 tarjetas estrechas con el texto **cortado con "…"** y la etiqueta "IDEAL PARA TU PRIMERA CLASE" apretada. En el teléfono, un carrusel que se corta.
5. **Textos largos y repetitivos.** Por ejemplo, Reformer: "Tenemos una sala de Pilates Reformer. El Pilates Reformer es una modalidad…".
6. **En el teléfono:** la barra fija "RESERVAR MI LUGAR" aparece justo debajo del botón de la portada, repetida. Debe aparecer solo después de pasar la portada.
7. **El modo oscuro no sigue al sistema:** no hay `prefers-color-scheme`; solo el botón de la luna.
8. **Letras muy pequeñas:** etiquetas de 11–12 px en mayúsculas (`.afecha span`, `.btn.sm`, `.pasos li`, iniciales). Mínimo 13 px, y 12 px solo para lo no esencial.
9. **El revelado al hacer scroll** deja bloques invisibles hasta que entran en pantalla (en una captura de página completa salen huecos). El contenido debe ser **visible por defecto**, y la animación, solo un realce. Que nunca dependa de que el JS llegue a ejecutarse.
10. **Falta prueba social:** no hay testimonios (cuando Marifer los dé) ni un enlace vivo a Instagram.

## 2. Qué hacer

### 2.0 PRIORIDAD 1: la sala real en la reserva

César guardó la imagen oficial en `bale/img/fuente/sala-espacios.png` (1536 × 1024): la foto real de la sala con los 16 círculos numerados, el título "balé studio · Ubicación de espacios" y el pie "16 espacios · Elige tu lugar". **Si no está ahí, PARA y pídemela.**

**La distribución real** (no la del dibujo actual de `js/sala.js`, que es 1–8 delante y 9–16 detrás):

| Zona | Lugares | Posición en la foto |
|---|---|---|
| Barras delanteras | **1–2** (izquierda), **3–4** (centro), **5–6** (derecha) | tres barras cortas, 2 lugares cada una |
| Barra del fondo, izquierda | **7–8** | junto a las cortinas |
| Barra del espejo | **9–16** | larga, a la derecha del letrero "You are exactly where you need to be" |

1. **Imágenes:** genera desde la PNG versiones WebP/AVIF (por ejemplo, 800, 1200 y 1536 px de ancho) con `srcset`, sin metadatos. Una versión recortada **solo a la foto** (sin el título ni el pie, que ya los pone la página), y la completa para compartir o descargar.
2. **Selector de lugar sobre la foto:**
   - botones invisibles accesibles **encima de cada círculo**, colocados con porcentajes;
   - **mide los centros de verdad** detectando los 16 círculos crema en la imagen (por ejemplo, con OpenCV/Hough o umbral por color) y guárdalos en `data/sala.json` (n, x%, y%, zona). Como referencia, en la imagen completa están aproximadamente:
     - fila delantera, y ≈ 603 px: 1 ≈ 208, 2 ≈ 390, 3 ≈ 676, 4 ≈ 844, 5 ≈ 1140, 6 ≈ 1318;
     - fila del fondo, y ≈ 464 px: 7 ≈ 305, 8 ≈ 390, 9 ≈ 761, 10 ≈ 858, 11 ≈ 952, 12 ≈ 1048, 13 ≈ 1136, 14 ≈ 1226, 15 ≈ 1314, 16 ≈ 1404.
3. **Estados sobre la foto** (siempre con texto además del color):
   - libre: anillo sutil al pasar o enfocar;
   - **elegido:** círculo marrón con el número en crema y el asentado con `--ease-spring`;
   - **ocupado o fijo de miembro:** velo y tachado, con "Ocupado" en la etiqueta accesible, sin decir de quién.
4. **Teléfono (390 px):** en la foto los círculos miden unos 15 px, así que **no basta con tocar la foto**.
   - Debajo de la foto (o en lugar de ella, si el ancho es menor de 600 px) va un **plano de botones de 44 px como mínimo**, ordenados como la sala: arriba "Barra del espejo 9–16" y "7–8"; abajo "1–2 · 3–4 · 5–6".
   - Al elegir un lugar en el plano, la foto **resalta ese círculo** (un zoom suave sobre la zona) para que la clienta vea dónde va a estar.
   - Opcional: tocar la foto la amplía.
5. **Teclado:**
   - las flechas recorren los lugares por zonas, en el orden real;
   - Enter elige;
   - etiqueta accesible: "Lugar 12, barra del espejo, libre".
6. **Dónde se usa la nueva distribución:** en `reservar.html` (paso "Lugar") y en `mi-reserva.html` ("tu lugar" resaltado en la foto). En `estudio.html`, en la vista de una clase y al asignar un lugar fijo, si usa el mismo componente.
7. **No cambies la lógica:** la base sigue con los lugares 1–16, que no cambian de número. **Solo cambia dónde se dibuja cada uno.** Las membresías importadas con su lugar fijo no se tocan.
8. **Reformer:** su dibujo de 6 máquinas se queda como está.
9. **El dibujo SVG viejo (2 × 8):** retíralo, o déjalo solo como respaldo si la imagen no carga (con la distribución nueva).
10. **Pruebas:** los 16 botones caen dentro de su círculo (tolerancia de unos pocos px a 1366 y a 390), los estados, el teclado, dos pestañas peleando por el mismo lugar y que la reserva queda con el número correcto.

### 2.0.b Instagram en Comunidad

Marifer quiere poder mostrar **publicaciones de Instagram** del estudio en Comunidad (por ejemplo, `https://www.instagram.com/p/DfYPjKolLgA/`).

- En la pestaña Comunidad del área del estudio, **"Añadir publicación de Instagram"**: se pega el enlace de un post o un reel de `@balestudio.rd`; se valida que sea de instagram.com y se guarda.
- **En la web:** una tarjeta con su foto (subida a mano por Marifer, o la vista previa que ella elija), un texto corto y "Ver en Instagram".
  - El **embed oficial de Instagram solo se carga si la clienta pulsa "Ver aquí"** (fachada): sin cargar scripts de terceros al abrir la página, por privacidad y rendimiento.
  - Anótalo en `privacidad.html`.
- **Si guardar el enlace necesita una columna nueva** en la base: prepara la migración en `bale-sistema` con sus pruebas, **no la apliques (PARA)**, y mientras tanto la web acepta las publicaciones de Instagram desde `data/bale.json` o `data/comunidad.json`.
- **No uses** la API de Instagram ni widgets que pidan tokens.

### 2.1 Plan primero (`frontend-design`)

Antes de tocar código, en `DECISIONES.md`:

- **Concepto:** "el estudio por dentro". Luz cálida, madera clara, barras negras, círculos crema numerados y **arcos** (los espejos en arco de la sala). **Los arcos son la firma:** úsalos con intención en fotos, cabeceras de página y un par de momentos, no en todo.
- **Escala tipográfica** con Montserrat: más contraste entre titulares y texto (por ejemplo, titulares grandes en peso 500 con tracking ligeramente negativo, cuerpo en 400 a 17–18 px), alturas de línea y anchos de línea de 60–75 caracteres.
- **Ritmo de secciones:** alterna secciones densas y tranquilas, cambia la disposición (título al lado del texto, imagen a sangre, lista editorial, cifra grande con etiqueta solo donde lo merezca) y varía el espacio vertical a propósito.
- **Componentes que se adaptan al contexto:**
  - precios: verticales;
  - comunidad: horizontales con foto;
  - clases: editoriales;

  con la misma lógica de sombras y márgenes.
- Revisa cada decisión con `lookup_slop` y quita lo genérico. Anota qué cambiaste y por qué.

### 2.2 Cambios concretos

1. **Etiquetas sobre títulos:** quítalas salvo donde den información real (por ejemplo, la fecha de un evento). Quita la rayita bajo cada título, o déjala solo en las cabeceras de página.
2. **Botones:**
   - en frase normal ("Reserva tu primera clase", "Ver horario");
   - el principal, en marrón;
   - el secundario, con borde;
   - el terciario, como enlace subrayado;
   - sin "→" automático;
   - una sola llamada principal por pantalla.
3. **Encabezado:**
   - cinta fina, con el logo alineado a la altura del texto del menú;
   - en escritorio, "Reservar" integrado;
   - la página actual marcada;
   - al bajar, se compacta con un fondo translúcido suave.
4. **Portada:**
   - el video con `poster` ligero y precarga mínima;
   - el texto, legible siempre con un velo calculado, sin oscurecer de más;
   - una sola secuencia de entrada, de menos de 1,2 s;
   - en el teléfono, la barra fija aparece después de la portada.
5. **Clases (inicio y `clases.html`):**
   - una presentación editorial **sin textos cortados**;
   - en escritorio, 2 columnas o una lista con foto en arco y el texto completo;
   - en el teléfono, una lista vertical o un carrusel con el siguiente asomando y puntos de posición;
   - la etiqueta "Ideal para tu primera clase", bien colocada;
   - "Se reserva en línea" o "Inscripción por WhatsApp", claro en cada clase.
6. **Reformer:**
   - texto reescrito, corto y con verbos ("6 máquinas. Viernes 8, 9, 10 y 11 am, con Viviana.");
   - la composición de fotos, como un mosaico en arco que respire.
7. **Próxima clase con lugar:** una pieza viva que se sienta del estudio (el número de lugares libres grande, la clase y la hora). Que se vea bien cuando no hay clases en la semana.
8. **Precios:** la membresía recomendada destacada con la firma de arco; "desde" legible; las medias y la cancelación, en una nota clara, no en letra pequeña.
9. **Comunidad:** tarjetas horizontales con foto y fecha destacada; vacío amable si no hay eventos ("Pronto anunciamos la próxima actividad. Síguenos en Instagram").
10. **Equipo:** se conservan las fotos en arco; nombre, rol y clase con buena jerarquía; "Leer más" accesible.
11. **Prueba social:**
    - un bloque preparado para **testimonios reales**, apagado mientras no haya (en `data/bale.json`);
    - un enlace a Instagram con 3–6 fotos propias de la web (no un widget de terceros).
12. **Preguntas:** la lista de preguntas con mejor espaciado y contraste; abrir y cerrar con animación corta.
13. **Pie:** en orden; WhatsApp, Instagram, dirección y "Cómo llegar" en un clic.
14. **Modo oscuro:**
    - sigue a `prefers-color-scheme` por defecto;
    - el botón de la luna lo cambia y lo recuerda (en `localStorage`, con try/catch);
    - revisa el contraste AA de cada componente en oscuro.
15. **Textos** (`ux-writing`):
    - repasa todos: más cortos, verbos claros, la misma palabra para la misma acción en todo el sitio;
    - errores que dicen cómo seguir;
    - sin emojis;
    - **sin cambiar datos** (precios, horarios, nombres).

### 2.3 Movimiento (pocas cosas, bien hechas)

- **Revelado:** visible por defecto; si el navegador lo permite, opacidad y 12 px de desplazamiento una vez por bloque, sin escalonar cada tarjeta.
- **Transiciones entre páginas** (View Transitions) cortas, con el encabezado fijo.
- **Sala y reserva:** se mantienen como están, solo se pulen tiempos si hace falta.
- **Hover** de 150–250 ms en botones y tarjetas.
- **Imágenes en arco:** un leve zoom al pasar el ratón (solo en escritorio).
- **`prefers-reduced-motion`:** todo en su estado final. Animar solo `opacity` y `transform`.

### 2.4 Calidad (medir antes y después)

- **Lighthouse móvil** (mediana de 3): Rendimiento ≥ 90, Accesibilidad 100, Buenas prácticas ≥ 95, SEO 100.
- **Video de la portada:** peso; versión ligera para el teléfono si hace falta.
- **WCAG 2.2 AA:**
  - contraste;
  - foco visible;
  - objetivos de 44 px;
  - `alt`;
  - orden del teclado;
  - formularios con etiqueta visible.
- **Sin scroll horizontal** en 360, 390, 768, 1024 y 1366 px.
- **Las pruebas web siguen en verde** (90/90 o las que haya). Añade pruebas: modo oscuro del sistema, barra fija tras la portada, sin textos cortados en las tarjetas y contenido visible sin JS.

## 3. Entrega

- **Capturas antes y después** de Inicio, Clases, Precios, Reservar y Comunidad (390 y 1366 px, claro y oscuro), en una carpeta fuera de git.
- **La crítica de diseño antes y después,** con las heurísticas que mejoraron, y la auditoría de accesibilidad.
- **Lighthouse antes y después.**
- **Qué tomaste de cada skill o conector.**
- **Lo que necesitas de Marifer:** testimonios, fotos de Hot Barre con el mat beige, los eventos, qué posts de Instagram mostrar y la foto de vista previa de cada uno.
- **Prueba de la sala:** capturas del paso "Lugar" en 390 y 1366 px con un lugar elegido y uno ocupado.
- **La lista de archivos cambiados y los mensajes de commit sugeridos, sin coautor.**
