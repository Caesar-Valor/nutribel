/* =========================================================
   balé — resena.html: «¿Cómo te fue en tu clase?» (13/11/2026, DECISIONES §43)
   Se abre con el enlace del correo del día siguiente: resena.html#r=r<id>-<firma>.
   El token va en el # (no viaja a ningún servidor). Una sola respuesta por enlace;
   la ve solo la dueña del estudio. Llama resena_ver, resena_responder y resena_no_pedir.
   ========================================================= */
(function(){
"use strict";
const NB = window.BALE, SIS = window.BALE_SISTEMA;
const {$, esc} = NB;
const TOKEN_RE = /^r\d{1,18}-[0-9a-f]{32}$/;
const token = (new URLSearchParams(location.hash.slice(1)).get("r")||"").trim().toLowerCase();
const estado = html=>{ $("#reEstado").innerHTML=html; };

function invalido(msg){
  $("#reTitulo").textContent="Este enlace no es válido";
  estado(`<p class="mrmsg">${esc(msg||"Revisa que abriste el enlace completo del correo. Si necesitas ayuda, escríbenos por WhatsApp.")}</p>`);
  $("#reForm").hidden=true; $("#reNo").hidden=true;
}
function gracias(){
  $("#reTitulo").textContent="¡Gracias!";
  estado(`<p class="mrmsg">Recibimos tu opinión. Nos ayuda a cuidar cada clase. Te esperamos pronto en balé.</p>`);
  $("#reForm").hidden=true;
}

async function enviar(e){
  e.preventDefault();
  const el=document.querySelector('input[name="estrellas"]:checked'), err=$("#reErr");
  if(!el){ err.textContent="Elige de 1 a 5 estrellas."; err.hidden=false; document.getElementById("re5").focus(); return; }
  err.hidden=true;
  const b=$("#reEnviar"); b.disabled=true; b.setAttribute("aria-busy","true"); b.textContent="Enviando…";
  let j=null;
  try{ j=await SIS.llamar("resena_responder",{p_token:token,p_estrellas:+el.value,p_comentario:$("#reCom").value.trim()||null}); }catch(x){ j=null; }
  b.disabled=false; b.removeAttribute("aria-busy"); b.textContent="Enviar mi opinión";
  if(!j){ err.textContent="No se pudo enviar. Revisa tu internet e inténtalo de nuevo."; err.hidden=false; return; }
  if(!j.ok&&j.error!=="ya_respondida"){ err.textContent=j.mensaje||"No se pudo enviar."; err.hidden=false; return; }
  gracias();
}
async function noPedir(){
  const b=$("#reNoBtn"); b.disabled=true;
  let j=null;
  try{ j=await SIS.llamar("resena_no_pedir",{p_token:token}); }catch(x){ j=null; }
  b.disabled=false;
  if(j&&j.ok){ $("#reNo").innerHTML=`<span class="ayuda">Listo: no te volveremos a pedir tu opinión por correo.</span>`; }
  else NB.toast("No se pudo guardar. Inténtalo de nuevo.");
}

// Un token en la consulta (?r=) se pasa al # sin que llegue a ningún otro lado
if(/[?&]r=/.test(location.search)) history.replaceState(null,"",location.pathname+location.hash);

Promise.all([NB.ready,SIS.listo]).then(async ([,activo])=>{
  if(!TOKEN_RE.test(token)){ invalido(); return; }
  if(!activo){ estado(`<p class="mrmsg">Ahora mismo no podemos abrirlo en línea. Prueba en unos minutos.</p>`); return; }
  let j=null;
  try{ j=await SIS.llamar("resena_ver",{p_token:token}); }catch(e){ j=null; }
  if(!j){ estado(`<p class="mrmsg">Ahora mismo no podemos abrirlo en línea. Prueba en unos minutos.</p>`); return; }
  if(!j.ok){ invalido(j.error==="token_invalido"?null:j.mensaje); return; }
  if(j.respondida){ $("#reTitulo").textContent="Ya nos contaste"; estado(`<p class="mrmsg">Ya recibimos tu opinión sobre esta clase. ¡Gracias, ${esc(j.nombre)}!</p>`); }
  else {
    estado(`<p class="mrmsg">Hola, ${esc(j.nombre)}. ¿Cómo te fue en tu clase de <b>${esc(j.clase)}</b> con ${esc(j.instructora)}, el ${esc(j.fecha_larga)} a las ${esc(j.hora)}?</p>`);
    $("#reForm").hidden=false;
    $("#reForm").addEventListener("submit",enviar);
  }
  if(!j.sin_pedidos){ $("#reNo").hidden=false; $("#reNoBtn").addEventListener("click",noPedir); }
}).catch(()=>invalido());
})();
