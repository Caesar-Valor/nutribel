Trabaja sin preguntarme y no hagas commit. Al terminar, dame un resumen corto, capturas en móvil
y escritorio, y un mensaje de commit sugerido.

OBJETIVO: una DEMO de Balé Studio dentro de la web de NutriBEL (bale.html), para presentársela a
la dueña de balé. Sin servidor: las reservas se guardan en el navegador (localStorage), con una
franja discreta que dice "Demostración: las reservas se guardan solo en este navegador".

RECURSOS: referencia/bale-recursos/ (lee LEEME.txt y texto/inspiracion-webs.md antes de empezar).
Copia imágenes y videos a assets/img/bale/ y assets/video/bale/.

REGLAS:
- Ningún rostro de niña. Usa solo las imágenes del paquete. Las de ballet niñas son solo
  zapatillas. Las instructoras, sin foto: iniciales en un círculo.
- No inventes precios, números de cuenta ni el usuario de Instagram: deja marcadores visibles.
- Identidad: logo crema #F3E4D8 con letras #2E2723; de su material de redes, rosa #F4C5CE y
  acento #ED2F59 (con moderación). Serif elegante de alto contraste para los títulos y
  mayúsculas espaciadas para los subtítulos. Que funcione en el modo oscuro del sitio.
- Primero para el teléfono. No rompas las demás páginas. Reutiliza js/common.js (NB.whatsapp) y
  amplía data/bale.json.
- Rendimiento: imágenes con loading="lazy". Los videos con muted, playsinline, loop y póster; el
  vertical en el teléfono y el horizontal en el escritorio. Que no se reproduzcan si el usuario
  pidió reducir el movimiento (prefers-reduced-motion): ahí se queda el póster.

MÓDULOS DE bale.html (con su propio menú interno y un enlace "← NutriBEL"):
1. Bienvenida, al estilo barre3 y Physique 57: video de portada a pantalla completa
   (video/bale-hero-*), logo, "Un espacio para conectar, fortalecer y transformar." y un solo
   botón principal, "Reserva tu primera clase", más uno secundario, "Ver horario".
2. El estudio: historia breve (texto/historia.md), María Fernanda Pimentel (CEO y coach
   principal), "¿Qué es el barre?" y sus certificaciones (Barre Intensity, Mat Pilates con
   ControlFit).
3. Clases, una tarjeta con foto por tipo:
   - Hot Barre (hot-barre-*);
   - Barre Flex y Barre Flow;
   - Mat Pilates (mat-pilates-*);
   - Reformer;
   - Ballet niñas (3 a 4, 5 a 7 y 8 a 11 años; ballet-ninas-zapatillas-*).
4. Horario y reservas, al estilo Verbena. Usa datos/horario.json, que es el horario OFICIAL: no
   lo cambies.
   - Tira de 7 días con "Hoy", flechas de semana y filtros por instructora y tipo de clase.
   - Cada clase en una fila: hora y duración, nombre, instructora, cupo y "Reservar" (o "Llena",
     con "Lista de espera").
   - En las clases de barra (Hot Barre, Barre Flex, Barre Flow) se reserva un lugar concreto
     sobre la foto de la sala (img/sala-barras.jpg + datos/sala.json): libre, ocupado (gris) y
     elegido. Debajo, una cuadrícula de 16 botones accesible para el teléfono.
   - En Reformer, Mat Pilates y Ballet niñas, cupo por número, configurable en bale.json. Pon
     los valores como "por confirmar".
   - Los sábados de Hot Barre llevan la etiqueta "Primera clase" (first class session).
   - Formulario: nombre, WhatsApp y pago por transferencia (datos bancarios como marcadores y
     un campo para el comprobante, solo simulado). Casilla para aceptar la política de
     cancelación (texto marcador). En Ballet niñas, también el nombre de la niña y del padre,
     la madre o el tutor.
   - Confirmación con el resumen y "Enviar confirmación por WhatsApp" (mensaje ya escrito con
     clase, día, hora, lugar e instructora).
   - Debajo, una vista previa de los mensajes automáticos del sistema real, como burbujas de
     WhatsApp: confirmación, recordatorio 24 horas y 2 horas antes, y lugar liberado de la lista
     de espera. Con la nota "En el sistema real llegarán solos".
5. Paquetes, al estilo Verbena: Clase de prueba, 4, 8, 12, 16 clases y Membresía ilimitada, cada
   uno con su frase y "Precio por definir".
6. Comunidad: el evento Girls Day Out (img/evento-girls-day-out.jpg) como ejemplo de "Eventos" y
   la colaboración Balé × NutriBEL (img/balexnutribel-matcha.jpg), con enlace al menú de NutriBEL.
7. Equipo: María Fernanda (Marifer), Glenny, Rusmairy y Viviana, con iniciales y sus clases,
   sacadas del horario.
8. Preguntas frecuentes, como barre3: ¿Necesito experiencia en ballet? ¿Qué llevo? ¿Cómo
   reservo? ¿Cómo cancelo? (respuestas cortas; lo que no se sepa, marcado "por confirmar").
9. Ubicación y contacto: en el edificio de NutriBEL, WhatsApp e Instagram (marcador).

VISTA DEL ESTUDIO (demo), en una pestaña "Balé" de panel.html o en bale.html?vista=estudio:
- Reservas por clase y por instructora, con la lista de alumnas y el mapa de la sala.
- Clientes: nombre, WhatsApp, reservas y créditos de demostración.
- Pagos por transferencia por confirmar, con el botón "Aprobar".
- "Calendario de la instructora": botón que descarga un .ics real con sus clases de la semana,
  importable en Google Calendar o en el iPhone.

Comprueba en el navegador a 390 px y a 1366 px: el video carga con su póster, reservar un lugar,
que quede ocupado al volver, lista de espera, ballet niñas con tutor, el .ics importable, el modo
oscuro y que con "reducir movimiento" no se reproduzca el video. Actualiza el README con la
sección "Demo de balé".
