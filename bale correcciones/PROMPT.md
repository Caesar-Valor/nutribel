# PROMPT PARA CLAUDE CODE — Balé: correcciones de diseño de la dueña

Fuente: lo que la dueña de Balé, María Fernanda Pimentel, pidió por WhatsApp el 22 y el 23 de octubre de 2026, en capturas marcadas y audios.

Trabaja solo, sin preguntarme. Si algo no encaja, toma la decisión más razonable, anótala en el informe final y sigue.

- **No hagas commit.** Trabaja en la rama actual.
- **Solo se toca `bale/`**, más la documentación de la sección 9. NutriBEL no se toca.
- **Este prompt manda sobre `CLAUDE.md` y `README.md`** en la identidad de balé (colores, letra, fotos). Al final los actualizas.
- **Entorno:** Windows.
  - Sitio en local: `npx serve .` y abre `http://localhost:3000/bale/`.
  - Capturas con `npx playwright`.
  - Rutas solo relativas.
- **Este paquete trae archivos listos** (fotos recortadas, video, imagen para compartir). Cópialos tal cual, sin volver a procesarlos.

---

## 0. Lo que pidió la dueña

1. **Colores.** Hay tres audios; lo que dice cada uno está en la sección 2.
   - Fuera el morado: no es de la marca.
   - Lo que era morado pasa a marrón; lo pidió ella para los botones.
   - El rosado de la marca se queda, incluido el fucsia de sus redes. Ella dijo: "el rosadito, que ahí está bien".
   - El fucsia sigue solo en los botones principales de reservar, como hoy. Lo eligió ella el 23/10/2026, después de ver la comparación con todos los botones en marrón.
   - Marcó en negro el día "HOY" del calendario, el círculo de la instructora, el botón "Reservar", la etiqueta "BARRE" y el enlace "Ver horario". Todos eran morados.
2. **Letra.**
   - Lo que dijo: "Ver si podemos usar una sola tipografía."
   - Hoy parecen muchas letras. Bastan tres pesos: negrita, media y normal.
3. **Información repetida y página demasiado cargada.**
   - El ejemplo que dio: la tarjeta de Barre Flex y Barre Flow dice el horario en el texto y lo repite abajo.
   - Lo que dijo: "la página abarca demasiado, pudiendo tener solo lo básico".
4. **Foto de Hot Barre.** Esa foto es de un evento especial por su cumpleaños: no usan la barra, la postura no es buena y salen hombres. Lo que dijo: "El lugar no es para hombres."
5. **Título del estudio.** Cambiar "Nutrición y movimiento" por "Balé Studio".
6. **Reformer.**
   - Confirma que son 6 máquinas.
   - No le gusta la descripción de los "espejos en arco".
   - Mandó su propio texto.
7. **Equipo.** Mandó las fotos y las bios de las instructoras (sección 1).

Al revisar la página apareció algo más. La foto del cumpleaños, con un hombre a la derecha, también es la primera toma del video de portada, el póster y la imagen que sale al compartir el enlace (`bale-og.jpg`). Este paquete trae las tres cosas rehechas sin esa foto (sección 6).

## Reglas que no se rompen

1. **Nunca caras de niñas.**
2. **Mats:** solo el mat beige con el logo de balé.
3. **Nada de la carpeta de Drive `agosto - septiembre/cumple maria`**, ni fotos ni video, y ninguna foto en la que salga un hombre.
4. **No inventes datos ni textos** sobre las clases. Usa solo lo que dice este prompt o ya está en los JSON.
5. **NutriBEL no se puede romper:** menú, carrito, pedido por WhatsApp, modo oscuro, panel y `data/*.json`.
6. **Todo en español.**
7. Al final, `grep -ri glenny` (sin `.git`) da 0 resultados.

## Contenido del paquete

| Archivo del paquete | Va a | Qué es |
|---|---|---|
| `bale/img/equipo/*.webp` (8) | `bale/img/equipo/` | Fotos y avatares de las 4 instructoras (sección 1) |
| `cambios-equipo.diff` | — | Cambios de código del equipo, probados sobre el commit `03d4c5e` (sección 1) |
| `bale/img/hot-barre-luces{,-800,-480}.webp` | `bale/img/` | Nueva foto de Hot Barre: alumna en la barra con luces (Drive `DSC09358`, carpeta `agosto - septiembre`) |
| `bale/img/estudio-logo{,-800,-480}.webp` | `bale/img/` | Logo de balé en la pared del estudio (Drive `DSC09136`) |
| `bale/img/bale-og.jpg` | `bale/img/` | Imagen al compartir el enlace, con botón fucsia y sin la foto del cumpleaños |
| `bale/video/*` (6) | `bale/video/` | Video de portada (horizontal y vertical) y pósters, sin la foto del cumpleaños |
| `referencia/bale-recursos/video/generar-portada.py` | misma ruta | Script de la portada con las 6 tomas nuevas |
| `referencia/bale-recursos/video/fotos-portada.tsv` | misma ruta | Los IDs de Drive de esas 6 tomas |

---

## Antes de empezar: capturas "antes"

Antes de cambiar nada, haz las capturas de cada sección de `bale/` (`#inicio` a `#ubicacion`):
- a 390 y a 1366 px;
- en modo claro y en modo oscuro;
- guárdalas en `referencia/capturas-diseno/antes/`.

Mide también la altura total de la página a 390 px. Hoy es de unos 15,469 px.

---

## 1. Equipo: fotos y bios (solo si aún no está hecho)

Si `bale/img/equipo/marifer.webp` ya existe y las 4 instructoras de `bale/data/bale.json` ya tienen `bio`, salta esta sección.

1. **Fotos.**
   - Copia los 8 archivos de `bale/img/equipo/` del paquete.
   - Borra `bale/img/equipo/LEEME.txt`.
2. **Datos.** En `bale/data/bale.json`, cambia el arreglo `instructoras` por este. **No cambies `nombre`**: el horario busca a cada instructora por ese campo.

```json
"instructoras": [
  {"nombre": "Marifer", "completo": "María Fernanda Pimentel", "rol": "CEO y coach principal", "clases": "Hot Barre y Barre Flow", "foto": "img/equipo/marifer.webp", "avatar": "img/equipo/marifer-avatar.webp",
   "bio": "Comunicadora Corporativa egresada de la Pontificia Universidad Católica Madre y Maestra (PUCMM). Apasionada por el baile, el movimiento y el bienestar físico. Coach de Barre certificada por Barre Intensity y de Pilates Mat por Controlfit. Su amor por la danza y el ejercicio la ha llevado a convertir su pasión en una profesión, motivando a otras mujeres a conectar con sus cuerpos a través del movimiento. Actualmente, es fundadora de Balé Studio."},
  {"nombre": "Lynette", "completo": "Lynette Peralta", "rol": "Instructora", "clases": "Barre Flex", "foto": "img/equipo/lynette.webp", "avatar": "img/equipo/lynette-avatar.webp",
   "bio": "Bailarina con más de 10 años de experiencia en ballet clásico, formada en Ballet Clásico Santiago. Desde muy pequeña, la danza ha sido una de sus grandes pasiones, y su amor por el movimiento y la enseñanza la llevó a descubrir el mundo del barre. Actualmente, forma parte de Balé Studio, donde imparte clases de Barre Flex, combinando su formación en danza con su pasión por inspirar, guiar y acompañar a otras mujeres a través del movimiento."},
  {"nombre": "Rusmairy", "completo": "Rusmairy Mercado Ortega", "rol": "Instructora", "clases": "Ballet niñas", "foto": "img/equipo/rusmairy.webp", "avatar": "img/equipo/rusmairy-avatar.webp",
   "bio": "Inició sus estudios de ballet en 2008, destacándose desde temprana edad por su talento y dedicación a la danza clásica. Es bailarina, maestra y coreógrafa profesional, con experiencia en concursos, bienales y encuentros nacionales e internacionales, donde ha obtenido importantes reconocimientos y premios por su desempeño artístico y coreográfico."},
  {"nombre": "Viviana", "completo": "Viviana Medina Sánchez", "rol": "Instructora", "clases": "Pilates Reformer", "foto": "img/equipo/viviana.webp", "avatar": "img/equipo/viviana-avatar.webp",
   "bio": "Bailarina de ballet clásico e instructora con más de 10 años de experiencia en República Dominicana, formada en BodyBalance, Pilates Mat y Pilates Reformer."}
]
```

3. **Código.** Aplica `cambios-equipo.diff` con `git apply`. Si no entra limpio, aplica la intención a mano:
   - **Apodo:** sale «Marifer» solo cuando el nombre completo no empieza por el apodo (`!p.completo.startsWith(p.nombre)`).
   - **Bio:** se muestra en 4 líneas, con un botón "Leer más" / "Leer menos". El botón lleva `aria-expanded` y `aria-controls`, y solo aparece si el texto no cabe.
   - **Horario:** el círculo con iniciales se cambia por la foto `avatar`, de 26 px, redonda y con `alt=""`. En las clases finalizadas, en gris.
4. **Pendientes.** En la lista `pendiente`, borra la línea "Fotos del equipo y confirmar quién es quién (...)".

Haz esta sección **antes** que las siguientes, porque el diff está hecho sobre el código actual.

---

## 2. Colores: fuera el morado, se queda el rosado de la marca

**Lo que dice cada audio.** Sirve para no perder el porqué.

- **Audio reenviado 1:**
  > Hay varios tonos de rosado y un morado [...] el morado no está dentro de la paleta [...] para lo que está el morado, pudieran coger el rosado como fucsia.
- **Audio reenviado 2:**
  > Pudieran usar los mismos colores pero de diferentes formas [...] los tonos que tiene la paleta como tal, que más o menos son la letra que es marrón, el beige o rosadito claro que es el fondo y los demás colores que están en la página.
- **Audio de la dueña** (el último; es el que decide):
  > Los colores de balé, en verdad, son el rosadito, que ahí está bien, y marrón. O sea, que todos esos botones que hay que resaltar, tú lo pudieras poner marrón.

**Cómo se aplica**

1. **Lo que sobra es la familia del morado.**
   - Morado: `#7A3E5C`.
   - Sus rosados malva y lila: `#B06A8B`, `#EBB5CD`, `#D08DAB`.
   - El telón: `#8a4868`, `#6e3753`, `#5f2f48`.
   - La burbuja de WhatsApp: `#5c3049`.
   - Todos tienen un tono de unos 330°, distinto del rosado de la marca (unos 350°). Por eso se ven "varios tonos de rosado y un morado".
2. **El rosado de la marca se queda.**
   - Son el rosadito claro `#F7E6E8` de los fondos, el rosa `#F4C5CE` de los detalles y el fucsia de sus redes.
   - Es un mismo rosado en tres intensidades: "los mismos colores de diferentes formas".
   - Nadie pidió quitar el fucsia: la dueña dice que el rosadito está bien, y el primer audio lo propone.
3. **Todo lo que hoy es morado pasa a marrón**, como pidió la dueña para los botones:
   - los botones;
   - el día seleccionado y "Hoy";
   - el lugar elegido;
   - "Ver horario";
   - las etiquetas pequeñas sobre los títulos;
   - los cargos como "Instructora".
4. **Textos y fondos, como hoy.**
   - Textos en espresso `#2E2723`: "la letra que es marrón".
   - Fondos crema y rosadito claro.

**Tokens en `bale/css/base.css`, modo claro**

| Token | Valor | Uso |
|---|---|---|
| `--b-bg` / `--cream` | `#F3E4D8` | Fondo (sin cambio) |
| `--paper` | `#FFFAF6` | Tarjetas (sin cambio) |
| `--blush` | `#F7E6E8` | Rosadito claro de las bandas (sin cambio) |
| `--pink` (sustituye a `--rose-soft`) | `#F4C5CE` | Detalles: círculos de iniciales, chips, separadores |
| `--fucsia` (une `--hot` y `--hot-fill`) | `#E0264F` | Acento de la marca. Letra blanca encima: 4.6:1 |
| `--fucsia-2` | `#C81E45` | Hover del fucsia |
| `--brown` (nuevo) | `#5A3426` | Todo lo que era morado |
| `--brown-2` (nuevo) | `#46281E` | Hover del marrón |
| `--cta` (nuevo) | `var(--fucsia)` | Botones principales de reservar |
| `--ring` | `var(--brown)` | Contorno de foco |
| `--b-ink` / `--ink`, `--muted`, `--line` | Como están | Textos y bordes |

**Modo oscuro**

| Token | Valor |
|---|---|
| `--brown` | `#F4C5CE`, con el texto encima en `#1d1715` |
| `--brown-2` | `#F9DCE2` |
| `--pink` | `#43302B` |
| `--blush` | `#2A201D` |
| `--fucsia` | Igual que en claro |

Quita `--ring:#EBB5CD` del bloque oscuro.

**Dónde va el fucsia: donde está hoy y en ningún sitio más.** Es la opción que eligió la dueña el 23/10/2026, frente a poner todos los botones en marrón.
- Con `var(--cta)`:
  - "Reservar" de la cabecera (`.tores`);
  - "Reserva tu primera clase" de la portada;
  - "Reserva tu Reformer del viernes";
  - "Lo quiero" de Clases ilimitadas;
  - "Regalar un paquete";
  - el botón del evento próximo de Comunidad;
  - en general, `.tores` y `.bbtn.hot`.
- Con `var(--fucsia)`:
  - la etiqueta "Ideal para tu primera clase" (`.badge`);
  - la fecha del evento próximo;
  - la franja del certificado de regalo (`.gcard i`).

**Todo lo demás que era morado pasa a marrón.**
- **Botones** `.bbtn.solid` (relleno marrón, letra `#FFFAF6`) y `.bbtn.line` (borde y letra marrón): "Reservar" del horario, "Lo quiero", "Reservar" de clase individual, "Inscribir a mi hija", "Cómo llegar", "Pregunta por tu Barre-tini Party", WhatsApp e Instagram.
- **Otros elementos:** el día seleccionado y "Hoy", el lugar elegido en la sala, los enlaces "Ver horario", las etiquetas pequeñas sobre los títulos, los cargos, los chips de edad, las notas del horario y el foco.

**Telón de entrada**
- El terciopelo morado pasa a marrón: `linear-gradient(180deg,#6B4030,#5A3426 70%,#46281E)`.
- Estos colores van escritos tal cual y no como tokens, para que el modo oscuro no los cambie.
- El logo sigue en crema y la cinta pasa a rosadito `#F4C5CE`.

**Se quedan como están**
- El rojo de error `#b54a3a`.
- El gris `#77706b` de los lugares ocupados.
- `.badge.soft` en espresso ("Solo nivel avanzado", "Exclusiva para miembros").

**Comprobación:** con este comando, 0 resultados.

```
grep -rniE "#7A3E5C|#B06A8B|#8a4868|#6e3753|#5f2f48|#5c3049|#EBB5CD|#D08DAB|#ED2F59|#d4204a|--rose|--hot" bale/
```

**Contrastes calculados:** crema sobre marrón 10.4:1, marrón sobre crema 8.6:1, blanco sobre fucsia 4.6:1 (pasa AA), espresso sobre rosadito 9.6:1.


---

## 3. Una sola tipografía: Montserrat

1. **Carga solo Montserrat.** En `bale/index.html` y `bale/panel.html` deja solo `family=Montserrat:wght@400;500;600&display=swap` y quita Cormorant Garamond.
2. **Sustituye las 32 apariciones de `var(--b-serif)`** por `var(--b-sans)` y borra `--b-serif`.
3. **Tres pesos, ni uno más.**
   - **600** (la negrita): títulos, nombres de clase, botones y pequeñas etiquetas.
   - **500** (la media): subtítulos, nombres de las personas y precios.
   - **400** (la normal): texto corrido.
   - No se usa 700 en ningún sitio.
4. **Sin cursivas.** Hoy hay 12 en `bale.css` y `panel.css`.
   - Quita las palabras en cursiva y de color de los títulos (`<em>` en los `h2` de `index.html`, y el `.replace("Reformer","<em>Reformer</em>")` de `bale.js`).
   - Quita también la frase de la portada, el día del calendario ("Hoy, viernes…"), «Marifer», "Ballet clásico infantil" y "En el edificio de NutriBEL".
5. **Escala.** Montserrat es más ancha que Cormorant: no copies los tamaños de antes.

| Elemento | Estilo |
|---|---|
| `h2` | `600 clamp(28px,4vw,42px)/1.15`, `letter-spacing:-.01em` |
| `h3` de tarjetas | `600 20–22px/1.2` |
| Frase de la portada | `500 clamp(18px,2.4vw,24px)/1.35` |
| Precios | `500 19–20px`, con `font-variant-numeric:tabular-nums` |
| Números de los días del calendario | `500`, con `tabular-nums` |
| Etiquetas pequeñas (`.b-kick`) | `600 11.5px`, mayúsculas, `letter-spacing:.16em` (hoy `.32em`, demasiado abierto) |
| Botones | `letter-spacing:.12em` |
| Texto | `400 16px/1.6` |

**Comprobación:** `grep -rniE "Cormorant|italic|b-serif|font-weight:700|font:700" bale/` da 0 resultados.

---

## 4. Menos repetición: lo básico

### 4.1 El estudio (`#estudio`)

1. **Título:** el `h2` pasa a **"Balé Studio"**, sin `<em>`. La etiqueta "El estudio" y el texto `historia` se quedan como están.
2. **Tarjeta de la fundadora:**
   - Hoy es el círculo morado "MF", con una bio vieja y distinta de la que mandó la dueña.
   - Cámbiala por la foto `img/estudio-logo.webp`, el logo de balé en la pared del estudio.
   - Va en el mismo marco de arco, con `srcset` 480/800/1200 como las demás fotos.
   - `alt`: "Logo de balé en la pared del estudio: Barre, Ballet & Pilates".
   - Marifer ya sale en Equipo con su foto y su bio nueva.
3. **Certificaciones:** borra el bloque "Certificaciones de María Fernanda", porque su bio nueva ya las nombra.
4. **Borra lo que deja de usarse:**
   - el bloque `fundadora` de `bale.json`;
   - en `bale.js`, las líneas que llenan `#mfName`, `.founder .role`, `.founder .bio` y `#certs`;
   - el CSS de `.founder`, `.certs` e `.ini.big`, si ya nada lo usa.
5. **"¿Qué es el barre?"** sale de aquí y pasa a Clases (4.2).

### 4.2 Clases (`#clases`)

1. **Etiqueta repetida:** quita "Tipos de clase", que repite el título "Nuestras clases".
2. **Introducción:** debajo del título va un solo párrafo con el texto de `que_es_barre`, tal cual.
   - Quita las píldoras "Fuerza, Resistencia, Estabilidad, Equilibrio, Conciencia corporal": repiten palabras del párrafo.
   - Quita el resto del bloque `.barre`.
3. **Textos de las tarjetas**, en `bale.json` → `clases`. Hoy las dos de barra repiten la misma frase y lo que dice la línea de días.
   - **Hot Barre:** `"texto": ""`. La etiqueta "Ideal para tu primera clase" ya lo dice.
   - **Barre Flex y Barre Flow:** `"texto": ""`. Era la repetición que marcó la dueña; la línea de días "Mar con Lynette · Jue con Marifer" se queda.
   - **Pilates Reformer:** `"texto": "En máquina Reformer, en grupos pequeños de hasta 6 personas."`
   - **Ballet niñas:** sin cambios.
   - En el render, no pintes el `<p>` cuando el texto está vacío.
4. **Fotos de Hot Barre** (`clases[0].fotos`):
   - Primera: `img/hot-barre-barra.webp`, la que ya está, con su `alt`.
   - Segunda: `img/hot-barre-luces.webp`, con `alt` "Alumna de espaldas apoyada en la barra durante una clase de Hot Barre, con luces de colores en el espejo".
   - Borra `bale/img/hot-barre-clase*.webp` (3 archivos): es la foto del cumpleaños.

### 4.3 Nuevo espacio de Reformer (`#reformer`)

1. **Texto** (`reformer.texto`): el de la dueña, tal cual, corrigiendo solo las mayúsculas de "Pilates Reformer":
   > Tenemos una sala de Pilates Reformer. El Pilates Reformer es una modalidad de Pilates que se realiza sobre una máquina especializada llamada Reformer, equipada con resortes, poleas y una plataforma deslizante que permite trabajar todo el cuerpo mediante movimientos controlados. Ven a vivir la experiencia guiada con nuestra instructora Viviana.
2. **Etiqueta:** "Pilates Reformer", sin "· Viernes", porque la línea de datos ya dice el día.
3. **Línea de datos** (`#refMeta` en `bale.js`):
   - Deja "Viernes · 8, 9, 10 y 11 am" y "Cupo: 6 máquinas".
   - Quita "Con Viviana": su texto ya la nombra.
4. **Cupo confirmado (6 máquinas):** en `cupos.nota`, pon `"Pilates Reformer": ""`.
   - Tiene que ser una cadena vacía: si borras la clave, `cupoNota()` devuelve "Cupo por confirmar".
   - Así desaparece "(estimado por fotos, por confirmar)" de la sección y del horario.
5. **Pendientes:** en `pendiente`, la línea del Reformer queda solo como "Cupo de Ballet niñas (la web usa 12)".

### 4.4 Horario y reservas (`#horario`)

1. **Etiqueta repetida:** quita "Reservar", que repite "Horario y reservas".
2. **Quita el bloque "Mensajes automáticos / Así te avisará balé"** (`.msgs`, `#bubbles`).
   - Anuncia recordatorios automáticos que todavía no existen. Eso es parte del sistema que se está hablando aparte con la dueña.
   - Borra también la función `renderBubbles()` de `bale.js` (hacia la línea 526) y **sus 3 llamadas**, hacia las líneas 442, 580 y 794; una de ellas está en el flujo de reserva. Si queda alguna, `$("#bubbles")` será `null` y la reserva se rompe.
   - Borra el CSS de `.msgs`, `.phone`, `.wa-top`, `.bub` y `.wa-note`, incluida la regla de `.msgs` dentro de la consulta de escritorio.
   - El código queda en el historial de git, por si hace falta para la propuesta.

### 4.5 Equipo (`#equipo`)

Quita la etiqueta "Team": repite el título y está en inglés.

### 4.6 Pie de página

Quita los enlaces "Vista del estudio (demo)" y "Panel del negocio" del pie público.
- Las dos páginas siguen funcionando por su dirección (`?vista=estudio` y `panel.html`).
- Anota la dirección del panel en `bale/COMO-ACTUALIZAR.md`.

### 4.7 En el teléfono: página más corta

Hoy, a 390 px, la página mide unos 15,469 px (unas 18 pantallas). Con 4.1–4.6 baja, pero no lo suficiente.

1. Por debajo de 700 px:
   - las tarjetas de **Clases** y las de "momentos" de **Comunidad** van en una fila deslizable (`scroll-snap`);
   - la siguiente tarjeta asoma un 15 % para que se note que se puede deslizar.
2. El evento próximo de Comunidad sigue arriba, visible.
3. Sin JavaScript nuevo y sin scroll horizontal en la página: el desborde queda dentro de la fila.
4. Las flechas del teclado y el foco tienen que poder recorrer las tarjetas.
5. **Objetivo:** la página completa a 390 px, en 11,500 px o menos. Anota en el informe las medidas de antes y después.

---

## 5. Lo que no cambia

- Textos de `historia`, precios, preguntas frecuentes y comunidad.
- El horario oficial.
- La pantalla de "Reserva enviada": a la dueña le gustó.
- La barra de navegación y sus secciones.
- El aviso "Versión de prueba" de arriba.

---

## 6. Portada e imagen para compartir

1. **Copia** `bale/video/*` del paquete encima de los actuales (mismos nombres: no hay que tocar el HTML).
2. **Las nuevas tomas:**
   - Hot Barre con luces, que es también el póster.
   - Barras nuevas.
   - Clase de Pilates Reformer.
   - Arabesque en la barra.
   - Hot Barre en la barra.
   - Mat con el logo.
3. **Copia** `referencia/bale-recursos/video/generar-portada.py` y `fotos-portada.tsv`. Si existe `_insumos/fotos.tsv`, quita de ahí `DSC02552`.
4. **Copia** `bale/img/bale-og.jpg` del paquete encima del actual. Es lo que sale en WhatsApp al compartir el enlace.
   - Lleva: fondo crema, logo, frase en Montserrat, botón fucsia y la foto del arabesque.
   - La de antes llevaba la foto del cumpleaños y la frase en cursiva.
5. **Comprueba** que ningún archivo de `bale/` viene de `DSC02552` ni de la carpeta `cumple maria`.

---

## 7. Panel del negocio y vista del estudio

`bale/panel.html` y la vista `?vista=estudio` usan los mismos tokens: tienen que quedar con la misma paleta y la misma letra.
- Revísalos.
- Cambia también las cursivas de `panel.css`.

---

## 8. Comprobaciones antes de terminar

1. **Capturas "después":** las mismas de "antes" (390 y 1366 px, claro y oscuro), en `referencia/capturas-diseno/despues/`.
   - Haz también una lámina `referencia/capturas-diseno/comparativa.png` con antes y después lado a lado de: portada, estudio, clases, horario y precios a 390 px.
   - Es para enseñársela a la dueña.
2. **Telón:** pruébalo sin `prefers-reduced-motion`. Se ve el telón marrón con el logo crema y la cinta rosada.
3. **Reserva completa** en una clase de barra y en una de Reformer:
   - día → clase → lugar → datos → "Reserva enviada" → enlace de WhatsApp;
   - sin errores en la consola.
4. **Sin 404**, sobre todo de las imágenes borradas (`hot-barre-clase*`).
5. **Contraste AA** en botones, etiquetas y textos pequeños, en claro y en oscuro.
6. **Los dos `grep`** de las secciones 2 y 3 dan 0 resultados, y `grep -rni "recordatorio" bale/` no promete nada que no exista.
7. **Sin scroll horizontal** a 360, 390 y 1366 px.
8. **Altura de la página a 390 px:** antes y después.
9. **Los `alt`** de las fotos nuevas están puestos.

---

## 9. Documentación

1. **`CLAUDE.md`, sección balé.** Cambia la línea de "Identidad" por:
   > **Identidad (pedido de la dueña, 22/10/2026):** una sola letra, Montserrat 400/500/600, sin cursivas. Crema `#F3E4D8`, papel `#FFFAF6`, rosadito `#F7E6E8` y rosa `#F4C5CE`, espresso `#2E2723` para textos. Fucsia `#E0264F`, de sus redes, solo en los botones principales de reservar (token `--cta`), la etiqueta de primera clase, la fecha del evento y la franja del regalo. Marrón `#5A3426` (hover `#46281E`) en todo lo demás que resalta. Nada de morado ni de rosados malva o lila (tono de unos 330°). En modo oscuro, el marrón pasa a rosadito.
   - Actualiza la descripción del telón: terciopelo marrón, logo crema y cinta rosada.
   - Actualiza la de la portada: las 6 tomas nuevas.
   - Actualiza la de reservas: la página ya no muestra la vista previa de los mensajes automáticos.
   - Añade a las reglas: "5. Nada de la carpeta `cumple maria` (cumpleaños de la dueña) ni fotos con hombres."
   - En la regla 3 añade que las fotos de las 4 instructoras actuales están confirmadas por la dueña (23/10/2026).
2. **`README.md`:** la misma identidad, en la línea de balé.
3. **`bale/COMO-ACTUALIZAR.md`:**
   - la dirección del panel, porque ya no está en el pie;
   - los colores nuevos;
   - cómo regenerar la portada con `fotos-portada.tsv`.

---

## 10. Informe final

1. Archivos cambiados, añadidos y borrados.
2. Altura de la página a 390 px, antes y después.
3. Ruta de las capturas y de la comparativa.
4. Lo que tuviste que adaptar porque el código no era como dice este prompt.
5. **Preguntas para la dueña:**
   - Una foto de grupo de Hot Barre en las barras nuevas, con los mats beige, solo con chicas. Hoy no hay ninguna en Drive que cumpla las reglas.
   - Si le gusta la letra única o prefiere los títulos con la letra del logo.
   - El cupo de Ballet niñas.

No hagas commit.
