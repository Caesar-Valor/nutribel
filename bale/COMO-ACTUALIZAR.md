# Cómo actualizar la página de balé

## El sitio se compila (desde noviembre de 2026)

Desde el rediseño, balé tiene varias páginas: `index.html` (inicio), `clases.html`, `reservar.html`, `precios.html`, `nosotras.html` (El estudio), `comunidad.html`, `cuenta.html` (Mi cuenta), `preguntas.html`, `mi-reserva.html`, `privacidad.html` y `404.html`. **No se editan a mano**: salen de

- `bale/_fuente/paginas/*.html` (el texto de cada página, con una cabecera `<!--@ {…} @-->` con su título y descripción),
- `bale/_fuente/parciales/` (lo que se repite: `<head>`, encabezado con el menú, pie y la barra «Reservar» del teléfono),
- y los JSON de `bale/data/` (clases, precios, equipo, preguntas, comunidad).

Después de cambiar cualquiera de ellos, en la carpeta del proyecto (`nutribel`):

```
node bale/_fuente/construir.mjs
```

Escribe las páginas de `bale/` y actualiza `sitemap.xml`. No necesita instalar nada (solo Node). Para comprobar que nada quedó sin compilar: `node bale/_fuente/construir.mjs --comprobar` (lo corren también las pruebas de la web). Las páginas compiladas sí van en git; la carpeta `_fuente/` no se publica (GitHub Pages ignora las carpetas que empiezan por «_»).

Las direcciones viejas de la página larga siguen funcionando: `bale/#horario` lleva a `reservar.html`, `#precios` a `precios.html`, `#reformer` a `clases.html#pilates-reformer`, `#equipo` y `#ubicacion` a `nosotras.html`, `#faq` a `preguntas.html` y `?vista=estudio` a `estudio.html` (`js/anclas.js`).

## El panel del negocio

Entra escribiendo su dirección, https://balestudiord.com/panel.html (en local, http://localhost:3000/bale/panel.html). Ahí se cambian los datos de contacto, el aviso para las clientas, las clases canceladas, los cupos, los lugares fijos de las miembros, los precios y los próximos eventos. Lo que guardas en el panel se ve **solo en ese navegador** y solo en la página Reservar (cupos, sala, lugares fijos y canceladas): los precios, los textos y la comunidad van compilados. Para que lo vea todo el mundo: pulsa **Descargar archivos para publicar**, copia los 4 archivos que se descargan (`config.json`, `precios.json`, `comunidad.json` y `bale.json`) a `bale/data/` reemplazando los que hay, **compila** (`node bale/_fuente/construir.mjs`) y publica (último apartado). Después pulsa «Restaurar los datos publicados» en el panel.

También se puede editar a mano. Los JSON son archivos de texto: ábrelos con VS Code, cambia solo lo que está entre comillas y guarda. Ojo con las comas: cada línea de una lista termina en coma menos la última. Si falta o sobra una coma, el compilado avisa en qué archivo.

Antes de publicar, mira el cambio en tu computadora: en la carpeta del proyecto ejecuta `npx serve .` y abre http://localhost:3000/bale/.

## Agregar o cambiar una clase (página Clases)

Archivo: `bale/data/bale.json` → `clases`. Cada clase tiene:

- `slug`: su ancla (`clases.html#hot-barre`). No lo cambies si ya está publicada.
- `tipo` (el nombre que se ve) y `tipos` (los nombres del horario que le corresponden, por ejemplo `["Hot Barre"]`).
- `reserva`: `"en_linea"` (botón «Reservar» que abre `reservar.html?tipo=…`) o `"inscripcion"` (botón de WhatsApp; así va el ballet de niñas).
- `texto`, `para` (para quién), `nivel`, `fotos` (`[{src, alt}]`, fotos 4:5 en `bale/img/`) y, en ballet, `edades`.

La duración, las instructoras y los días salen solos de `horario.json`. Después, compila.

## Agregar una foto

1. Fotos verticales 4:5 (1200 × 1500) en WebP en `bale/img/`, con sus versiones `-480.webp` y `-800.webp` (las usa el `srcset`).
2. Cada foto con su `alt`: qué se ve en ella, en una frase (nada de «foto de…»).
3. Reglas: solo el mat beige, ningún hombre, nunca caras de niñas, y en la ventana de reserva no va la foto de las barras (la sala es un dibujo).
4. Compila.

## Con el sistema de reservas: qué se cambia dónde

Cuando el sistema esté activo (`bale/data/config.json → sistema.activo: true`, ver `bale-sistema/docs/CONFIGURAR-SUPABASE.md`), parte de lo que antes se hacía en el panel pasa al **área del estudio** (`estudio.html`, con contraseña; guía: `GUIA-AREA-DEL-ESTUDIO.md`):

| Qué | Dónde |
|---|---|
| Reservas, asistencia, cancelar una reserva o una clase, suplencias | Área del estudio → **Clases** |
| Clientas, membresías, **lugares fijos** y renovar cada mes | Área del estudio → **Clientas** |
| Pagos y cargos de RD$300 | Área del estudio → **Cobros** |
| Datos de transferencia, textos de los avisos, horario de la base de datos, personal | Área del estudio → **Ajustes** (solo la dueña). La tarjeta (CardNET) va por cobro: **Cobros → Enlaces por enviar** |
| Precio que se **cobra** | Área del estudio → Ajustes → Precios **y también** el panel (el que se **muestra** en la página) |
| Datos de contacto, aviso para las clientas, precios que se muestran, próximos eventos | Panel del negocio (como siempre) |
| Horario que se ve sin sistema, textos, fotos | Los JSON de `bale/data/` (como siempre) |

Con el sistema activo, la página ya no usa `bale.json → fijos` ni `canceladas`: el panel lo indica y remite al área del estudio. Si un día el sistema se apaga (`activo: false`), todo vuelve a funcionar como antes con los JSON.

Para activar o cambiar el sistema, en `config.json → sistema` van solo la URL del proyecto y la clave **publicable** (`sb_publishable_…`). **Nunca** la clave secreta. `abrir_whatsapp_al_reservar` se pone en `false` cuando los WhatsApp automáticos ya funcionen.

## Lugares fijos de las miembros (al empezar cada mes)

> Con el sistema activo esto se hace en el área del estudio (Clientas → Renovar / Agregar lugar fijo). Lo de abajo es para el modo sin sistema.

Las clientas con membresía tienen su lugar guardado todo el mes; las demás reservan en la página. Para que la página no ofrezca un lugar que ya es de una miembro:

1. Abre el panel y ve a **Lugares fijos de miembros**.
2. En **Clase de la semana**, elige la clase (día y hora).
3. Clases de barra: toca en el esquema de la sala el lugar de cada miembro (queda en marrón). Para quitarlo, tócalo otra vez. Pilates Reformer: escribe cuántas máquinas están tomadas.
4. Repite con cada clase y pulsa **Guardar cambios**. Abajo sale el resumen de todas las clases con lugares fijos.
5. Pulsa **Descargar archivos para publicar**, copia `bale.json` (y los demás) a `bale/data/` y publica.

Se repite todas las semanas del mes. Cuando cambie el mes, entra de nuevo, ajusta los lugares y vuelve a publicar. En el archivo quedan solo números, por ejemplo `"fijos": { "lun-1730": [3, 7, 12], "vie-0800": 2 }`: **nunca escribas nombres de clientas**, porque `bale.json` es público.

## Aviso por correo sin sistema (FormSubmit): apagado

Desde el 30/10/2026 los correos al estudio y a las clientas los manda el sistema (Supabase). FormSubmit solo servía cuando la base de datos no responde y dejaba el correo de la dueña a la vista en `config.json`, así que está apagado (`aviso_correo.endpoint` vacío). En ese caso, la confirmación dice «Escríbenos por WhatsApp para confirmar» y la reserva sigue por WhatsApp como siempre.

Si algún día se quiere volver a usar: activar FormSubmit con el correo del estudio, pedir el **alias** y ponerlo en `aviso_correo.endpoint` como `https://formsubmit.co/ajax/<alias>` (nunca el correo).

## Agregar un evento o un momento

**Con la comunidad en la base de datos** (`config.json → sistema.comunidad: true`, después de aplicar la migración de noviembre), las publicaciones se hacen en el **área del estudio → Comunidad** (guía: `GUIA-AREA-DEL-ESTUDIO.md`): actividades con «Me apunto» y cupo, anuncios y fotos. Lo de abajo (`comunidad.json`) queda como respaldo: es lo que la página muestra mientras la comunidad no esté en la base de datos o si la base no responde.

Archivo: `bale/data/comunidad.json`. Después de cambiarlo, compila.

**Noviembre de 2026:** `proximos` está vacío (Halloween ya pasó y se quitó). Mientras no haya eventos, Comunidad muestra solo los momentos. En el archivo hay un bloque `_ejemplo_proximo` que **no se publica**: sirve de modelo.

**Para añadir un evento** (cuando Marifer mande los de noviembre):

1. Abre `bale/data/comunidad.json`.
2. Copia el bloque `_ejemplo_proximo` y pégalo **dentro** de los corchetes de `"proximos": [ ]`.
3. Cambia el `id` (sin espacios, por ejemplo `taller-21-nov`), el `titulo`, la `fecha`, la `hora`, el `precio`, el `texto` y el `mensaje`. Quita la palabra «EJEMPLO».
4. Si hay dos eventos, sepáralos con una coma: `[ {…}, {…} ]`.
5. Revisa en local y publica (último apartado).

Lo mismo se puede hacer desde el panel del negocio (Próximos eventos) y «Descargar archivos para publicar». Sin emojis en los títulos ni en los textos.

**Evento con fecha** (lista `proximos`). Se muestra arriba en Comunidad y **desaparece solo** al día siguiente. Cada evento es así:

```json
{
  "id": "taller-noviembre",
  "titulo": "Nombre del evento",
  "fecha": "2026-11-14",
  "hora": "10:00",
  "precio": 800,
  "texto": "Una frase corta.",
  "foto": null,
  "boton": "Reservar por WhatsApp",
  "mensaje": "Hola, balé. Quiero reservar mi lugar en ... del sábado 14 de noviembre."
}
```

- `fecha` siempre como año-mes-día. `hora` en 24 horas (6:30 pm = `"18:30"`). Si no tiene precio, pon `null`.
- No publiques eventos privados (cumpleaños de clientas, etc.).

**Momento** (lista `momentos`): siempre visible. Necesita `kick` (etiqueta pequeña), `titulo`, `texto`, `foto` y `alt` (qué se ve en la foto). Si quieres botón de WhatsApp, agrega `boton` y `mensaje`.

## Cambiar el horario

Archivo: `bale/data/horario.json`, lista `clases`. Cada clase es así:

```json
{ "id": "lun-1730", "dia": "lunes", "inicio": "17:30", "fin": "18:30", "clase": "Hot Barre", "instructora": "Marifer" }
```

- `dia`: lunes, martes, miercoles, jueves, viernes o sabado (sin tilde).
- `id`: día + hora de inicio (`mie-1845`). Debe ser único.
- `edad` (opcional): para ballet, por ejemplo `"3 a 5 años"`. El ballet de niñas no se reserva en la página: su botón «Inscripción» abre WhatsApp para pedir el formulario.
- `etiqueta` (opcional): `"avanzado"`, `"miembros"` o `"primera"`.
- Una instructora nueva también va en `bale/data/bale.json` → `instructoras`.
- Después, compila: la página Clases muestra la duración, las instructoras y los días que salen de aquí.

## Cambiar un precio

Archivo: `bale/data/precios.json` (o el panel, apartado Precios). Cambia el número de `precio` (sin "RD$" ni comas: `6500`). La página le pone el formato. Después, compila.

Precios del flyer de octubre de 2026: clase infantil de 3 a 11 años; uniformes y accesorios: leotardo (solo leotardo) RD$1,200, uniforme de ballet completo (leotardo + falda) RD$3,200, medias pantis RD$850, zapatillas RD$1,600, medias antideslizantes cortas RD$450 y largas RD$850. Debajo salen dos notas que se cambian en el mismo archivo: `membresia.aviso` y `infantil.nota_accesorios`.

**Medias antideslizantes** (`medias`): son obligatorias y tienen su propio bloque con el botón «Pedir mis medias». Ahí se cambian el texto y los precios (`items`: de tobillo y largas); el mensaje de WhatsApp se arma solo con esos precios. Cada medida (`items`) lleva su foto cuadrada sin textos (`foto`, 720 × 720, más una versión `-400.webp`) y su `alt`: hoy `img/medias-tobillo.webp` y `img/medias-largas.webp`. Para cambiar una, guarda las dos versiones en `bale/img/` con el mismo nombre. El flyer completo de las medias quedó en `referencia/medias-flyer.webp` (no se publica): la dueña lo puede mandar por WhatsApp.

## Fotos del equipo

Las fotos de Marifer, Lynette, Rusmairy y Viviana ya están puestas y confirmadas por la dueña (23/10/2026). Para una instructora nueva:

1. Recorta su foto vertical 4:5 (por ejemplo 600 × 750 px) en WebP: `bale/img/equipo/<nombre>.webp`, y un avatar cuadrado pequeño `bale/img/equipo/<nombre>-avatar.webp` (sale en el horario, en redondo).
2. En `bale/data/bale.json` → `instructoras`, agrega `"foto"`, `"avatar"` y `"bio"`. No cambies `nombre`: el horario busca a cada instructora por ese campo.
3. No publiques una cara con nombre sin confirmarlo con la dueña.

Reglas de fotos: nunca caras de niñas; solo el mat beige con el logo de balé (nada de mats negros, verdes ni marrones); nada de la carpeta `cumple maria` (cumpleaños de la dueña) y ninguna foto en la que salga un hombre.

## Colores y letra (pedido de la dueña, 22/10/2026)

- Una sola letra: Montserrat, en negrita (600), media (500) y normal (400). Sin cursivas.
- Fondos: crema `#F3E4D8`, papel `#FFFAF6`, rosadito `#F7E6E8`; detalles en rosa `#F4C5CE`; textos en espresso `#2E2723`.
- **Marrón `#5A3426`** en todos los botones y en todo lo que resalta (día elegido, etiquetas, fecha del evento, enlaces). Desde el 25/10/2026 los botones que eran rosado fuerte también son marrones: «así todo está en la misma línea».
- En la portada, el botón «Reserva tu primera clase» va en rosadito `#F4C5CE` con letra espresso, porque un botón marrón no se ve sobre el video.
- Nada de morado ni de rosados malva o lila. Los colores están en `bale/css/base.css` (`--brown`, `--pink`, `--cta`).

## Rehacer el video de portada

El script es `referencia/bale-recursos/video/generar-portada.py`. Usa seis fotos de Drive cuyos IDs están en `referencia/bale-recursos/video/fotos-portada.tsv` (Hot Barre con luces, que es también el póster; barras nuevas; clase de Pilates Reformer; arabesque en la barra; Hot Barre en la barra; mat con el logo).

1. Descarga esas fotos de Drive a `_insumos/drive/` con los nombres de la primera columna (`b-DSC09385.jpg`, etc.).
2. Desde la raíz del proyecto, ejecuta el script dos veces (necesita Python con Pillow y ffmpeg):
   `python referencia/bale-recursos/video/generar-portada.py _insumos/drive <ruta de ffmpeg> bale/video horizontal` y lo mismo con `vertical`. Genera los videos y sus pósters en `bale/video/` con los mismos nombres, así que no hay que tocar el HTML.
3. Para cambiar una toma, cambia su línea en el `.tsv` y en la lista `SHOTS` del script. Respeta las reglas de fotos de arriba.

## Cambiar WhatsApp, correo, Instagram o datos bancarios

Archivo: `bale/data/config.json`. Cuando la dueña mande los datos bancarios, reemplaza los `POR CONFIRMAR` de `pago` y cambia `pago.texto` (por ejemplo "Transferencia a Banco X, cuenta ...").

## Publicar los cambios

1. Guarda los archivos, compila (`node bale/_fuente/construir.mjs`) y revisa en local (ver arriba).
2. En VS Code, panel de Git: escribe un mensaje corto (por ejemplo "balé: horario de noviembre") y pulsa **Commit**, luego **Sync / Push**.
3. Cloudflare Pages publica solo en uno o dos minutos: https://balestudiord.com/ (la dirección vieja, caesar-valor.github.io/nutribel/bale/, lleva sola al dominio nuevo).
   La dirección del sitio está en un solo lugar, `bale/data/config.json` → `sitio.url`; si algún día cambia, cámbiala ahí, compila, y cambia también «Dirección pública de la página» en Ajustes del área del estudio (los enlaces de los correos y WhatsApp).
4. Si no ves el cambio, recarga con Ctrl + Shift + R.
