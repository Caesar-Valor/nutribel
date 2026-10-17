/* =========================================================
   metodo.html — los 6 pasos y "nos encargamos del resto"
   Contenido desde data/servicios.json
   ========================================================= */
(function(){
"use strict";
const {$, esc} = NB;

NB.load("servicios").then(s=>{
  // El ícono ya incluye el número del paso: es decorativo (la lista <ol> anuncia el orden)
  $("#steps6").innerHTML = s.metodo_1_al_6.map((m,i)=>`
    <li style="--mc:${esc(m.color)};--i:${i}">
      <span class="ic"><img src="${esc(m.icono)}" alt="" width="96" height="80"${i>=2?' loading="lazy"':""}></span>
      <div><h3>${esc(m.titulo)}</h3><p>${esc(m.texto)}</p></div>
    </li>`).join("");
  $("#resto").innerHTML = s.nos_encargamos.map(t=>`<li>${esc(t)}</li>`).join("");
}).catch(()=>{});
})();
