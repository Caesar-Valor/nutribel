# Informe de correcciones de las clientas (21-10-2026)

Rama `correcciones-clientas`, **sin commit** (mensaje sugerido al final). Todo se hizo según `_insumos/PROMPT-nutribel-bale-v4.md`, más la indicación de César: **el sábado NutriBEL abre de 8:00 am a 4:00 pm**.

## NutriBEL

- **Inicio:** H1 "Nutrición *personalizada* y bienestar *integral*" (con la misma animación por palabras), línea superior "Una experiencia que conecta cuerpo y mente" (`negocio.json → frase`), nuevo texto de "¿Quiénes somos?" y meta description que empieza con "Centro de nutrición de la Dra. Bielka Eusebio en La Vega…".
- **Lema viejo fuera de todo el sitio:** H1, `og:image:alt` de 7 páginas, `prueba-fase1.html` (borrado), ejemplo de `CLAUDE.md` y la imagen `assets/img/og/nutribel-og.jpg`, rehecha a 1200×630 con Playwright (logo, la doctora, texto nuevo y botón "Agenda tu consulta"). También se cambió en `referencia/demo-completo-aprobado.html` (se puso el H1 nuevo) y, en los informes viejos de Lighthouse de `referencia/auditoria-*`, la etiqueta del H1 se sustituyó por "[lema anterior, retirado el 21-10-2026]" sin tocar ninguna cifra.
- **Horario del sábado:** 8:00 am – 4:00 pm en `negocio.json`, en el JSON-LD de `index.html` y `contacto.html` y en la descripción de `contacto.html`. El indicador abierto/cerrado lo toma de ahí.
- **Planes:** texto de entrada nuevo, sin precio en las tarjetas ni en `meta`/`og:description`. `negocio.json → pendiente` deja solo "Precios de bebidas". Los precios del menú de comida no se tocaron.
- **Fotos:** las del menú, planes, pasos 2 y 3 del inicio y local se cambiaron por fotos reales de Drive (tabla abajo). Cada foto del menú y de los planes tiene ahora un `alt` descriptivo (`alt` en `menu.json` y `planes.json`). En contacto se recentró la fachada nueva en su caja vertical.
- **Conexión con balé:** solo el botón "Ir a balé" de la cabecera, que ahora apunta a `bale/`.
- **Probado:** carrito desde el menú, cambio de página, modalidad delivery cercano y envío: abre WhatsApp de NutriBEL con el pedido, RD$75 de delivery y la dirección. Modo oscuro, panel y `data/*.json` siguen funcionando, sin errores de consola.

## balé

- **Página propia en `bale/`**, autónoma (copia mínima de la base en `bale/css/base.css` y `bale/js/core.js`; no carga nada de NutriBEL). `bale.html` de la raíz redirige a `bale/` conservando `?vista=estudio` y el `#ancla`. `serve.json` ya no reescribe `bale`. `canonical`, `og:url`, JSON-LD `ExerciseGym` (con teléfono, Instagram y dirección) y `sitemap.xml` apuntan a `…/nutribel/bale/`.
- **Sin navegación a NutriBEL:** fuera el botón "← NutriBEL", el carrito, el pie y el WhatsApp de NutriBEL. NutriBEL solo aparece en la dirección y en la tarjeta "Balé × NutriBEL" (sin enlace). En la cabecera quedan el logo, el modo oscuro y un botón "Reservar".
- **Datos en `bale/data/`:** `config.json` (WhatsApp +1 849-638-6337, correo de reservas, Instagram, dirección, Maps, pago `POR CONFIRMAR`, cargo de cancelación y aviso por correo), `horario.json`, `precios.json`, `comunidad.json` y `bale.json`. `18097357036` no aparece en `bale/`.
- **Horario nuevo** (18 clases, publicación fijada del 10 de septiembre): sin la instructora que ya no está ni Mat Pilates, con Lynette (Barre Flex, martes). Etiquetas: "Solo nivel avanzado" avisa al reservar; "Exclusiva para miembros" exige confirmar membresía activa (probado: no deja reservar sin marcarla); "Sesión de primera clase" se destaca como "Ideal para tu primera clase". `demo.ocupados` regenerado con los ids nuevos. El `.ics` de Lynette sale bien y no existe ninguno de la instructora que ya no está.
- **Clases:** Hot Barre, Barre Flex y Barre Flow, Pilates Reformer y Ballet niñas (2 a 5 y 6 a 11 años, solo piernas y zapatillas). Mat Pilates desaparece.
- **Nuevo espacio de Reformer:** bloque propio con DSC04893 grande + DSC04871 y DSC04894, texto y botón "Reserva tu Reformer del viernes" (lleva al próximo viernes con el filtro de Reformer). Cupo 6, "estimado por fotos, por confirmar".
- **Precios:** tabla oficial en 3 bloques (individual, membresía, infantil con uniformes y accesorios). "Lo quiero", "Inscribir a mi hija" y "Regalar un paquete" abren WhatsApp de balé con el mensaje pedido; "Reservar" lleva al horario. Certificado de regalo hecho en CSS con el logo. Pago: "Transferencia — datos por confirmar".
- **Cancelación (RD$300):** en la pregunta "¿Cómo cancelo?", en el resumen de la reserva, en el mensaje de WhatsApp, en el correo, en el `.ics` y en los mensajes de ejemplo.
- **Equipo:** tarjetas con espacio de foto como protagonista; por ahora iniciales y "Foto próximamente". Marifer, Lynette, Rusmairy y Viviana Medina Sánchez (con su bio). Fotos preparadas en `bale/img/equipo/<nombre>.webp` (ver `LEEME.txt` y la guía).
- **Comunidad:** `proximos` (Clase temática de Halloween 🎃, martes 27 de octubre, 6:30 pm, RD$600, con WhatsApp; se oculta sola al pasar la fecha) y `momentos` (Girls Day Out, Barre-tini Party con WhatsApp, Río 🐾 y Balé × NutriBEL sin enlace).
- **Reservas (prueba real lista):** al confirmar se abre `wa.me/18496386337` con clase, fecha, hora, instructora, lugar, nombre, teléfono y la línea de RD$300; se envía el aviso por FormSubmit (`_subject` "Nueva reserva · …", `_template: table`, `_captcha: false`) y si falla se avisa con un mensaje amable; "Agregar a mi calendario" descarga el `.ics` (zona America/Santo_Domingo, dirección y política). El bloque de mensajes dice "Vista previa: los recordatorios automáticos llegan en la siguiente fase". Guía de la prueba en `bale/PRUEBA-RESERVA.md`.
- **Sala:** esquema SVG limpio (espejo arriba, 2 filas × 8 lugares, `POR CONFIRMAR`) junto a la foto de las barras nuevas (DSC04941). Ballet niñas y Reformer: solo cupo.
- **Portada:** videos horizontal (1,4 MB) y vertical (1,3 MB) regenerados con las 6 fotos indicadas, con pósters WebP y JPG en `bale/video/`. Imagen para compartir nueva `bale/img/bale-og.jpg` con DSC02552.
- **Probado en el navegador** (Playwright): reserva completa de Hot Barre del sábado hasta abrir WhatsApp (mensaje revisado), correo simulado (ver abajo), `.ics` de la clienta y de Lynette, clase de miembros bloqueada sin confirmar, redirección de `bale.html?vista=estudio` y vista del estudio. Sin errores de consola. Sin scroll horizontal a 390 px.

## Añadido después: panel del negocio de balé

A pedido de César, `bale/panel.html` (enlace «Panel del negocio» al pie de balé, dentro de `bale/` para que siga autónoma). Igual que el de NutriBEL, es una demo que guarda en el navegador (`bale-panel`) y la página aplica los cambios al momento:

- Datos de contacto: WhatsApp, Instagram, dirección, enlace de Maps y correo o alias de FormSubmit.
- Aviso para las clientas: franja arriba de la página (por ejemplo, un feriado).
- Cancelar una clase en una fecha concreta: sale «Cancelada» y no se puede reservar (también en la vista del estudio).
- Cupos y sala: máquinas de Reformer, cupo de Ballet niñas, filas y lugares por fila. Un cupo puesto ahí deja de decir «por confirmar».
- Precios de toda la tabla oficial.
- Próximos eventos: agregar, editar o quitar (si no se escribe el mensaje de WhatsApp, se genera solo).
- **Descargar archivos para publicar:** genera `config.json`, `precios.json`, `comunidad.json` y `bale.json` ya actualizados para reemplazarlos en `bale/data/` y publicar; así los cambios del panel llegan a todas las clientas. «Restaurar los datos publicados» borra los cambios guardados.

Probado en el navegador: aviso, cancelación, cupo, precio y evento nuevo se ven en la página pública; las 4 descargas tienen los cambios; restaurar los quita; la reserva sigue funcionando igual. Sin errores de consola. Falta lo mismo que en NutriBEL para producción: contraseña y guardar en un servidor.

## Tabla de imágenes

| Uso | Antes | Después | Motivo | ID de Drive |
|---|---|---|---|---|
| Wraps | genérica de internet | DSC04815 | foto real | `1-SU36B-ZXnN1i1s7cf-w4W_Y2-dFuJ5s` |
| Poder Dominicano | hummus | PODER DOMINICANO-6 | era otro plato | `1MofLn1Ur9i6fXZwZJ8va14cjuhxOojNu` |
| Quesadilla | sin foto | DSC04919 | foto real | `1e_b1qhZUvdgFQAfvL2AwGvANbjNFgtSX` |
| Nutriavena | sin foto | AVENA 1-5 | foto real | `17iU23wOqhSARFWZtj4VPevF3TogAmj68` |
| Montaditos | sin foto | TOSTADA-1 (salado) | foto real | `1qdacWJuwdtuziW0a9ktX024tVIeuL1ww` |
| Huevos rancheros | shakshuka | DSC00119 | era otro plato | `1hiOsfwHf7G_QccxEA-xnhkSHfZE9pWN1` |
| Bomba de huevo | sin foto | BOMBA DE HUEVO-4 | foto real | `1C4K30JgvJW0xwzQAmR2u54eOdlCuvmxe` |
| Waffles / pancakes | genérica | DSC04760 | foto real | `1diOqAodoCMNX7iK9UOAtCq8mexVzXkL3` |
| Rollo de huevos | sin foto | ROLLOS DE HUEVO-1 | foto real | `1LsNXjFHdvksB5aoEKyBMZB6bqTavYniU` |
| Pasta Tomatina | sin foto | NUTRIPASTAS verde | foto real | `1174WAVAtz2ErHZAjo4X0njky5EpOKlOa` |
| Pasta pesto | ensalada de farfalle | DSC00093 | era otro plato | `1ZCsq5u9-4PxP8mHPfTtuazJMlWZvbR9D` |
| Pasta Zuchinie | sin foto | NUTRIPASTAS morado | foto real | `14YJQJMU0gb_Mp7nzOKik5bdImQ9x5FYF` |
| Patacón maduro | sin foto | PATACONFIT-3 | foto real | `1qkdfJUVcMEEtUrGoUmnEpkCZiUszbd4q` |
| Dominicanísimo | sin foto | ARROZ HABICHUELA 1-02 | foto real | `1xZsTz3nMs0OHn7XSWKe8Gf6W-FejNtai` |
| Canasta de plátano maduro | sin foto | DSC04783 | foto real | `1PAfc7uz1X3mqQUlO9A1g9tURVyOpvXT8` |
| Nutriovalado | sin foto | OVALO-3 | foto real | `1Ty1eHaTsrWRCWPR1EmNuZ9-yloRVpd7Q` |
| Bowl Bel | sin foto | BOWLBEL-1 | foto real | `1w2ME9pKw38JUF6LdMPm7X5NAg1W9hpTu` |
| Nutriesfera | bola verde con ajonjolí | recorte de la story | era otra bola | `1KHpZISxncLLPLFWkLUIwxmRjnXlj5V5-` |
| Sopas y cremas | genérica | Sopas Shoot #1 (sancocho) | foto real | `1CDBnCJ0jLOWNWJZ-Fqd-awP4rxAi5WTX` |
| Taco salad | genérica | NACHOS-2 | foto real | `1vcqbZyq_NrX4hCVmjlDhZL14cyumznqX` |
| Bowl de ensaladas | genérica | GRANOS-2 | foto real | `1ms5rjjegGxMiT3Q6XUWhWqzTg1JonxEz` |
| Bowl salmón | sin foto | ENSALADAS BOWLS/SALMON | foto real | `1MmeAtkNlhX-tvxv5IgBHsAngAoSX6S6M` |
| Ensalada con crotones | sin foto | ENSALADA CESAR-1 | foto real | `14R4GYNLDoG_eM1SYgPHM-kcpRaj-y3FJ` |
| Nutriempanadas | anterior | EMPANADAS MULTI | foto de la sesión | `13osl0NMLA2UDYeK37aXimksGKMpQPZvX` |
| Nutrihamburguesa | anterior | NUTRIHAMBURGUESA-3 | foto de la sesión | `11B5iBT4KWezQtvyiT9pQZKCNNW2-CKpA` |
| Pizzana | genérica | PIZZA-3 | foto real (**confirmar**) | `1zgC2eQMtdmxmDA_UsukN7mWYDd2WAgFQ` |
| NutriShot (bebida) | Adobe Stock | DSC04811 | stock | `15-frS-2yq_RSI4UB_7IW2kZi3y5hGVw6` |
| Shot activador | sin foto | Kit Detox V1-4 | foto real | `1FCVJlj00Q0mNMEGdppV8y62sG6jpgN1C` |
| Verde que te quiero verde | stock | foto que estaba en el plan R3 | eran esas botellas | — (copia local) |
| Verde | sin foto | PRENSADOS-15 | foto real | `1MW4ecRfzhGGORmzLby43gJ658pMP5qpb` |
| Zana | stock | PRENSADOS-11 | stock | `1QHJQgK4DwXc29JkOipv8w2XutUcgwUmO` |
| 3 en 1 | sin foto | PRENSADOS-12 | foto real | `1_Dh0LaICL4BxWEHCT3AiIkmxCGLcMw4K` |
| Prensados tropicales | anterior | PRENSADOS-16 (piña) | foto de la sesión | `1zbQk36qZT7jOm1yvpTn1uaqL_JIURUuP` |
| Jugos potencializados | anterior | DSC09991 (Bluebel) | foto de la sesión | `17O5LDFg_YnMkSXwoTd6q68qhGOftyvO4` |
| Té verde | stock | DSC05022 (matcha) | stock | `1tvUe4gT_0aARVeoswaQRODOnml89Z-Bc` |
| Pastel BBQ, Yogurtbel, Defenshot, Té rojo, Tisana | stock / producto equivocado | sin foto | no hay foto real | — |
| Reto 21 días | stock | bolsas NutriBEL | no encajaba | `1wHyqv0V0_XbDuUKYpnlFwNMQ0yBZtgI3` |
| Kit Detox | anterior | foto profesional del kit | — | `1r-TL8iZ99uIHh9hbJxKa6pPvzH1vyHbk` |
| NutriBEL R3 | "Verde que te quiero verde" | botellas nu·tri·bel | estaba mal puesta | `13eoQ2ERVDwfWFxuoFwT0lC1UPP3SwGPN` |
| NutriBEL al trabajo | stock | torre de bowls | no encajaba | `1O-5xe9V0Grsw7Yxy_-789Yi5MUkleVJm` |
| Planes semanales | misma que Reto 21 días | quinoa tricolor | foto repetida | `1tI5STnh1Limi0AQpnFzxk7PFG1MjKcPg` |
| 7 días de bienestar | stock | fila de jugos | no encajaba | `1n6UMkqd1cOHAl0uhshxoLjwUXbGGu3-o` |
| Sin pareo pa' la playa | stock (bikini) | bowl capresa | no encajaba | `1x-0RineLiWX2TSFFXvNN7OSqPL-JBLDP` |
| Verano Fit | stock (bikini) | galón de jugo verde | no encajaba | `1sZbfkm7WSChzGlKEbV4W83azqN2yzHFd` |
| Rumbo a Navidad | stock | quinoa con pollo | no encajaba | `1I8pD5pxR110oPWb1s5t3LtiWJ8ubi9ro` |
| Paso 2 (inicio) | stock doctora + chef | Chef Joel Luna | gente genérica | `14JRs4EP4eolV2EPyutIouiDAourdx7Kl` |
| Paso 3 (inicio) | stock | bolsa NutriBEL en la mano | gente genérica | `1ogz_xWX9_W0Z0NBY_ji6XTKx-OWZ_0_S` |
| Fachada | parecía un render | foto real | — | `1YezYGAlB51uBKzlZnxvFidS9gei-tO3D` |
| Interior | anterior | salón con estantería iluminada | — | `18wu5aJXykRmlWkibydLUGCvH9ck7u_Kv` |
| balé · Hot Barre | hot-barre-1/3 (mats negros/verdes) | DSC02552 y DSC09385 | regla de los mats | `1eQWdU3BDepEHMM7eAzDdUHKSMxvQPY8K`, `1hc6ZsoEhuZKM-ScVZRcR65rGgsWS39Qj` |
| balé · Barre Flex/Flow | barre-entrenamiento | DSC04941 y DSC09187 | barras nuevas | `170pm9p8TYvtphN-4t8R62NOFG_x8Wro-`, `13rsVCd-8rvqrh8TB7Y_9DsqWcUSsOyjn` |
| balé · Reformer | sin foto | DSC04893, DSC04871, DSC04894 | sala nueva | `1VRCWgMmPcZ1xLH5zDGz9iy20HRcj9b7r`, `1OdVLsLI2ef5Zjft7KWl_-0-3JqtzoSA5`, `1GeRy2Z0t2mq6b8f5tBeBIbI_NWVohCBb` |
| balé · Ballet niñas | zapatillas 1/2 | DSC05051 y DSC05052 (solo piernas) | mismas tomas, versión original | `1PEoianGVNS0drwVAABmeiZGYtpVxa9JQ`, `1JEhcjAspz98FtwiXi2WaUvUzxUkJoU0d` |
| balé · Mat Pilates | mat-pilates-1/4 | (tarjeta eliminada) | clase eliminada y mats prohibidos | — |
| balé · Girls Day Out | póster | DSC00370 | foto del evento | `1T2Tn_vR1eUeEj7H2_PS1vDKC3xQLWu5l` |
| balé · Barre-tini Party | — | DSC02492 | nuevo | `1GOW8uXFVYf78fbQ2_IK4SjqEipYzAeqW` |
| balé · Río | — | DSC04848 | nuevo | `1pRL0YlEnFdhm_sMK4WgQDh3mmDQM_aYQ` |
| balé · Mapa de la sala | sala-barras (barras viejas) | esquema SVG + DSC04941 | cambiaron las barras | `170pm9p8TYvtphN-4t8R62NOFG_x8Wro-` |
| balé · Portada (video) | hot-barre/mat-pilates | DSC02552, DSC04941, DSC04893, DSC09187, DSC09385, DSC04819 | regla de los mats | + `15vXF7sQKbjkQVWC_ktK1pxluNnEJoz4Z` |
| balé · Imagen para compartir | bale-og viejo (mats) | DSC02552 | regla de los mats | `1eQWdU3BDepEHMM7eAzDdUHKSMxvQPY8K` |

Registro foto por foto (decisión y motivo, revisión de caras de niñas y de mats): `_insumos/revision-fotos.md`.

## Limpieza

- Borrados: `prueba-fase1.html`, `bale-demo-recursos-v2/`, `bale-demo-recursos.zip`, `assets/img/extra/`, `assets/img/local/fachada-completa*` y `horario-nutribel*`, `assets/img/bale/` (todo, incluidas las fotos con mats y `bale-horario.png`), `assets/video/bale/`, `assets/img/og/bale-og.jpg`, la versión vieja de balé (`data/bale.json`, `js/bale.js`, `css/bale.css`), las imágenes de stock retiradas del menú y los `.jpg` sin uso de pasos 2 y 3 y del local (eran las fotos viejas).
- `referencia/bale-recursos/`: horario actualizado; borrados `PROMPT.md` (nombraba a la instructora que ya no está), `referencias/horario-oficial.jpg` (horario viejo con la instructora que ya no está en la imagen), `datos/sala.json` (barras viejas), las fotos `hot-barre-*`, `mat-pilates-*`, `ballet-ninas-zapatillas-3` y `sala-barras` y los videos viejos. `generar-portada.py` usa las fotos nuevas. "Mat Pilates" de la certificación de Marifer se escribe "Pilates Mat" (en `historia.md` y en la web) para que Mat Pilates solo aparezca en la membresía ilimitada.
- `referencia/auditoria-*`: borradas las capturas y los informes Lighthouse viejos de balé (mostraban a la instructora que ya no está y la portada con mats); sus cifras siguen en `comparativa-3-pasadas.txt` e `INFORME.md`.
- `CLAUDE.md` y `README.md` reescritos en la parte de balé; ejemplo de tipografía actualizado.
- `.mcp.json` conserva la clave de ejemplo `TU_CLAVE`. **La clave real nunca se sube al repositorio.**
- `_insumos/` agregado a `.gitignore`.

## Revisión final

- `grep -ri` del nombre de la instructora que ya no está (sin `.git`, `node_modules` ni `_insumos/`): **0**. `come rico`: **0**. `Precio por definir`: **0**. `18097357036` en `bale/`: **0**. ("_insumos/" sí los contiene, porque guarda el prompt original; está ignorado por git.)
- "Mat Pilates" en la web: solo en el texto de la membresía ilimitada (además de `CLAUDE.md` y `README.md`, que explican esa regla).
- Capturas a 390 y 1366 px de `/`, `/menu.html`, `/planes.html`, `/contacto.html` y `/bale/` en `referencia/capturas-final/` (tomadas con movimiento reducido para que no salgan animaciones a medio camino). Corregido tras mirarlas: etiquetas repetidas en la tarjeta de Hot Barre, nota de cupo duplicada, tarjetas de clases 3+1, cinta del certificado sobre el texto, ubicación estrecha en escritorio, tarjetas del equipo enormes en el teléfono, fachada mal centrada en contacto y el aviso de correo que se partía palabra por palabra (choque de nombres de clase CSS).
- Fotos publicadas de balé: ninguna cara de niña, ningún mat negro, verde ni marrón. Fotos del menú: cada una coincide con su plato.

### Lighthouse (móvil, 3 pasadas, servidor local `npx serve`)

| Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP |
|---|---|---|---|---|---|
| `/` | 74 / 75 / 75 | 100 | 100 | 100 | 4,4–4,6 s |
| `/bale/` | 87 / 87 / 87 | 100 | 100 | 100 | 2,9–3,0 s |

El rendimiento del inicio **no bajó por estos cambios**: medí la versión anterior (último commit) en las mismas condiciones y da 74 (FCP 4,0 s). La diferencia con el 99 del informe anterior es el entorno (aquel se midió en otro servidor local); el FCP lo frenan las fuentes de Google bajo 4G simulado.

## Preguntas para la doctora

- ~~Horario del sábado~~ **Resuelto:** César confirmó 8:00 am – 4:00 pm (ya está en la web).
- ¿Es **Pizzana** la pizza de la sesión de marzo (carpeta "PIZZA")?
- El **taco de camarón** de octubre (`1baoH2NJh7bCsjygksnwv0ByXa0ApjEQz`), ¿es el Trío de tacos? (no se usó)
- El **sándwich en pan plano** con aguacate y papas de octubre (DSC04860–04864), ¿qué plato es? (no se usó)
- ¿Las fotos de la **fritaca** son suyas? (se conservó la actual)
- **Fotos que faltan:** Yogurtbel (la real está en su Instagram: si César la deja en `_insumos/extra/yogurtbel.jpg`, se usa), Pastel BBQ, Sándwiches, Pita, Pasta keto, Brócolibel, Brochetas, Defenshot, Té rojo, Tisana, Trío de tacos, Nutrialmuerzo, Reto Mamitas en forma, y la consulta y el seguimiento (pasos 1 y 4 del inicio, que siguen con fotos de stock).

## Preguntas para la dueña de balé

- ¿Cuántos **lugares** hay con las barras nuevas? (la web usa 2 filas de 8 = 16)
- ¿Cuántas **máquinas de Reformer** hay? (la web usa 6, contadas en las fotos) ¿Y el cupo de **ballet niñas**? (la web usa 12)
- **Fotos del equipo** y confirmar quién es quién en `_insumos/equipo-por-confirmar.jpg` (1: ¿Marifer?; 2: ¿Rusmairy?; 3: ¿Viviana?).
- **Datos bancarios** para las transferencias.
- "¿Qué llevo?": ¿las **medias antideslizantes** son obligatorias?
- **Más fotos con el mat de balé** de clases de Hot Barre.
- **Aviso:** su flyer de Instagram dice 3–5 y 6–10 años; la web usa 2–5 y 6–11, como ella escribió.
- **Correo:** activar FormSubmit en el primer correo que le llegue (ver `bale/PRUEBA-RESERVA.md`).

## Decisiones tomadas y lo que no se pudo hacer

- **Correo de reservas:** en las pruebas locales intercepté el envío a FormSubmit (respuesta simulada) para no mandarle a la dueña un correo de activación sin avisar. El envío real queda por probar en la URL publicada, siguiendo `bale/PRUEBA-RESERVA.md`. No se pudo probar en la URL publicada porque no se hizo commit ni push.
- **`serve` en local:** sin una regla propia, `npx serve` mostraba la lista de archivos de `bale/` en vez de la página. Arreglado en `serve.json` (regla `/bale`, sin barra final, que es la que funciona en Windows) y con una línea en `bale/index.html` que añade la barra si se entra por `/bale`. Probado: `/bale/`, `/bale`, `/bale.html`, `/bale.html?vista=estudio` y el botón "Ir a balé" cargan la página. En GitHub Pages `bale/` funciona sin nada de esto.
- **"Plaza NutriBEL" en Girls Day Out:** el prompt lo pedía, pero la regla 4.1 dice que NutriBEL solo aparece en dos lugares. Ganó la regla: el momento dice "29 de agosto" y "pilates al aire libre". Si la dueña quiere el nombre del lugar, es una línea en `comunidad.json`.
- **Video de la clase real `hotbarre.(1).mov` (opcional):** no se usó. El video de fotos ya cumple los requisitos (< 3 MB, sin mats prohibidos) y el de la clase habría que revisarlo tramo a tramo por los mats y el texto sobreimpreso.
- **Foto opcional DSC04904** (jugo sobre el Reformer): no se usó, para no recargar el bloque.
- **Nutriesfera:** el recorte de la story es de celular; se exporta a 1000 px sin ampliar y se ve nítido.
- **Montaditos, Dominicanísimo y botellas de jugo:** el 16:10 no deja ver el plato o la botella completos (fotos verticales); se centró lo esencial (huevo, etiqueta del jugo).
- **Equipo:** sin fotos publicadas hasta confirmar; las cinco candidatas están solo en `_insumos/equipo-por-confirmar.jpg`.
- **Clase de miembros:** la página no puede verificar la membresía; pide una confirmación (casilla) y el estudio la valida por WhatsApp.

## Mensaje de commit sugerido (no se hizo el commit)

```
Correcciones de las clientas: fotos reales, textos nuevos y balé en bale/

NutriBEL
- Inicio: H1 "Nutrición personalizada y bienestar integral", nueva línea,
  nuevo "¿Quiénes somos?" y meta description; fuera el lema viejo (también
  en og:image:alt y en la imagen para compartir, rehecha)
- Sábado de 8:00 am a 4:00 pm
- Planes sin precios y con texto nuevo
- Fotos reales de Drive para menú, bebidas, planes, pasos y local; fuera las
  de stock y las de otros platos; alt descriptivo por foto

balé
- Página autónoma en bale/ (bale.html redirige) sin navegación a NutriBEL
- WhatsApp, correo e Instagram propios en bale/data/config.json
- Horario oficial nuevo con etiquetas; sin Mat Pilates
- Reservas: WhatsApp completo, aviso por correo (FormSubmit) y .ics
- Precios oficiales, certificado de regalo, cargo de cancelación RD$300
- Bloque "Nuevo espacio de Reformer", esquema SVG de la sala, comunidad
  con eventos que vencen solos, equipo listo para fotos
- Fotos y video de portada nuevos: sin caras de niñas ni mats prohibidos

Limpieza de archivos viejos, CLAUDE.md y README.md actualizados.
```
