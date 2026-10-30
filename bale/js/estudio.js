/* =========================================================
   balé — Área del estudio (estudio.html)
   Para Marifer, su asistente y las instructoras, con su cuenta de Supabase
   Auth (supabase-js en js/vendor, sesión en "bale-estudio-auth"). Todo pasa por
   las funciones estudio_* de la base de datos (docs/API.md), que deciden qué
   puede hacer cada rol; aquí solo se esconde lo que no le toca:
   - instructora: Mis clases (alumnas, lugar, primera vez y asistencia) y su .ics
   - asistente: Clases, Clientas, Cobros y Avisos
   - dueña: además Ajustes (pago, reservas, avisos, horario, precios, personal) y Exportar
   Sin animaciones de entrada: es una herramienta. Lo que toca dinero o borra pide confirmación.
   ========================================================= */
(function(){
"use strict";
const NB = window.BALE;
const {$, esc} = NB;
const TZ = "America/Santo_Domingo";
const DIAS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const PAGO = {pendiente:"Por pagar", pagado:"Pagada", membresia:"Membresía", cortesia:"Cortesía"};
const METODO = {transferencia:"Transferencia", tarjeta:"Tarjeta", efectivo:"Efectivo"};
let sb=null, YO=null, CAT=null, CFG=null;

/* ---------- Fechas (siempre las de La Vega) ---------- */
function nowLV(){
  const p={}; new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"})
    .formatToParts(new Date()).forEach(x=>{ p[x.type]=x.value; });
  return {fecha:`${p.year}-${p.month}-${p.day}`, hora:`${p.hour}:${p.minute}`};
}
const iso = d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fromIso = s=>{ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
const sumar = (s,n)=>{ const d=fromIso(s); d.setDate(d.getDate()+n); return iso(d); };
const hoy = ()=>nowLV().fecha;
const lunes = w=>{ const d=fromIso(hoy()); d.setDate(d.getDate()-((d.getDay()+6)%7)+7*w); return iso(d); };
const fmtDay = s=>fromIso(s).toLocaleDateString("es-DO",{weekday:"long",day:"numeric",month:"long"});
const fmtCorta = s=>fromIso(s).toLocaleDateString("es-DO",{day:"numeric",month:"short"}).replace(".","");
const h12 = t=>{ const [h,m]=t.split(":").map(Number); return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"pm":"am"}`; };
// Milisegundos de una fecha y hora de La Vega (UTC−4 todo el año)
const msLV = (f,t)=>{ const [y,mo,d]=f.split("-").map(Number), [h,mi]=(t||"00:00").split(":").map(Number); return Date.UTC(y,mo-1,d,h+4,mi); };
const finDeMes = s=>{ const d=fromIso(s); d.setMonth(d.getMonth()+1); d.setDate(d.getDate()-1); return iso(d); };
const dinero = n=>n==null||n===""?"":NB.money(+n);
const esAdmin = ()=>YO&&(YO.rol==="duena"||YO.rol==="asistente");
const esDuena = ()=>YO&&YO.rol==="duena";

/* ---------- Avisos ---------- */
function aviso(msg,tipo){
  const a=$("#estAviso"); a.textContent=msg; a.hidden=!msg; a.className="estaviso"+(tipo?" "+tipo:"");
}
const listo = msg=>NB.toast(msg);

/* ---------- La base de datos ---------- */
class Prohibido extends Error {}
async function rpc(fn,args){
  const {data,error}=await sb.rpc(fn,args||{});
  if(error){
    if(error.code==="42501"||/no_autorizado|requiere_2fa/.test(error.message||"")){
      const e=new Prohibido(/requiere_2fa/.test(error.message||"")?"requiere_2fa":"no_autorizado"); throw e;
    }
    throw new Error(error.message||"error");
  }
  return data;
}
// Acción del personal: si sale bien devuelve los datos; si no, muestra el mensaje y devuelve null
async function hacer(fn,args,{dlg=false}={}){
  try{
    const r=await rpc(fn,args);
    if(r&&r.ok===false){ if(dlg) return r; aviso(r.mensaje||"No se pudo completar.","mal"); return null; }
    return r;
  }catch(e){
    if(e instanceof Prohibido){ sesionTerminada(e.message); return null; }
    aviso("No hay conexión con la base de datos. Revisa el internet e inténtalo de nuevo.","mal");
    return dlg?{ok:false,mensaje:"No hay conexión con la base de datos. Inténtalo de nuevo."}:null;
  }
}
function sesionTerminada(cod){
  if(cerrarDlg) cerrarDlg(null);
  aviso(cod==="requiere_2fa"?"Esta cuenta necesita la verificación en dos pasos. Pídele a César que la configure."
    :"Tu sesión terminó o tu cuenta no tiene permiso para esto. Vuelve a entrar.","mal");
  sb.auth.signOut().catch(()=>{}); mostrarEntrar();
}

/* ---------- Diálogo genérico ----------
   pedir({titulo, html, ok, accion(form) → true | "mensaje de error"}) → true si se aceptó */
let cerrarDlg=null;
function pedir({titulo, html, ok="Guardar", no="Cancelar", peligro=false, alAbrir, accion}){
  const dlg=$("#dlg"), form=$("#dlgForm");
  $("#dlgT").textContent=titulo; $("#dlgBody").innerHTML=html||"";
  const err=$("#dlgErr"); err.hidden=true; err.textContent="";
  const okB=$("#dlgOk"); okB.textContent=ok; okB.className="bbtn "+(peligro?"solid peligro":"solid"); okB.disabled=false;
  $("#dlgNo").textContent=no; $("#dlgNo").hidden=!no;
  return new Promise(res=>{
    const fin=v=>{ form.onsubmit=null; cerrarDlg=null; if(dlg.open) dlg.close(); res(v); };
    cerrarDlg=fin;
    $("#dlgNo").onclick=()=>fin(false); $("#dlgX").onclick=()=>fin(false);
    dlg.oncancel=e=>{ e.preventDefault(); fin(false); };
    form.onsubmit=async e=>{
      e.preventDefault();
      if(!accion){ fin(true); return; }
      okB.disabled=true; okB.setAttribute("aria-busy","true"); err.hidden=true;
      let r; try{ r=await accion(form); }catch(x){ r="No se pudo completar. Inténtalo de nuevo."; }
      okB.disabled=false; okB.removeAttribute("aria-busy");
      if(r===true||r===undefined){ fin(true); return; }
      if(r===null){ return; }                     // la sesión terminó: ya se cerró
      err.textContent=r; err.hidden=false; err.focus&&err.scrollIntoView({block:"nearest"});
    };
    dlg.showModal();
    if(alAbrir) alAbrir(form);
    const f=form.querySelector("#dlgBody input:not([type=hidden]),#dlgBody select,#dlgBody textarea"); (f||okB).focus();
  });
}
const v = (form,name)=>{ const el=form.querySelector(`[name="${name}"]`); return el?(el.type==="checkbox"?el.checked:el.value.trim()):""; };
const opt = (val,txt,sel)=>`<option value="${esc(val)}"${sel?" selected":""}>${esc(txt)}</option>`;

/* ---------- Sala: elegir un lugar (barra) ---------- */
function sala(){ const S=(CAT&&CAT.sala)||{filas:2,por_fila:8}; return {filas:+S.filas||2, por_fila:+S.por_fila||8}; }
function salaSVG(ocup){
  const S=sala(), set=new Set(ocup||[]), W=S.por_fila*44+16, Hh=S.filas*50+44; let marks="";
  for(let f=1;f<=S.filas;f++) for(let i=1;i<=S.por_fila;i++){
    const n=(f-1)*S.por_fila+i, x=8+22+(i-1)*44, y=44+12+(f-1)*50;
    marks+=`<g class="mk ${set.has(n)?"busy":"free"}"><line x1="${x-14}" y1="${y-15}" x2="${x+14}" y2="${y-15}"/><circle cx="${x}" cy="${y+4}" r="15"/><text x="${x}" y="${y+9}">${n}</text></g>`;
  }
  return `<svg viewBox="0 0 ${W} ${Hh}" role="presentation"><rect class="mirror" x="8" y="6" width="${W-16}" height="16" rx="4"/><text class="mtxt" x="${W/2}" y="18">ESPEJO</text>${marks}</svg>`;
}
// Botones de lugares dentro de un formulario; el elegido va en <input name="lugar">
function seatsHTML(ocup){
  const S=sala(), set=new Set(ocup||[]); let h=`<input type="hidden" name="lugar" value=""><div class="seats" data-seats>`;
  for(let f=1;f<=S.filas;f++){
    h+=`<div class="srow" role="group" aria-label="Fila ${f}"><span class="bar">Fila ${f}${f===1?" (junto al espejo)":""}</span><div style="--n:${S.por_fila}">`;
    for(let i=1;i<=S.por_fila;i++){ const n=(f-1)*S.por_fila+i, b=set.has(n);
      h+=`<button type="button" class="seat ${b?"busy":""}" data-n="${n}" ${b?"disabled":""} aria-pressed="false" aria-label="Lugar ${n}, fila ${f}${b?", ocupado":""}">${n}</button>`; }
    h+=`</div></div>`;
  }
  return h+`</div>`;
}
function activarSeats(form){
  const box=form.querySelector("[data-seats]"); if(!box) return;
  box.addEventListener("click",e=>{ const b=e.target.closest("[data-n]"); if(!b||b.disabled) return;
    box.querySelectorAll(".seat").forEach(s=>s.setAttribute("aria-pressed",String(s===b)));
    form.querySelector('[name="lugar"]').value=b.dataset.n; });
}

/* =========================================================
   ENTRAR
   ========================================================= */
function mostrarEntrar(){
  YO=null; $("#app").hidden=true; $("#entrar").hidden=false; $("#salir").hidden=true; $("#cambiarClave").hidden=true; $("#quien").hidden=true;
  $("#fEntrar").hidden=false; $("#fNueva").hidden=true;
}
async function entrarApp(){
  let yo;
  try{ yo=await rpc("estudio_yo"); }
  catch(e){
    if(e instanceof Prohibido){ aviso(e.message==="requiere_2fa"?"Esta cuenta necesita la verificación en dos pasos.":"Tu cuenta no tiene acceso al área del estudio.","mal"); await sb.auth.signOut().catch(()=>{}); mostrarEntrar(); return; }
    aviso("No hay conexión con la base de datos. Inténtalo de nuevo en unos minutos.","mal"); mostrarEntrar(); return;
  }
  YO=yo; aviso("");
  CAT=await hacer("estudio_catalogos")||{planes:[],horario:[],instructoras:[],tipos:[],sala:{filas:2,por_fila:8}};
  $("#entrar").hidden=true; $("#app").hidden=false; $("#salir").hidden=false; $("#cambiarClave").hidden=false;
  const q=$("#quien"); q.hidden=false; q.textContent=`${YO.nombre} · ${{duena:"Dueña",asistente:"Asistente",instructora:"Instructora"}[YO.rol]||""}`;
  montarTabs();
}
async function login(e){
  e.preventDefault();
  const correo=$("#eCorreo").value.trim(), clave=$("#eClave").value;
  if(!correo||!clave){ aviso("Escribe tu correo y tu contraseña.","mal"); return; }
  const b=$("#eBtn"); b.disabled=true; b.textContent="Entrando…";
  const {error}=await sb.auth.signInWithPassword({email:correo,password:clave}).catch(()=>({error:{message:"red"}}));
  b.disabled=false; b.textContent="Entrar";
  if(error){ aviso(error.message==="red"?"No hay conexión. Revisa el internet.":"Correo o contraseña incorrectos.","mal"); return; }
  $("#eClave").value=""; entrarApp();
}
async function olvido(){
  const correo=$("#eCorreo").value.trim();
  if(!correo){ aviso("Escribe tu correo arriba y vuelve a pulsar «¿Olvidaste tu contraseña?».","mal"); $("#eCorreo").focus(); return; }
  await sb.auth.resetPasswordForEmail(correo,{redirectTo:location.origin+location.pathname}).catch(()=>{});
  aviso("Si ese correo es de una cuenta del estudio, te llegó un enlace para poner una contraseña nueva. Revisa también Spam.");
}
async function nuevaClave(e){
  e.preventDefault();
  const c=$("#eNueva").value;
  if(c.length<8){ aviso("La contraseña debe tener al menos 8 caracteres.","mal"); return; }
  const {error}=await sb.auth.updateUser({password:c}).catch(()=>({error:{}}));
  if(error){ aviso("No se pudo cambiar la contraseña. Pide otro enlace.","mal"); return; }
  $("#eNueva").value=""; aviso("Contraseña cambiada."); history.replaceState(null,"",location.pathname); entrarApp();
}
// Con la sesión iniciada: poner una contraseña nueva (no necesita correo)
async function cambiarClave(){
  const ok=await pedir({titulo:"Cambiar tu contraseña", ok:"Guardar contraseña",
    html:`<p class="privacy">Mínimo 8 caracteres. Mejor una frase que solo tú sepas.</p>
      <label class="fld">Contraseña nueva<input type="password" name="c1" autocomplete="new-password" minlength="8"></label>
      <label class="fld">Repítela<input type="password" name="c2" autocomplete="new-password" minlength="8"></label>`,
    accion:async f=>{
      const c1=f.querySelector('[name="c1"]').value, c2=f.querySelector('[name="c2"]').value;
      if(c1.length<8) return "La contraseña debe tener al menos 8 caracteres.";
      if(c1!==c2) return "Las dos contraseñas no son iguales.";
      const {error}=await sb.auth.updateUser({password:c1}).catch(()=>({error:{message:"red"}}));
      if(error) return error.message==="red"?"No hay conexión. Inténtalo de nuevo.":"No se pudo cambiar. Prueba con otra contraseña (más larga o distinta de la anterior).";
      return true; }});
  if(ok) listo("Contraseña cambiada");
}

/* =========================================================
   PESTAÑAS (según el rol)
   ========================================================= */
let TAB="";
function montarTabs(){
  const t=YO.rol==="instructora" ? [["clases","Mis clases"]]
    : [["clases","Clases"],["clientas","Clientas"],["cobros","Cobros"],["avisos","Avisos"]].concat(esDuena()?[["ajustes","Ajustes"],["exportar","Exportar"]]:[]);
  $("#tabs").innerHTML=t.map(([id,n],i)=>`<button role="tab" type="button" id="t-${id}" aria-controls="p-${id}" aria-selected="${i===0}" tabindex="${i?-1:0}">${n}${id==="cobros"?' <span class="tcnt" id="cntEnlaces" hidden></span>':""}</button>`).join("");
  $("#tabs").hidden=t.length<2;
  ["clases","clientas","cobros","avisos","ajustes","exportar"].forEach(id=>{ $("#p-"+id).hidden=true; });
  $("#cInstW").hidden=YO.rol==="instructora";
  $("#icsWrap").hidden=YO.rol!=="instructora";
  $("#cInst").innerHTML=opt("","Todas")+CAT.instructoras.map(i=>opt(i.nombre,i.nombre)).join("");
  abrirTab(t[0][0]);
  if(YO.rol!=="instructora") contarEnlaces();
}
// Contador de "Enlaces por enviar" (cobros con tarjeta que la clienta pidió y nadie ha enviado)
function pintarContador(n){
  const b=$("#cntEnlaces"); if(!b) return;
  b.hidden=!n; b.textContent=n||"";
  $("#t-cobros").setAttribute("aria-label",n?`Cobros, ${n} ${n===1?"enlace":"enlaces"} por enviar`:"Cobros");
}
async function contarEnlaces(){   // en silencio: el contador es una ayuda, no un error
  try{ const r=await rpc("estudio_enlaces_por_enviar",{}); if(r&&r.ok) pintarContador(+r.por_enviar||0); return r; }
  catch(e){ return null; }
}
function abrirTab(id){
  TAB=id;
  document.querySelectorAll('#tabs [role="tab"]').forEach(b=>{ const on=b.id==="t-"+id; b.setAttribute("aria-selected",on); b.tabIndex=on?0:-1; });
  ["clases","clientas","cobros","avisos","ajustes","exportar"].forEach(x=>{ $("#p-"+x).hidden=x!==id; });
  ({clases:cargarSemana, clientas:abrirClientas, cobros:cargarCobros, avisos:cargarAvisos, ajustes:cargarAjustes, exportar:()=>{}})[id]();
  if(id!=="cobros"&&YO&&YO.rol!=="instructora") contarEnlaces();
}

/* =========================================================
   CLASES
   ========================================================= */
let cWeek=0, cSel=null, SEM=[];
async function cargarSemana(){
  const a=lunes(cWeek), b=sumar(a,6);
  $("#cLabel").textContent=`${fmtCorta(a)} – ${fmtCorta(b)}`;
  const r=await hacer("estudio_semana",{p_desde:a,p_hasta:b}); if(!r) return;
  SEM=r.sesiones||[];
  pintarSemana();
  const lista=SEM.filter(filtroInst);
  if(!lista.some(s=>s.id===cSel)){
    const ahora=Date.now(), prox=lista.find(s=>msLV(s.fecha,s.fin)>ahora)||lista[0];
    cSel=prox?prox.id:null;
  }
  pintarSemana();
  if(cSel) cargarClase(cSel); else $("#cDet").innerHTML="";
}
const filtroInst = s=>!$("#cInst").value||s.instructora===$("#cInst").value;
function cupoTxt(s){
  if(s.estado==="cancelada") return "Cancelada";
  if(s.modo==="inscripcion") return "Inscripción";
  return `${s.ocupados}/${s.capacidad}${s.en_espera?` · ${s.en_espera} en espera`:""}${s.por_revisar?` · ${s.por_revisar} por revisar`:""}`;
}
function pintarSemana(){
  let dia="";
  $("#cList").innerHTML=SEM.filter(filtroInst).map(s=>{
    const head=s.fecha!==dia?`<li class="vday">${esc(fmtDay(s.fecha))}${s.fecha===hoy()?" · hoy":""}</li>`:""; dia=s.fecha;
    const lleno=s.estado==="cancelada"||(s.modo!=="inscripcion"&&s.ocupados>=s.capacidad);
    return head+`<li><button type="button" class="vcls" data-s="${s.id}" aria-pressed="${s.id===cSel}">
      <span class="t">${esc(h12(s.inicio))}</span><span class="n">${esc(s.clase)}<small>${esc(s.instructora)}${s.etiqueta?` · ${esc(s.etiqueta)}`:""}${s.edad?` · ${esc(s.edad)}`:""}</small></span>
      <span class="c ${lleno?"full":""}">${esc(cupoTxt(s))}</span></button></li>`;
  }).join("")||`<li class="empty-state">${YO.rol==="instructora"?"No tienes clases esta semana.":"Sin clases esta semana."}</li>`;
}
let CLASE=null;
async function cargarClase(id){
  const r=await hacer("estudio_clase",{p_sesion_id:id}); if(!r) return;
  CLASE=Object.assign({}, r, {sem:SEM.find(s=>s.id===id)||{}});
  pintarClase();
}
function pintarClase(){
  const {sesion:s, alumnas, espera, sem}=CLASE, box=$("#cDet"), admin=esAdmin();
  const asisDesde=msLV(s.fecha,sem.inicio)-60*60e3, puedeAsis=Date.now()>=asisDesde;
  const cancelada=s.estado==="cancelada", insc=s.modo==="inscripcion";
  const tags=a=>[a.origen==="fijo"?`<span class="tagx web">Miembro</span>`:"", a.primera_vez?`<span class="tagx prim">Primera vez</span>`:"",
    a.origen==="estudio"?`<span class="tagx">Por el estudio</span>`:"",
    admin&&a.pago_estado?`<span class="tagx ${a.pago_estado==="pendiente"?"pend":""}">${esc(PAGO[a.pago_estado]||a.pago_estado)}${a.pago_estado==="pendiente"&&a.monto!=null?` ${esc(dinero(a.monto))}`:""}</span>`:""].join("");
  box.innerHTML=`<h2>${esc(s.clase)}${s.etiqueta||s.edad?` <small>${esc(s.etiqueta||s.edad)}</small>`:""}</h2>
    <p class="meta">${esc(s.fecha_larga)} · ${esc(s.hora)} – ${esc(s.hora_fin)} · ${esc(s.instructora)}${insc?"":` · <b>${alumnas.length} de ${s.capacidad}</b>`}</p>
    ${cancelada?`<p class="note">Clase cancelada${s.motivo_cancelacion?`: ${esc(s.motivo_cancelacion)}`:""}.</p>`:""}
    ${s.modo==="lugares"?`<div class="sala mini" aria-hidden="true">${salaSVG(s.lugares_ocupados)}</div>`:insc?`<p class="cupoinfo">Inscripción por WhatsApp con formulario; no se reserva por la web ni aquí.</p>`:`<p class="cupoinfo">Cupo por número, sin lugar fijo: ${s.capacidad} máquinas.</p>`}
    ${admin&&!cancelada&&!insc?`<div class="eacc"><button class="bbtn solid sm" type="button" data-a="reservar">Reservar para una clienta</button>
      <button class="bbtn line sm" type="button" data-a="instructora">Cambiar instructora</button>
      <button class="bbtn line sm peligro" type="button" data-a="cancelar-clase">Cancelar clase</button></div>`:""}
    ${admin&&cancelada?`<div class="eacc"><button class="bbtn line sm" type="button" data-a="reabrir">Reabrir clase</button></div>`:""}
    <h3>Alumnas (${alumnas.length})</h3>
    ${!puedeAsis&&alumnas.length?`<p class="privacy">La asistencia se marca desde una hora antes de la clase.</p>`:""}
    <ol class="roster est">${alumnas.map((a,i)=>`<li>
      <span class="seatno" title="${s.modo==="lugares"?"Lugar":"Orden"}"><span class="sr-only">${s.modo==="lugares"?"Lugar":"Número"} </span>${a.lugar||i+1}</span>
      <span class="nm">${esc(a.nombre)}${a.nombre_reserva?`<small>Reservó como ${esc(a.nombre_reserva)}</small>`:""}${a.telefono?`<small>${esc(a.telefono)}</small>`:""}${a.revisar?`<small class="rev">${esc(a.revisar)}</small>`:""}</span>
      <span class="tgs">${tags(a)}</span>
      <span class="asis" role="group" aria-label="Asistencia de ${esc(a.nombre)}">
        <button type="button" class="abtn" data-asis="asistio" data-r="${a.reserva_id}" aria-pressed="${a.asistencia==="asistio"}" ${puedeAsis?"":"disabled"}>Asistió</button>
        <button type="button" class="abtn" data-asis="falto" data-r="${a.reserva_id}" aria-pressed="${a.asistencia==="falto"}" ${puedeAsis?"":"disabled"}>Faltó</button>
      </span>
      ${admin?`<button class="linkbtn" type="button" data-cancel="${a.reserva_id}" data-nombre="${esc(a.nombre)}">Cancelar</button>`:""}
    </li>`).join("")||`<li class="vacio">Sin reservas.</li>`}</ol>
    <h3>Lista de espera</h3>
    ${espera.length?`<ol class="roster">${espera.map((e,i)=>`<li><span class="seatno">${i+1}</span><span class="nm">${esc(e.nombre)}${e.telefono?`<small>${esc(e.telefono)}</small>`:""}</span><span class="tagx">${e.estado==="avisada"?"Avisada":"Esperando"}</span></li>`).join("")}</ol>`:`<p class="privacy">Nadie en espera.</p>`}`;
}
async function marcarAsistencia(b){
  const val=b.getAttribute("aria-pressed")==="true"?"pendiente":b.dataset.asis;
  const r=await hacer("estudio_asistencia",{p_reserva_id:+b.dataset.r,p_asistencia:val}); if(!r) return;
  const a=CLASE.alumnas.find(x=>x.reserva_id===+b.dataset.r); if(a) a.asistencia=val;
  pintarClase(); const n=$(`#cDet [data-r="${b.dataset.r}"][data-asis="${b.dataset.asis}"]`); if(n) n.focus();
}
async function cancelarReserva(id,nombre){
  const s=CLASE.sesion;
  const ok=await pedir({titulo:`Cancelar la reserva de ${nombre}`, ok:"Cancelar reserva", no:"Volver", peligro:true,
    html:`<p>${esc(s.clase)}, ${esc(s.fecha_larga)} a las ${esc(s.hora)}.</p>
      <fieldset class="opts"><legend>¿Se cobra el cargo de cancelación tardía?</legend>
        <label class="radio"><input type="radio" name="cargo" value="auto" checked> Automático (si es el mismo día de la clase, sí)</label>
        <label class="radio"><input type="radio" name="cargo" value="si"> Sí, cobrar el cargo</label>
        <label class="radio"><input type="radio" name="cargo" value="no"> No cobrar</label></fieldset>
      <label class="check"><input type="checkbox" name="avisar" checked> Avisar a la clienta</label>`,
    accion:async f=>{ const r=await hacer("estudio_cancelar_reserva",{p_reserva_id:id,p_cargo:f.querySelector('[name="cargo"]:checked').value,p_avisar:v(f,"avisar")},{dlg:true});
      if(!r) return null; if(r.ok===false) return r.mensaje; listo(r.tardia?`Reserva cancelada con cargo de ${dinero(r.cargo)}`:"Reserva cancelada"); return true; }});
  if(ok) recargarClase();
}
function recargarClase(){ cargarSemanaSinMover(); }
async function cargarSemanaSinMover(){
  const a=lunes(cWeek), r=await hacer("estudio_semana",{p_desde:a,p_hasta:sumar(a,6)}); if(!r) return;
  SEM=r.sesiones||[]; pintarSemana(); if(cSel) cargarClase(cSel);
}
async function accionClase(a){
  const s=CLASE.sesion;
  if(a==="cancelar-clase"){
    const ok=await pedir({titulo:"Cancelar la clase", ok:"Cancelar la clase", no:"Volver", peligro:true,
      html:`<p><b>${esc(s.clase)}</b>, ${esc(s.fecha_larga)} a las ${esc(s.hora)}. Se cancelan sus ${CLASE.alumnas.length} reservas, sin cargo.</p>
        <label class="fld">Motivo (sale en el aviso a las alumnas)<input name="motivo" maxlength="200" placeholder="Ej.: la instructora está enferma"></label>
        <label class="check"><input type="checkbox" name="avisar" checked> Avisar a las alumnas</label>`,
      accion:async f=>{ const r=await hacer("estudio_cancelar_clase",{p_sesion_id:s.id,p_motivo:v(f,"motivo")||null,p_avisar:v(f,"avisar")},{dlg:true});
        if(!r) return null; if(r.ok===false) return r.mensaje; listo(`Clase cancelada (${r.reservas_canceladas} reservas)`); return true; }});
    if(ok) recargarClase();
  }else if(a==="reabrir"){
    const ok=await pedir({titulo:"Reabrir la clase", ok:"Reabrir", html:`<p>La clase vuelve a estar abierta. Las reservas canceladas no vuelven solas: resérvalas de nuevo si hace falta.</p>`,
      accion:async()=>{ const r=await hacer("estudio_reabrir_clase",{p_sesion_id:s.id},{dlg:true}); if(!r) return null; return r.ok===false?r.mensaje:true; }});
    if(ok) recargarClase();
  }else if(a==="instructora"){
    const ok=await pedir({titulo:"Cambiar instructora", ok:"Guardar",
      html:`<p>Solo para ${esc(s.fecha_larga)} (suplencia). El horario semanal no cambia.</p>
        <label class="fld">Instructora<select name="inst">${CAT.instructoras.map(i=>opt(i.id,i.nombre_completo||i.nombre,i.nombre===s.instructora)).join("")}</select></label>`,
      accion:async f=>{ const r=await hacer("estudio_editar_sesion",{p_sesion_id:s.id,p_instructora_id:v(f,"inst")},{dlg:true}); if(!r) return null; return r.ok===false?r.mensaje:true; }});
    if(ok){ listo("Instructora cambiada"); recargarClase(); }
  }else if(a==="reservar") reservarPara();
}
// Reserva hecha por el estudio (por teléfono, en persona): clienta de la lista o nueva
async function reservarPara(){
  const s=CLASE.sesion, barra=s.modo==="lugares";
  let elegida=null, t=null;
  const ok=await pedir({titulo:`Reservar: ${s.clase}, ${s.hora}`, ok:"Reservar",
    html:`<label class="fld">Buscar clienta (nombre o WhatsApp)<input name="q" type="search" autocomplete="off"></label>
      <ul class="pick-cli" data-res></ul>
      <details class="nueva"><summary>O una clienta nueva</summary>
        <label class="fld">Nombre<input name="nombre" autocomplete="off"></label>
        <label class="fld">WhatsApp<input name="tel" type="tel" inputmode="tel" placeholder="809-000-0000"></label>
        <label class="fld">Correo (opcional)<input name="correo" type="email" inputmode="email"></label>
        <label class="check"><input type="checkbox" name="wa"> Acepta avisos por WhatsApp</label>
      </details>
      ${barra?`<p class="steph">Lugar</p>${seatsHTML(s.lugares_ocupados)}`:""}
      <label class="fld">Pago<select name="pago">${opt("","Por pagar (o membresía)")}${opt("pagado","Ya pagó")}${opt("cortesia","Cortesía")}</select></label>
      <label class="check"><input type="checkbox" name="avisar" checked> Enviar la confirmación a la clienta</label>`,
    alAbrir:f=>{
      activarSeats(f);
      const q=f.querySelector('[name="q"]'), ul=f.querySelector("[data-res]");
      q.addEventListener("input",()=>{ clearTimeout(t); t=setTimeout(async()=>{
        const txt=q.value.trim(); if(txt.length<2){ ul.innerHTML=""; return; }
        const r=await hacer("estudio_clientas",{p_buscar:txt,p_limite:8}); if(!r) return;
        ul.innerHTML=r.clientas.map(c=>`<li><label class="radio"><input type="radio" name="cli" value="${c.id}"> ${esc(c.nombre)} <small>${esc(c.telefono)}${c.membresia?` · ${esc(c.membresia)}`:""}</small></label></li>`).join("")||`<li class="privacy">Sin resultados: usa «O una clienta nueva».</li>`;
      },300); });
      ul.addEventListener("change",e=>{ elegida=+e.target.value; });
    },
    accion:async f=>{
      const args={p_sesion_id:s.id, p_avisar:v(f,"avisar"), p_pago_estado:v(f,"pago")||null};
      if(barra){ const l=+v(f,"lugar"); if(!l) return "Elige el lugar en la sala."; args.p_lugar=l; }
      if(elegida) args.p_clienta_id=elegida;
      else{ if(!v(f,"nombre")||!v(f,"tel")) return "Elige una clienta de la lista o escribe el nombre y el WhatsApp de una nueva.";
        Object.assign(args,{p_nombre:v(f,"nombre"),p_telefono:v(f,"tel"),p_correo:v(f,"correo")||null,p_acepta_whatsapp:v(f,"wa")}); }
      const r=await hacer("estudio_reservar",args,{dlg:true}); if(!r) return null; if(r.ok===false) return r.mensaje;
      listo(`Reservado: ${r.reserva.nombre}, ${r.reserva.lugar_texto}`); return true;
    }});
  if(ok) recargarClase();
}

/* ---------- Calendario de la instructora (.ics) ---------- */
async function icsSemana(){
  const lista=SEM.filter(s=>s.estado!=="cancelada"); if(!lista.length){ listo("No tienes clases esta semana."); return; }
  const eventos=[];
  for(const s of lista){
    const r=await hacer("estudio_clase",{p_sesion_id:s.id}); if(!r) return;
    const al=r.alumnas||[];
    eventos.push({uid:`sesion-${s.id}@bale`, fecha:s.fecha, inicio:s.inicio, fin:s.fin, resumen:`${s.clase} · ${al.length}/${s.capacidad||"-"}`,
      descripcion:`Instructora: ${s.instructora}\n\nAlumnas:\n`+(al.map((a,i)=>`${a.lugar||i+1}. ${a.nombre}${a.primera_vez?" (primera vez)":""}${a.origen==="fijo"?" (miembro)":""}`).join("\n")||"Sin reservas todavía."),
      lugar:`balé, ${CFG.direccion||""}`});
  }
  window.BALE_ICS.descargar(window.BALE_ICS.archivo(`balé · ${YO.nombre}`,eventos),`bale-${(YO.instructora||YO.nombre).toLowerCase()}-${lunes(cWeek)}.ics`);
}

/* =========================================================
   CLIENTAS
   ========================================================= */
let qT=null, CLI=null;
async function abrirClientas(){ cargarVencen(); buscarClientas(); }
async function cargarVencen(){
  const r=await hacer("estudio_vencen",{p_dias:7}); if(!r) return;
  const m=r.membresias||[];
  $("#vencen").innerHTML=`<h2>Vencen esta semana</h2>${m.length?`<ul class="pays">${m.map(x=>`<li><div><b>${esc(x.nombre)}</b><small>${esc(x.plan)}${x.detalle?` · ${esc(x.detalle)}`:""} · hasta ${esc(fmtCorta(x.hasta))}${x.fijos?` · ${x.fijos} ${x.fijos===1?"lugar fijo":"lugares fijos"}`:""}</small></div>
    <div class="eacc"><button class="bbtn solid sm" type="button" data-renovar="${x.membresia_id}" data-hasta="${esc(x.hasta)}" data-nombre="${esc(x.nombre)}">Renovar</button>
    <button class="bbtn line sm" type="button" data-ficha="${x.clienta_id}">Ver ficha</button></div></li>`).join("")}</ul>`:`<p class="privacy">Ninguna membresía vence en los próximos 7 días.</p>`}`;
}
async function buscarClientas(){
  const r=await hacer("estudio_clientas",{p_buscar:$("#qCli").value.trim()||null,p_limite:60}); if(!r) return;
  $("#cliList").innerHTML=r.clientas.map(c=>`<li><button type="button" class="vcls cli" data-ficha="${c.id}" aria-pressed="${CLI&&CLI.clienta.id===c.id}">
    <span class="n">${esc(c.nombre)}<small>${esc(c.telefono)}${c.correo?` · ${esc(c.correo)}`:""}</small></span>
    <span class="c">${c.membresia?esc(c.membresia):`${c.reservas} ${c.reservas===1?"reserva":"reservas"}`}</span></button></li>`).join("")||`<li class="empty-state">No hay clientas con esa búsqueda.</li>`;
}
async function abrirFicha(id){
  const r=await hacer("estudio_clienta",{p_clienta_id:id}); if(!r) return;
  CLI=r; pintarFicha(); buscarClientas();
  if(matchMedia("(max-width:899px)").matches) $("#cliDet").scrollIntoView({block:"start"});
}
function pintarFicha(){
  const c=CLI.clienta, M=CLI.membresias||[], R=CLI.reservas||[], cargos=R.filter(x=>x.cancelacion_tardia);
  $("#cliDet").innerHTML=`<h2>${esc(c.nombre)}</h2>
    <p class="meta">${esc(c.telefono)}${c.correo?` · ${esc(c.correo)}`:""} · ${c.acepta_whatsapp?"acepta avisos por WhatsApp":"sin avisos por WhatsApp"}</p>
    ${c.anonimizada?`<p class="note">Datos personales borrados. Solo queda el historial anónimo.</p>`:`
    <form class="form efich" id="fCli" novalidate>
      <div class="two"><label class="fld">Nombre<input name="nombre" value="${esc(c.nombre)}"></label>
      <label class="fld">WhatsApp<input name="tel" type="tel" value="${esc(c.telefono)}"></label></div>
      <label class="fld">Correo<input name="correo" type="email" value="${esc(c.correo||"")}"></label>
      <label class="check"><input type="checkbox" name="wa" ${c.acepta_whatsapp?"checked":""}> Acepta avisos por WhatsApp</label>
      <label class="fld">Notas (solo para el estudio; nada de salud)<textarea name="notas" rows="2" maxlength="500">${esc(c.notas||"")}</textarea></label>
      <div class="eacc"><button class="bbtn line sm" type="submit">Guardar datos</button></div>
    </form>`}
    <h3>Membresías</h3>
    ${M.map(m=>`<div class="mem ${m.estado!=="activa"?"off":""}">
      <p class="mt"><b>${esc(m.plan)}</b>${m.detalle?` · ${esc(m.detalle)}`:""}<small>${esc(fmtCorta(m.desde))} – ${esc(fmtCorta(m.hasta))} · ${esc(dinero(m.precio))} · ${esc(PAGO[m.pago_estado]||m.pago_estado)}${m.pago_metodo?` (${esc(METODO[m.pago_metodo])})`:""}${m.estado!=="activa"?" · cancelada":""}</small></p>
      <ul class="fijos">${(m.fijos||[]).map(f=>`<li><span>${esc(DIAS[f.dia_semana-1])} ${esc(h12(f.inicio))} · ${esc(f.clase)}${f.lugar?` · lugar ${f.lugar}`:""}<small>${esc(fmtCorta(f.desde))} – ${esc(fmtCorta(f.hasta))}</small></span>
        ${m.estado==="activa"?`<button class="linkbtn" type="button" data-quitar-fijo="${f.id}">Quitar</button>`:""}</li>`).join("")||`<li class="privacy">Sin lugares fijos.</li>`}</ul>
      ${m.estado==="activa"&&!c.anonimizada?`<div class="eacc"><button class="bbtn solid sm" type="button" data-fijo="${m.id}">Agregar lugar fijo</button>
        <button class="bbtn line sm" type="button" data-renovar="${m.id}" data-hasta="${esc(m.hasta)}" data-nombre="${esc(c.nombre)}">Renovar</button>
        ${m.pago_estado==="pendiente"&&+m.precio>0?`<button class="bbtn line sm" type="button" data-cobro-mem="${m.id}">Cobrar con tarjeta</button>`:""}
        <button class="bbtn line sm" type="button" data-mem="${m.id}">Editar</button>
        <button class="bbtn line sm peligro" type="button" data-cancel-mem="${m.id}">Cancelar membresía</button></div>`:""}
    </div>`).join("")||`<p class="privacy">Sin membresías.</p>`}
    ${c.anonimizada?"":`<div class="eacc"><button class="bbtn line sm" type="button" data-mem="nueva">Nueva membresía</button></div>`}
    <h3>Cargos por cancelación tardía</h3>
    ${cargos.length?`<ul class="pays">${cargos.map(x=>`<li><div><b>${esc(dinero(x.cargo))}</b><small>${esc(x.clase)} · ${esc(fmtCorta(x.fecha))} · ${esc({pendiente:"Pendiente",cobrado:"Cobrado",perdonado:"Perdonado"}[x.cargo_estado]||x.cargo_estado)}</small></div></li>`).join("")}</ul>`:`<p class="privacy">Sin cargos.</p>`}
    <h3>Historial de reservas</h3>
    ${R.length?`<div class="tablewrap"><table class="vtable"><caption class="sr-only">Historial de reservas</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Clase</th><th scope="col">Lugar</th><th scope="col">Estado</th><th scope="col">Asistencia</th><th scope="col">Pago</th></tr></thead><tbody>
      ${R.map(x=>`<tr><td>${esc(fmtCorta(x.fecha))} ${esc(x.hora)}</td><td>${esc(x.clase)}</td><td>${x.lugar||"—"}</td><td>${x.estado==="activa"?"Activa":"Cancelada"}</td><td>${{asistio:"Asistió",falto:"Faltó",pendiente:"—"}[x.asistencia]}</td><td>${esc(PAGO[x.pago_estado]||x.pago_estado)}</td></tr>`).join("")}
    </tbody></table></div>`:`<p class="privacy">Sin reservas.</p>`}
    ${esDuena()&&!c.anonimizada?`<h3>Privacidad</h3><p class="privacy">Si la clienta lo pide (Ley 172-13), se borran su nombre, WhatsApp, correo y notas. Queda solo el historial anónimo.</p>
      <div class="eacc"><button class="bbtn line sm peligro" type="button" data-borrar="${c.id}">Borrar datos personales</button></div>`:""}`;
}
async function guardarCli(f){
  const r=await hacer("estudio_guardar_clienta",{p_id:CLI.clienta.id,p_nombre:v(f,"nombre"),p_telefono:v(f,"tel"),p_correo:v(f,"correo"),p_notas:v(f,"notas"),p_acepta_whatsapp:v(f,"wa")});
  if(r){ listo("Datos guardados"); abrirFicha(CLI.clienta.id); }
}
async function nuevaClienta(){
  let id=null;
  const ok=await pedir({titulo:"Nueva clienta", ok:"Crear",
    html:`<label class="fld">Nombre<input name="nombre" autocomplete="off"></label>
      <label class="fld">WhatsApp<input name="tel" type="tel" inputmode="tel" placeholder="809-000-0000"></label>
      <label class="fld">Correo (opcional)<input name="correo" type="email" inputmode="email"></label>
      <label class="check"><input type="checkbox" name="wa"> Acepta avisos por WhatsApp</label>
      <label class="fld">Notas (solo para el estudio; nada de salud)<textarea name="notas" rows="2" maxlength="500"></textarea></label>`,
    accion:async f=>{ const r=await hacer("estudio_guardar_clienta",{p_nombre:v(f,"nombre"),p_telefono:v(f,"tel"),p_correo:v(f,"correo")||null,p_notas:v(f,"notas"),p_acepta_whatsapp:v(f,"wa")},{dlg:true});
      if(!r) return null; if(r.ok===false) return r.mensaje; id=r.clienta_id; return true; }});
  if(ok&&id){ listo("Clienta creada"); abrirFicha(id); }
}
const planes = ()=>(CAT.planes||[]).filter(p=>p.tipo==="membresia");
const pagoSelect = (sel="pendiente")=>`<label class="fld">Pago<select name="pago">${opt("pendiente","Pendiente",sel==="pendiente")}${opt("pagado","Pagado",sel==="pagado")}${opt("cortesia","Cortesía",sel==="cortesia")}</select></label>
  <label class="fld">Método<select name="metodo">${opt("","—")}${Object.entries(METODO).map(([k,n])=>opt(k,n)).join("")}</select></label>`;
async function membresia(id){
  const m=id==="nueva"?null:CLI.membresias.find(x=>x.id===+id);
  const desde=m?m.desde:hoy(), P=planes();
  const ok=await pedir({titulo:m?"Editar membresía":"Nueva membresía", ok:"Guardar",
    html:`<label class="fld">Plan<select name="plan">${P.map(p=>opt(p.id,`${p.nombre}${p.detalle?` · ${p.detalle}`:""} (${dinero(p.precio)})`,m?m.plan_id===p.id:false)).join("")}</select></label>
      <div class="two"><label class="fld">Desde<input type="date" name="desde" value="${esc(desde)}"></label>
      <label class="fld">Hasta<input type="date" name="hasta" value="${esc(m?m.hasta:finDeMes(desde))}"></label></div>
      <label class="fld">Precio RD$<input type="number" name="precio" min="0" step="50" inputmode="numeric" value="${esc(m?m.precio:(P[0]||{}).precio||"")}"></label>
      <div class="two">${pagoSelect(m?m.pago_estado:"pendiente")}</div>
      <label class="fld">Notas<input name="notas" maxlength="200" value="${esc(m?m.notas||"":"")}"></label>`,
    alAbrir:f=>{ if(!m) f.querySelector('[name="plan"]').addEventListener("change",e=>{ const p=P.find(x=>x.id===e.target.value); if(p) f.querySelector('[name="precio"]').value=p.precio; }); },
    accion:async f=>{
      if(!v(f,"desde")||!v(f,"hasta")||v(f,"hasta")<v(f,"desde")) return "Revisa las fechas: «hasta» no puede ser antes de «desde».";
      const r=await hacer("estudio_guardar_membresia",{p_id:m?m.id:null,p_clienta_id:CLI.clienta.id,p_plan_id:v(f,"plan"),p_desde:v(f,"desde"),p_hasta:v(f,"hasta"),
        p_precio:v(f,"precio")===""?null:+v(f,"precio"),p_pago_estado:v(f,"pago"),p_pago_metodo:v(f,"metodo")||null,p_notas:v(f,"notas")},{dlg:true});
      if(!r) return null; if(r.ok===false) return r.mensaje; conflictos(r.fijos); return true; }});
  if(ok){ listo("Membresía guardada"); abrirFicha(CLI.clienta.id); }
}
// Lo que la base de datos no pudo aplicar de los lugares fijos: el estudio decide
function conflictos(fj,noCopiados){
  const c=(fj&&fj.conflictos)||[], n=noCopiados||[];
  if(!c.length&&!n.length) return;
  const M={lugar_ocupado:"el lugar ya estaba reservado",clase_llena:"la clase ya estaba llena",ya_tiene_reserva:"ya tenía una reserva ese día",lugar_invalido:"ese lugar no existe en la sala"};
  setTimeout(()=>pedir({titulo:"Revisa estos lugares fijos", ok:"Entendido", no:"",
    html:`${c.length?`<p>No se pudo guardar el lugar en estas fechas; resérvalas a mano o cambia la reserva que ya existía:</p><ul class="lista">${c.map(x=>`<li>${esc(fmtDay(x.fecha))}${x.lugar?` · lugar ${x.lugar}`:""}: ${esc(M[x.motivo]||x.motivo)}</li>`).join("")}</ul>`:""}
      ${n.length?`<p>Estos lugares fijos no se copiaron porque otra miembro ya los tiene:</p><ul class="lista">${n.map(x=>`<li>${esc(x.horario_id)} · lugar ${x.lugar}</li>`).join("")}</ul>`:""}`}),50);
}
async function renovar(id,hasta,nombre){
  const desde=sumar(hasta,1);
  let res=null;
  const ok=await pedir({titulo:`Renovar: ${nombre}`, ok:"Renovar",
    html:`<p>Nueva membresía con el mismo plan y los mismos lugares fijos.</p>
      <div class="two"><label class="fld">Desde<input type="date" name="desde" value="${esc(desde)}"></label>
      <label class="fld">Hasta<input type="date" name="hasta" value="${esc(finDeMes(desde))}"></label></div>
      <label class="fld">Precio RD$ (vacío = el del plan)<input type="number" name="precio" min="0" step="50" inputmode="numeric"></label>
      <div class="two">${pagoSelect()}</div>`,
    accion:async f=>{
      const r=await hacer("estudio_renovar_membresia",{p_id:+id,p_desde:v(f,"desde"),p_hasta:v(f,"hasta"),p_precio:v(f,"precio")===""?null:+v(f,"precio"),
        p_pago_estado:v(f,"pago"),p_pago_metodo:v(f,"metodo")||null},{dlg:true});
      if(!r) return null; if(r.ok===false) return r.mensaje; res=r; return true; }});
  if(ok){ listo("Membresía renovada"); conflictos(res.fijos,res.fijos_no_copiados); cargarVencen(); if(CLI) abrirFicha(CLI.clienta.id); }
}
async function agregarFijo(memId){
  const clases=(CAT.horario||[]).filter(h=>h.modo!=="inscripcion");
  let res=null;
  const ok=await pedir({titulo:"Agregar lugar fijo", ok:"Guardar",
    html:`<p>Se repite cada semana mientras dure la membresía.</p>
      <label class="fld">Clase del horario<select name="h">${clases.map(h=>opt(h.id,`${DIAS[h.dia_semana-1]} ${h12(h.inicio)} · ${h.clase} (${h.instructora})`)).join("")}</select></label>
      <div data-lugar>${seatsHTML([])}</div><p class="privacy" data-cupo hidden>Pilates Reformer: ocupa una máquina, sin número de lugar.</p>`,
    alAbrir:f=>{ activarSeats(f); const sel=f.querySelector('[name="h"]'), upd=()=>{ const h=clases.find(x=>x.id===sel.value), b=h&&h.modo==="lugares";
      f.querySelector("[data-lugar]").hidden=!b; f.querySelector("[data-cupo]").hidden=b; }; sel.addEventListener("change",upd); upd(); },
    accion:async f=>{
      const h=clases.find(x=>x.id===v(f,"h")); const l=+v(f,"lugar");
      if(h.modo==="lugares"&&!l) return "Elige el lugar en la sala.";
      const r=await hacer("estudio_guardar_fijo",{p_membresia_id:+memId,p_horario_id:h.id,p_lugar:h.modo==="lugares"?l:null},{dlg:true});
      if(!r) return null; if(r.ok===false) return r.mensaje; res=r; return true; }});
  if(ok){ listo("Lugar fijo guardado"); conflictos(res.fijos); abrirFicha(CLI.clienta.id); }
}
async function quitarFijo(id){
  const ok=await pedir({titulo:"Quitar lugar fijo", ok:"Quitar", peligro:true, html:`<p>Se cancelan las reservas futuras de ese lugar fijo (sin cargo ni aviso).</p>`,
    accion:async()=>{ const r=await hacer("estudio_quitar_fijo",{p_fijo_id:+id},{dlg:true}); if(!r) return null; return r.ok===false?r.mensaje:true; }});
  if(ok){ listo("Lugar fijo quitado"); abrirFicha(CLI.clienta.id); }
}
async function cancelarMem(id){
  const ok=await pedir({titulo:"Cancelar membresía", ok:"Cancelar membresía", no:"Volver", peligro:true,
    html:`<p>Se cancelan sus reservas fijas futuras. El pago ya registrado no cambia.</p>`,
    accion:async()=>{ const r=await hacer("estudio_cancelar_membresia",{p_id:+id},{dlg:true}); if(!r) return null; return r.ok===false?r.mensaje:true; }});
  if(ok){ listo("Membresía cancelada"); abrirFicha(CLI.clienta.id); }
}
async function borrarDatos(id){
  const ok=await pedir({titulo:"Borrar datos personales", ok:"Borrar para siempre", no:"Volver", peligro:true,
    html:`<p>Se borran el nombre, el WhatsApp, el correo y las notas de <b>${esc(CLI.clienta.nombre)}</b>, se cancelan sus reservas futuras y sus membresías activas. <b>No se puede deshacer.</b></p>
      <label class="fld">Para confirmar, escribe BORRAR<input name="conf" autocomplete="off"></label>`,
    accion:async f=>{ if(v(f,"conf").toUpperCase()!=="BORRAR") return "Escribe BORRAR para confirmar.";
      const r=await hacer("estudio_anonimizar_clienta",{p_clienta_id:+id},{dlg:true}); if(!r) return null; return r.ok===false?r.mensaje:true; }});
  if(ok){ listo("Datos personales borrados"); abrirFicha(+id); }
}

/* =========================================================
   COBROS
   ========================================================= */
const soloDigitos = t=>String(t||"").replace(/\D/g,"").replace(/^1(?=\d{10}$)/,"");
async function cargarCobros(){
  const [r,e]=await Promise.all([hacer("estudio_pendientes"),contarEnlaces()]); if(!r) return;
  const E=(e&&e.cobros)||[];
  $("#cobEnlaces").innerHTML=E.map(x=>`<li><div><b>${esc(x.nombre)} · ${esc(dinero(+x.monto))}</b><small>${esc(x.concepto)}</small>
      <small>WhatsApp ${esc(x.telefono)} <button class="linkbtn" type="button" data-copiar="${esc(soloDigitos(x.whatsapp))}" data-que="Teléfono">Copiar teléfono</button>
        · <button class="linkbtn" type="button" data-copiar="${esc(String(Math.round(+x.monto)))}" data-que="Monto">Copiar monto</button></small>
      <small>${x.estado==="enviado"?`Enlace enviado el ${esc(fmtCorta(String(x.enviado_en).slice(0,10)))}: falta que pague`:x.origen==="web"?"Lo pidió la clienta desde la web":"Lo pidió el estudio"}</small></div>
    <div class="eacc">${x.estado==="pedido"?`<button class="bbtn solid sm" type="button" data-enlace="enviado" data-id="${x.id}" data-q="${esc(x.nombre)}">Enlace enviado</button>`
      :`<button class="bbtn solid sm" type="button" data-enlace="pagado" data-id="${x.id}" data-q="${esc(x.nombre)}">Pagada (tarjeta)</button>`}
      <button class="bbtn line sm" type="button" data-enlace="anulado" data-id="${x.id}" data-q="${esc(x.nombre)}">Quitar</button></div></li>`).join("")
    ||`<li class="empty-state">No hay cobros con tarjeta pendientes.</li>`;
  $("#cobClases").innerHTML=(r.clases||[]).map(x=>`<li><div><b>${esc(x.nombre)}</b><small>${esc(x.clase)} · ${esc(fmtCorta(x.fecha))} · ${esc(x.hora)} · ${esc(dinero(x.monto))}</small><small>${esc(x.telefono)}</small></div>
    <div class="eacc"><button class="bbtn solid sm" type="button" data-pagar="${x.reserva_id}" data-q="${esc(x.nombre)}">Marcar pagada</button><button class="bbtn line sm" type="button" data-cobro-reserva="${x.reserva_id}">Cobrar con tarjeta</button><button class="bbtn line sm" type="button" data-cortesia="${x.reserva_id}" data-q="${esc(x.nombre)}">Cortesía</button></div></li>`).join("")
    ||`<li class="empty-state">No hay clases sin pagar.</li>`;
  $("#cobCargos").innerHTML=(r.cargos||[]).map(x=>`<li><div><b>${esc(x.nombre)} · ${esc(dinero(x.cargo))}</b><small>${esc(x.clase)} · ${esc(fmtCorta(x.fecha))} · ${esc(x.hora)}</small><small>${esc(x.telefono)}</small></div>
    <div class="eacc"><button class="bbtn solid sm" type="button" data-cargo="cobrado" data-r="${x.reserva_id}" data-q="${esc(x.nombre)}">Cobrado</button><button class="bbtn line sm" type="button" data-cargo="perdonado" data-r="${x.reserva_id}" data-q="${esc(x.nombre)}">Perdonado</button></div></li>`).join("")
    ||`<li class="empty-state">No hay cargos pendientes.</li>`;
}
async function pagar(id,nombre,cortesia){
  const ok=await pedir({titulo:cortesia?`Cortesía para ${nombre}`:`Pago de ${nombre}`, ok:cortesia?"Marcar cortesía":"Marcar pagada",
    html:cortesia?`<p>La clase queda como cortesía del estudio (sin cobro).</p>`:`<label class="fld">¿Cómo pagó?<select name="m">${Object.entries(METODO).map(([k,n])=>opt(k,n)).join("")}</select></label>`,
    accion:async f=>{ const r=await hacer("estudio_pago",{p_reserva_id:+id,p_pago_estado:cortesia?"cortesia":"pagado",p_metodo:cortesia?null:v(f,"m")},{dlg:true}); if(!r) return null; return r.ok===false?r.mensaje:true; }});
  if(ok){ listo("Pago guardado"); cargarCobros(); }
}
async function enlace(id,estado,nombre){
  if(estado==="enviado"){
    const r=await hacer("estudio_enlace_pago",{p_id:+id,p_estado:"enviado"});
    if(r&&r.ok!==false){ listo("Marcado: enlace enviado"); cargarCobros(); } else if(r) aviso(r.mensaje,"mal");
    return;
  }
  const pagado=estado==="pagado";
  const ok=await pedir({titulo:pagado?`¿${nombre} pagó con tarjeta?`:`¿Quitar el cobro de ${nombre}?`, ok:pagado?"Sí, pagada":"Quitar",
    html:`<p>${pagado?"Mira primero en CardNET que el pago entró. La reserva (o la membresía) queda pagada con tarjeta."
      :"El cobro sale de la lista; la reserva o la membresía siguen sin pagar. Úsalo si se pidió por error o pagó de otra forma."}</p>`,
    accion:async()=>{ const r=await hacer("estudio_enlace_pago",{p_id:+id,p_estado:estado},{dlg:true}); if(!r) return null; return r.ok===false?r.mensaje:true; }});
  if(ok){ listo(pagado?"Pago con tarjeta guardado":"Cobro quitado"); cargarCobros(); }
}
async function cobrarConTarjeta(args,despues){
  const r=await hacer("estudio_cobro_tarjeta",args);
  if(!r) return;
  if(r.ok===false){ aviso(r.mensaje,"mal"); return; }
  listo("Agregado a «Enlaces por enviar» (pestaña Cobros)"); contarEnlaces(); if(despues) despues();
}
function copiar(valor,que){
  const ok=()=>NB.toast(`${que} copiado`), no=()=>NB.toast(`${que}: ${valor}`);
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(valor).then(ok,no); else no();
}
async function cargo(id,estado,nombre){
  const ok=await pedir({titulo:estado==="cobrado"?`¿Cobraste el cargo a ${nombre}?`:`¿Perdonar el cargo a ${nombre}?`, ok:estado==="cobrado"?"Sí, cobrado":"Sí, perdonar",
    html:`<p>${estado==="cobrado"?"El cargo por cancelación tardía queda como cobrado.":"El cargo por cancelación tardía queda perdonado (no se cobra)."}</p>`,
    accion:async()=>{ const r=await hacer("estudio_cargo",{p_reserva_id:+id,p_cargo_estado:estado},{dlg:true}); if(!r) return null; return r.ok===false?r.mensaje:true; }});
  if(ok){ listo("Cargo actualizado"); cargarCobros(); }
}

/* =========================================================
   AVISOS
   ========================================================= */
async function cargarAvisos(){
  const r=await hacer("estudio_estado"); if(!r) return;
  const vivos=(r.trabajadores||[]).filter(t=>t.activo), est=Object.assign({},...vivos.map(t=>t.estado||{}));
  const correo=!vivos.length?["mal","el notificador no responde"]:est.correo==="error"?["mal","con errores"]:["bien","funcionando"];
  const wa=!r.whatsapp_automatico||est.whatsapp==="desactivado"?["", "apagado"]:!vivos.length||est.whatsapp!=="conectado"?["mal","desconectado"]:["bien","funcionando"];
  const n=r.avisos_7_dias||{}, cnt=(c,e)=>+n[`${c}.${e}`]||0;
  const ult=(r.trabajadores||[]).map(t=>t.latido).sort().pop();
  $("#avEstado").innerHTML=`<h2>Estado de los avisos</h2>
    <ul class="estado"><li class="${correo[0]}"><b>Correo:</b> ${correo[1]}</li><li class="${wa[0]}"><b>WhatsApp:</b> ${wa[1]}</li></ul>
    <p class="privacy">${ult?`Último latido del notificador: ${esc(new Date(ult).toLocaleString("es-DO",{timeZone:TZ,dateStyle:"medium",timeStyle:"short"}))}.`:"El notificador todavía no se ha conectado."}</p>
    ${esDuena()?`<div class="switches"><label class="check"><input type="checkbox" data-sw="correo_automatico" ${r.correo_automatico?"checked":""}> Enviar correos automáticos</label>
      <label class="check"><input type="checkbox" data-sw="whatsapp_automatico" ${r.whatsapp_automatico?"checked":""}> Enviar WhatsApp automáticos</label></div>`
      :`<p class="privacy">Correos automáticos: ${r.correo_automatico?"encendidos":"apagados"}. WhatsApp automáticos: ${r.whatsapp_automatico?"encendidos":"apagados"}.</p>`}
    <h3>Últimos 7 días</h3>
    <div class="tablewrap"><table class="vtable"><caption class="sr-only">Avisos de los últimos 7 días</caption><thead><tr><th scope="col">Canal</th><th scope="col">Enviados</th><th scope="col">En cola</th><th scope="col">Con error</th><th scope="col">Sin enviar</th></tr></thead><tbody>
      ${["correo","whatsapp"].map(c=>`<tr><th scope="row">${c==="correo"?"Correo":"WhatsApp"}</th><td>${cnt(c,"enviada")}</td><td>${cnt(c,"pendiente")+cnt(c,"enviando")}</td><td>${cnt(c,"error")}</td><td>${cnt(c,"vencida")+cnt(c,"omitida")+cnt(c,"anulada")}</td></tr>`).join("")}
    </tbody></table></div>
    <h3>Errores recientes</h3>
    ${(r.errores||[]).length?`<ul class="lista">${r.errores.map(e=>`<li><b>${e.canal==="correo"?"Correo":"WhatsApp"}</b> · ${esc(e.plantilla)} · ${esc(new Date(e.creada).toLocaleString("es-DO",{timeZone:TZ,dateStyle:"short",timeStyle:"short"}))}<small>${esc(e.error||"")}</small></li>`).join("")}</ul>`:`<p class="privacy">Sin errores.</p>`}`;
}
async function interruptor(el){
  const on=el.checked, nom=el.dataset.sw==="correo_automatico"?"los correos":"los WhatsApp";
  el.checked=!on;
  const ok=await pedir({titulo:on?`Encender ${nom} automáticos`:`Apagar ${nom} automáticos`, ok:on?"Encender":"Apagar",
    html:`<p>${on?`Se empiezan a enviar ${nom} de la bandeja.`:`Mientras esté apagado, ${nom} que toquen no se envían (quedan como «sin enviar»).`}</p>`,
    accion:async()=>{ const r=await hacer("estudio_guardar_ajuste",{p_clave:el.dataset.sw,p_valor:on},{dlg:true}); if(!r) return null; return r.ok===false?r.mensaje:true; }});
  if(ok){ listo("Guardado"); cargarAvisos(); }
}

/* =========================================================
   AJUSTES (dueña)
   ========================================================= */
let AJ={}, PLANT=[];
const aj = (k,d)=>AJ[k]?AJ[k].valor:d;
const VARIABLES = ["nombre","clase","fecha_larga","fecha_corta","hora","hora_fin","instructora","lugar_texto","pago_texto","cancelacion_texto","cargo_texto","enlace_reserva","enlace_horario","direccion","whatsapp_estudio","motivo"];
const VAR_ESTUDIO = ["nombre_completo","telefono","correo","primera_vez","revisar"];
const EJEMPLO = {nombre:"Laura", clase:"Hot Barre", fecha_larga:"lunes 2 de noviembre", fecha_corta:"lun 2 nov", hora:"5:30 pm", hora_fin:"6:30 pm", instructora:"Marifer",
  lugar_texto:"Lugar 7, fila 1", pago_texto:"RD$900. Pago por transferencia: te enviamos los datos por WhatsApp.", cancelacion_texto:"Si cancelas el mismo día de la clase, se aplica un cargo de RD$300 por cancelación tardía.",
  cargo_texto:"", enlace_reserva:"https://…/mi-reserva.html#t=…", enlace_horario:"https://…/#horario", direccion:"C. José Horacio Rodríguez #30, La Vega", whatsapp_estudio:"+1 849-638-6337", motivo:"",
  nombre_completo:"Laura Pérez", telefono:"809-555-0101", correo:"laura@example.com", primera_vez:"Sí", revisar:""};
const PLANT_NOMBRE = {reserva_confirmada:"Reserva confirmada", recordatorio_dia_antes:"Recordatorio del día antes", recordatorio_horas_antes:"Recordatorio horas antes",
  reserva_cancelada:"Reserva cancelada", clase_cancelada:"Clase cancelada", lugar_liberado:"Se liberó un lugar", estudio_nueva_reserva:"Al estudio: nueva reserva", estudio_cancelacion:"Al estudio: cancelación"};
const render = (t,d)=>String(t||"").replace(/\{\{([a-z_]+)\}\}/g,(m,k)=>d[k]||"").replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();

async function cargarAjustes(){
  const [a,p,per]=await Promise.all([hacer("estudio_ajustes"),hacer("estudio_plantillas"),hacer("estudio_personal")]);
  if(!a||!p||!per) return;
  CAT=await hacer("estudio_catalogos")||CAT;
  AJ=a.ajustes||{}; PLANT=p.plantillas||[];
  const pago=aj("pago",{}), tr=pago.transferencia||{}, rec=aj("recordatorios",{}), sil=aj("horas_silencio",{});
  const sinPC=x=>/por confirmar/i.test(x||"")?"":x||"";
  const sec=(id,titulo,cuerpo,nota="")=>`<form class="ebox form" data-aj="${id}" novalidate><h2>${titulo}</h2>${nota?`<p class="privacy">${nota}</p>`:""}${cuerpo}<div class="eacc"><button class="bbtn solid sm" type="submit">Guardar</button></div></form>`;
  $("#ajustes").innerHTML=
    sec("pago","Pago",`<label class="fld">Texto del pago (sale en la confirmación y los avisos)<input name="texto" value="${esc(pago.texto||"")}" maxlength="200"></label>
      <div class="two"><label class="fld">Banco<input name="banco" value="${esc(sinPC(tr.banco))}"></label><label class="fld">Tipo de cuenta<input name="tipo" value="${esc(sinPC(tr.tipo_cuenta))}"></label></div>
      <div class="two"><label class="fld">Número de cuenta<input name="cuenta" value="${esc(sinPC(tr.cuenta))}"></label><label class="fld">Titular<input name="titular" value="${esc(sinPC(tr.titular))}"></label></div>`,
      "Mientras falte algún dato de la transferencia, la confirmación dice «te enviamos los datos por WhatsApp». La tarjeta (CardNET) va por cobro: la clienta pulsa «Pagar con tarjeta» y el cobro aparece en Cobros → Enlaces por enviar.")+
    sec("reservas","Reservas por la web",`<div class="two"><label class="fld">Cierran (minutos antes de la clase)<input name="cierre" type="number" min="0" max="1440" value="${esc(aj("cierre_reserva_min",30))}"></label>
      <label class="fld">Reservas sueltas pendientes por persona<input name="max" type="number" min="1" max="20" value="${esc(aj("max_reservas_futuras",3))}"></label></div>
      <label class="fld">Se puede reservar hasta (días adelante)<input name="dias" type="number" min="1" max="60" value="${esc(aj("dias_abiertos",28))}"></label>`)+
    sec("recordatorios","Recordatorios y horas de silencio",`<div class="two"><label class="fld">Recordatorio el día antes, a las<input name="dia" type="time" value="${esc(rec.dia_antes_hora||"18:00")}"></label>
      <label class="fld">Y horas antes (0 = no)<input name="horas" type="number" min="0" max="12" value="${esc(rec.horas_antes??2)}"></label></div>
      <div class="two"><label class="fld">Sin WhatsApp desde<input name="sd" type="time" value="${esc(sil.desde||"21:00")}"></label><label class="fld">hasta<input name="sh" type="time" value="${esc(sil.hasta||"07:00")}"></label></div>`)+
    sec("otros","Instructoras y dirección pública",`<label class="check"><input type="checkbox" name="tel" ${aj("instructoras_ven_telefono",false)?"checked":""}> Las instructoras ven el WhatsApp de sus alumnas</label>
      <label class="fld">Dirección pública de la página (base de los enlaces de los avisos)<input name="url" type="url" value="${esc(aj("url_publica",""))}"></label>`)+
    `<form class="ebox form" data-aj="plantilla" novalidate><h2>Textos de los avisos</h2>
      <label class="fld">Aviso<select name="id">${PLANT.map(t=>{ const [k,c]=t.id.split("."); return opt(t.id,`${PLANT_NOMBRE[k]||k} · ${c==="correo"?"correo":"WhatsApp"}`); }).join("")}</select></label>
      <label class="fld" data-asunto>Asunto<input name="asunto" maxlength="200"></label>
      <label class="fld">Texto<textarea name="cuerpo" rows="10" maxlength="4000"></textarea></label>
      <p class="privacy">Variables: ${VARIABLES.map(x=>`<code>{{${x}}}</code>`).join(" ")}. Solo en los avisos al estudio: ${VAR_ESTUDIO.map(x=>`<code>{{${x}}}</code>`).join(" ")}.</p>
      <p class="steph">Vista previa</p><pre class="previa" data-previa></pre>
      <div class="eacc"><button class="bbtn solid sm" type="submit">Guardar texto</button></div></form>`+
    `<div class="ebox"><h2>Horario semanal</h2><p class="privacy">Cambia o quita una clase desde una fecha. Las fechas que ya tienen reservas no se tocan: se muestran para que decidas.</p>
      <ul class="lista hor">${(CAT.horario||[]).map(h=>`<li><span><b>${esc(DIAS[h.dia_semana-1])} ${esc(h12(h.inicio))}</b> · ${esc(h.clase)} · ${esc(h.instructora)}${h.etiqueta?` · ${esc(h.etiqueta)}`:""}${h.edad?` · ${esc(h.edad)}`:""}</span>
        <button class="linkbtn" type="button" data-hor="${esc(h.id)}">Cambiar</button></li>`).join("")}</ul>
      <div class="eacc"><button class="bbtn line sm" type="button" data-hor="nueva">Nueva clase en el horario</button></div></div>`+
    `<form class="ebox form" data-aj="precios" novalidate><h2>Precios de los planes</h2><p class="privacy">Es lo que usa la base de datos para cobrar. La página muestra los de <code>precios.json</code>: cámbialos también en el panel del negocio.</p>
      ${(CAT.planes||[]).map(p=>`<label class="prow"><span>${esc(p.nombre)}<small>${esc(p.detalle||"")}</small></span><input type="number" min="0" step="50" inputmode="numeric" data-plan="${esc(p.id)}" data-antes="${esc(p.precio)}" value="${esc(p.precio)}" aria-label="Precio de ${esc(p.nombre)} ${esc(p.detalle||"")}"></label>`).join("")}
      <div class="eacc"><button class="bbtn solid sm" type="submit">Guardar precios</button></div></form>`+
    `<div class="ebox"><h2>Personal</h2><p class="privacy">Primero César crea la cuenta en Supabase (Authentication → Users). Después aquí le das acceso con el mismo correo.</p>
      <ul class="lista">${(per.personal||[]).map(x=>`<li><span><b>${esc(x.nombre)}</b> · ${esc({duena:"Dueña",asistente:"Asistente",instructora:"Instructora"}[x.rol])}${x.activo?"":" · sin acceso"}<small>${esc(x.correo)}</small></span>
        <button class="linkbtn" type="button" data-per="${esc(x.correo)}">Cambiar</button></li>`).join("")}</ul>
      <div class="eacc"><button class="bbtn line sm" type="button" data-per="">Dar acceso</button></div></div>`;
  const fp=$('[data-aj="plantilla"]'); plantillaSel(fp);
  fp.querySelector('[name="id"]').addEventListener("change",()=>plantillaSel(fp));
  fp.addEventListener("input",()=>previa(fp));
  $("#ajustes").__per=per.personal||[];
}
function plantillaSel(f){
  const t=PLANT.find(x=>x.id===v(f,"id"))||{}, correo=/\.correo$/.test(t.id||"");
  f.querySelector("[data-asunto]").hidden=!correo;
  f.querySelector('[name="asunto"]').value=t.asunto||""; f.querySelector('[name="cuerpo"]').value=t.cuerpo||"";
  previa(f);
}
function previa(f){ const correo=!f.querySelector("[data-asunto]").hidden;
  f.querySelector("[data-previa]").textContent=(correo?`Asunto: ${render(v(f,"asunto"),EJEMPLO)}\n\n`:"")+render(v(f,"cuerpo"),EJEMPLO); }
async function guardarAjustes(f){
  const id=f.dataset.aj, ajuste=(k,val)=>hacer("estudio_guardar_ajuste",{p_clave:k,p_valor:val});
  const num=(n,min,max)=>{ const x=+v(f,n); return Number.isInteger(x)&&x>=min&&x<=max?x:null; };
  let ok=true;
  if(id==="pago"){
    const t={banco:v(f,"banco")||"POR CONFIRMAR",tipo_cuenta:v(f,"tipo")||"POR CONFIRMAR",cuenta:v(f,"cuenta")||"POR CONFIRMAR",titular:v(f,"titular")||"POR CONFIRMAR"};
    const conf=await pedir({titulo:"Guardar los datos de pago",ok:"Guardar",html:`<p>Estos datos salen en la confirmación de cada reserva por pagar. Revísalos bien.</p>`});
    if(!conf) return;
    ok=!!await ajuste("pago",{texto:v(f,"texto")||"Pago por transferencia: te enviamos los datos por WhatsApp.",cardnet_url:aj("pago",{}).cardnet_url||null,transferencia:t});   // el enlace fijo ya no se usa, pero no se borra
  }else if(id==="reservas"){
    const c=num("cierre",0,1440), m=num("max",1,20), d=num("dias",1,60);
    if(c==null||m==null||d==null){ aviso("Revisa los números de las reservas.","mal"); return; }
    ok=!!await ajuste("cierre_reserva_min",c)&&!!await ajuste("max_reservas_futuras",m)&&!!await ajuste("dias_abiertos",d);
  }else if(id==="recordatorios"){
    const h=num("horas",0,12); if(h==null||!v(f,"dia")||!v(f,"sd")||!v(f,"sh")){ aviso("Revisa las horas.","mal"); return; }
    ok=!!await ajuste("recordatorios",{dia_antes_hora:v(f,"dia"),horas_antes:h})&&!!await ajuste("horas_silencio",{desde:v(f,"sd"),hasta:v(f,"sh")});
  }else if(id==="otros"){
    const url=v(f,"url"); if(url&&!/^https:\/\/\S+$/i.test(url)){ aviso("La dirección pública debe empezar por https://","mal"); return; }
    ok=!!await ajuste("instructoras_ven_telefono",v(f,"tel"))&&(!url||!!await ajuste("url_publica",url));
  }else if(id==="plantilla"){
    const r=await hacer("estudio_guardar_plantilla",{p_id:v(f,"id"),p_asunto:v(f,"asunto"),p_cuerpo:f.querySelector('[name="cuerpo"]').value});
    if(r){ const t=PLANT.find(x=>x.id===v(f,"id")); if(t){ t.asunto=v(f,"asunto"); t.cuerpo=f.querySelector('[name="cuerpo"]').value; } listo("Texto guardado"); }
    return;
  }else if(id==="precios"){
    const cambios=[...f.querySelectorAll("[data-plan]")].filter(i=>i.value!==""&&+i.value!==+i.dataset.antes);
    if(!cambios.length){ listo("No cambiaste ningún precio."); return; }
    if(cambios.some(i=>!(+i.value>=0))){ aviso("Cada precio debe ser un número.","mal"); return; }
    const conf=await pedir({titulo:"Cambiar precios",ok:"Guardar precios",html:`<ul class="lista">${cambios.map(i=>`<li>${esc(i.getAttribute("aria-label").replace("Precio de ",""))}: ${esc(dinero(i.dataset.antes))} → <b>${esc(dinero(i.value))}</b></li>`).join("")}</ul><p class="privacy">Las reservas nuevas se cobran con el precio nuevo. Cámbialo también en el panel del negocio para que la página lo muestre.</p>`});
    if(!conf) return;
    for(const i of cambios){ if(!await hacer("estudio_guardar_plan",{p_id:i.dataset.plan,p_precio:+i.value})){ ok=false; break; } i.dataset.antes=i.value; }
  }
  if(ok){ listo("Guardado"); aviso(""); }
}
async function editarHorario(id){
  const h=id==="nueva"?null:(CAT.horario||[]).find(x=>x.id===id);
  const tipo=h?(CAT.tipos.find(t=>t.nombre===h.clase)||{}).id:"", inst=h?(CAT.instructoras.find(i=>i.nombre===h.instructora)||{}).id:"";
  let res=null;
  const ok=await pedir({titulo:h?`Cambiar: ${DIAS[h.dia_semana-1]} ${h12(h.inicio)}`:"Nueva clase en el horario", ok:"Guardar",
    html:`${h?"":`<label class="fld">Código (día y hora, ej. mar-1900)<input name="id" pattern="[a-z0-9-]{3,20}" autocomplete="off"></label>`}
      <div class="two"><label class="fld">Día<select name="dia">${DIAS.map((d,i)=>opt(i+1,d,h?h.dia_semana===i+1:i===0)).join("")}</select></label>
      <label class="fld">Desde la fecha<input type="date" name="desde" value="${esc(hoy())}"></label></div>
      <div class="two"><label class="fld">Empieza<input type="time" name="ini" value="${esc(h?h.inicio:"18:00")}"></label><label class="fld">Termina<input type="time" name="fin" value="${esc(h?h.fin:"19:00")}"></label></div>
      <div class="two"><label class="fld">Clase<select name="tipo">${CAT.tipos.map(t=>opt(t.id,t.nombre,t.id===tipo)).join("")}</select></label>
      <label class="fld">Instructora<select name="inst">${CAT.instructoras.map(i=>opt(i.id,i.nombre,i.id===inst)).join("")}</select></label></div>
      <div class="two"><label class="fld">Etiqueta<select name="et">${opt("","Ninguna")}${opt("avanzado","Solo nivel avanzado",h&&h.etiqueta==="avanzado")}${opt("miembros","Exclusiva para miembros",h&&h.etiqueta==="miembros")}${opt("primera","Sesión de primera clase",h&&h.etiqueta==="primera")}</select></label>
      <label class="fld">Edad (solo ballet niñas)<input name="edad" value="${esc(h&&h.edad||"")}"></label></div>
      ${h?`<label class="check"><input type="checkbox" name="quitar"> Quitar esta clase del horario desde esa fecha</label>`:""}
      <p class="privacy">Recuerda cambiar también <code>horario.json</code> (los textos de la página sin sistema).</p>`,
    accion:async f=>{
      const cid=h?h.id:v(f,"id");
      if(!/^[a-z0-9-]{3,20}$/.test(cid||"")) return "El código solo puede tener minúsculas, números y guiones (ej. mar-1900).";
      if(!v(f,"ini")||!v(f,"fin")||v(f,"fin")<=v(f,"ini")) return "La hora de terminar debe ser después de la de empezar.";
      const r=await hacer("estudio_guardar_horario",{p_id:cid,p_dia_semana:+v(f,"dia"),p_inicio:v(f,"ini"),p_fin:v(f,"fin"),p_tipo_id:v(f,"tipo"),p_instructora_id:v(f,"inst"),
        p_etiqueta:v(f,"et")||null,p_edad:v(f,"edad")||null,p_activo:!v(f,"quitar"),p_desde:v(f,"desde")||null},{dlg:true});
      if(!r) return null; if(r.ok===false) return r.mensaje; res=r; return true; }});
  if(ok){
    listo(`Horario guardado (${res.sesiones_actualizadas} fechas actualizadas)`);
    const c=res.con_reservas||[];
    if(c.length) setTimeout(()=>pedir({titulo:"Fechas con reservas", ok:"Entendido", no:"",
      html:`<p>Estas fechas ya tenían reservas y se quedaron como estaban. Decide en <b>Clases</b> si las cancelas (avisando a las alumnas) o las mantienes:</p><ul class="lista">${c.map(x=>`<li>${esc(fmtDay(x.fecha))}: ${x.reservas} ${x.reservas===1?"reserva":"reservas"}</li>`).join("")}</ul>`}),50);
    cargarAjustes();
  }
}
async function editarPersonal(correo){
  const p=($("#ajustes").__per||[]).find(x=>x.correo===correo);
  const ok=await pedir({titulo:p?`Acceso de ${p.nombre}`:"Dar acceso", ok:"Guardar",
    html:`<label class="fld">Correo de su cuenta<input name="correo" type="email" value="${esc(p?p.correo:"")}" ${p?"readonly":""}></label>
      <label class="fld">Nombre<input name="nombre" value="${esc(p?p.nombre:"")}"></label>
      <div class="two"><label class="fld">Rol<select name="rol">${opt("asistente","Asistente",p&&p.rol==="asistente")}${opt("instructora","Instructora",p&&p.rol==="instructora")}${opt("duena","Dueña",p&&p.rol==="duena")}</select></label>
      <label class="fld">Instructora (si es instructora)<select name="inst">${opt("","—")}${CAT.instructoras.map(i=>opt(i.id,i.nombre,p&&p.instructora_id===i.id)).join("")}</select></label></div>
      <label class="check"><input type="checkbox" name="activo" ${!p||p.activo?"checked":""}> Tiene acceso</label>`,
    accion:async f=>{
      if(v(f,"rol")==="instructora"&&!v(f,"inst")) return "Elige qué instructora es.";
      const r=await hacer("estudio_guardar_personal",{p_correo:v(f,"correo"),p_nombre:v(f,"nombre"),p_rol:v(f,"rol"),p_instructora_id:v(f,"inst")||null,p_activo:v(f,"activo")},{dlg:true});
      if(!r) return null; return r.ok===false?r.mensaje:true; }});
  if(ok){ listo("Acceso guardado"); cargarAjustes(); }
}

/* =========================================================
   EXPORTAR (dueña): CSV con BOM para que Excel lea los acentos
   ========================================================= */
const COLS = {clientas:{nombre:"Nombre",whatsapp:"WhatsApp",correo:"Correo",acepta_whatsapp:"Acepta WhatsApp",alta:"Alta",reservas:"Reservas activas",asistencias:"Asistencias"},
  reservas:{fecha:"Fecha",hora:"Hora",clase:"Clase",instructora:"Instructora",clienta:"Clienta",whatsapp:"WhatsApp",lugar:"Lugar",estado:"Estado",origen:"Origen",asistencia:"Asistencia",pago:"Pago",metodo:"Método",monto:"Monto",cancelacion_tardia:"Cancelación tardía",cargo:"Cargo",cargo_estado:"Estado del cargo"},
  membresias:{clienta:"Clienta",whatsapp:"WhatsApp",plan:"Plan",detalle:"Detalle",desde:"Desde",hasta:"Hasta",precio:"Precio",pago:"Pago",metodo:"Método",estado:"Estado"}};
function csv(que,filas){
  const C=COLS[que], keys=Object.keys(C);
  const cel=x=>{ const s=x==null?"":typeof x==="boolean"?(x?"Sí":"No"):String(x); return /[",\n\r;]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; };
  return "﻿"+[keys.map(k=>cel(C[k])).join(","), ...filas.map(f=>keys.map(k=>cel(f[k])).join(","))].join("\r\n")+"\r\n";
}
async function exportar(e){
  e.preventDefault();
  const que=$("#xQue").value, args={p_que:que};
  if(que==="reservas"){ args.p_desde=$("#xDesde").value||null; args.p_hasta=$("#xHasta").value||null; }
  const r=await hacer("estudio_exportar",args); if(!r) return;
  const blob=new Blob([csv(que,r.filas||[])],{type:"text/csv;charset=utf-8"}), a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download=`bale-${que}-${hoy()}.csv`; document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  listo(`Descargado: ${(r.filas||[]).length} filas`);
}

/* =========================================================
   ARRANQUE
   ========================================================= */
function eventos(){
  $("#fEntrar").addEventListener("submit",login);
  $("#eOlvido").addEventListener("click",olvido);
  $("#fNueva").addEventListener("submit",nuevaClave);
  $("#cambiarClave").addEventListener("click",cambiarClave);
  $("#salir").addEventListener("click",async()=>{ await sb.auth.signOut().catch(()=>{}); aviso("Saliste del área del estudio."); mostrarEntrar(); });
  $("#tabs").addEventListener("click",e=>{ const t=e.target.closest('[role="tab"]'); if(t) abrirTab(t.id.slice(2)); });
  $("#tabs").addEventListener("keydown",e=>{ const d=e.key==="ArrowRight"?1:e.key==="ArrowLeft"?-1:0; if(!d) return;
    const tabs=[...document.querySelectorAll('#tabs [role="tab"]')], i=tabs.findIndex(t=>t.getAttribute("aria-selected")==="true"), n=tabs[(i+d+tabs.length)%tabs.length];
    abrirTab(n.id.slice(2)); n.focus(); });
  // Clases
  $("#cPrev").addEventListener("click",()=>{ cWeek--; cSel=null; cargarSemana(); });
  $("#cNext").addEventListener("click",()=>{ cWeek++; cSel=null; cargarSemana(); });
  $("#cInst").addEventListener("change",()=>{ cSel=null; pintarSemana(); const s=SEM.find(filtroInst); cSel=s?s.id:null; pintarSemana(); if(cSel) cargarClase(cSel); else $("#cDet").innerHTML=""; });
  $("#cList").addEventListener("click",e=>{ const b=e.target.closest("[data-s]"); if(!b) return; cSel=+b.dataset.s; pintarSemana(); cargarClase(cSel);
    $(`#cList [data-s="${cSel}"]`).focus(); if(matchMedia("(max-width:899px)").matches) $("#cDet").scrollIntoView({block:"start"}); });
  $("#cDet").addEventListener("click",e=>{
    const a=e.target.closest("[data-asis]"); if(a&&!a.disabled){ marcarAsistencia(a); return; }
    const c=e.target.closest("[data-cancel]"); if(c){ cancelarReserva(+c.dataset.cancel,c.dataset.nombre); return; }
    const x=e.target.closest("[data-a]"); if(x) accionClase(x.dataset.a);
  });
  $("#icsSemana").addEventListener("click",icsSemana);
  // Clientas
  $("#qCli").addEventListener("input",()=>{ clearTimeout(qT); qT=setTimeout(buscarClientas,300); });
  $("#nuevaCli").addEventListener("click",nuevaClienta);
  $("#p-clientas").addEventListener("click",e=>{
    const t=e.target.closest("[data-ficha],[data-renovar],[data-fijo],[data-quitar-fijo],[data-mem],[data-cancel-mem],[data-borrar],[data-cobro-mem]"); if(!t) return;
    const d=t.dataset;
    if(d.cobroMem) cobrarConTarjeta({p_membresia_id:+d.cobroMem});
    else if(d.renovar) renovar(d.renovar,d.hasta,d.nombre);
    else if(d.ficha) abrirFicha(+d.ficha);
    else if(d.fijo) agregarFijo(d.fijo);
    else if(d.quitarFijo) quitarFijo(d.quitarFijo);
    else if(d.mem) membresia(d.mem);
    else if(d.cancelMem) cancelarMem(d.cancelMem);
    else if(d.borrar) borrarDatos(d.borrar);
  });
  $("#p-clientas").addEventListener("submit",e=>{ if(e.target.id==="fCli"){ e.preventDefault(); guardarCli(e.target); } });
  // Cobros
  $("#p-cobros").addEventListener("click",e=>{
    const p=e.target.closest("[data-pagar]"); if(p){ pagar(p.dataset.pagar,p.dataset.q,false); return; }
    const c=e.target.closest("[data-cortesia]"); if(c){ pagar(c.dataset.cortesia,c.dataset.q,true); return; }
    const g=e.target.closest("[data-cargo]"); if(g){ cargo(g.dataset.r,g.dataset.cargo,g.dataset.q); return; }
    const en=e.target.closest("[data-enlace]"); if(en){ enlace(en.dataset.id,en.dataset.enlace,en.dataset.q); return; }
    const cp=e.target.closest("[data-copiar]"); if(cp){ copiar(cp.dataset.copiar,cp.dataset.que); return; }
    const cr=e.target.closest("[data-cobro-reserva]"); if(cr) cobrarConTarjeta({p_reserva_id:+cr.dataset.cobroReserva},cargarCobros);
  });
  // Avisos y ajustes
  $("#p-avisos").addEventListener("change",e=>{ if(e.target.dataset.sw) interruptor(e.target); });
  $("#ajustes").addEventListener("submit",e=>{ const f=e.target.closest("[data-aj]"); if(f){ e.preventDefault(); guardarAjustes(f); } });
  $("#ajustes").addEventListener("click",e=>{ const h=e.target.closest("[data-hor]"); if(h){ editarHorario(h.dataset.hor); return; }
    const p=e.target.closest("[data-per]"); if(p) editarPersonal(p.dataset.per); });
  // Exportar
  $("#xQue").addEventListener("change",()=>{ $("#xFechas").hidden=$("#xQue").value!=="reservas"; });
  $("#xDesde").value=sumar(hoy(),-30); $("#xHasta").value=sumar(hoy(),30);
  $("#fExp").addEventListener("submit",exportar);
}

NB.ready.then(async cfg=>{
  CFG=cfg;
  const S=cfg.sistema||{};
  if(!(S.activo===true&&/^https:\/\/[^\s/]+\.supabase\.co\/?$/.test(S.url||"")&&/^sb_publishable_/.test(S.clave_publicable||""))||!window.supabase){
    $("#entrar").hidden=false; $("#fEntrar").hidden=true;
    aviso("El área del estudio todavía no está conectada a la base de datos (data/config.json → sistema). Ver docs/CONFIGURAR-SUPABASE.md.","mal");
    return;
  }
  // Volver de "¿Olvidaste tu contraseña?": el enlace del correo trae type=recovery
  const recuperando=/type=recovery/.test(location.hash);
  sb=window.supabase.createClient(S.url.replace(/\/+$/,""),S.clave_publicable,{auth:{storageKey:"bale-estudio-auth",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  eventos();
  sb.auth.onAuthStateChange(ev=>{ if(ev==="PASSWORD_RECOVERY"){ $("#entrar").hidden=false; $("#app").hidden=true; $("#fEntrar").hidden=true; $("#fNueva").hidden=false; $("#eNueva").focus(); } });
  const {data}=await sb.auth.getSession().catch(()=>({data:{}}));
  if(recuperando){ $("#entrar").hidden=false; $("#fEntrar").hidden=true; $("#fNueva").hidden=false; return; }
  if(data&&data.session) entrarApp(); else mostrarEntrar();
}).catch(()=>aviso("No se pudo cargar la configuración. Recarga la página.","mal"));
})();
