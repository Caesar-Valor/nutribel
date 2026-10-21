# Cómo actualizar la página de balé

**Lo más fácil: el panel del negocio** (`bale/panel.html`, enlace «Panel del negocio» al pie de la página). Ahí se cambian los datos de contacto, el aviso para las clientas, las clases canceladas, los cupos, los precios y los próximos eventos. Lo que guardas en el panel se ve **solo en ese navegador**. Para que lo vea todo el mundo: pulsa **Descargar archivos para publicar**, copia los 4 archivos que se descargan (`config.json`, `precios.json`, `comunidad.json` y `bale.json`) a la carpeta `bale/data/` reemplazando los que hay, y publica (último apartado de esta guía). Después pulsa «Restaurar los datos publicados» en el panel.

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

## Poner las fotos del equipo

La dueña va a mandar una foto por instructora. Antes de publicarlas, confirma con ella quién es quién (hoja `_insumos/equipo-por-confirmar.jpg`).

1. Recorta cada foto vertical 4:5 (por ejemplo 600 × 750 px) y guárdala en WebP con estos nombres: `bale/img/equipo/marifer.webp`, `lynette.webp`, `rusmairy.webp`, `viviana.webp`.
2. En `bale/data/bale.json` → `instructoras`, cambia `"foto": null` por la ruta, por ejemplo `"foto": "img/equipo/marifer.webp"`.
3. La foto pasa a ocupar la parte de arriba de la tarjeta, en lugar de las iniciales.

Reglas: nunca caras de niñas, y solo fotos con el mat beige de balé (nada de mats negros, verdes ni marrones).

## Cambiar WhatsApp, correo, Instagram o datos bancarios

Archivo: `bale/data/config.json`. Cuando la dueña mande los datos bancarios, reemplaza los `POR CONFIRMAR` de `pago` y cambia `pago.texto` (por ejemplo "Transferencia a Banco X, cuenta ...").

## Publicar los cambios

1. Guarda los archivos y revisa en local (ver arriba).
2. En VS Code, panel de Git: escribe un mensaje corto (por ejemplo "balé: horario de noviembre") y pulsa **Commit**, luego **Sync / Push**.
3. GitHub Pages publica solo en uno o dos minutos: https://caesar-valor.github.io/nutribel/bale/
4. Si no ves el cambio, recarga con Ctrl + Shift + R.
