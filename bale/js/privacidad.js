/* balé — privacidad.html: el WhatsApp y el correo del estudio salen de data/config.json (por si cambian sin recompilar) */
(function(){
"use strict";
const NB = window.BALE;
NB.ready.then(c=>{
  const wa=NB.$("#pvWa"), m=NB.$("#pvMail");
  if(wa&&c.whatsapp){ wa.textContent=c.whatsapp_texto||c.whatsapp; wa.href=NB.waLink("Hola, balé. Tengo una consulta sobre mis datos."); }
  if(m&&c.correo_reservas){ m.textContent=c.correo_reservas; m.href=`mailto:${c.correo_reservas}`; }
}).catch(()=>{});
})();
