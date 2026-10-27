# Cómo actualizar la página de balé

**Lo más fácil: el panel del negocio.** Ya no tiene enlace en la página pública: entra escribiendo su dirección, https://caesar-valor.github.io/nutribel/bale/panel.html (en local, http://localhost:3000/bale/panel.html). La vista del estudio (demo) está en https://caesar-valor.github.io/nutribel/bale/?vista=estudio. Ahí se cambian los datos de contacto, el aviso para las clientas, las clases canceladas, los cupos, los lugares fijos de las miembros, los precios y los próximos eventos. Lo que guardas en el panel se ve **solo en ese navegador**. Para que lo vea todo el mundo: pulsa **Descargar archivos para publicar**, copia los 4 archivos que se descargan (`config.json`, `precios.json`, `comunidad.json` y `bale.json`) a la carpeta `bale/data/` reemplazando los que hay, y publica (último apartado de esta guía). Después pulsa «Restaurar los datos publicados» en el panel.

También se puede editar a mano. Todo el contenido está en la carpeta `bale/data/`. Son archivos de texto (JSON): ábrelos con VS Code, cambia solo lo que está entre comillas y guarda. Ojo con las comas: cada línea de una lista termina en coma menos la última.

Antes de publicar, mira el cambio en tu computadora: en la carpeta del proyecto ejecuta `npx serve .` y abre http://localhost:3000/bale/index.html. Si la página sale en blanco, casi siempre falta o sobra una coma.

## Lugares fijos de las miembros (al empezar cada mes)

Las clientas con membresía tienen su lugar guardado todo el mes; las demás reservan en la página. Para que la página no ofrezca un lugar que ya es de una miembro:

1. Abre el panel y ve a **Lugares fijos de miembros**.
2. En **Clase de la semana**, elige la clase (día y hora).
3. Clases de barra: toca en el esquema de la sala el lugar de cada miembro (queda en marrón). Para quitarlo, tócalo otra vez. Pilates Reformer: escribe cuántas máquinas están tomadas.
4. Repite con cada clase y pulsa **Guardar cambios**. Abajo sale el resumen de todas las clases con lugares fijos.
5. Pulsa **Descargar archivos para publicar**, copia `bale.json` (y los demás) a `bale/data/` y publica.

Se repite todas las semanas del mes. Cuando cambie el mes, entra de nuevo, ajusta los lugares y vuelve a publicar. En el archivo quedan solo números, por ejemplo `"fijos": { "lun-1730": [3, 7, 12], "vie-0800": 2 }`: **nunca escribas nombres de clientas**, porque `bale.json` es público.

## Activar el aviso por correo (FormSubmit)

Si al reservar sale «No pudimos avisar al estudio por correo», es que FormSubmit todavía no está activado. La reserva sigue por WhatsApp, pero el correo no llega.

1. Haz una reserva de prueba en la página publicada. FormSubmit envía a **Mariapimentel1609@gmail.com** un correo «Confirm your email» (si no aparece, buscar en Spam o Promociones).
2. La dueña abre ese correo y pulsa el botón de activar. Desde ese momento, cada reserva le llega por correo.
3. FormSubmit le da un **alias** (letras y números) para no dejar el correo a la vista. Ponlo en `bale/data/config.json` → `aviso_correo.endpoint`: `https://formsubmit.co/ajax/<alias>` (o en el panel, campo «Correo de reservas o alias de FormSubmit», y descarga los archivos). Publica.
4. Haz otra reserva de prueba y comprueba que llega el correo «Nueva reserva · …».

## Agregar un evento o un momento

Archivo: `bale/data/comunidad.json`.

**Evento con fecha** (lista `proximos`). Se muestra arriba en Comunidad y **desaparece solo** al día siguiente. Copia este bloque dentro de `proximos`:

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

## Cambiar un precio

Archivo: `bale/data/precios.json` (o el panel, apartado Precios). Cambia el número de `precio` (sin "RD$" ni comas: `6500`). La página le pone el formato.

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

1. Guarda los archivos y revisa en local (ver arriba).
2. En VS Code, panel de Git: escribe un mensaje corto (por ejemplo "balé: horario de noviembre") y pulsa **Commit**, luego **Sync / Push**.
3. GitHub Pages publica solo en uno o dos minutos: https://caesar-valor.github.io/nutribel/bale/
4. Si no ves el cambio, recarga con Ctrl + Shift + R.
