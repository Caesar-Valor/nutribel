/* =========================================================
   balé — mi-reserva.html: ver o cancelar una reserva con el enlace del correo
   El token va en el # (mi-reserva.html#t=<id>-<firma>), que no viaja a ningún
   servidor; nunca se pone en la consulta (?). Se llama mi_reserva y
   cancelar_mi_reserva (js/sistema.js). No se muestra el teléfono ni el correo.
   Desde el 4/11/2026 también abre la membresía del aviso de renovación
   (mi-reserva.html#m=m<id>-<firma>, mi_membresia): pagar con tarjeta o «Ya transferí».
   ========================================================= */
(function(){
"use strict";
const NB = window.BALE, SIS = window.BALE_SISTEMA;
const {$, esc} = NB;
const MIS_KEY = "bale-mis-reservas";
const TOKEN_RE = /^\d{1,18}-[0-9a-f]{32}$/, TOKEN_M_RE = /^m\d{1,18}-[0-9a-f]{32}$/;
const params = new URLSearchParams(location.hash.slice(1));
const esMem = !params.get("t")&&!!params.get("m");
const token = ((esMem?params.get("m"):params.get("t"))||"").trim().toLowerCase();
let R=null, CFG=null;

const range = (a,b)=>a.slice(-2)===b.slice(-2) ? `${a.slice(0,-3)} – ${b}` : `${a} – ${b}`;
const dinero = n=>n!=null&&n!==""&&!isNaN(+n)?NB.money(+n):"";
function estado(html){ $("#mrEstado").innerHTML=html; }
function waLink(){ $("#mrWa").onclick=()=>NB.whatsapp(R?(esMem?`Hola, balé. Tengo una consulta sobre mi membresía ${R.plan}.`:`Hola, balé. Tengo una consulta sobre mi reserva de ${R.clase} del ${R.fecha_larga} a las ${R.hora}.`):"Hola, balé. Tengo una consulta sobre mi reserva."); }

function invalido(msg){
  $("#mrTitle").textContent="Este enlace no es válido";
  estado(`<p class="mrmsg">${esc(msg||"Revisa que copiaste el enlace completo del correo. Si necesitas ayuda, escríbenos por WhatsApp.")}</p>`);
  $("#mrSum").hidden=true; $("#mrBtns").hidden=false;
  $("#mrCancel").hidden=true; $("#mrIcs").hidden=true;
  waLink();
}

// Pago pendiente: tarjeta (CardNET por cobro), datos de la transferencia y «Ya transferí»
function pintarPago(){
  const r=R, pay=$("#mrPay"), T=r.pago_transferencia&&typeof r.pago_transferencia==="object"?r.pago_transferencia:null;
  const tarjeta=!!(r.pagar_con_tarjeta&&SIS.tarjeta), transf=!!(r.por_pagar&&SIS.transferencia);
  const fila=(k,v,extra="")=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}${extra}</dd></div>`;
  pay.innerHTML=tarjeta||transf?`<p class="paytit">Pago${dinero(r.monto)?` · ${esc(dinero(r.monto))}`:""}</p>
    ${tarjeta?SIS.tarjeta.html(r):""}
    ${T&&transf?`<dl class="bankd">${fila("Banco",T.banco)}${fila("Tipo de cuenta",T.tipo_cuenta)}${fila("Número",T.cuenta,` <button class="linkbtn" type="button" data-copy="${esc(T.cuenta)}">Copiar número</button>`)}${fila("Titular",T.titular)}</dl>`:""}
    ${transf?SIS.transferencia.html(r):""}`:"";
  pay.hidden=!(tarjeta||transf);
}

function pintarMembresia(){
  const r=R;
  $("#mrTitle").textContent=r.estado!=="activa"?"Membresía cancelada":"Tu membresía";
  document.title="Mi membresía · balé";
  let msg;
  if(r.estado!=="activa") msg=`<p class="mrmsg">Esta membresía está cancelada. Escríbenos por WhatsApp si quieres volver.</p>`;
  else if(r.pago_estado==="pendiente") msg=`<p class="mrmsg">Hola, ${esc(r.nombre)}. Tu membresía queda lista en cuanto pagues: por transferencia (y nos avisas aquí) o con tarjeta.</p>`;
  else msg=`<p class="mrmsg">Hola, ${esc(r.nombre)}. Tu membresía está al día. ¡Gracias!</p>`;
  estado(msg);
  const filas=[["Plan",r.plan],["Del",r.desde_larga],["Al",r.hasta_larga],["Clases fijas",(r.fijos||[]).join(" · ")],["Pago",r.pago_texto]].filter(x=>x[1]);
  $("#mrSum").innerHTML=filas.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
  $("#mrSum").hidden=false; $("#mrBtns").hidden=false;
  pintarPago();
  $("#mrCancel").hidden=true; $("#mrIcs").hidden=true; $("#mrHorario").hidden=false;
  waLink();
}

function pintar(){
  if(esMem){ pintarMembresia(); return; }
  const r=R;
  $("#mrTitle").textContent=r.estado==="cancelada"?"Reserva cancelada":r.clase_cancelada?"La clase se canceló":"Tu reserva";
  let msg="";
  if(r.clase_cancelada) msg=`<p class="mrmsg">El estudio canceló esta clase. No se te cobra nada. Puedes elegir otra en el horario.</p>`;
  else if(r.estado==="cancelada") msg=`<p class="mrmsg">Esta reserva está cancelada.${r.cancelacion_tardia&&r.cargo?` Como se canceló el mismo día de la clase, queda un cargo de ${esc(dinero(+r.cargo))} por cancelación tardía.`:""}</p>`;
  else msg=`<p class="mrmsg">Hola, ${esc(r.nombre)}. Tu reserva está confirmada.</p>`;
  estado(msg);
  const estadoTxt=r.clase_cancelada?"Clase cancelada por el estudio":r.estado==="cancelada"?"Cancelada":"Confirmada";
  const filas=[["Clase",r.clase],["Día",r.fecha_larga],["Hora",range(r.hora,r.hora_fin)],["Instructora",r.instructora],
    ["Lugar",r.lugar_texto],["Pago",r.pago_texto],["Estado",estadoTxt]].filter(x=>x[1]);
  $("#mrSum").innerHTML=filas.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
  $("#mrSum").hidden=false; $("#mrBtns").hidden=false;
  pintarPago();
  $("#mrCancel").hidden=!r.cancelable;
  $("#mrIcs").hidden=r.estado!=="activa"||r.clase_cancelada;
  $("#mrHorario").hidden=!(r.clase_cancelada||r.estado==="cancelada");
  waLink();
}

function quitarDeMias(){
  try{ const a=JSON.parse(localStorage.getItem(MIS_KEY))||[];
    const b=Array.isArray(a)?a.filter(x=>x&&x.t!==token):[];
    b.length?localStorage.setItem(MIS_KEY,JSON.stringify(b)):localStorage.removeItem(MIS_KEY); }catch(e){}
}

function abrirCancelar(){
  const dlg=$("#mrDlg");
  $("#mrDlgTxt").textContent=`${R.clase}, ${R.fecha_larga} a las ${R.hora}.`;
  const t=$("#mrTarde");
  t.hidden=!R.cancelar_es_tardio;
  if(R.cancelar_es_tardio) t.textContent=`Si cancelas hoy se aplica un cargo de ${dinero(+R.cargo_si_cancela)||"RD$300"} por cancelación tardía.`;
  dlg.showModal(); $("#mrNo").focus();
}
async function cancelar(){
  const b=$("#mrSi"); b.disabled=true; b.setAttribute("aria-busy","true"); b.textContent="Cancelando…";
  let j=null;
  try{ j=await SIS.llamar("cancelar_mi_reserva",{p_token:token}); }catch(e){ j=null; }
  b.disabled=false; b.removeAttribute("aria-busy"); b.textContent="Sí, cancelar";
  $("#mrDlg").close();
  if(!j){ estado(`<p class="mrmsg">Ahora mismo no podemos cancelar en línea. Escríbenos por WhatsApp y el estudio la cancela.</p>`); return; }
  if(!j.ok){ if(j.error==="token_invalido"){ invalido(j.mensaje); return; } NB.toast(j.mensaje||"No se pudo cancelar."); return; }
  R=j.reserva; quitarDeMias(); pintar();
  $("#mrTitle").textContent="Tu reserva quedó cancelada";
  estado(`<p class="mrmsg">Tu reserva quedó cancelada.${j.tardia&&j.cargo?` Como cancelaste el mismo día de la clase, queda un cargo de ${esc(dinero(+j.cargo))} por cancelación tardía; el estudio te escribe para coordinarlo.`:" No hay ningún cargo."}</p>`);
  $("#mrHorario").focus();
}

function ics(){
  if(!R||esMem) return;
  const desc=`Clase de ${R.clase} con ${R.instructora}.\n${R.lugar_texto}.\n\n${R.cancelacion_texto||""}\nPara ver o cancelar tu reserva: ${location.href}`;
  NB.toast("Descargando el archivo del calendario");
  window.BALE_ICS.descargar(window.BALE_ICS.archivo("balé",[{uid:`reserva-${R.id}@bale`,fecha:R.fecha,inicio:R.inicio,fin:R.fin,
    resumen:`balé · ${R.clase}`,descripcion:desc,lugar:`balé, ${CFG?CFG.direccion:""}`}]),`bale-${R.fecha}-${R.inicio.replace(":","")}.ics`);
}

$("#mrCancel").addEventListener("click",abrirCancelar);
$("#mrSi").addEventListener("click",cancelar);
$("#mrNo").addEventListener("click",()=>$("#mrDlg").close());
$("#mrDlg").addEventListener("close",()=>{ if(!$("#mrCancel").hidden) $("#mrCancel").focus(); });
$("#mrIcs").addEventListener("click",ics);
$("#mrPay").addEventListener("click",e=>{
  const b=e.target.closest("[data-tarjeta]");
  if(b&&R){ SIS.tarjeta.pedir(R,b).then(ok=>{ if(ok){ pintarPago(); const n=$("#mrPay [data-tarjeta]"); if(n) n.focus(); } }); return; }
  const cp=e.target.closest("[data-copy]");
  if(cp){ const v=cp.dataset.copy, ok=()=>NB.toast("Número de cuenta copiado"), no=()=>NB.toast(`Número de cuenta: ${v}`);
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(ok,no); else no(); }
});
if(SIS.transferencia) SIS.transferencia.conectar($("#mrPay"),()=>R,()=>{ if(R) pintarPago(); });
// Un enlace con el token en la consulta (?t= o ?m=) se corrige al # sin que llegue a ningún otro lado
if(/[?&](t|m)=/.test(location.search)) history.replaceState(null,"",location.pathname+location.hash);

Promise.all([NB.ready,SIS.listo]).then(async ([cfg,activo])=>{
  CFG=cfg;
  if(!(esMem?TOKEN_M_RE:TOKEN_RE).test(token)){ invalido(); return; }
  if(esMem){ $("#mrTitle").textContent="Tu membresía"; const k=$(".mres .bk-kick"); if(k) k.textContent="balé · mi membresía"; }
  if(!activo){
    estado(`<p class="mrmsg">Ahora mismo no podemos mostrarlo en línea. Escríbenos por WhatsApp y el estudio te ayuda.</p>`);
    $("#mrBtns").hidden=false; $("#mrCancel").hidden=true; $("#mrIcs").hidden=true; waLink(); return;
  }
  let j=null;
  try{ j=await SIS.llamar(esMem?"mi_membresia":"mi_reserva",{p_token:token}); }catch(e){ j=null; }
  if(!j){ estado(`<p class="mrmsg">Ahora mismo no podemos mostrarlo en línea. Prueba en unos minutos o escríbenos por WhatsApp.</p>`); $("#mrBtns").hidden=false; waLink(); return; }
  if(!j.ok){ invalido(j.error==="token_invalido"?null:j.mensaje); return; }
  R=esMem?j.membresia:j.reserva; pintar();
}).catch(()=>invalido());
})();
