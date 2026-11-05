/* =========================================================
   balé — comunidad.html
   La página ya trae, compilado desde data/comunidad.json, lo de siempre (respaldo).
   Con data/config.json → sistema.comunidad = true (después de aplicar la migración), se cambia por las
   publicaciones del estudio: actividades con «Me apunto» (cupo y lista de espera), anuncios y
   fotos, «Me gusta» y comentarios (si el estudio los encendió; se ven al aprobarlos).
   Sin sesión, «Me apunto» lleva a «Mi cuenta» y vuelve aquí. Si algo falla, queda el respaldo.
   ========================================================= */
(function(){
"use strict";
const NB = window.BALE, C = window.BALE_CUENTA;
const {$, esc} = NB;
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
let BASE = "", conSesion = false, PUBS = [];

// **negrita**, listas con «- » y párrafos; todo escapado antes
function cuerpo(t){
  const bloques=String(t||"").replace(/\r/g,"").split(/\n{2,}/);
  return bloques.map(b=>{
    const ls=b.split("\n"), neg=s=>esc(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");
    if(ls.every(l=>/^\s*-\s+/.test(l))) return `<ul>${ls.map(l=>`<li>${neg(l.replace(/^\s*-\s+/,""))}</li>`).join("")}</ul>`;
    return `<p>${ls.map(neg).join("<br>")}</p>`;
  }).join("");
}
const fotoSrc = f=>f.ruta ? `${BASE}/storage/v1/object/public/comunidad/${f.ruta.split("/").map(encodeURIComponent).join("/")}` : f.src;
const fotos = (p,sizes)=>(p.fotos||[]).length ? `<div class="afotos">${p.fotos.map((f,i)=>`<img src="${esc(fotoSrc(f))}" alt="${esc(f.alt||"")}" width="800" height="1000" loading="${i?"lazy":"lazy"}" decoding="async" sizes="${sizes}">`).join("")}</div>` : "";
function hora12(h){ if(!h) return ""; const [H,M]=h.split(":").map(Number); return `${(H%12)||12}:${String(M).padStart(2,"0")} ${H<12?"a. m.":"p. m."}`; }

function accion(p){
  if(p.tipo!=="actividad") return "";
  const mio=p.mio&&p.mio.apuntada;
  const cupo=p.cupo!=null?`<p class="acupo" aria-live="polite">${p.libres>0?`${p.libres} de ${p.cupo} lugares libres`:"Llena: puedes quedar en la lista de espera"}</p>`:"";
  let b;
  if(!conSesion) b=`<a class="btn sm" href="cuenta.html?volver=${encodeURIComponent(`comunidad.html#p${p.id}`)}">Me apunto</a>`;
  else if(mio==="apuntada") b=`<span class="mode">Estás apuntada</span> <button class="btn texto sm" type="button" data-salir="${p.id}">Ya no voy</button>`;
  else if(mio==="espera") b=`<span class="mode">En la lista de espera</span> <button class="btn texto sm" type="button" data-salir="${p.id}">Salir de la lista</button>`;
  else b=`<button class="btn sm" type="button" data-apuntar="${p.id}">${p.cupo!=null&&p.libres<=0?"Lista de espera":"Me apunto"}</button>`;
  return cupo+`<div class="acciones">${b}</div>`;
}
function social(p){
  const g=conSesion?`<button class="btn texto sm megusta" type="button" data-gusta="${p.id}" aria-pressed="${!!(p.mio&&p.mio.me_gusta)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.4 5 7 5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.6 0 5.8 3.6 4.5 6.8C19.5 16.4 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>Me gusta${p.me_gusta?` · ${p.me_gusta}`:""}</button>`
    : (p.me_gusta?`<span class="cmeta">${p.me_gusta} ${p.me_gusta===1?"Me gusta":"Me gusta"}</span>`:"");
  const com=p.permite_comentarios?`<div class="comentarios">${(p.comentarios||[]).map(c=>`<p><b>${esc(c.nombre)}:</b> ${esc(c.texto)}</p>`).join("")}
      ${conSesion?`<form class="form" data-comentar="${p.id}"><div class="campo"><label for="com${p.id}">Tu comentario</label><input id="com${p.id}" maxlength="500" aria-describedby="e-com${p.id}"><p class="error" id="e-com${p.id}" hidden></p></div><button class="btn line sm" type="submit">Enviar comentario</button></form>`:""}</div>`:"";
  return (g?`<div class="acciones">${g}</div>`:"")+com;
}
function tarjeta(p){
  const wa=p.mensaje?`<button class="btn line sm" type="button" data-wa="${esc(p.mensaje)}">${esc(p.boton||"Escribir por WhatsApp")}</button>`:"";
  const solo=p.visibilidad==="comunidad"?`<span class="solo-com">Solo comunidad</span>`:"";
  if(p.tipo==="actividad"){
    const [, m, d]=p.fecha.split("-").map(Number);
    const meta=[`${d} de ${MESES[m-1]}`, hora12(p.hora), p.lugar, p.precio!=null?NB.money(+p.precio):"Gratis"].filter(Boolean).join(" · ");
    return `<li class="actividad" id="p${p.id}"><p class="afecha" aria-hidden="true"><b>${d}</b><span>${MESES[m-1].slice(0,3)}</span></p>
      <div>${solo}<h3>${esc(p.titulo)}</h3><p class="ameta">${esc(meta)}</p><div class="cuerpo-pub">${cuerpo(p.cuerpo)}</div>${fotos(p,"(min-width:768px) 200px, 40vw")}${accion(p)}${wa?`<div class="acciones">${wa}</div>`:""}${social(p)}</div></li>`;
  }
  const f=(p.fotos||[])[0];
  return `<li class="momento" id="p${p.id}">${f?`<figure><img src="${esc(fotoSrc(f))}" alt="${esc(f.alt||"")}" width="800" height="1000" loading="lazy" decoding="async"></figure>`:""}
    ${solo}<h3>${esc(p.titulo)}</h3><div class="cuerpo-pub">${cuerpo(p.cuerpo)}</div>${(p.fotos||[]).length>1?fotos({fotos:p.fotos.slice(1)},"(min-width:768px) 160px, 30vw"):""}${wa?`<div class="acciones">${wa}</div>`:""}${social(p)}</li>`;
}
function pintar(j){
  PUBS=j.publicaciones||[];
  const hoy=new Date().toISOString().slice(0,10);
  const prox=PUBS.filter(p=>p.tipo==="actividad"&&p.fecha>=hoy), resto=PUBS.filter(p=>!(p.tipo==="actividad"&&p.fecha>=hoy));
  const box=$("#comunidad");
  box.innerHTML=(prox.length?`<section class="csec" aria-labelledby="t-prox"><h2 id="t-prox">Próximas actividades</h2><ul class="actividades" role="list">${prox.map(tarjeta).join("")}</ul></section>`:"")+
    (resto.length?`<section class="csec" aria-labelledby="t-mom"><h2 id="t-mom">Momentos</h2><ul class="momentos" role="list">${resto.map(tarjeta).join("")}</ul></section>`:"")+
    (!PUBS.length?`<section class="csec"><p class="vacio">Pronto publicamos las próximas actividades.</p></section>`:"");
  box.dataset.fuente="db";
  $("#comSolo").hidden=!(j.ocultas>0&&!conSesion);
  if(location.hash){ const el=document.getElementById(location.hash.slice(1)); if(el) el.scrollIntoView({block:"start"}); }
}
function reemplazar(p){
  const i=PUBS.findIndex(x=>x.id===p.id); if(i<0) return;
  PUBS[i]=p; const el=document.getElementById("p"+p.id); if(!el) return;
  const t=document.createElement("template"); t.innerHTML=tarjeta(p).trim(); el.replaceWith(t.content.firstElementChild);
}

async function cargar(){
  if(!C) return;
  const S=await C.listo;
  if(!S||S.comunidad!==true) return;   // se enciende en config.json al aplicar la migración (sistema.comunidad)
  try{
    let j;
    if(C.haySesionGuardada()&&await C.sesion()){ j=await C.rpc("comunidad_publicaciones"); conSesion=!!j.con_sesion; }
    else j=await C.publica("comunidad_publicaciones");
    if(!j||!j.ok) return;
    const c=await NB.ready; BASE=String((c.sistema&&c.sistema.url)||"").replace(/\/+$/,"");
    pintar(j);
  }catch(e){ /* sin la comunidad en la base todavía: queda lo de comunidad.json */ }
}

document.addEventListener("click",async e=>{
  const a=e.target.closest("[data-apuntar],[data-salir],[data-gusta]"); if(!a) return;
  const id=+(a.dataset.apuntar||a.dataset.salir||a.dataset.gusta);
  const fn=a.dataset.apuntar?"comunidad_apuntarme":a.dataset.salir?"comunidad_desapuntarme":"comunidad_me_gusta";
  const args=fn==="comunidad_me_gusta"?{p_id:id,p_on:a.getAttribute("aria-pressed")!=="true"}:{p_id:id};
  a.disabled=true;
  try{
    const j=await C.rpc(fn,args);
    if(!j.ok){ NB.toast(j.mensaje||"No se pudo. Inténtalo de nuevo."); a.disabled=false; return; }
    if(j.publicacion) reemplazar(j.publicacion);
    if(j.mensaje) NB.toast(j.mensaje); else if(fn==="comunidad_desapuntarme") NB.toast("Listo: ya no estás apuntada.");
    const n=document.querySelector(`#p${id} [data-apuntar],#p${id} [data-salir],#p${id} [data-gusta]`); if(n&&fn!=="comunidad_me_gusta") n.focus();
  }catch(err){ NB.toast(C.mensaje(err)); a.disabled=false; }
});
document.addEventListener("submit",async e=>{
  const f=e.target.closest("[data-comentar]"); if(!f) return;
  e.preventDefault();
  const id=+f.dataset.comentar, inp=f.querySelector("input"), err=f.querySelector(".error"), b=f.querySelector("button");
  err.hidden=true; inp.removeAttribute("aria-invalid");
  const t=inp.value.trim();
  if(t.length<2){ inp.setAttribute("aria-invalid","true"); err.textContent="Escribe un comentario de 2 a 500 letras."; err.hidden=false; inp.focus(); return; }
  b.disabled=true;
  try{
    const j=await C.rpc("comunidad_comentar",{p_id:id,p_texto:t});
    if(!j.ok){ inp.setAttribute("aria-invalid","true"); err.textContent=j.mensaje||"No se pudo enviar."; err.hidden=false; }
    else { inp.value=""; NB.toast(j.mensaje); }
  }catch(x){ NB.toast(C.mensaje(x)); }
  finally{ b.disabled=false; }
});

cargar();
})();
