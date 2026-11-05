/* =========================================================
   balé — cuenta.html («Mi cuenta» de la clienta)
   Entrar (correo → código) · completar la ficha la primera vez · su espacio: próximas reservas
   (ver y cancelar; el mismo día, con el cargo de RD$300), membresía y pago, historial, avisos,
   borrar sus datos (Ley 172-13) y salir. Todo por funciones cliente_* de la base de datos:
   cada clienta ve solo lo suyo. Sin la función o sin config, dice que llega muy pronto.
   ========================================================= */
(function(){
"use strict";
const NB = window.BALE, C = window.BALE_CUENTA;
const {$, esc} = NB;
const q = new URLSearchParams(location.search);
const volver = /^[a-z0-9-]+\.html(#p\d+)?$/.test(q.get("volver")||"") ? q.get("volver") : null;
let correo = "", ESP = null;

const pasos = ["cuEntrar","cuFicha","cuMio"];
function ver(id){
  pasos.forEach(p=>{ $("#"+p).hidden=p!==id; });
  $("#cuTitulo").textContent=id==="cuFicha"?"Tu ficha":"Mi cuenta";
}
function aviso(txt,html){ const a=$("#cuAviso"); if(!txt&&!html){ a.hidden=true; a.textContent=""; return; } if(html) a.innerHTML=html; else a.textContent=txt; a.hidden=false; }
function limpiar(form){ form.querySelectorAll("[aria-invalid]").forEach(e=>e.removeAttribute("aria-invalid")); form.querySelectorAll(".error").forEach(e=>{ e.hidden=true; e.textContent=""; }); }
function error(el,msg){ el.setAttribute("aria-invalid","true"); const b=document.getElementById("e-"+el.id); if(b){ b.textContent=msg; b.hidden=false; } el.focus(); return false; }
function ocupado(btn,on,txt){ if(on){ btn.dataset.t=btn.textContent; btn.textContent=txt||"Un momento…"; } else if(btn.dataset.t) btn.textContent=btn.dataset.t; btn.disabled=on; btn.toggleAttribute("aria-busy",on); }
const correoOk = s=>/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(s)&&s.length<=254;

/* ---------- Entrar ---------- */
$("#fCorreo").addEventListener("submit",async e=>{
  e.preventDefault(); limpiar(e.target);
  const v=$("#cuCorreo").value.trim().toLowerCase();
  if(!correoOk(v)) return error($("#cuCorreo"),"Escribe un correo válido, por ejemplo tucorreo@gmail.com.");
  const b=$("#cuEnviar"); ocupado(b,true,"Enviando…");
  try{
    await C.enviarCodigo(v); correo=v;
    $("#cuEnviado").textContent=`Te enviamos un código de 6 números a ${v}.`;
    $("#fCorreo").hidden=true; $("#fCodigo").hidden=false; $("#cuCodigo").value=""; $("#cuCodigo").focus();
  }catch(err){ error($("#cuCorreo"),C.mensaje(err)); }
  finally{ ocupado(b,false); }
});
$("#fCodigo").addEventListener("submit",async e=>{
  e.preventDefault(); limpiar(e.target);
  const v=$("#cuCodigo").value.replace(/\D/g,"");
  if(v.length!==6) return error($("#cuCodigo"),"El código tiene 6 números.");
  const b=$("#cuEntrarBtn"); ocupado(b,true,"Entrando…");
  try{ await C.verificar(correo,v); await despues(true); }
  catch(err){ error($("#cuCodigo"),C.mensaje(err)); }
  finally{ ocupado(b,false); }
});
$("#cuCodigo").addEventListener("input",e=>{ const v=e.target.value.replace(/\D/g,"").slice(0,6); if(v!==e.target.value) e.target.value=v; });
$("#cuOtro").addEventListener("click",()=>{ $("#fCodigo").hidden=true; $("#fCorreo").hidden=false; $("#cuCorreo").focus(); });

/* ---------- Después de entrar: ficha o su espacio ---------- */
async function despues(recien){
  let yo=null;
  try{ yo=await C.yo(); }catch(err){ aviso(C.mensaje(err)); ver("cuEntrar"); return; }
  if(!yo){ ver("cuEntrar"); return; }
  if(!yo.ok){ aviso(yo.mensaje||C.mensaje(yo)); await C.salir(); ver("cuEntrar"); return; }
  if(!yo.vinculada){ ver("cuFicha"); $("#cuNombre").focus(); return; }
  if(recien&&volver){ location.replace(volver); return; }
  await espacio();
}
$("#fFicha").addEventListener("submit",async e=>{
  e.preventDefault(); limpiar(e.target);
  if($("#cuNombre").value.trim().length<2) return error($("#cuNombre"),"Escribe tu nombre y apellido.");
  if($("#cuTel").value.replace(/\D/g,"").length<8) return error($("#cuTel"),"Escribe un WhatsApp de 10 dígitos, por ejemplo 809-000-0000. Si es de otro país, empieza con + y el código.");
  if(!$("#cuPriv").checked) return error($("#cuPriv"),"Para crear tu ficha, acepta el aviso de privacidad.");
  const b=e.target.querySelector('[type="submit"]'); ocupado(b,true,"Guardando…");
  try{
    const tel=/^\s*(\+|00)/.test($("#cuTel").value)?"+"+$("#cuTel").value.replace(/\D/g,"").replace(/^00/,""):$("#cuTel").value;
    const j=await C.rpc("cliente_crear_ficha",{p_nombre:$("#cuNombre").value.trim(),p_telefono:tel,p_acepta_privacidad:$("#cuPriv").checked});
    if(!j.ok){
      const el=j.campo==="nombre"?$("#cuNombre"):j.campo==="telefono"?$("#cuTel"):j.error==="falta_consentimiento"?$("#cuPriv"):null;
      if(el) error(el,j.mensaje||"Revisa este dato."); else aviso(j.mensaje||"No pudimos guardar tu ficha.");
      return;
    }
    if(volver){ location.replace(volver); return; }
    await espacio();
    NB.toast("Listo: tu ficha quedó guardada.");
  }catch(err){ aviso(C.mensaje(err)); }
  finally{ ocupado(b,false); }
});

/* ---------- Su espacio ---------- */
const PAGO = {pendiente:"Pago pendiente", pagado:"Pagado", membresia:"Incluida en tu membresía", cortesia:"Cortesía"};
async function espacio(){
  let j;
  try{ j=await C.rpc("cliente_mi_espacio"); }catch(err){ aviso(C.mensaje(err)); if(/no_autorizado|sin_ficha|jwt/i.test(String(err.message))){ await C.salir(); ver("cuEntrar"); } return; }
  ESP=j; aviso("");
  const c=j.clienta;
  $("#cuHola").textContent=`Hola, ${c.primer_nombre||c.nombre}.`;
  // Próximas reservas
  $("#cuProximas").innerHTML=j.proximas.length ? j.proximas.map(R=>`<li>
      <span class="cl-t">${esc(R.clase)}</span>
      <span class="cl-m">${esc(cap(R.fecha_larga))} · ${esc(R.hora)} · ${esc(R.instructora)}</span>
      <span class="cl-m">${esc(R.lugar_texto)} · ${esc(R.pago_texto||PAGO[R.pago_estado]||"")}</span>
      <div class="bkbtns"><a class="btn line sm" href="mi-reserva.html#t=${esc(R.token)}">Ver o pagar</a>${R.cancelable?`<button class="btn texto sm" type="button" data-cancelar="${R.id}">Cancelar</button>`:""}</div>
    </li>`).join("") : `<li class="vacio">No tienes reservas próximas.</li>`;
  // Membresía
  const ms=j.membresias||[];
  $("#cuMembresia").innerHTML=ms.length ? `<ul class="cu-lista">${ms.map(M=>`<li>
      <span class="cl-t">${esc(M.plan)}</span>
      <span class="cl-m">Del ${esc(M.desde_larga)} al ${esc(M.hasta_larga)}${M.estado&&M.estado!=="activa"?` · ${esc(M.estado)}`:""}</span>
      ${Array.isArray(M.fijos)&&M.fijos.length?`<span class="cl-m">Lugar fijo: ${esc(M.fijos.map(f=>f.texto||f).join(", "))}</span>`:""}
      <span class="cl-m">${esc(M.pago_texto||PAGO[M.pago_estado]||"")}</span>
      ${M.por_pagar&&M.token?`<div class="bkbtns"><a class="btn line sm" href="mi-reserva.html#t=${esc(M.token)}">Pagar con tarjeta o avisar «Ya transferí»</a></div>`:""}
    </li>`).join("")}</ul>` : `<p class="vacio">No tienes una membresía activa. <a href="precios.html#membresias">Ver las membresías</a>.</p>`;
  // Historial
  const EST={activa:"Reservada",cancelada:"Cancelada"}, AS={asistio:"Asististe",falto:"No asististe"};
  $("#cuHistorial").innerHTML=j.historial.length ? j.historial.map(h=>`<li>
      <span class="cl-t">${esc(h.clase)}</span>
      <span class="cl-m">${esc(cap(h.fecha_larga))} · ${esc(h.hora)} · ${esc(h.estado==="cancelada"?"Cancelada":(AS[h.asistencia]||EST[h.estado]||h.estado))}${h.cancelacion_tardia&&h.cargo?` · cargo de ${esc(NB.money(+h.cargo))}`:""}</span>
    </li>`).join("") : `<li class="vacio">Todavía no hay clases en tu historial.</li>`;
  // Avisos
  $("#cuWa").checked=!!c.acepta_whatsapp; $("#cuCom").checked=!!c.acepta_comunidad;
  ver("cuMio");
}
const cap = s=>s?s.charAt(0).toUpperCase()+s.slice(1):"";

/* ---------- Diálogo de confirmación ---------- */
function confirmar({titulo,html,si,peligro,escribir}){
  const d=$("#cuDlg"); $("#cuDlgT").textContent=titulo; $("#cuDlgTxt").innerHTML=html;
  $("#cuDlgErr").hidden=true; $("#cuDlgSi").textContent=si; $("#cuDlgSi").classList.toggle("peligro",!!peligro);
  return new Promise(ok=>{
    const fin=v=>{ d.removeEventListener("close",cerrar); $("#cuDlgForm").removeEventListener("submit",env); ok(v); };
    const cerrar=()=>fin(null);
    const env=e=>{ e.preventDefault(); const inp=$("#cuDlgTxt input"); if(escribir&&inp&&inp.value.trim().toUpperCase()!=="BORRAR"){ $("#cuDlgErr").textContent="Escribe BORRAR para confirmar."; $("#cuDlgErr").hidden=false; inp.setAttribute("aria-invalid","true"); inp.focus(); return; } const v=inp?inp.value:"si"; d.removeEventListener("close",cerrar); d.close(); fin(v); };
    d.addEventListener("close",cerrar); $("#cuDlgForm").addEventListener("submit",env);
    d.showModal(); ( $("#cuDlgTxt input")||$("#cuDlgNo") ).focus();
  });
}
$("#cuDlgNo").addEventListener("click",()=>$("#cuDlg").close());

$("#cuProximas").addEventListener("click",async e=>{
  const b=e.target.closest("[data-cancelar]"); if(!b||!ESP) return;
  const R=ESP.proximas.find(x=>String(x.id)===b.dataset.cancelar); if(!R) return;
  const tarde=R.cancelar_es_tardio, cargo=R.cargo_si_cancela;
  const ok=await confirmar({titulo:"¿Cancelar esta reserva?", si:"Sí, cancelar", peligro:true,
    html:`<p>${esc(R.clase)}, ${esc(R.fecha_larga)} a las ${esc(R.hora)}.</p>${tarde?`<p><b>Es el mismo día de la clase: se cobra el cargo de ${esc(NB.money(+cargo||300))}.</b></p>`:"<p>Tu lugar queda libre para otra persona.</p>"}`});
  if(!ok) return;
  ocupado(b,true,"Cancelando…");
  try{
    const j=await C.rpc("cliente_cancelar_reserva",{p_reserva_id:R.id});
    if(!j.ok){ NB.toast(j.mensaje||"No se pudo cancelar. Escríbenos por WhatsApp."); return; }
    NB.toast(j.tardia?`Reserva cancelada. Cargo por cancelación del mismo día: ${NB.money(+j.cargo||300)}.`:"Reserva cancelada.");
    await espacio();
  }catch(err){ NB.toast(C.mensaje(err)); }
  finally{ if(document.contains(b)) ocupado(b,false); }
});

$("#fAvisos").addEventListener("submit",async e=>{
  e.preventDefault();
  const b=e.target.querySelector('[type="submit"]'); ocupado(b,true,"Guardando…");
  try{
    const j=await C.rpc("cliente_guardar_avisos",{p_acepta_whatsapp:$("#cuWa").checked,p_acepta_comunidad:$("#cuCom").checked});
    NB.toast(j.ok?"Avisos guardados.":(j.mensaje||"No se pudieron guardar."));
  }catch(err){ NB.toast(C.mensaje(err)); }
  finally{ ocupado(b,false); }
});

$("#cuBorrar").addEventListener("click",async()=>{
  const v=await confirmar({titulo:"Borrar mis datos", si:"Borrar mis datos", peligro:true, escribir:true,
    html:`<p>Se borran tu nombre, WhatsApp y correo, se cancelan tus reservas futuras y tu membresía, y se cierra tu cuenta. Queda solo un historial sin tu nombre. <b>No se puede deshacer.</b></p>
      <div class="campo"><label for="cuConf">Para confirmar, escribe BORRAR</label><input id="cuConf" autocomplete="off" aria-describedby="cuDlgErr"></div>`});
  if(!v) return;
  try{
    const j=await C.rpc("cliente_borrar_mis_datos",{p_confirmacion:v});
    if(!j.ok){ NB.toast(j.mensaje||"No se pudo. Escríbenos por WhatsApp."); return; }
    await C.salir();
    ver("cuEntrar"); $("#fCodigo").hidden=true; $("#fCorreo").hidden=false;
    aviso("Listo: borramos tus datos personales y cerramos tu cuenta.");
  }catch(err){ NB.toast(C.mensaje(err)); }
});

$("#cuSalir").addEventListener("click",async()=>{ await C.salir(); ESP=null; ver("cuEntrar"); $("#fCodigo").hidden=true; $("#fCorreo").hidden=false; aviso("Saliste de tu cuenta."); });

/* ---------- Arranque ---------- */
C.disponible().then(async ok=>{
  if(!ok){
    pasos.forEach(p=>{ $("#"+p).hidden=true; });
    aviso(null,`Muy pronto vas a poder entrar aquí con tu correo para ver tus reservas y tu membresía. Mientras tanto, <a href="reservar.html">reserva en el horario</a>; cada reserva trae su enlace para verla o cancelarla.`);
    return;
  }
  if(C.haySesionGuardada()) await despues(false); else ver("cuEntrar");
}).catch(()=>ver("cuEntrar"));
})();
