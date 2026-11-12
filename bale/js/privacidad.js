/* balé — privacidad.html: el WhatsApp y el correo del estudio salen de data/config.json (por si cambian sin recompilar) */
(function(){
"use strict";
const NB = window.BALE;
NB.ready.then(c=>{
  const wa=NB.$("#pvWa"), m=NB.$("#pvMail");
  if(wa&&c.whatsapp){ wa.textContent=c.whatsapp_texto||c.whatsapp; wa.href=NB.waLink("Hola, balé. Tengo una consulta sobre mis datos."); }
  const correo=c.contacto_privacidad||c.correo_reservas;   // config.json → contacto_privacidad (12/11/2026)
  if(m&&correo){ m.textContent=correo; m.href=`mailto:${correo}`; }
}).catch(()=>{});
})();
