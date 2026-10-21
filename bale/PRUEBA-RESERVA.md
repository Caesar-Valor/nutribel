# Prueba de reserva con la dueña de balé

La dueña quiere reservar una clase ella misma y ver cómo le llega. Esta prueba se hace en la página publicada: https://caesar-valor.github.io/nutribel/bale/

## Paso a paso

**Antes (una sola vez): activar el aviso por correo**

1. Haz tú una primera reserva de prueba (pasos de abajo). FormSubmit le enviará a **Mariapimentel1609@gmail.com** un correo de activación ("Confirm your email").
2. Pídele a la dueña que abra ese correo y pulse el botón de activar. Si no lo ve, que busque en Spam o Promociones.
3. Después de activar, FormSubmit da un alias (una cadena de letras y números). Cámbialo en `bale/data/config.json` → `aviso_correo.endpoint`: `https://formsubmit.co/ajax/<alias>`. Así el correo no queda a la vista en el código. Publica el cambio.

**La prueba con ella**

1. Que abra la página en su teléfono y pulse **Reserva tu primera clase** (o elija cualquier clase en el horario).
2. En una clase de barra, que elija un lugar en el esquema de la sala y pulse **Continuar**.
3. Que escriba su nombre y su WhatsApp, marque la política de cancelación y pulse **Confirmar y enviar por WhatsApp**.
4. Se abre WhatsApp con el mensaje de la reserva ya escrito, dirigido al +1 849-638-6337. Que lo envíe.
5. Revisar juntos:
   - **WhatsApp de balé:** llegó el mensaje con clase, fecha, hora, instructora, lugar, nombre, teléfono y la línea del cargo de RD$300.
   - **Correo** Mariapimentel1609@gmail.com: llegó "Nueva reserva · {clase} {fecha} {hora}" con una tabla con los mismos datos.
   - **Calendario:** en la pantalla de confirmación, **Agregar a mi calendario** descarga un archivo `.ics`. En el iPhone se abre y se agrega al Calendario; en Android, con Google Calendar. Debe salir a la hora correcta, con la dirección y la política de cancelación.
6. Si el correo no llega, la página lo dice con un mensaje amable y la reserva sigue por WhatsApp.

## Qué es real y qué es demo (honesto)

**Ya funciona de verdad**

- El mensaje de WhatsApp con la reserva completa al número de balé.
- El aviso por correo a la dueña (después de activar FormSubmit).
- El archivo `.ics` para agregar la clase al calendario.
- Horario, precios, eventos y textos se cambian editando los JSON (ver `COMO-ACTUALIZAR.md`).

**Todavía es demo**

- **Recordatorios de 24 h y 2 h antes:** la página solo muestra una vista previa. Hoy no se envía nada automático.
- **Lista de espera:** se guarda solo en el teléfono de quien se anotó; el estudio no se entera salvo por el WhatsApp.
- **Cupos y lugares ocupados:** los que se ven son de ejemplo. Una reserva hecha en un teléfono no ocupa el lugar en los demás teléfonos: la confirmación real es la que da el estudio por WhatsApp.
- **Vista del estudio y lista de clientes** (`?vista=estudio`): datos de ejemplo más las reservas de ese mismo navegador.
- **Panel del negocio** (`panel.html`): los cambios se ven al momento solo en el navegador donde se hicieron. Para todos, hay que descargar los archivos y publicarlos (ver `COMO-ACTUALIZAR.md`). No tiene contraseña.
- **Pagos:** se acuerdan por WhatsApp; los datos bancarios están por confirmar.

**Qué hace falta para que lo de demo sea real**

- Un lugar común donde se guarden las reservas para todos los teléfonos: un backend pequeño, o **Google Sheets con Apps Script** (lo más sencillo y barato para empezar). Con eso, los cupos, la lista de espera y la lista de clientes serían los de verdad.
- **API de WhatsApp Business** (por ejemplo, con Meta directamente o con un proveedor como Twilio) para enviar los recordatorios de 24 h y 2 h y los avisos de lista de espera sin que nadie los mande a mano.
- Un acceso con contraseña para la vista del estudio y el panel del negocio, y que el panel guarde en ese mismo lugar común (así sus cambios se publican solos).
