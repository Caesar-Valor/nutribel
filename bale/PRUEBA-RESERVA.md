# Prueba de reserva con la dueña de balé

Marifer quiere reservar ella misma y ver cómo le llega por correo (y por WhatsApp). Esta prueba es **con el sistema de reservas** (Supabase + notificador). Si el sistema todavía no está activo, al final está la prueba de siempre.

## Antes (César)

1. El proyecto de Supabase listo (`bale-sistema/docs/CONFIGURAR-SUPABASE.md`), con la cuenta de Marifer creada.
2. `bale/data/config.json → sistema`: `activo: true`, la URL y la clave publicable. Publicado.
3. El notificador encendido (`bale-sistema/docs/NOTIFICADOR.md`). Para la prueba con Marifer, **`MODO_PRUEBA=false`** (si no, los correos te llegan a ti) y `CORREO_RESPONDER_A` con su correo. Primero pruébalo tú en modo prueba.
4. En el área del estudio → **Avisos** debe decir "Correo: funcionando".

## La prueba con ella

1. En su teléfono, que abra https://caesar-valor.github.io/nutribel/bale/ y elija una clase de barra (que no sea hoy, para probar también cancelar sin cargo).
2. Que elija un lugar, pulse **Continuar** y escriba su nombre, su WhatsApp y **su correo**. Si quiere, que marque "Quiero recibir la confirmación y los recordatorios por WhatsApp". Que acepte el aviso de privacidad y la política de cancelación y pulse **Confirmar reserva**.
3. Sale **¡Reserva confirmada!** con el resumen, el pago y **Ver mi reserva**. (Si `abrir_whatsapp_al_reservar` sigue en `true`, también se abre WhatsApp con la reserva, como antes.)
4. Revisar juntos:
   - **Su correo:** "Tu reserva en balé: …" con la clase, el día, la hora, el lugar, el pago y el botón **Ver o cancelar mi reserva**. Si no aparece en un minuto, mirar en Spam o Promociones.
   - **El correo del estudio** (`correo_estudio`): "Nueva reserva: …" con su nombre, WhatsApp y correo.
   - **Área del estudio** (`estudio.html`, con su cuenta) → **Clases** → esa clase: ella sale en la lista con su lugar; la sala lo marca ocupado. En **Clientas** aparece su ficha con su correo.
   - **WhatsApp** (solo si ya está vinculado el número viejo y encendido en Avisos): la confirmación.
5. **Cancelar con el enlace:** en el correo, **Ver o cancelar mi reserva** → **Cancelar mi reserva** → **Sí, cancelar**. Sale "Tu reserva quedó cancelada" sin cargo (no es el mismo día). Llega el correo de cancelación, y al estudio "Cancelación: …". En el área del estudio la reserva ya no está.
6. **Opcional, cargo tardío:** reservar una clase de hoy y cancelarla: el enlace avisa del cargo de RD$300 y en **Cobros** aparece para marcarlo **Cobrado** o **Perdonado**.

## Qué es real y qué falta

**Real con el sistema:** cupos y lugares compartidos por todos los teléfonos (nadie se queda con el mismo lugar), correo de confirmación y al estudio, enlace para ver o cancelar, cargo tardío automático, lista de espera con aviso cuando se libera un lugar, recordatorios (el día antes a las 6:00 pm por correo y WhatsApp, y 2 horas antes por WhatsApp), lugares fijos de las miembros y área del estudio con contraseña.

**Falta o depende de ella:** datos bancarios (Ajustes → Pago; mientras falten, la confirmación dice "te enviamos los datos por WhatsApp"; la tarjeta va por cobro desde Cobros → Enlaces por enviar), los lugares fijos de cada miembro, WhatsApp automático (número viejo con Baileys, no la API oficial) y las cuentas de su asistente e instructoras.

## Sin el sistema (como antes)

Si `sistema.activo` es `false` o la base de datos no responde, la página avisa "Ahora mismo no podemos confirmar en línea…" y la reserva sigue por WhatsApp: se abre WhatsApp con la reserva completa al +1 849-638-6337, el estudio recibe el aviso por correo de FormSubmit (después de activarlo: ver `COMO-ACTUALIZAR.md`) y la clienta puede descargar el `.ics`. En ese modo, una reserva hecha en un teléfono no ocupa el lugar en los demás: la confirmación real la da el estudio por WhatsApp.
