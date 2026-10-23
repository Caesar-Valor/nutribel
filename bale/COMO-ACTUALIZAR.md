# Cómo actualizar la página de balé

**Lo más fácil: el panel del negocio.** Ya no tiene enlace en la página pública: entra escribiendo su dirección, https://caesar-valor.github.io/nutribel/bale/panel.html (en local, http://localhost:3000/bale/panel.html). La vista del estudio (demo) está en https://caesar-valor.github.io/nutribel/bale/?vista=estudio. Ahí se cambian los datos de contacto, el aviso para las clientas, las clases canceladas, los cupos, los precios y los próximos eventos. Lo que guardas en el panel se ve **solo en ese navegador**. Para que lo vea todo el mundo: pulsa **Descargar archivos para publicar**, copia los 4 archivos que se descargan (`config.json`, `precios.json`, `comunidad.json` y `bale.json`) a la carpeta `bale/data/` reemplazando los que hay, y publica (último apartado de esta guía). Después pulsa «Restaurar los datos publicados» en el panel.

También se puede editar a mano. Todo el contenido está en la carpeta `bale/data/`. Son archivos de texto (JSON): ábrelos con VS Code, cambia solo lo que está entre comillas y guarda. Ojo con las comas: cada línea de una lista termina en coma menos la última.

Antes de publicar, mira el cambio en tu computadora: en la carpeta del proyecto ejecuta `npx serve .` y abre http://localhost:3000/bale/index.html. Si la página sale en blanco, casi siempre falta o sobra una coma.

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
- `edad` (opcional): para ballet, por ejemplo `"2 a 5 años"`.
- `etiqueta` (opcional): `"avanzado"`, `"miembros"` o `"primera"`.
- Una instructora nueva también va en `bale/data/bale.json` → `instructoras`.

## Cambiar un precio

Archivo: `bale/data/precios.json`. Cambia el número de `precio` (sin "RD$" ni comas: `6500`). La página le pone el formato.

## Fotos del equipo

Las fotos de Marifer, Lynette, Rusmairy y Viviana ya están puestas y confirmadas por la dueña (23/10/2026). Para una instructora nueva:

1. Recorta su foto vertical 4:5 (por ejemplo 600 × 750 px) en WebP: `bale/img/equipo/<nombre>.webp`, y un avatar cuadrado pequeño `bale/img/equipo/<nombre>-avatar.webp` (sale en el horario, en redondo).
2. En `bale/data/bale.json` → `instructoras`, agrega `"foto"`, `"avatar"` y `"bio"`. No cambies `nombre`: el horario busca a cada instructora por ese campo.
3. No publiques una cara con nombre sin confirmarlo con la dueña.

Reglas de fotos: nunca caras de niñas; solo el mat beige con el logo de balé (nada de mats negros, verdes ni marrones); nada de la carpeta `cumple maria` (cumpleaños de la dueña) y ninguna foto en la que salga un hombre.

## Colores y letra (pedido de la dueña, 22/10/2026)

- Una sola letra: Montserrat, en negrita (600), media (500) y normal (400). Sin cursivas.
- Fondos: crema `#F3E4D8`, papel `#FFFAF6`, rosadito `#F7E6E8`; detalles en rosa `#F4C5CE`; textos en espresso `#2E2723`.
- **Marrón `#5A3426`** en todo lo que resalta (botones, día elegido, etiquetas pequeñas, enlaces).
- **Fucsia `#E0264F`** solo en los botones principales de reservar, la etiqueta «Ideal para tu primera clase», la fecha del evento y la franja del certificado de regalo.
- Nada de morado ni de rosados malva o lila. Los colores están en `bale/css/base.css` (`--brown`, `--pink`, `--fucsia`, `--cta`).

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
