# NutriBEL — web multipágina

Web de NutriBEL (La Vega, RD): clínica de nutrición de la Dra. Bielka Eusebio y restaurante saludable. En la carpeta `bale/` vive la página de balé (Barre, Ballet & Pilates), autónoma. HTML, CSS y JS sin frameworks ni compilación.

## Probar en local

El contenido se carga desde `data/*.json` con `fetch`, así que **no funciona abriendo el archivo con doble clic**. Usa un servidor local desde la carpeta del proyecto:

```bash
npx serve .
```

y abre la dirección que indique (normalmente http://localhost:3000). También sirve la extensión Live Server de VS Code. `serve.json` desactiva las "URL limpias" de `serve` y reescribe `/` a `index.html` y `/consulta`, `/menu`, etc. a su `.html`. También reescribe `/bale` a `bale/index.html` (sin esa regla, `serve` muestra la lista de archivos de la carpeta); la regla va sin barra final porque con `/bale/` no funciona en Windows. Si se entra por `/bale` sin barra, `bale/index.html` añade la barra para que carguen bien sus rutas relativas. GitHub Pages sirve `bale/` sin necesidad de nada de esto. Si cambias `serve.json`, reinicia `serve` (y comprueba que no quede otro `serve` viejo ocupando el puerto 3000: si lo hay, el nuevo arranca en otro puerto).

## Estructura

```
*.html            una página por módulo de NutriBEL (index, metodo, menu, servicios, planes, consulta, contacto, panel)
bale.html         redirección a bale/ (conserva ?vista=estudio y el #ancla)
bale/             página de balé, autónoma (ver más abajo y bale/COMO-ACTUALIZAR.md)
css/base.css      tokens claro/oscuro, tipografía, cabecera, navegación, botones, bandas, tarjetas, carrito
css/<pagina>.css  estilos propios de cada página
js/common.js      cabecera y navegación, modo oscuro, horario, WhatsApp, carrito compartido (API global NB)
js/<pagina>.js    lógica de cada página
js/motion.js      microinteracciones (módulo ES): entradas al hacer scroll, hover/toque, plato que vuela al pedido
js/vendor/motion.mjs  Motion 14 para JS puro (animate, inView, scroll) empaquetado en un solo archivo
design-system/    decisiones del sistema de diseño (los tokens viven en css/base.css)
sitemap.xml, robots.txt  SEO (URL base: https://caesar-valor.github.io/nutribel/)
laboratorio/      pruebas aisladas que no se enlazan desde la web
data/*.json       contenido de NutriBEL (lo que falta confirmar está en la lista "pendiente")
assets/img/       imágenes de NutriBEL
referencia/       demo aprobado, bocetos, recursos de balé y capturas (no se enlaza desde la web)
```

Cada página de NutriBEL lleva `<body data-page="id">`, un `<header class="top" id="cabecera"></header>` vacío que rellena `common.js`, y en el `<head>` un script de una línea que aplica el modo oscuro antes de pintar.

## Sistema de diseño y animación

Los tokens (tipografía, espaciado, radios, sombras, duraciones y curvas) están en el `:root` de `css/base.css`. `design-system/nutribel/MASTER.md` explica cada decisión. `js/motion.js` lee esas variables para que CSS y JavaScript animen con las mismas duraciones. Con `prefers-reduced-motion` no se anima nada.

`js/vendor/motion.mjs` se generó una sola vez con esbuild a partir del paquete `motion` (`npm i`). La web no necesita compilación. Para actualizarlo, ejecuta en una carpeta aparte:

```bash
echo 'export { animate, inView, scroll } from "motion";' > entry.mjs
npx esbuild entry.mjs --bundle --format=esm --minify --outfile=js/vendor/motion.mjs
```

Las fotos de platos, bebidas, planes y local tienen variantes `-480.webp` y `-800.webp` para `srcset` (`NB.srcset()` en `common.js`). Las de balé, igual, con `BALE.srcset()` en `bale/js/core.js`.

## Fotos

Todas las fotos de platos, bebidas, planes, pasos y local vienen de las sesiones de Drive de NutriBEL, revisadas una por una (registro en `_insumos/revision-fotos.md`, que no se sube). **Regla:** nunca se usa la foto de otro plato ni de stock para un plato del menú; si no hay foto real, el plato va sin foto. Cada foto del menú lleva un `alt` descriptivo en `data/menu.json` (campo `alt`).

## SEO

Cada página lleva título, descripción, `canonical`, Open Graph (imágenes en `assets/img/og/` y `bale/img/bale-og.jpg`) y Twitter Card. `index.html` y `contacto.html` incluyen datos estructurados `Restaurant` + `MedicalClinic` (dirección, horario, teléfono, Instagram), y `bale/index.html` incluye `ExerciseGym` (teléfono, Instagram y dirección de balé). **Si cambia el dominio**, actualiza la URL base en esas etiquetas, en `sitemap.xml` y en `robots.txt`. `robots.txt` solo lo leen los buscadores en la raíz del dominio, así que en `usuario.github.io/nutribel/` no tiene efecto hasta que haya un dominio propio. Si cambian el horario o el WhatsApp desde el panel, el JSON-LD no se actualiza solo: hay que editarlo.

La imagen para compartir de NutriBEL (`assets/img/og/nutribel-og.jpg`, 1200×630) se genera con Playwright desde una plantilla HTML (logo, la doctora, "Nutrición personalizada y bienestar integral" y el botón "Agenda tu consulta").

## Datos guardados en el navegador

| Clave | Contenido |
|---|---|
| `nutribel-mode` | `dark` o `light` |
| `nutribel-pedido` | productos del pedido y modalidad de entrega (sin nombre, dirección ni notas) |
| `nutribel-panel` | cambios del panel demo: agotados, etiquetas, info nutricional, plato de la semana, datos del negocio |
| `bale-mode` | modo oscuro de balé |
| `bale-panel` | cambios del panel de balé: datos de contacto, aviso, clases canceladas, cupos, sala, precios y próximos eventos (solo lo que difiere de los JSON) |
| `bale-reservas` | reservas hechas en ese navegador (clase, fecha, lugar, nombre, WhatsApp, niña y tutor), lista de espera y pagos aprobados de la vista del estudio |

Las claves de balé llevan el prefijo `bale-` porque comparten origen con todo `caesar-valor.github.io`. Nunca se guardan ni se envían datos de salud desde la web.

## Panel del negocio (demo)

`panel.html` (enlace en el pie de todas las páginas de NutriBEL) permite cambiar el WhatsApp, la dirección y el enlace de Google Maps, el Nutrialmuerzo de la semana y, por plato, la información nutricional, las etiquetas y "Agotado hoy". Los cambios se guardan solo en ese navegador; en producción harían falta una base de datos y un acceso con contraseña.

## balé (`bale/`)

Página propia y **autónoma**: tiene su copia mínima de la base (`bale/css/base.css`, `bale/js/core.js`) y no carga nada de NutriBEL, así que la carpeta `bale/` se puede copiar tal cual a otro dominio (por ejemplo `bale.com.do`). La dueña pidió que no haya navegación hacia NutriBEL para que sus clientas no se confundan: **NutriBEL solo aparece en la dirección ("En el edificio de NutriBEL") y en la tarjeta "Balé × NutriBEL" de Comunidad, sin enlace.** En NutriBEL, la única conexión es el botón "Ir a balé" de la cabecera, que lleva a `bale/`.

```
bale/index.html          la página (telón de entrada, modo oscuro, ?vista=estudio)
bale/panel.html          panel del negocio de balé (demo, sin enlace: se entra por su dirección)
bale/css/base.css        tokens, modo oscuro, formularios, aviso emergente
bale/css/bale.css        estilos de balé
bale/js/core.js          datos, WhatsApp de balé, modo oscuro (API global BALE)
bale/js/bale.js          página pública, reservas y vista del estudio
bale/js/panel.js         panel del negocio
bale/css/panel.css       estilos del panel
bale/data/config.json    WhatsApp, correo de reservas, Instagram, dirección, Maps, pago, cancelación, aviso por correo
bale/data/horario.json   horario oficial (18 clases) con etiquetas
bale/data/precios.json   clase individual, membresías, clase infantil, uniformes, certificado de regalo
bale/data/comunidad.json próximos eventos (con fecha) y momentos (siempre visibles)
bale/data/bale.json      textos, clases, Reformer, instructoras, sala, cupos, preguntas, datos de ejemplo
bale/img/, bale/video/   fotos, logo, favicon, imagen para compartir y videos de portada
bale/COMO-ACTUALIZAR.md  guía sencilla para cambiar horario, precios, eventos y fotos del equipo
bale/PRUEBA-RESERVA.md   cómo hacer la prueba de reserva con la dueña y qué es real y qué es demo
```

**Identidad:** una sola letra, Montserrat 400/500/600, sin cursivas. Crema `#F3E4D8`, papel `#FFFAF6`, rosadito `#F7E6E8` y rosa `#F4C5CE`, espresso `#2E2723` para textos. Fucsia `#E0264F`, de sus redes, solo en los botones principales de reservar (token `--cta`), la etiqueta de primera clase, la fecha del evento y la franja del regalo. Marrón `#5A3426` (hover `#46281E`) en todo lo demás que resalta. Nada de morado ni de rosados malva o lila (tono de unos 330°). En modo oscuro, el marrón pasa a rosadito. Telón de entrada (terciopelo marrón, logo crema y cinta rosada) que se salta con un clic o una tecla y no aparece con movimiento reducido; todas las animaciones terminan.

**Contacto (data/config.json):** WhatsApp +1 849-638-6337 (`wa.me/18496386337`, el de la bio de Instagram), Instagram @balestudio.rd, correo de reservas de la dueña, dirección C. José Horacio Rodríguez #30, frente al Country Club, La Vega. El número de NutriBEL no aparece en `bale/`.

**Horario (data/horario.json):** el oficial de la publicación fijada del Instagram de balé (10 de septiembre de 2026), 18 clases con Marifer (María Fernanda Pimentel), Lynette, Rusmairy y Viviana. Etiquetas: `avanzado` ("Solo nivel avanzado": aviso al reservar), `miembros` ("Exclusiva para miembros": pide confirmar membresía activa) y `primera` ("Sesión de primera clase": se destaca como "Ideal para tu primera clase"). Ballet niñas en dos grupos: 2 a 5 y 6 a 11 años, con Rusmairy. Ya no hay Mat Pilates en el horario.

**Reservas:** las clases de barra muestran un esquema SVG de la sala (espejo arriba, `sala.filas` × `sala.por_fila`, hoy 2 × 8 por confirmar) junto a la foto de las barras nuevas; Pilates Reformer y Ballet niñas usan cupo por número (`cupos`). Al confirmar: (1) se abre WhatsApp de balé con la reserva completa y la línea del cargo de RD$300 por cancelación el mismo día, (2) se avisa al estudio por correo con FormSubmit y (3) se ofrece "Agregar a mi calendario" (`.ics` con zona America/Santo_Domingo, dirección y política). Los recordatorios automáticos, la lista de espera y los cupos compartidos entre teléfonos todavía son demo: ver `bale/PRUEBA-RESERVA.md`.

**Precios (data/precios.json):** tabla oficial en tres bloques (clase individual, con membresía y clase infantil con uniformes y accesorios), más el certificado de regalo. "Lo quiero", "Inscribir a mi hija" y "Regalar un paquete" abren WhatsApp de balé con el mensaje escrito; "Reservar" lleva al horario. Pago: transferencia, datos por confirmar.

**Panel del negocio (`bale/panel.html`, sin enlace en la página: se entra por su dirección):** como el de NutriBEL, guarda en el navegador y la página lo aplica al momento. Permite cambiar WhatsApp, Instagram, dirección, enlace de Maps y correo (o alias de FormSubmit); poner un aviso para las clientas (franja arriba de la página); cancelar una clase en una fecha concreta (sale "Cancelada" y no se puede reservar); ajustar las máquinas de Reformer, el cupo de Ballet niñas y la sala (filas × lugares); cambiar cada precio, y agregar, editar o quitar próximos eventos. Solo guarda lo que difiere de los JSON publicados. **"Descargar archivos para publicar"** genera `config.json`, `precios.json`, `comunidad.json` y `bale.json` ya actualizados: se reemplazan en `bale/data/` y se publican para que todas las clientas vean los cambios. "Restaurar los datos publicados" borra los cambios del panel. Un cupo confirmado desde el panel deja de mostrarse como "por confirmar". En producción haría falta un acceso con contraseña y guardar en un servidor.

**Vista del estudio (`bale/?vista=estudio`, sin enlace: se entra por su dirección):** reservas por clase con el esquema de la sala, clientes, pagos por aprobar y calendario `.ics` por instructora. Usa datos de ejemplo (`demo`) más las reservas de ese navegador.

**Portada:** videos de 15 s (vertical y horizontal, < 3 MB) generados con `referencia/bale-recursos/video/generar-portada.py` a partir de seis fotos de Drive (Hot Barre con luces, también póster; barras nuevas; clase de Pilates Reformer; arabesque en la barra; Hot Barre en la barra y mat con el logo; IDs en `fotos-portada.tsv`). Nada de la carpeta `cumple maria` ni fotos con hombres. Muted, en bucle, con póster y sin reproducirse con movimiento reducido.

**Reglas de balé:**
- Nunca caras de niñas: de ballet infantil solo piernas, medias, zapatillas y piso.
- Solo el mat beige con el logo de balé: ninguna foto con mats negros, verdes ni marrones.
- Las fotos del equipo no se publican con nombre hasta que la dueña confirme quién es quién; mientras tanto, iniciales.
- No se inventan datos: lo que falta va como `POR CONFIRMAR`.

## Pendiente de confirmar con el cliente

- NutriBEL: enlace exacto de Google Maps, precios de las bebidas, etiquetas keto / sin gluten / ligero / alto en proteína e información nutricional (desde el panel), fotos reales de varios platos y de los pasos 1 y 4. Detalle en `INFORME-correcciones.md`.
- balé (`bale/data/bale.json` → `pendiente`): lugares con las barras nuevas, máquinas de Reformer y cupo de ballet, fotos del equipo, datos bancarios, si las medias antideslizantes son obligatorias y más fotos de Hot Barre con el mat beige.

## Publicar en GitHub Pages

Sube el repositorio y activa Pages en *Settings → Pages → Deploy from a branch* (rama `main`, carpeta raíz). No hace falta compilar nada: todas las rutas son relativas. La carpeta `_insumos/` (descargas de Drive y scripts de trabajo) está en `.gitignore`.
