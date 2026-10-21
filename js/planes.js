/* =========================================================
   planes.html — 13 planes con filtros y temporada según la fecha
   Contenido desde data/planes.json
   ========================================================= */
(function(){
"use strict";
const {$, esc} = NB;
let P, kind="todos";

// De temporada: "Disponible ahora" si hoy cae en sus meses (y antes del día de fin)
function status(p){
  const t=p.temporada; if(!t) return null;
  const now=new Date(), mo=now.getMonth()+1, day=now.getDate();
  let on=t.meses.includes(mo);
  if(on&&t.fin&&mo===t.fin[0]&&day>t.fin[1]) on=false;
  return on?{now:true,txt:"Disponible ahora"}:{now:false,txt:t.texto};
}

function render(){
  $("#planFilter").innerHTML=Object.entries(P.tipos).map(([k,v])=>`<button class="chip" type="button" aria-pressed="${kind===k}" data-k="${k}">${esc(v)}</button>`).join("");
  const list=P.planes.filter(p=>kind==="todos"||p.tipo===kind)
    .sort((a,b)=>(status(b)?.now?1:0)-(status(a)?.now?1:0));
  $("#plans").innerHTML=list.map((p,i)=>{const s=status(p);return `
    <article class="card plan" style="--accent:var(--${esc(p.color||"olive")});--i:${i}">
      ${p.imagen?`<div class="ph"><img loading="lazy" decoding="async" src="${esc(p.imagen)}" srcset="${esc(NB.srcset(p.imagen))}" sizes="(max-width:700px) calc(100vw - 40px), 340px" alt="${esc(p.alt||p.nombre)}"></div>`:""}
      ${s?`<span class="badge ${s.now?"now":""}">${esc(s.txt)}</span>`:""}
      <h3>${esc(p.nombre)}</h3>
      <p>${esc(p.descripcion)}</p>
      <a class="add" href="consulta.html?plan=${encodeURIComponent(p.nombre)}">Consultar con la doctora</a>
    </article>`}).join("");
}

NB.load("planes").then(data=>{
  P=data; render();
  $("#planFilter").addEventListener("click",e=>{
    const c=e.target.closest("[data-k]"); if(!c) return;
    kind=c.dataset.k; render();
    $(`#planFilter [data-k="${kind}"]`).focus();
  });
}).catch(()=>{});
})();
