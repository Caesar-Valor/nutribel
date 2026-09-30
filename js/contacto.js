/* =========================================================
   contacto.html — horario abierto/cerrado, dirección y enlaces
   Datos de data/negocio.json (con los cambios del panel)
   ========================================================= */
(function(){
"use strict";
const {$, esc} = NB;

let lastState="";
function renderHours(s){
  if(!s) return;
  if(s.text!==lastState){lastState=s.text;$("#openState").innerHTML=`<i class="dot ${s.open?"on":""}"></i>${esc(s.text)}`;}
  $("#hoursBody").innerHTML=s.rows.map(([d,h,cur])=>`<tr class="${cur?"cur":""}"><td>${esc(d)}${cur?'<span class="sr-only"> (hoy)</span>':""}</td><td>${esc(h)}</td></tr>`).join("");
}
document.addEventListener("nb:horario",e=>renderHours(e.detail));

NB.ready.then(biz=>{
  renderHours(NB.hours());
  $("#addr").textContent=biz.direccion;
  $("#mapsBtn").href=biz.google_maps||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("NutriBEL "+biz.direccion)}`;
  const wa=NB.waLink("");
  if(wa) $("#waBtn").href=wa; else $("#waBtn").hidden=true;
  $("#igBtn").href=biz.instagram;
  const handle=(biz.instagram.match(/instagram\.com\/([^/?#]+)/)||[])[1];
  if(handle) $("#igTxt").textContent="Instagram @"+handle;
}).catch(()=>{});
})();
