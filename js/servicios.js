/* =========================================================
   servicios.html — listas desde data/servicios.json
   ========================================================= */
(function(){
"use strict";
const {$, esc} = NB;
NB.load("servicios").then(s=>{
  $("#svcA").innerHTML=s.nutricion_y_bienestar.map((x,i)=>`<li style="--i:${i}">${esc(x)}</li>`).join("");
  $("#svcB").innerHTML=s.seguimiento_condiciones.map((x,i)=>`<li style="--i:${i+2}">${esc(x)}</li>`).join("");
}).catch(()=>{});
})();
