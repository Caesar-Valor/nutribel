# NutriBEL — web multipágina

Web de NutriBEL (La Vega, RD): clínica de nutrición de la Dra. Bielka Eusebio, restaurante saludable y balé (Barre, Ballet & Pilates). HTML, CSS y JS sin frameworks ni compilación.

## Probar en local

El contenido se carga desde `data/*.json` con `fetch`, así que **no funciona abriendo el archivo con doble clic**. Usa un servidor local desde la carpeta del proyecto:

```bash
npx serve .
```

y abre la dirección que indique (normalmente http://localhost:3000). También sirve la extensión Live Server de VS Code. `serve.json` desactiva las "URL limpias" de `serve`, que redirigían `bale.html?vista=estudio` a `/bale` y perdían el parámetro.

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
| `nutribel-bale-demo` | demo de balé: reservas (clase, fecha, lugar, nombre, WhatsApp, niña y tutor, nombre del comprobante), lista de espera y pagos aprobados |

Nunca se guardan ni se envían datos de salud desde la web.

## Panel del negocio (demo)

`panel.html` (enlace en el pie de todas las páginas) permite cambiar el WhatsApp, la dirección y el enlace de Google Maps, el Nutrialmuerzo de la semana y, por plato, la información nutricional, las etiquetas y "Agotado hoy". Los cambios se guardan solo en ese navegador; en producción harían falta una base de datos y un acceso con contraseña.

## Demo de balé

`bale.html` es una demostración para la dueña de balé, sin servidor: las reservas se guardan solo en el navegador (`nutribel-bale-demo`) y una franja lo indica. Todo el contenido sale de `data/bale.json`; los recursos originales (paquete v2: fotos, videos, horario oficial, texto de la clienta, posiciones de la sala) están en `referencia/bale-recursos/`. Las fotos están en `assets/img/bale/` (WebP con `loading="lazy"`) y los videos de portada con sus pósters en `assets/video/bale/`. Esos videos se regeneraron con `referencia/bale-recursos/video/generar-portada.py` (Python + Pillow + ffmpeg) a partir de las mismas fotos: los originales del paquete, hechos con `zoompan` de ffmpeg, temblaban porque el zoom se redondea a píxeles enteros. El script calcula cada fotograma con precisión subpíxel, a 30 fps, con fundidos de 0,5 s y un bucle sin corte; el póster es su primer fotograma. Para cambiar las fotos, edita la lista `SHOTS` y vuelve a ejecutarlo.

balé es una sección aparte: su cabecera (logo, modo oscuro y "← NutriBEL", que lleva a `index.html`), su menú interno y su pie, sin la cabecera, la navegación ni el pedido de NutriBEL. `common.js` lo hace con `<body data-standalone>`: no pinta la cabecera, el pie ni el pedido, pero sigue dando el modo oscuro, WhatsApp y los avisos. Dentro de balé, NutriBEL solo aparece en la colaboración Balé × NutriBEL (Comunidad, con enlace al menú) y en la ubicación ("En el edificio de NutriBEL"). Las páginas de NutriBEL no muestran nada de balé salvo el botón "Ir a balé" de su cabecera.

**Página pública:**

1. **Bienvenida**: video a pantalla completa (vertical en el teléfono, horizontal en el escritorio: se elige por proporción de pantalla, `min-aspect-ratio: 4/5`), muted, playsinline, loop y póster. No lleva `autoplay`: `bale.js` lo carga y lo reproduce solo si no está activado "reducir movimiento"; en ese caso se queda el póster. Se pausa al salir de la pantalla. Logo, "Un espacio para conectar, fortalecer y transformar.", el botón principal "Reserva tu primera clase" (lleva al próximo sábado de primera clase) y "Ver horario".
2. **El estudio**: historia del texto de la clienta, María Fernanda Pimentel (CEO y coach principal), ¿Qué es el barre? y sus certificaciones (Barre Intensity; Mat Pilates con ControlFit).
3. **Clases**: una tarjeta con foto por tipo: Hot Barre, Barre Flex y Barre Flow, Mat Pilates, Pilates Reformer (sin foto: "Foto por confirmar") y Ballet niñas (3 a 4, 5 a 7 y 8 a 11 años; solo fotos de zapatillas). Días e instructoras salen del horario.
4. **Horario y reservas**: usa el horario oficial (`referencia/bale-recursos/datos/horario.json`, 22 clases), copiado sin cambios en `bale.json → horario` con un `id` y, los sábados de Hot Barre, la `etiqueta` "Primera clase". Tira de 7 días con "Hoy", flechas de semana (hasta 3 semanas adelante) y filtros por instructora y tipo. Cada fila muestra hora, duración, clase, instructora, cupo libre y Reservar, o "Llena" con Lista de espera.
   - Las clases de barra (`barra_tipos`: Hot Barre, Barre Flex, Barre Flow) abren la foto de la sala con los 16 lugares encima (`sala.lugares`) y una cuadrícula de 16 botones accesible.
   - Reformer, Mat Pilates y Ballet niñas usan cupo por número (`cupos`: 6, 12 y 12, marcados "Cupo por confirmar").
   - Ocupación de ejemplo en `demo.ocupados`: lista de lugares en las de barra, número en las demás.
   - Después: datos, pago por transferencia (datos bancarios como marcadores; el comprobante solo anota el nombre del archivo), política de cancelación y, en Ballet niñas, nombre de la niña y del tutor.
   - La confirmación tiene "Enviar confirmación por WhatsApp" con el mensaje ya escrito: clase, día, hora, lugar e instructora. Usa por ahora el número de NutriBEL, sin mostrarlo, hasta tener el de balé.
   - Debajo, vista previa de los mensajes automáticos del sistema real.
5. **Paquetes**: clase de prueba, 4, 8, 12, 16 clases y membresía ilimitada, con "Precio por definir".
6. **Comunidad**: el evento Girls Day Out como ejemplo de Eventos ("Próximos eventos: por confirmar") y la colaboración Balé × NutriBEL (matcha), con enlace al menú de NutriBEL.
7. **Equipo**: María Fernanda (Marifer), Glenny, Rusmairy y Viviana, con iniciales y las clases que dan según el horario.
8. **Preguntas frecuentes**: experiencia, qué llevar, cómo reservar y cómo cancelar; lo que no se sabe va marcado "por confirmar".
9. **Ubicación y contacto**: en el edificio de NutriBEL, dirección, Cómo llegar, WhatsApp, Instagram "@ por confirmar".

**Vista del estudio**: `bale.html?vista=estudio` (enlazada desde el pie de balé).

- **Reservas**: clases de la semana por instructora, cada una con su lista de alumnas, su lista de espera y el mapa de la sala (en las de barra) o el cupo por número. Cancelar una reserva web libera el lugar y ofrece avisar por WhatsApp a la primera en espera.
- **Clientes**: nombre, WhatsApp, reservas y créditos de demostración.
- **Pagos**: transferencias por confirmar con el botón "Aprobar".
- **Calendario**: descarga un `.ics` real con las clases de la semana de la instructora y su lista de alumnas en la descripción (horas en UTC; La Vega es UTC−4 todo el año). Se importa en Google Calendar (Configuración → Importar y exportar) o se abre en el iPhone.

Las clientas de ejemplo son ficticias (WhatsApp 555) y se marcan como "Ejemplo". "Borrar las reservas de la demo" vacía `nutribel-bale-demo`. En producción harían falta un servidor, acceso con contraseña para el estudio y envío automático de los mensajes de WhatsApp.

Reglas de la demo: no se publican rostros de niñas (solo las fotos de piernas y zapatillas); se usan solo las fotos del paquete; las instructoras van con iniciales; no hay precios, cuenta bancaria ni Instagram inventados. Identidad: crema #F3E4D8 y café #2E2723 del logo, rosa #F4C5CE y acento #ED2F59 de sus redes (solo en el botón principal y las etiquetas: blanco sobre #ED2F59 da 4,7:1).

## Pendiente de confirmar con el cliente

- Enlace exacto de Google Maps (mientras tanto, "Cómo llegar" busca la dirección).
- Precios de las bebidas y de los 13 planes (se muestran como "Precio por confirmar").
- Validar las etiquetas keto / sin gluten / ligero / alto en proteína y completar la información nutricional desde el panel.
- balé (lista completa en `data/bale.json` → `pendiente`): precios y vigencia de los paquetes, datos bancarios, política de cancelación, WhatsApp e Instagram propios, que "Marifer" del horario es María Fernanda Pimentel, descripción de cada clase, cupo real de Reformer, Mat Pilates y Ballet niñas, foto de Reformer, qué llevar a clase, próximos eventos, fotos de las instructoras, el horario del sábado 11:00–12:00 y las autorizaciones de los padres antes de publicar rostros de niñas.
- "Planes semanales" usa la misma foto que "Reto 21 días"; falta una foto propia. "Reto Mamitas en forma" sigue sin foto.

## Publicar en GitHub Pages

Sube el repositorio y activa Pages en *Settings → Pages → Deploy from a branch* (rama `main`, carpeta raíz). No hace falta compilar nada: todas las rutas son relativas.
