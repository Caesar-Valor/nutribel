/* balé — privacidad.html: el WhatsApp y el correo del estudio salen de data/config.json */
(function(){
"use strict";
const NB = window.BALE;
NB.ready.then(c=>{
  const wa=NB.$("#pvWa"), m=NB.$("#pvMail");
  if(c.whatsapp){ wa.textContent=c.whatsapp_texto||c.whatsapp; wa.href=NB.waLink("Hola, balé. Tengo una consulta sobre mis datos."); wa.target="_blank"; wa.rel="noopener"; }
  if(c.correo_reservas){ m.textContent=c.correo_reservas; m.href=`mailto:${c.correo_reservas}`; }
}).catch(()=>{});
})();
