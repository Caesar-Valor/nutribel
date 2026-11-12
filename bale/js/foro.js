/* =========================================================
   balé — comunidad.html: conversación de alumnas (13/11/2026, DECISIONES §44)
   Apagada hasta que el estudio la encienda (ajuste comunidad_foro de la base). Con la sesión de
   «Mi cuenta» (js/cuenta-sesion.js): reglas la primera vez; posts y comentarios de solo texto
   (hasta 500 caracteres, sin enlaces), «Me gusta» y «Reportar». Se ve «Laura M.»; nunca correos ni
   teléfonos. Todo se borra a los 10 días, salvo lo fijado por el estudio.
   Si la base no responde o la función aún no existe, la sección no aparece.
   ========================================================= */
(function(){
"use strict";
const NB = window.BALE, C = window.BALE_CUENTA;
const {$, esc} = NB;
let V = null;
const ENLACE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|do|io|co|me|app|link|ly|info|biz|xyz|shop|site|online)\b)/i;
const REGLAS = ["Trata a todas con respeto y cariño: nada de burlas, críticas al cuerpo ni comentarios sobre el físico de nadie.",
  "Solo texto, hasta 500 caracteres. Sin enlaces, ventas, publicidad ni datos personales (teléfonos, direcciones, correos).",
  "Nada de consejos médicos ni de salud: para eso, tu médico.",
  "Lo que se publica aquí se borra solo a los 10 días.",
  "El estudio puede borrar lo que no siga estas reglas y pausar la participación de quien no las respete. Si ves algo que no está bien, pulsa «Reportar»."];

const cuando = iso=>{ try{ return new Date(iso).toLocaleString("es-DO",{timeZone:"America/Santo_Domingo",day:"numeric",month:"long",hour:"numeric",minute:"2-digit"}); }catch(e){ return ""; } };
// Un post nuevo va arriba, pero debajo de lo fijado por el estudio
const alPrincipio = p=>{ const i=V.posts.findIndex(x=>!x.fijado); V.posts.splice(i<0?V.posts.length:i,0,p); };
const quedan = d=>d==null?"Fijado por el estudio":d<=1?"Se borra mañana":`Se borra en ${d} días`;
const corazon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.4 5 7 5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.6 0 5.8 3.6 4.5 6.8C19.5 16.4 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
function gusta(tipo,x){
  return `<button class="btn texto sm megusta" type="button" data-foro-gusta="${tipo}" data-id="${x.id}" aria-pressed="${!!x.mio_gusta}">${corazon}Me gusta${x.me_gusta?` · ${x.me_gusta}`:""}</button>`;
}
function acciones(tipo,x){
  const rep=x.mio||x.del_estudio?"":x.reportado?`<span class="cmeta">Reportado</span>`:`<button class="btn texto sm" type="button" data-foro-rep="${tipo}" data-id="${x.id}">Reportar</button>`;
  const borrar=x.mio?`<button class="btn texto sm" type="button" data-foro-borrar="${tipo}" data-id="${x.id}">Borrar</button>`:"";
  return `${V.reglas_aceptadas&&V.motivo!=="suspendida"?gusta(tipo,x):""}${rep}${borrar}`;
}
function post(p){
  const puede=V.puede_publicar;
  return `<li class="foro-post${p.fijado?" fijado":""}" id="foro${p.id}">
    <p class="foro-autor"><b>${esc(p.autor)}</b>${p.del_estudio?` <span class="solo-com">Estudio</span>`:""} <span class="cmeta">${esc(cuando(p.creado))} · ${esc(quedan(p.borra_en_dias))}</span></p>
    <p class="foro-texto">${esc(p.texto)}</p>
    <div class="acciones">${acciones("post",p)}</div>
    ${(p.comentarios||[]).length?`<ul class="foro-coms" role="list">${p.comentarios.map(k=>`<li><p><b>${esc(k.autor)}:</b> ${esc(k.texto)}</p><div class="acciones">${acciones("comentario",k)}</div></li>`).join("")}</ul>`:""}
    ${puede?`<form class="form foro-com" data-foro-comentar="${p.id}" novalidate><div class="campo"><label for="fc${p.id}">Tu comentario</label><input id="fc${p.id}" maxlength="500" aria-describedby="efc${p.id}"><p class="error" id="efc${p.id}" hidden></p></div><button class="btn line sm" type="submit">Comentar</button></form>`:""}
  </li>`;
}
function pintar(){
  const box=$("#foroCuerpo"), sec=$("#foro");
  if(!V||!V.activo){ sec.hidden=true; return; }
  sec.hidden=false;
  if(!V.con_sesion){ box.innerHTML=`<p>Para leer y participar, entra con tu correo.</p><a class="btn" href="cuenta.html?volver=${encodeURIComponent("comunidad.html#foro")}">Entrar a mi cuenta</a>`; return; }
  if(!V.reglas_aceptadas){
    box.innerHTML=`<div class="foro-reglas"><h3>Reglas de la comunidad</h3><ol>${REGLAS.map(r=>`<li>${esc(r)}</li>`).join("")}</ol>
      <p class="ayuda">Se ve tu nombre y la inicial de tu apellido (por ejemplo, «${esc(V.yo||"Laura M.")}»). Más detalles en el <a href="privacidad.html">aviso de privacidad</a>.</p>
      <button class="btn" type="button" id="foroAcepto">Acepto las reglas</button></div>`;
    return;
  }
  const form=V.puede_publicar?`<form class="form foro-nuevo" id="foroNuevo" novalidate><div class="campo"><label for="foroTxt">Escribe a la comunidad</label>
      <textarea id="foroTxt" rows="3" maxlength="500" aria-describedby="foroCuenta foroErr"></textarea><p class="ayuda" id="foroCuenta">Hasta 500 caracteres, sin enlaces. Se publica como ${esc(V.yo||"")}.</p><p class="error" id="foroErr" hidden></p></div>
      <button class="btn" type="submit">Publicar</button></form>`:`<p class="aviso-linea">${esc(V.mensaje||"")}</p>`;
  box.innerHTML=form+((V.posts||[]).length?`<ul class="foro-lista" role="list">${V.posts.map(post).join("")}</ul>`:`<p class="vacio-com">Todavía no hay mensajes. ¡Escribe el primero!</p>`);
}
function reemplazar(p){
  const i=V.posts.findIndex(x=>x.id===p.id); if(i<0){ alPrincipio(p); pintar(); return; }
  V.posts[i]=p; const el=document.getElementById("foro"+p.id); if(!el){ pintar(); return; }
  const t=document.createElement("template"); t.innerHTML=post(p).trim(); el.replaceWith(t.content.firstElementChild);
}
function errorEn(inp,err,msg){ inp.setAttribute("aria-invalid","true"); err.textContent=msg; err.hidden=false; inp.focus(); }
const valido = t=>t.length<2||t.length>500?"Escribe de 2 a 500 caracteres.":ENLACE.test(t)?"Por ahora no se pueden poner enlaces.":"";

async function cargar(){
  if(!C) return;
  const S=await C.listo; if(!S||S.comunidad!==true) return;
  try{
    V=C.haySesionGuardada()&&await C.sesion()?await C.rpc("foro_ver"):await C.publica("foro_ver");
    if(V&&V.ok) pintar();
  }catch(e){ /* sin la función en la base todavía: la sección no aparece */ }
}

document.addEventListener("click",async e=>{
  const b=e.target.closest("#foroAcepto,[data-foro-gusta],[data-foro-rep],[data-foro-borrar]"); if(!b||!$("#foro").contains(b)) return;
  b.disabled=true;
  try{
    if(b.id==="foroAcepto"){ const j=await C.rpc("foro_aceptar_reglas"); if(j.ok){ V=await C.rpc("foro_ver"); pintar(); const t=$("#foroTxt"); if(t) t.focus(); } else NB.toast(j.mensaje||"No se pudo."); return; }
    const tipo=b.dataset.foroGusta||b.dataset.foroRep||b.dataset.foroBorrar, id=+b.dataset.id;
    if(b.dataset.foroGusta){ const j=await C.rpc("foro_me_gusta",{p_tipo:tipo,p_id:id,p_on:b.getAttribute("aria-pressed")!=="true"}); if(j.ok) reemplazar(j.post); else NB.toast(j.mensaje||"No se pudo."); return; }
    if(b.dataset.foroRep){
      const j=await C.rpc("foro_reportar",{p_tipo:tipo,p_id:id,p_motivo:null});   // el estudio ve qué se reportó NB.toast(j.mensaje||"Gracias. El estudio lo revisa.");
      if(j.ok){ V=await C.rpc("foro_ver"); pintar(); } return; }
    if(b.dataset.foroBorrar){ const j=await C.rpc("foro_borrar_mio",{p_tipo:tipo,p_id:id}); if(j.ok){ NB.toast("Borrado"); V=await C.rpc("foro_ver"); pintar(); } else NB.toast(j.mensaje||"No se pudo."); }
  }catch(err){ NB.toast(C.mensaje(err)); }
  finally{ if(document.contains(b)) b.disabled=false; }
});
document.addEventListener("submit",async e=>{
  const f=e.target.closest("#foroNuevo,[data-foro-comentar]"); if(!f) return;
  e.preventDefault();
  const inp=f.querySelector("textarea,input"), err=f.querySelector(".error"), b=f.querySelector('[type="submit"]'), t=inp.value.trim();
  err.hidden=true; inp.removeAttribute("aria-invalid");
  const m=valido(t); if(m){ errorEn(inp,err,m); return; }
  b.disabled=true;
  try{
    const j=f.id==="foroNuevo"?await C.rpc("foro_publicar",{p_texto:t}):await C.rpc("foro_comentar",{p_post_id:+f.dataset.foroComentar,p_texto:t});
    if(!j.ok){ errorEn(inp,err,j.mensaje||"No se pudo publicar."); return; }
    inp.value="";
    if(f.id==="foroNuevo"){ alPrincipio(j.post); pintar(); NB.toast("Publicado"); } else { reemplazar(j.post); const n=$(`#fc${j.post.id}`); if(n) n.focus(); }
  }catch(x){ NB.toast(C.mensaje(x)); }
  finally{ if(document.contains(b)) b.disabled=false; }
});

cargar();
})();
