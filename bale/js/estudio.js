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
  if(cod==="requiere_2fa"){ pedirSegundoPaso(); return; }
  aviso("Tu sesión terminó o tu cuenta no tiene permiso para esto. Vuelve a entrar.","mal");
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
// La sala real (foto «Ubicación de espacios», 8/11/2026): barra del espejo 9–16 y del fondo 7–8 arriba;
// tres barras de adelante 1–2, 3–4 y 5–6 abajo. Si la sala no tiene 16 lugares, filas en orden.
const ZONAS16=[{t:"Barra del fondo",ns:[7,8]},{t:"Barra del espejo",ns:[9,10,11,12,13,14,15,16]},{t:"Barras de adelante",ns:[1,2,3,4,5,6]}];
function zonas(){ const S=sala(), tot=S.filas*S.por_fila;
  return tot===16?ZONAS16:Array.from({length:S.filas},(_,f)=>({t:`Fila ${f+1}`,ns:Array.from({length:S.por_fila},(_,i)=>f*S.por_fila+i+1)})); }
function salaSVG(ocup){
  const set=new Set(ocup||[]), Z=zonas(), arriba=Z.length===3?[Z[0],Z[1]]:Z.slice(0,1), abajo=Z.length===3?[Z[2]]:Z.slice(1);
  const fila=(gs,y)=>{ let x=30, m=""; gs.forEach((g,gi)=>{ g.ns.forEach((n,i)=>{ if(Z.length===3&&g.t.startsWith("Barras")&&i&&i%2===0) x+=22;
      m+=`<g class="mk ${set.has(n)?"busy":"free"}"><line x1="${x-14}" y1="${y-15}" x2="${x+14}" y2="${y-15}"/><circle cx="${x}" cy="${y+4}" r="15"/><text x="${x}" y="${y+9}">${n}</text></g>`; x+=44; }); x+=22; }); return [m,x]; };
  const [m1,w1]=fila(arriba,56), [m2,w2]=fila(abajo,106), W=Math.max(w1,w2)+8;
  return `<svg viewBox="0 0 ${W} 136" role="presentation"><rect class="mirror" x="8" y="6" width="${W-16}" height="16" rx="4"/><text class="mtxt" x="${W/2}" y="18">ESPEJO</text>${m1}${m2}</svg>`;
}
// Botones de lugares dentro de un formulario; el elegido va en <input name="lugar">
function seatsHTML(ocup){
  const set=new Set(ocup||[]); let h=`<input type="hidden" name="lugar" value=""><div class="seats" data-seats>`;
  for(const z of zonas()){
    h+=`<div class="srow" role="group" aria-label="${z.t}"><span class="bar">${z.t} ${z.ns[0]}–${z.ns[z.ns.length-1]}</span><div style="--n:${Math.min(z.ns.length,8)}">`;
    for(const n of z.ns){ const b=set.has(n);
      h+=`<button type="button" class="seat ${b?"busy":""}" data-n="${n}" ${b?"disabled":""} aria-pressed="false" aria-label="Lugar ${n}, ${z.t.toLowerCase()}${b?", ocupado":""}">${n}</button>`; }
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
  YO=null; $("#app").hidden=true; $("#entrar").hidden=false; $("#salir").hidden=true; $("#cambiarClave").hidden=true; $("#seguridad").hidden=true; $("#quien").hidden=true;
  $("#fEntrar").hidden=false; $("#fNueva").hidden=true; $("#fCodigo").hidden=true;
}
/* ---------- Verificación en dos pasos (TOTP de Supabase Auth) ----------
   Si la cuenta tiene un factor verificado, después de la contraseña se pide el código.
   Si la dueña exige la verificación (exigir_2fa) y la cuenta todavía no la tiene, se le
   ofrece activarla ahí mismo; sin ella no entra. */
async function nivel2FA(){
  try{ const {data}=await sb.auth.mfa.getAuthenticatorAssuranceLevel(); return data||{}; }catch(e){ return {}; }
}
async function factorTotp(){
  try{ const {data}=await sb.auth.mfa.listFactors(); return ((data&&data.totp)||[]).find(f=>f.status==="verified")||null; }catch(e){ return null; }
}
async function pedirSegundoPaso(){
  const f=await factorTotp();
  if(!f){
    $("#app").hidden=true; $("#entrar").hidden=false; $("#fEntrar").hidden=true; $("#fCodigo").hidden=true;
    aviso("La dueña pidió la verificación en dos pasos para entrar. Actívala ahora: necesitas tu teléfono con una app de autenticación.","mal");
    const ok=await activar2FA(true);
    if(ok) entrarApp(); else { await sb.auth.signOut().catch(()=>{}); mostrarEntrar(); }
    return;
  }
  $("#app").hidden=true; $("#entrar").hidden=false; $("#fEntrar").hidden=true; $("#fNueva").hidden=true; $("#fCodigo").hidden=false;
  $("#eCodigo").value=""; $("#eCodigo").focus();
}
async function confirmarCodigo(e){
  e.preventDefault();
  const code=$("#eCodigo").value.replace(/\D/g,"");
  if(code.length!==6){ aviso("Escribe los 6 números del código.","mal"); return; }
  const f=await factorTotp(); if(!f){ mostrarEntrar(); return; }
  const b=$("#eCodBtn"); b.disabled=true;
  const {error}=await sb.auth.mfa.challengeAndVerify({factorId:f.id,code}).catch(()=>({error:{message:"red"}}));
  b.disabled=false;
  if(error){ aviso(error.message==="red"?"No hay conexión. Revisa el internet.":"Ese código no es válido o ya cambió. Escribe el que sale ahora en la app.","mal"); $("#eCodigo").select(); return; }
  $("#eCodigo").value=""; aviso(""); entrarApp();
}
async function entrarApp(){
  const n=await nivel2FA();
  if(n.nextLevel==="aal2"&&n.currentLevel!=="aal2"){ pedirSegundoPaso(); return; }
  let yo;
  try{ yo=await rpc("estudio_yo"); }
  catch(e){
    if(e instanceof Prohibido&&e.message==="requiere_2fa"){ pedirSegundoPaso(); return; }
    if(e instanceof Prohibido){ aviso("Tu cuenta no tiene acceso al área del estudio.","mal"); await sb.auth.signOut().catch(()=>{}); mostrarEntrar(); return; }
    aviso("No hay conexión con la base de datos. Inténtalo de nuevo en unos minutos.","mal"); mostrarEntrar(); return;
  }
  YO=yo; aviso("");
  CAT=await hacer("estudio_catalogos")||{planes:[],horario:[],instructoras:[],tipos:[],sala:{filas:2,por_fila:8}};
  $("#entrar").hidden=true; $("#app").hidden=false; $("#salir").hidden=false; $("#cambiarClave").hidden=false;
  $("#seguridad").hidden=YO.rol==="instructora";
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
// Activar la verificación en dos pasos: QR (o clave para escribir) → código de la app → verificado
async function activar2FA(obligatoria){
  // si quedó un intento a medias, se borra para empezar limpio
  try{ const {data}=await sb.auth.mfa.listFactors(); for(const f of ((data&&data.all)||[]).filter(x=>x.status!=="verified")) await sb.auth.mfa.unenroll({factorId:f.id}); }catch(e){}
  const {data:en,error}=await sb.auth.mfa.enroll({factorType:"totp",friendlyName:"balé"}).catch(()=>({error:{message:"red"}}));
  if(error||!en||!en.totp){ aviso(error&&error.message==="red"?"No hay conexión. Inténtalo de nuevo.":"No se pudo empezar la verificación en dos pasos. Avísale a César.","mal"); return false; }
  // Supabase da el QR como «data:image/svg+xml;utf-8,<svg…>» sin codificar: se vuelve a codificar para que el navegador lo pinte
  let svg=String(en.totp.qr_code||"");
  while(/^data:image\/svg\+xml[^,]*,/.test(svg)) svg=svg.replace(/^data:image\/svg\+xml[^,]*,/,"");
  if(!/^\s*</.test(svg)){ try{ svg=decodeURIComponent(svg); }catch(e){ svg=""; } }
  const qr=/^\s*<svg[\s>]/.test(svg)?"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg):"";
  const ok=await pedir({titulo:"Activar la verificación en dos pasos", ok:"Activar", no:obligatoria?"Salir":"Cancelar",
    html:`<ol class="pasos"><li>En tu teléfono, instala <b>Google Authenticator</b> o <b>Microsoft Authenticator</b> (gratis).</li>
      <li>En la app, pulsa <b>+</b> y escanea este código${qr?"":" (o escribe la clave)"}.${qr?` Si estás en el mismo teléfono, copia la clave y pégala en la app.`:""}</li>
      <li>Escribe aquí el código de 6 números que te muestra la app.</li></ol>
      ${qr?`<p class="qr2fa"><img src="${esc(qr)}" alt="Código QR para la app de autenticación" width="180" height="180"></p>`:""}
      <p class="privacy">Clave: <code class="clave2fa">${esc(en.totp.secret)}</code> <button class="linkbtn" type="button" data-copiar-clave>Copiar clave</button></p>
      <label class="fld">Código de la app<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}"></label>
      <p class="privacy">Desde ahora, al entrar te pediremos la contraseña y este código. Si cambias de teléfono, avísale a César antes.</p>`,
    alAbrir:f=>{ const b=f.querySelector("[data-copiar-clave]"); if(b) b.addEventListener("click",()=>copiar(en.totp.secret,"Clave")); },
    accion:async f=>{
      const code=v(f,"code").replace(/\D/g,""); if(code.length!==6) return "Escribe los 6 números del código.";
      const {error:e}=await sb.auth.mfa.challengeAndVerify({factorId:en.id,code}).catch(()=>({error:{message:"red"}}));
      if(e) return e.message==="red"?"No hay conexión. Inténtalo de nuevo.":"Ese código no es válido. Escribe el que sale ahora en la app (cambia cada 30 segundos).";
      return true; }});
  if(!ok){ sb.auth.mfa.unenroll({factorId:en.id}).catch(()=>{}); return false; }
  listo("Verificación en dos pasos activada");
  return true;
}
async function seguridad(){
  const f=await factorTotp(), n=await nivel2FA();
  if(!f){
    const ok=await pedir({titulo:"Seguridad de tu cuenta", ok:"Activar verificación en dos pasos",
      html:`<p>La verificación en dos pasos pide, además de la contraseña, un código que cambia cada 30 segundos en tu teléfono. Si alguien descubre tu contraseña, no puede entrar sin tu teléfono.</p>
        <p class="privacy">Es para la dueña y la asistente: son las cuentas que ven teléfonos y cobros.</p>`});
    if(ok) await activar2FA(false);
    return;
  }
  const quitar=await pedir({titulo:"Seguridad de tu cuenta", ok:"Quitar la verificación", no:"Cerrar", peligro:true,
    html:`<p><b>Verificación en dos pasos: activada</b>${f.created_at?` desde el ${esc(new Date(f.created_at).toLocaleDateString("es-DO",{timeZone:TZ,dateStyle:"long"}))}`:""}.</p>
      <p class="privacy">Quítala solo si cambias de teléfono (después la vuelves a activar con el nuevo).${n.currentLevel!=="aal2"?" Para quitarla tienes que haber entrado con el código.":""}</p>`,
    accion:async()=>{
      if(esDuena()&&aj("exigir_2fa",false)) return "Primero apaga «Exigir la verificación» en Ajustes → Seguridad.";
      const {error}=await sb.auth.mfa.unenroll({factorId:f.id}).catch(()=>({error:{message:"red"}}));
      if(error) return error.message==="red"?"No hay conexión.":"No se pudo quitar. Sal y vuelve a entrar con el código, y prueba otra vez.";
      return true; }});
  if(quitar){ await sb.auth.refreshSession().catch(()=>{}); listo("Verificación en dos pasos quitada"); }
}

/* =========================================================
   PESTAÑAS (según el rol)
   ========================================================= */
let TAB="";
function montarTabs(){
  const t=YO.rol==="instructora" ? [["clases","Mis clases"]]
    : [["clases","Clases"],["clientas","Clientas"],["cobros","Cobros"],["avisos","Avisos"]].concat(conComunidad()?[["comunidad","Comunidad"]]:[]).concat(esDuena()?[["ingresos","Ingresos"],["ajustes","Ajustes"],["exportar","Exportar"]]:[]);
  $("#tabs").innerHTML=t.map(([id,n],i)=>`<button role="tab" type="button" id="t-${id}" aria-controls="p-${id}" aria-selected="${i===0}" tabindex="${i?-1:0}">${n}${id==="cobros"?' <span class="tcnt" id="cntEnlaces" hidden></span>':""}</button>`).join("");
  $("#tabs").hidden=t.length<2;
  PANELES.forEach(id=>{ $("#p-"+id).hidden=true; });
  $("#cInstW").hidden=YO.rol==="instructora";
  $("#icsWrap").hidden=YO.rol!=="instructora";
  $("#cInst").innerHTML=opt("","Todas")+CAT.instructoras.map(i=>opt(i.nombre,i.nombre)).join("");
  abrirTab(t[0][0]);
}
// Contador de Cobros: enlaces de tarjeta por enviar + transferencias por confirmar
const PANELES = ["clases","clientas","cobros","avisos","comunidad","ingresos","ajustes","exportar"];
let CNT={enlaces:0,transf:0};
function pintarContador(){
  const b=$("#cntEnlaces"); if(!b) return;
  const n=CNT.enlaces+CNT.transf;
  b.hidden=!n; b.textContent=n||"";
  const partes=[CNT.enlaces?`${CNT.enlaces} ${CNT.enlaces===1?"enlace":"enlaces"} por enviar`:"",CNT.transf?`${CNT.transf} ${CNT.transf===1?"transferencia":"transferencias"} por confirmar`:""].filter(Boolean);
  $("#t-cobros").setAttribute("aria-label",partes.length?`Cobros, ${partes.join(" y ")}`:"Cobros");
}
async function contarEnlaces(){   // en silencio: el contador es una ayuda, no un error
  try{ const r=await rpc("estudio_enlaces_por_enviar",{}); if(r&&r.ok){ CNT.enlaces=+r.por_enviar||0; pintarContador(); } return r; }
  catch(e){ return null; }
}
async function contarTransf(){
  try{ const r=await rpc("estudio_transferencias",{}); if(r&&r.ok){ CNT.transf=+r.total||0; pintarContador(); } return r; }
  catch(e){ return null; }
}
function abrirTab(id){
  TAB=id;
  document.querySelectorAll('#tabs [role="tab"]').forEach(b=>{ const on=b.id==="t-"+id; b.setAttribute("aria-selected",on); b.tabIndex=on?0:-1; });
  PANELES.forEach(x=>{ $("#p-"+x).hidden=x!==id; });
  ({clases:cargarSemana, clientas:abrirClientas, cobros:cargarCobros, avisos:cargarAvisos, comunidad:cargarComunidad, ingresos:cargarIngresos, ajustes:cargarAjustes, exportar:()=>{}})[id]();
  if(id!=="cobros"&&YO&&YO.rol!=="instructora"){ contarEnlaces(); contarTransf(); }
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
async function abrirClientas(){ cargarControl(); cargarVencen(); buscarClientas(); }

/* ---------- Control de membresías (el Excel de Brittany) ---------- */
const EST_MEM = {activa:"Activa", renueva_pronto:"Renueva pronto", vencida:"Vencida"};
let CTRL=null; const ctrlF={estado:"",plan:"",clase:""};
async function cargarControl(){
  const r=await hacer("estudio_control_membresias",{}); if(!r) return;
  CTRL=r; pintarControl();
}
const claseTxt = id=>{ const h=(CAT.horario||[]).find(x=>x.id===id); return h?`${DIAS[h.dia_semana-1].slice(0,3)} ${h12(h.inicio)} · ${h.clase}`:id; };
function filtradas(){ return (CTRL.membresias||[]).filter(m=>(!ctrlF.estado||m.estado===ctrlF.estado)&&(!ctrlF.plan||m.plan_id===ctrlF.plan)&&(!ctrlF.clase||(m.horarios||[]).includes(ctrlF.clase))); }
function pintarControl(){
  const r=CTRL, c=r.contadores||{}, M=r.membresias||[];
  const planesUsados=[...new Map(M.map(m=>[m.plan_id,m.plan])).entries()];
  const clases=[...new Set(M.flatMap(m=>m.horarios||[]))].sort();
  const sel=(id,etq,opts)=>`<label class="fld">${etq}<select data-ctrl="${id}">${opt("","Todas")}${opts.map(([k,n])=>opt(k,n,ctrlF[id]===k)).join("")}</select></label>`;
  const L=filtradas();
  $("#control").innerHTML=`<h2>Control de membresías</h2>
    <ul class="kpis" aria-label="Resumen">
      <li><b>${+c.clientas||0}</b><span>clientas registradas</span></li>
      <li><b>${+c.activas||0}</b><span>membresías activas</span></li>
      <li class="${c.renuevan?"ojo":""}"><b>${+c.renuevan||0}</b><span>renuevan en ${r.dias} días</span></li>
      <li><b>${+c.vencidas||0}</b><span>vencidas</span></li></ul>
    <div class="filtros">${sel("estado","Estado",Object.entries(EST_MEM))}${sel("plan","Plan",planesUsados)}${sel("clase","Clase fija",clases.map(h=>[h,claseTxt(h)]))}</div>
    ${L.length?`<div class="tablewrap"><table class="vtable ctrl"><caption class="sr-only">Membresías (${L.length})</caption><thead><tr>
      <th scope="col">Nombre</th><th scope="col">Clase fija y lugar</th><th scope="col">Correo</th><th scope="col">Teléfono</th><th scope="col">Plan</th>
      <th scope="col">Inicio</th><th scope="col">Último pago</th><th scope="col">Próximo pago</th><th scope="col">Monto</th><th scope="col">Método</th><th scope="col">Banco</th><th scope="col">Estado</th></tr></thead><tbody>
      ${L.map(m=>`<tr><th scope="row"><button class="linkbtn" type="button" data-ficha="${m.clienta_id}">${esc(m.nombre)}</button></th>
        <td>${esc(m.clases_fijas||"—")}</td><td>${esc(m.correo||"—")}</td><td class="nw">${esc(m.telefono||"")}</td><td>${esc(m.plan)}</td>
        <td class="nw">${esc(fmtCorta(m.desde))}</td><td class="nw">${m.pagado_en?esc(fmtCorta(m.pagado_en)):m.pago_estado==="cortesia"?"Cortesía":"<span class=\"pend\">Por pagar</span>"}</td>
        <td class="nw">${esc(fmtCorta(m.proximo_pago))}</td><td class="nw">${esc(dinero(m.monto))}</td><td>${esc(METODO[m.pago_metodo]||"—")}</td><td>${esc(m.banco||"—")}</td>
        <td><span class="est ${m.estado}">${esc(EST_MEM[m.estado])}</span></td></tr>`).join("")}
    </tbody></table></div>`:`<p class="privacy">${M.length?"Ninguna membresía con esos filtros.":"Todavía no hay membresías registradas."}</p>`}
    ${esDuena()?`<div class="eacc"><button class="bbtn line sm" type="button" data-exp-control>Exportar a Excel</button>
      <button class="bbtn line sm" type="button" data-importar>Importar membresías</button></div>`:""}`;
}
async function exportarControl(){
  const r=await hacer("estudio_exportar",{p_que:"control"}); if(!r) return;
  descargarCsv("control",r.filas||[],`bale-membresias-${hoy()}.csv`);
}

/* ---------- Importar membresías (solo la dueña): .xlsx o .csv → revisar fila por fila → importar ---------- */
function filasImport(r){
  const E={ok:["bien","OK"],ya_estaba:["","Ya estaba"],error:["mal","Error"]};
  return `<ul class="impfilas">${(r.filas||[]).map(f=>{ const [cl,et]=E[f.estado]||["",f.estado];
    return `<li class="${cl}"><p><b>Fila ${f.fila} · ${esc(f.nombre||"(sin nombre)")}</b> <span class="est ${cl}">${esc(et)}</span>${f.plan?`<small>${esc(f.plan)} · ${esc(fmtCorta(f.desde))} – ${esc(fmtCorta(f.hasta))}</small>`:""}</p>
      ${(f.fijos||[]).map(x=>`<small>Lugar fijo: ${esc(x.clase)}${x.lugar?`, lugar ${x.lugar}`:""}${x.estado==="ya_estaba"?" (ya estaba)":""}</small>`).join("")}
      ${(f.errores||[]).map(x=>`<small class="err">✗ ${esc(x)}</small>`).join("")}${(f.avisos||[]).map(x=>`<small>! ${esc(x)}</small>`).join("")}</li>`; }).join("")}</ul>`;
}
function resumenImport(s){
  const pl=(n,uno,varios)=>`${n} ${+n===1?uno:varios}`;
  return `<p><b>${pl(s.filas,"fila","filas")}</b> · <b>${s.con_error}</b> con error · ${pl(s.clientas_nuevas,"clienta nueva","clientas nuevas")} · ${pl(s.membresias_nuevas,"membresía nueva","membresías nuevas")} · ${pl(s.fijos_nuevos,"lugar fijo","lugares fijos")} · ${pl(s.reservas_fijas,"reserva fija","reservas fijas")}</p>
    ${(s.conflictos||[]).length?`<p class="privacy">Al reservar los lugares fijos, estas fechas chocaron (resérvalas a mano): ${s.conflictos.map(c=>esc(`${c.clienta||""} ${c.fecha||""}`)).join(", ")}</p>`:""}`;
}
async function importarMembresias(){
  let filas=null, paso="revisar";
  const ok=await pedir({titulo:"Importar membresías", ok:"Revisar el archivo",
    html:`<p class="privacy">Usa la plantilla de membresías (Excel .xlsx o .csv). Primero se revisa cada fila <b>sin guardar nada</b>; solo se importa si no hay ningún error. Repetirlo no duplica nada y no se manda ningún aviso a las clientas.</p>
      <label class="fld">Archivo<input type="file" name="archivo" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"></label>
      <div data-imp aria-live="polite"></div>`,
    alAbrir:f=>{ f.querySelector('[name="archivo"]').addEventListener("change",()=>{ filas=null; paso="revisar"; $("#dlgOk").textContent="Revisar el archivo"; f.querySelector("[data-imp]").innerHTML=""; }); },
    accion:async f=>{
      const box=f.querySelector("[data-imp]");
      if(paso==="listo") return true;
      if(paso==="revisar"){
        try{ filas=await window.BALE_HOJAS.leer(f.querySelector('[name="archivo"]').files[0]); }catch(e){ return e.message||"No se pudo leer el archivo."; }
        const r=await hacer("estudio_importar_membresias",{p_filas:filas,p_aplicar:false},{dlg:true});
        if(!r) return null; if(r.ok===false&&!r.filas) return r.mensaje;
        box.innerHTML=resumenImport(r.resumen||{})+filasImport(r);
        if((r.resumen||{}).con_error>0){ box.insertAdjacentHTML("afterbegin",`<p class="note">Hay filas con error: corrígelas en el archivo y vuelve a elegirlo. No se importó nada.</p>`); return null; }
        paso="importar"; $("#dlgOk").textContent=`Importar ${r.resumen.filas} ${r.resumen.filas===1?"fila":"filas"}`; return null;
      }
      const r=await hacer("estudio_importar_membresias",{p_filas:filas,p_aplicar:true},{dlg:true});
      if(!r) return null;
      if(!r.aplicado){ box.innerHTML=`<p class="note">No se importó: algo cambió desde la revisión. Vuelve a revisarlo.</p>`+filasImport(r); paso="revisar"; $("#dlgOk").textContent="Revisar el archivo"; return null; }
      box.innerHTML=`<p class="note bien">Listo: importado.</p>`+resumenImport(r.resumen||{});
      paso="listo"; $("#dlgOk").textContent="Cerrar"; $("#dlgNo").hidden=true; return null;
    }});
  if(ok||paso==="listo"){ listo("Membresías importadas"); abrirClientas(); }
}

/* ---------- Vencen esta semana: renovar una o todas ---------- */
let VENCEN=[];
async function cargarVencen(){
  const r=await hacer("estudio_vencen",{p_dias:7}); if(!r) return;
  const m=VENCEN=r.membresias||[];
  $("#vencen").innerHTML=`<h2>Vencen esta semana</h2>${m.length?`<ul class="pays">${m.map(x=>`<li><div><label class="check"><input type="checkbox" data-ren-sel="${x.membresia_id}" checked> <b>${esc(x.nombre)}</b></label><small>${esc(x.plan)}${x.detalle?` · ${esc(x.detalle)}`:""} · hasta ${esc(fmtCorta(x.hasta))}${x.fijos?` · ${x.fijos} ${x.fijos===1?"lugar fijo":"lugares fijos"}`:""}</small></div>
    <div class="eacc"><button class="bbtn solid sm" type="button" data-renovar="${x.membresia_id}" data-hasta="${esc(x.hasta)}" data-nombre="${esc(x.nombre)}">Renovar</button>
    <button class="bbtn line sm" type="button" data-ficha="${x.clienta_id}">Ver ficha</button></div></li>`).join("")}</ul>
    <div class="eacc"><button class="bbtn solid" type="button" data-renovar-todas>Renovar todas las de esta semana</button></div>`
    :`<p class="privacy">Ninguna membresía vence en los próximos 7 días.</p>`}`;
}
async function renovarTodas(){
  const ids=[...document.querySelectorAll("#vencen [data-ren-sel]:checked")].map(i=>+i.dataset.renSel);
  if(!ids.length){ aviso("Marca al menos una membresía para renovar.","mal"); return; }
  const rev=await hacer("estudio_renovar_varias",{p_ids:ids,p_aplicar:false}); if(!rev) return;
  const F=rev.filas||[], buenas=F.filter(x=>x.ok);
  const M={lugar_ocupado:"el lugar ya estaba reservado",clase_llena:"la clase ya estaba llena",ya_tiene_reserva:"ya tenía una reserva ese día",lugar_invalido:"ese lugar no existe en la sala"};
  const ok=await pedir({titulo:`Renovar ${buenas.length} ${buenas.length===1?"membresía":"membresías"}`, ok:buenas.length?`Renovar ${buenas.length}`:"Cerrar", no:buenas.length?"Cancelar":"",
    html:`<p>Mismo plan, mismo monto y mismos lugares fijos, por un mes. Cada una queda <b>por pagar</b> hasta que marques el pago.</p>
      <ul class="impfilas">${F.map(x=>`<li class="${x.ok?((x.fijos_no_copiados||[]).length||(x.conflictos||[]).length?"ojo":"bien"):"mal"}"><p><b>${esc(x.nombre||"")}</b>${x.ok?`<small>${esc(x.plan)} · ${esc(fmtCorta(x.desde))} – ${esc(fmtCorta(x.hasta))} · ${esc(dinero(x.monto))} · ${x.fijos} ${x.fijos===1?"lugar fijo":"lugares fijos"}</small>`:`<small class="err">${esc(x.mensaje||"No se puede renovar")}</small>`}</p>
        ${(x.fijos_no_copiados||[]).map(n=>`<small class="err">No se copia ${esc(claseTxt(n.horario_id))}, lugar ${n.lugar}: otra miembro ya lo tiene.</small>`).join("")}
        ${(x.conflictos||[]).map(c=>`<small class="err">${esc(fmtDay(c.fecha))}${c.lugar?` · lugar ${c.lugar}`:""}: ${esc(M[c.motivo]||c.motivo)} (resérvala a mano).</small>`).join("")}</li>`).join("")}</ul>`,
    accion:async()=>{
      if(!buenas.length) return true;
      const r=await hacer("estudio_renovar_varias",{p_ids:buenas.map(x=>+x.membresia_id),p_aplicar:true},{dlg:true});
      if(!r) return null; if(r.ok===false) return r.mensaje; listo(`${r.renovadas} ${r.renovadas===1?"membresía renovada":"membresías renovadas"} (por pagar)`); return true; }});
  if(ok&&buenas.length) abrirClientas();
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
      <p class="mt"><b>${esc(m.plan)}</b>${m.detalle?` · ${esc(m.detalle)}`:""}<small>${esc(fmtCorta(m.desde))} – ${esc(fmtCorta(m.hasta))} · ${esc(dinero(m.precio))} · ${esc(PAGO[m.pago_estado]||m.pago_estado)}${m.pago_metodo?` (${esc(METODO[m.pago_metodo])}${m.banco?`, ${esc(m.banco)}`:""})`:""}${m.pagado_en?` el ${esc(fmtCorta(m.pagado_en))}`:""}${m.estado!=="activa"?" · cancelada":""}</small>
        ${m.transferencia&&m.transferencia.estado==="por_confirmar"?`<small class="rev">Avisó una transferencia: confírmala en Cobros.</small>`:""}</p>
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
const pagoSelect = (sel="pendiente",met="")=>`<label class="fld">Pago<select name="pago">${opt("pendiente","Pendiente",sel==="pendiente")}${opt("pagado","Pagado",sel==="pagado")}${opt("cortesia","Cortesía",sel==="cortesia")}</select></label>
  <label class="fld">Método<select name="metodo">${opt("","—")}${Object.entries(METODO).map(([k,n])=>opt(k,n,met===k)).join("")}</select></label>`;
const BANCOS_RD = ["Banco Popular","Banreservas","BHD","Scotiabank","Banco Santa Cruz","APAP","Asociación Cibao","Banco Caribe","Banesco","Promerica","Banco López de Haro","Banco Vimenca","Qik"];
const bancosList = ()=>`<datalist id="bancosRD">${BANCOS_RD.map(b=>`<option value="${esc(b)}">`).join("")}</datalist>`;
// Fecha y banco solo si está pagada (el banco, solo por transferencia)
function camposPago(f){
  const upd=()=>{ const pag=v(f,"pago")==="pagado", tr=v(f,"metodo")==="transferencia";
    const a=f.querySelector("[data-si-pagado]"), b=f.querySelector("[data-si-transf]"); if(a) a.hidden=!pag; if(b) b.hidden=!tr; };
  f.querySelectorAll('[name="pago"],[name="metodo"]').forEach(s=>s.addEventListener("change",upd)); upd();
}
async function membresia(id){
  const m=id==="nueva"?null:CLI.membresias.find(x=>x.id===+id);
  const desde=m?m.desde:hoy(), P=planes();
  const ok=await pedir({titulo:m?"Editar membresía":"Nueva membresía", ok:"Guardar",
    html:`<label class="fld">Plan<select name="plan">${P.map(p=>opt(p.id,`${p.nombre}${p.detalle?` · ${p.detalle}`:""} (${dinero(p.precio)})`,m?m.plan_id===p.id:false)).join("")}</select></label>
      <div class="two"><label class="fld">Desde<input type="date" name="desde" value="${esc(desde)}"></label>
      <label class="fld">Hasta<input type="date" name="hasta" value="${esc(m?m.hasta:finDeMes(desde))}"></label></div>
      <label class="fld">Precio RD$<input type="number" name="precio" min="0" step="50" inputmode="numeric" value="${esc(m?m.precio:(P[0]||{}).precio||"")}"></label>
      <div class="two">${pagoSelect(m?m.pago_estado:"pendiente",m&&m.pago_metodo)}</div>
      <div class="two" data-si-pagado><label class="fld">Fecha del pago<input type="date" name="pagado_en" max="${esc(hoy())}" value="${esc(m&&m.pagado_en||"")}"></label>
        <label class="fld" data-si-transf>Banco de origen<input name="banco" maxlength="60" list="bancosRD" value="${esc(m&&m.banco||"")}"></label></div>
      ${bancosList()}
      <label class="fld">Notas<input name="notas" maxlength="200" value="${esc(m?m.notas||"":"")}"></label>`,
    alAbrir:f=>{ if(!m) f.querySelector('[name="plan"]').addEventListener("change",e=>{ const p=P.find(x=>x.id===e.target.value); if(p) f.querySelector('[name="precio"]').value=p.precio; }); camposPago(f); },
    accion:async f=>{
      if(!v(f,"desde")||!v(f,"hasta")||v(f,"hasta")<v(f,"desde")) return "Revisa las fechas: «hasta» no puede ser antes de «desde».";
      const pagado=v(f,"pago")==="pagado";
      const r=await hacer("estudio_guardar_membresia",{p_id:m?m.id:null,p_clienta_id:CLI.clienta.id,p_plan_id:v(f,"plan"),p_desde:v(f,"desde"),p_hasta:v(f,"hasta"),
        p_precio:v(f,"precio")===""?null:+v(f,"precio"),p_pago_estado:v(f,"pago"),p_pago_metodo:v(f,"metodo")||null,p_notas:v(f,"notas"),
        p_pagado_en:pagado&&v(f,"pagado_en")||null,p_banco:pagado&&v(f,"metodo")==="transferencia"&&v(f,"banco")||null},{dlg:true});
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
  const [r,e,t]=await Promise.all([hacer("estudio_pendientes"),contarEnlaces(),contarTransf()]); if(!r) return;
  const E=(e&&e.cobros)||[], T=(t&&t.transferencias)||[];
  $("#cobTransf").innerHTML=T.map(x=>`<li><div><b>${esc(x.nombre)} · ${esc(dinero(+x.monto))}</b><small>${esc(x.concepto||"")}</small>
      <small>Transfirió el ${esc(fmtCorta(x.fecha))} desde ${esc(x.banco)}${x.avisos>1?` · avisó ${x.avisos} veces`:""} · ${esc(x.telefono)}</small>
      <small>${x.comprobante?`<button class="linkbtn" type="button" data-foto="${esc(x.comprobante)}" data-q="${esc(x.nombre)}">Ver comprobante</button>`:"Sin foto del comprobante"}</small></div>
    <div class="eacc"><button class="bbtn solid sm" type="button" data-transf="confirmada" data-id="${x.id}" data-q="${esc(x.nombre)}" data-m="${esc(x.monto)}">Confirmar</button>
      <button class="bbtn line sm" type="button" data-transf="rechazada" data-id="${x.id}" data-q="${esc(x.nombre)}" data-m="${esc(x.monto)}">Rechazar</button></div></li>`).join("")
    ||`<li class="empty-state">No hay transferencias por confirmar.</li>`;
  $("#cobMem").innerHTML=(r.membresias||[]).map(x=>`<li><div><b>${esc(x.nombre)} · ${esc(dinero(x.monto))}</b><small>${esc(x.plan)} · ${esc(fmtCorta(x.desde))} – ${esc(fmtCorta(x.hasta))}</small><small>${esc(x.telefono)}</small></div>
    <div class="eacc"><button class="bbtn solid sm" type="button" data-pagar-mem="${x.membresia_id}" data-q="${esc(x.nombre)}">Marcar pagada</button><button class="bbtn line sm" type="button" data-cobro-mem2="${x.membresia_id}">Cobrar con tarjeta</button><button class="bbtn line sm" type="button" data-cortesia-mem="${x.membresia_id}" data-q="${esc(x.nombre)}">Cortesía</button></div></li>`).join("")
    ||`<li class="empty-state">No hay membresías por pagar.</li>`;
  $("#cobPagadas").innerHTML=(r.pagadas||[]).map(x=>`<li><div><b>${esc(x.nombre)} · ${esc(dinero(x.monto))}</b><small>${esc(x.concepto)} · ${esc(METODO[x.metodo]||"sin método")} · ${esc(x.fecha?fmtCorta(String(x.fecha).slice(0,10)):"")}</small></div></li>`).join("")
    ||`<li class="empty-state">Nada pagado en los últimos 14 días.</li>`;
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
// Transferencia avisada por la clienta: confirmar (queda pagada) o rechazar con motivo
async function revisarTransf(id,estado,nombre,monto){
  const conf=estado==="confirmada";
  const ok=await pedir({titulo:conf?`¿Llegó la transferencia de ${nombre}?`:`Rechazar la transferencia de ${nombre}`, ok:conf?"Sí, confirmar":"Rechazar", peligro:!conf,
    html:conf?`<p>Mira primero en el banco que entraron <b>${esc(dinero(+monto))}</b>. Queda pagada por transferencia.</p><label class="check"><input type="checkbox" name="avisar" checked> Avisar a la clienta</label>`
      :`<label class="fld">Motivo (le llega a la clienta)<textarea name="motivo" rows="2" maxlength="200" placeholder="Ej.: no vemos el depósito en la cuenta"></textarea></label><label class="check"><input type="checkbox" name="avisar" checked> Avisar a la clienta</label>`,
    accion:async f=>{
      if(!conf&&v(f,"motivo").length<3) return "Escribe el motivo del rechazo.";
      const r=await hacer("estudio_transferencia",{p_id:+id,p_estado:estado,p_motivo:conf?null:v(f,"motivo"),p_avisar:v(f,"avisar")},{dlg:true});
      if(!r) return null; return r.ok===false?r.mensaje:true; }});
  if(ok){ listo(conf?"Transferencia confirmada":"Transferencia rechazada"); cargarCobros(); }
}
async function verComprobante(ruta,nombre){
  const {data,error}=await sb.storage.from("comprobantes").createSignedUrl(ruta,120).catch(()=>({error:{}}));
  if(error||!data||!data.signedUrl){ aviso("No encontramos la foto: puede que la clienta no llegara a subirla.","mal"); return; }
  await pedir({titulo:`Comprobante de ${nombre}`, ok:"Cerrar", no:"",
    html:`<p class="comprob"><img src="${esc(data.signedUrl)}" alt="Foto del comprobante de transferencia de ${esc(nombre)}"></p><p class="privacy">El enlace de la foto caduca en 2 minutos.</p>`});
}
async function pagarMembresia(id,nombre,cortesia){
  const ok=await pedir({titulo:cortesia?`Cortesía para ${nombre}`:`Pago de la membresía de ${nombre}`, ok:cortesia?"Marcar cortesía":"Marcar pagada",
    html:cortesia?`<p>La membresía queda como cortesía del estudio (sin cobro).</p>`
      :`<div class="two"><label class="fld">¿Cómo pagó?<select name="metodo">${Object.entries(METODO).map(([k,n])=>opt(k,n)).join("")}</select></label>
        <label class="fld">Fecha del pago<input type="date" name="pagado_en" max="${esc(hoy())}" value="${esc(hoy())}"></label></div>
        <label class="fld" data-si-transf>Banco de origen<input name="banco" maxlength="60" list="bancosRD"></label>${bancosList()}<input type="hidden" name="pago" value="pagado">`,
    alAbrir:f=>{ if(!cortesia) camposPago(f); },
    accion:async f=>{
      const r=await hacer("estudio_pago_membresia",cortesia?{p_id:+id,p_pago_estado:"cortesia"}
        :{p_id:+id,p_pago_estado:"pagado",p_metodo:v(f,"metodo"),p_pagado_en:v(f,"pagado_en")||null,p_banco:v(f,"metodo")==="transferencia"?v(f,"banco")||null:null},{dlg:true});
      if(!r) return null; return r.ok===false?r.mensaje:true; }});
  if(ok){ listo("Pago guardado"); cargarCobros(); }
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
  /* Cada canal se mira en quien lo manda: el correo sale de Supabase y el WhatsApp del servidor de Oracle */
  const deCorreo=vivos.filter(t=>t.estado&&"correo" in t.estado);
  const correo=!deCorreo.length?["mal","el notificador no responde"]:deCorreo.some(t=>t.estado.correo==="error")?["mal","con errores"]:["bien","funcionando"];
  const wa=est.whatsapp==="desconectado"?["mal","desconectado"]:!r.whatsapp_automatico||est.whatsapp==="desactivado"?["", "apagado"]:est.whatsapp!=="conectado"?["mal","desconectado"]:["bien",est.modo_prueba?"funcionando (modo prueba)":"funcionando"];
  const MOTIVO_WA={sin_vincular:"Falta vincular el teléfono.",cerrada:"WhatsApp cerró la sesión. Hay que volver a vincular el teléfono.",
    bloqueada:"WhatsApp restringió el número. Revisa el teléfono y no lo vuelvas a vincular todavía.",
    reemplazada:"Otro equipo abrió esta sesión. Hay que volver a vincular el teléfono."};
  const notaWa=wa[1]!=="desconectado"?"":`${est.whatsapp==="desconectado"?(MOTIVO_WA[est.whatsapp_motivo]||"Se está reconectando solo."):"El servidor de WhatsApp no responde."}${correo[0]==="bien"?" Los correos siguen saliendo.":""}`;
  const n=r.avisos_7_dias||{}, cnt=(c,e)=>+n[`${c}.${e}`]||0;
  const ult=(r.trabajadores||[]).map(t=>t.latido).sort().pop();
  $("#avEstado").innerHTML=`<h2>Estado de los avisos</h2>
    <ul class="estado"><li class="${correo[0]}"><b>Correo:</b> ${correo[1]}</li><li class="${wa[0]}"><b>WhatsApp:</b> ${wa[1]}</li></ul>
    ${notaWa?`<p class="privacy">${esc(notaWa)}</p>`:""}
    <p class="privacy">${ult?`Último latido del notificador: ${esc(new Date(ult).toLocaleString("es-DO",{timeZone:TZ,dateStyle:"medium",timeStyle:"short"}))}.`:"El notificador todavía no se ha conectado."}</p>
    ${esDuena()?`<div class="switches"><label class="check"><input type="checkbox" data-sw="correo_automatico" ${r.correo_automatico?"checked":""}> Enviar correos automáticos</label>
      <label class="check"><input type="checkbox" data-sw="whatsapp_automatico" ${r.whatsapp_automatico?"checked":""}> Enviar WhatsApp automáticos</label></div>`
      :`<p class="privacy">Correos automáticos: ${r.correo_automatico?"encendidos":"apagados"}. WhatsApp automáticos: ${r.whatsapp_automatico?"encendidos":"apagados"}.</p>`}
    <h3>Últimos 7 días</h3>
    <div class="tablewrap"><table class="vtable"><caption class="sr-only">Avisos de los últimos 7 días</caption><thead><tr><th scope="col">Canal</th><th scope="col">Enviados</th><th scope="col">En cola</th><th scope="col">Con error</th><th scope="col">Sin enviar</th></tr></thead><tbody>
      ${["correo","whatsapp"].map(c=>`<tr><th scope="row">${c==="correo"?"Correo":"WhatsApp"}</th><td>${cnt(c,"enviada")}</td><td>${cnt(c,"pendiente")+cnt(c,"enviando")}</td><td>${cnt(c,"error")}</td><td>${cnt(c,"vencida")+cnt(c,"omitida")+cnt(c,"anulada")}</td></tr>`).join("")}
    </tbody></table></div>
    ${esDuena()&&r.uso?usoPlan(r.uso):""}
    <h3>Errores recientes</h3>
    ${(r.errores||[]).length?`<ul class="lista">${r.errores.map(e=>`<li><b>${e.canal==="correo"?"Correo":"WhatsApp"}</b> · ${esc(e.plantilla)} · ${esc(new Date(e.creada).toLocaleString("es-DO",{timeZone:TZ,dateStyle:"short",timeStyle:"short"}))}<small>${esc(e.error||"")}</small></li>`).join("")}</ul>`:`<p class="privacy">Sin errores.</p>`}`;
}
// Plan gratis de Supabase: base de datos (500 MB), fotos de comprobantes (1 GB) y correos de Gmail (unos 500 al día)
function usoPlan(u){
  const f=(x,l,txt)=>{ const p=l?Math.round(100*(+x||0)/l):0; return `<li class="${p>=80?"mal":p>=60?"":"bien"}"><b>${txt}:</b> ${esc(String(x))} de ${esc(String(l))} (${p} %)${p>=80?" · avísale a César":""}</li>`; };
  return `<h3>Uso del plan gratis</h3><ul class="estado">${f(u.base_mb,u.base_limite_mb,"Base de datos (MB)")}${f(u.fotos_mb,u.fotos_limite_mb,"Fotos de comprobantes (MB)")}${f(u.correos_hoy,u.correos_limite_dia,"Correos enviados hoy")}</ul>`;
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
const VARIABLES = ["nombre","cuando","clase","fecha_larga","fecha_corta","hora","hora_fin","instructora","lugar_texto","pago_texto","cancelacion_texto","cargo_texto","enlace_reserva","enlace_horario","direccion","whatsapp_estudio","motivo"];
const VAR_ESTUDIO = ["nombre_completo","telefono","correo","primera_vez","revisar"];
const EJEMPLO = {nombre:"Laura", clase:"Hot Barre", fecha_larga:"lunes 2 de noviembre", fecha_corta:"lun 2 nov", hora:"5:30 pm", hora_fin:"6:30 pm", instructora:"Marifer",
  lugar_texto:"Lugar 7, fila 1", pago_texto:"RD$900. Pago por transferencia: te enviamos los datos por WhatsApp.", cancelacion_texto:"Si cancelas el mismo día de la clase, se aplica un cargo de RD$300 por cancelación tardía.",
  cuando:"hoy", cargo_texto:"", enlace_reserva:"https://…/mi-reserva.html#t=…", enlace_horario:"https://…/#horario", direccion:"C. José Horacio Rodríguez #30, La Vega", whatsapp_estudio:"+1 849-638-6337", motivo:"",
  nombre_completo:"Laura Pérez", telefono:"809-555-0101", correo:"laura@example.com", primera_vez:"Sí", revisar:""};
const PLANT_NOMBRE = {reserva_confirmada:"Reserva confirmada", recordatorio_dia_antes:"Recordatorio del día antes", recordatorio_horas_antes:"Recordatorio horas antes",
  reserva_cancelada:"Reserva cancelada", clase_cancelada:"Clase cancelada", lugar_liberado:"Se liberó un lugar", estudio_nueva_reserva:"Al estudio: nueva reserva", estudio_cancelacion:"Al estudio: cancelación",
  membresia_por_vencer:"Membresía por vencer", transferencia_confirmada:"Transferencia confirmada", transferencia_rechazada:"Transferencia rechazada",
  membresia_confirmada:"Membresía nueva", membresia_renovada:"Membresía renovada"};
const VAR_MEM = ["plan","membresia","clases_texto","desde_larga","hasta_larga","fijos_texto","pago_linea","enlace_membresia","monto","pago_texto","enlace_pago","concepto","motivo"];
Object.assign(EJEMPLO,{plan:"Barre · 8 clases al mes", desde_larga:"lunes 2 de noviembre", hasta_larga:"martes 1 de diciembre", monto:"RD$6,800",
  enlace_pago:"https://…/mi-reserva.html#m=…", concepto:"tu membresía", membresia:"Barre", clases_texto:"8 clases al mes",
  fijos_texto:"Tu horario fijo:
- Lunes 5:30 pm, Hot Barre con Marifer (Lugar 7, fila 1)", pago_linea:"Te esperamos para completar el pago en el estudio. Si te queda más cómodo, también puedes transferir o pagar con tarjeta desde el enlace de tu membresía.",
  enlace_membresia:"https://…/mi-reserva.html#m=…"});
const render = (t,d)=>String(t||"").replace(/\{\{([a-z_]+)\}\}/g,(m,k)=>d[k]||"").replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();

async function cargarAjustes(){
  const [a,p,per]=await Promise.all([hacer("estudio_ajustes"),hacer("estudio_plantillas"),hacer("estudio_personal")]);
  if(!a||!p||!per) return;
  CAT=await hacer("estudio_catalogos")||CAT;
  AJ=a.ajustes||{}; PLANT=p.plantillas||[];
  const pago=aj("pago",{}), tr=pago.transferencia||{}, rec=aj("recordatorios",{}), sil=aj("horas_silencio",{}), ren=aj("aviso_renovacion",{activo:false,dias:3});
  const n2fa=await nivel2FA();
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
      <label class="fld">Y horas antes (0 = no)<input name="horas" type="number" min="0" max="12" value="${esc(rec.horas_antes??6)}"></label></div>
      <div class="two"><label class="fld">Sin WhatsApp desde<input name="sd" type="time" value="${esc(sil.desde||"21:00")}"></label><label class="fld">hasta<input name="sh" type="time" value="${esc(sil.hasta||"07:00")}"></label></div>`,
      "El de horas antes sale por correo y WhatsApp. Si esa hora cae en el silencio, sale 30 minutos antes de que empiece (una clase de 6:45 am lo recibe a las 8:30 pm del día anterior). Reservas con menos anticipación no lo reciben. Al guardar, los pendientes se reprograman.")+
    sec("membresias","Membresías y aviso de renovación",`<label class="fld">«Renueva pronto» en el control: cuando falten (días)<input name="pronto" type="number" min="1" max="60" value="${esc(aj("renueva_pronto_dias",7))}"></label>
      <label class="check"><input type="checkbox" name="aviso" ${ren.activo?"checked":""}> Avisar a la clienta antes de que venza su membresía</label>
      <label class="fld">¿Cuántos días antes?<input name="dias" type="number" min="1" max="14" value="${esc(ren.dias||3)}"></label>`,
      "Sale un correo (y un WhatsApp si el automático está encendido y ella lo aceptó) con el monto y cómo pagar: transferencia (con «Ya transferí») o con tarjeta. Una sola vez por membresía, entre las 9 am y las 8 pm. El texto se cambia abajo, en «Membresía por vencer».")+
    sec("seguridad","Seguridad",`<label class="check"><input type="checkbox" name="exigir" ${aj("exigir_2fa",false)?"checked":""}> Exigir la verificación en dos pasos a la dueña y a la asistente</label>`,
      `Primero actívala tú (botón «Seguridad», arriba) y entra con el código. Cuando la enciendas aquí, la asistente tendrá que activarla la próxima vez que entre. ${n2fa.currentLevel==="aal2"?"Ahora mismo entraste con el código.":"Ahora mismo entraste sin el código: todavía no puedes exigirla."}`)+
    sec("otros","Instructoras y dirección pública",`<label class="check"><input type="checkbox" name="tel" ${aj("instructoras_ven_telefono",false)?"checked":""}> Las instructoras ven el WhatsApp de sus alumnas</label>
      <label class="fld">Dirección pública de la página (base de los enlaces de los avisos)<input name="url" type="url" value="${esc(aj("url_publica",""))}"></label>
      ${conComunidad()?`<label class="check"><input type="checkbox" name="comAv" ${aj("comunidad_avisos",false)?"checked":""}> Se puede avisar por correo a la comunidad de una actividad (solo a quienes lo aceptaron en su cuenta)</label>`:""}`)+
    `<form class="ebox form" data-aj="plantilla" novalidate><h2>Textos de los avisos</h2>
      <label class="fld">Aviso<select name="id">${PLANT.map(t=>{ const [k,c]=t.id.split("."); return opt(t.id,`${PLANT_NOMBRE[k]||k} · ${c==="correo"?"correo":"WhatsApp"}`); }).join("")}</select></label>
      <label class="fld" data-asunto>Asunto<input name="asunto" maxlength="200"></label>
      <label class="fld">Texto<textarea name="cuerpo" rows="10" maxlength="4000"></textarea></label>
      <p class="privacy">Variables: ${VARIABLES.map(x=>`<code>{{${x}}}</code>`).join(" ")}. Solo en los avisos al estudio: ${VAR_ESTUDIO.map(x=>`<code>{{${x}}}</code>`).join(" ")}. En los de membresía y transferencia: ${VAR_MEM.map(x=>`<code>{{${x}}}</code>`).join(" ")}.</p>
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
  }else if(id==="membresias"){
    const p=num("pronto",1,60), d=num("dias",1,14);
    if(p==null||d==null){ aviso("Revisa los días: «renueva pronto» de 1 a 60 y el aviso de 1 a 14.","mal"); return; }
    const on=v(f,"aviso"), antes=aj("aviso_renovacion",{}).activo;
    if(on&&!antes){ const c=await pedir({titulo:"Encender el aviso de renovación",ok:"Encender",
      html:`<p>Desde hoy, cada miembro cuya membresía venza en ${d} días recibe un correo con el monto y cómo pagar${aj("whatsapp_automatico",false)?" (y un WhatsApp si lo aceptó)":""}. Revisa antes el texto en «Textos de los avisos» → «Membresía por vencer».</p>`}); if(!c) return; }
    ok=!!await ajuste("renueva_pronto_dias",p)&&!!await ajuste("aviso_renovacion",{activo:on,dias:d});
    if(ok){ AJ.aviso_renovacion={valor:{activo:on,dias:d}}; AJ.renueva_pronto_dias={valor:p}; }
  }else if(id==="seguridad"){
    const on=v(f,"exigir");
    if(on&&!aj("exigir_2fa",false)){ const c=await pedir({titulo:"Exigir la verificación en dos pasos",ok:"Exigir",
      html:`<p>La dueña y la asistente tendrán que escribir el código de su app cada vez que entren. Si la asistente aún no la tiene, se le pedirá activarla al entrar.</p>`}); if(!c){ f.querySelector('[name="exigir"]').checked=false; return; } }
    const r=await hacer("estudio_guardar_ajuste",{p_clave:"exigir_2fa",p_valor:on});
    ok=!!r; if(r) AJ.exigir_2fa={valor:on}; else f.querySelector('[name="exigir"]').checked=!on;
  }else if(id==="otros"){
    const url=v(f,"url"); if(url&&!/^https:\/\/\S+$/i.test(url)){ aviso("La dirección pública debe empezar por https://","mal"); return; }
    ok=!!await ajuste("instructoras_ven_telefono",v(f,"tel"))&&(!url||!!await ajuste("url_publica",url));
    if(ok&&conComunidad()) ok=!!await ajuste("comunidad_avisos",v(f,"comAv"));
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
  membresias:{clienta:"Clienta",whatsapp:"WhatsApp",plan:"Plan",detalle:"Detalle",desde:"Desde",hasta:"Hasta",precio:"Precio",pago:"Pago",metodo:"Método",pagado_en:"Último pago",banco:"Banco",estado:"Estado"},
  // las mismas columnas del Excel de Brittany
  control:{nombre:"Nombre",clases_fijas:"Clase fija y lugar",correo:"Correo",telefono:"Teléfono",plan:"Plan",desde:"Fecha de inicio",pagado_en:"Último pago",
    proximo_pago:"Próximo pago / renovación",monto:"Monto",pago_metodo:"Método de pago",banco:"Banco",estado:"Estado"},
  ingresos:{mes:"Mes",concepto:"Concepto",metodo:"Forma de pago",cantidad:"Cantidad",total:"Total RD$"},
  apuntadas:{nombre:"Nombre",telefono:"WhatsApp",correo:"Correo",estado:"Estado",creada:"Se apuntó"}};
const TEXTO_CELDA = {estado:EST_MEM, pago_metodo:METODO};
const METODO_ING = {transferencia:"Transferencia", tarjeta:"Tarjeta", efectivo:"Efectivo", sin_registrar:"Sin registrar"};
function csv(que,filas){
  const C=COLS[que], keys=Object.keys(C);
  const val=(k,x)=>que==="ingresos"&&k==="metodo"?METODO_ING[x]||x:TEXTO_CELDA[k]&&que==="control"?TEXTO_CELDA[k][x]||x||"":x;
  // Un texto que empieza por = + - @ (p. ej. un nombre escrito en la web) Excel lo tomaría como fórmula: se le antepone '
  const cel=x=>{ let s=x==null?"":typeof x==="boolean"?(x?"Sí":"No"):String(x); if(typeof x==="string"&&/^[=+\-@\t\r]/.test(s)) s="'"+s;
    return /[",\n\r;]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; };
  return "﻿"+[keys.map(k=>cel(C[k])).join(","), ...filas.map(f=>keys.map(k=>cel(val(k,f[k]))).join(","))].join("\r\n")+"\r\n";
}
function descargarCsv(que,filas,nombre){
  const blob=new Blob([csv(que,filas)],{type:"text/csv;charset=utf-8"}), a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download=nombre||`bale-${que}-${hoy()}.csv`; document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  listo(`Descargado: ${filas.length} ${filas.length===1?"fila":"filas"}`);
}
async function exportar(e){
  e.preventDefault();
  const que=$("#xQue").value, args={p_que:que};
  if(que==="reservas"||que==="ingresos"){ args.p_desde=$("#xDesde").value||null; args.p_hasta=$("#xHasta").value||null; }
  const r=await hacer("estudio_exportar",args); if(!r) return;
  descargarCsv(que,r.filas||[]);
}

/* =========================================================
   INGRESOS (dueña): por mes, forma de pago y concepto; cortesías aparte
   ========================================================= */
const sumarMeses = (s,n)=>{ const d=fromIso(s); d.setDate(1); d.setMonth(d.getMonth()+n); return iso(d); };
const primeroDeMes = s=>s.slice(0,8)+"01";
const fmtMes = m=>{ const [y,mo]=m.split("-").map(Number); const t=new Date(y,mo-1,1).toLocaleDateString("es-DO",{month:"long",year:"numeric"}); return t.charAt(0).toUpperCase()+t.slice(1); };
async function cargarIngresos(){
  const d=$("#iDesde").value, h=$("#iHasta").value;
  if(!d||!h||h<d){ aviso("Revisa las fechas: «hasta» no puede ser antes de «desde».","mal"); return; }
  const r=await hacer("estudio_ingresos",{p_desde:d,p_hasta:h}); if(!r) return;
  const tabla=(cap,cols,filas)=>filas.length?`<div class="tablewrap"><table class="vtable"><caption class="sr-only">${esc(cap)}</caption><thead><tr>${cols.map(c=>`<th scope="col">${esc(c)}</th>`).join("")}</tr></thead><tbody>${filas.map(f=>`<tr>${f.map((x,i)=>i===0?`<th scope="row">${esc(x)}</th>`:`<td class="${i===f.length-1?"num":""}">${esc(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`:`<p class="privacy">Sin movimientos.</p>`;
  $("#ingresos").innerHTML=`<div class="ebox"><h2>Total cobrado: ${esc(dinero(r.total))}</h2><p class="privacy">Del ${esc(fmtCorta(r.desde))} al ${esc(fmtCorta(r.hasta))}. Cuenta lo marcado como pagado (y los cargos de RD$300 cobrados). Las cortesías no suman: salen abajo.</p>
      <h3>Por mes</h3>${tabla("Ingresos por mes",["Mes","Pagos","Total"],(r.por_mes||[]).map(x=>[fmtMes(x.mes),x.cantidad,dinero(x.total)]))}
      <h3>Por forma de pago</h3>${tabla("Ingresos por forma de pago",["Forma de pago","Pagos","Total"],(r.por_metodo||[]).map(x=>[METODO_ING[x.metodo]||x.metodo,x.cantidad,dinero(x.total)]))}
      <h3>Por plan o clase suelta</h3>${tabla("Ingresos por concepto",["Concepto","Pagos","Total"],(r.por_concepto||[]).map(x=>[x.concepto,x.cantidad,dinero(x.total)]))}
      <h3>Cortesías</h3>${tabla("Cortesías",["Mes","Concepto","Cantidad","Valor"],(r.cortesias||[]).map(x=>[fmtMes(x.mes),x.concepto,x.cantidad,dinero(x.valor)]))}
      <h3>Detalle</h3>${tabla("Detalle por mes, concepto y forma de pago",["Mes","Concepto","Forma de pago","Pagos","Total"],(r.filas||[]).map(x=>[fmtMes(x.mes),x.concepto,METODO_ING[x.metodo]||x.metodo,x.cantidad,dinero(x.total)]))}</div>`;
}
async function exportarIngresos(){
  const r=await hacer("estudio_exportar",{p_que:"ingresos",p_desde:$("#iDesde").value||null,p_hasta:$("#iHasta").value||null}); if(!r) return;
  descargarCsv("ingresos",(r.filas||[]).map(x=>Object.assign({},x,{mes:fmtMes(x.mes)})),`bale-ingresos-${hoy()}.csv`);
}

/* =========================================================
   ARRANQUE
   ========================================================= */
function eventos(){
  $("#fEntrar").addEventListener("submit",login);
  $("#eOlvido").addEventListener("click",olvido);
  $("#fNueva").addEventListener("submit",nuevaClave);
  $("#cambiarClave").addEventListener("click",cambiarClave);
  $("#seguridad").addEventListener("click",seguridad);
  $("#fCodigo").addEventListener("submit",confirmarCodigo);
  $("#eCodSalir").addEventListener("click",async()=>{ await sb.auth.signOut().catch(()=>{}); aviso(""); mostrarEntrar(); });
  $("#fIng").addEventListener("submit",e=>{ e.preventDefault(); cargarIngresos(); });
  $("#iExp").addEventListener("click",exportarIngresos);
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
  $("#p-clientas").addEventListener("change",e=>{ const s=e.target.closest("[data-ctrl]"); if(s&&CTRL){ ctrlF[s.dataset.ctrl]=s.value; pintarControl(); const n=$(`#control [data-ctrl="${s.dataset.ctrl}"]`); if(n) n.focus(); } });
  $("#p-clientas").addEventListener("click",e=>{
    if(e.target.closest("[data-renovar-todas]")){ renovarTodas(); return; }
    if(e.target.closest("[data-exp-control]")){ exportarControl(); return; }
    if(e.target.closest("[data-importar]")){ importarMembresias(); return; }
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
    const cr=e.target.closest("[data-cobro-reserva]"); if(cr){ cobrarConTarjeta({p_reserva_id:+cr.dataset.cobroReserva},cargarCobros); return; }
    const tr=e.target.closest("[data-transf]"); if(tr){ revisarTransf(tr.dataset.id,tr.dataset.transf,tr.dataset.q,tr.dataset.m); return; }
    const fo=e.target.closest("[data-foto]"); if(fo){ verComprobante(fo.dataset.foto,fo.dataset.q); return; }
    const pm=e.target.closest("[data-pagar-mem]"); if(pm){ pagarMembresia(pm.dataset.pagarMem,pm.dataset.q,false); return; }
    const cm=e.target.closest("[data-cortesia-mem]"); if(cm){ pagarMembresia(cm.dataset.cortesiaMem,cm.dataset.q,true); return; }
    const tm=e.target.closest("[data-cobro-mem2]"); if(tm) cobrarConTarjeta({p_membresia_id:+tm.dataset.cobroMem2},cargarCobros);
  });
  // Avisos y ajustes
  $("#p-avisos").addEventListener("change",e=>{ if(e.target.dataset.sw) interruptor(e.target); });
  $("#ajustes").addEventListener("submit",e=>{ const f=e.target.closest("[data-aj]"); if(f){ e.preventDefault(); guardarAjustes(f); } });
  $("#ajustes").addEventListener("click",e=>{ const h=e.target.closest("[data-hor]"); if(h){ editarHorario(h.dataset.hor); return; }
    const p=e.target.closest("[data-per]"); if(p) editarPersonal(p.dataset.per); });
  // Exportar
  $("#xQue").addEventListener("change",()=>{ $("#xFechas").hidden=!["reservas","ingresos"].includes($("#xQue").value); });
  $("#iDesde").value=primeroDeMes(sumarMeses(hoy(),-5)); $("#iHasta").value=hoy();
  $("#xDesde").value=sumar(hoy(),-30); $("#xHasta").value=sumar(hoy(),30);
  $("#fExp").addEventListener("submit",exportar);
  eventosComunidad();
}

/* =========================================================
   COMUNIDAD (dueña y asistente): publicaciones, apuntadas, comentarios y aviso por correo.
   Se ve con data/config.json → sistema.comunidad = true (después de aplicar la migración).
   Fotos: se re-codifican aquí a WebP (máx. 1600 px, sin metadatos: el canvas no copia el EXIF
   ni la ubicación) y se suben al bucket público «comunidad».
   ========================================================= */
const conComunidad = ()=>!!(CFG&&CFG.sistema&&CFG.sistema.comunidad===true);
let PUBS=[];
const TIPO_PUB={actividad:"Actividad",anuncio:"Anuncio",foto:"Foto"}, EST_PUB={borrador:"Borrador",publicada:"Publicada",archivada:"Archivada"};
const fotoUrl = f=>f.ruta?`${CFG.sistema.url.replace(/\/+$/,"")}/storage/v1/object/public/comunidad/${f.ruta}`:f.src;
function cuerpoHtml(t){
  return String(t||"").replace(/\r/g,"").split(/\n{2,}/).map(b=>{
    const ls=b.split("\n"), neg=s=>esc(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");
    return ls.every(l=>/^\s*-\s+/.test(l))?`<ul>${ls.map(l=>`<li>${neg(l.replace(/^\s*-\s+/,""))}</li>`).join("")}</ul>`:`<p>${ls.map(neg).join("<br>")}</p>`;
  }).join("");
}
async function cargarComunidad(){
  const r=await hacer("estudio_publicaciones",{}); if(!r) return;
  PUBS=r.publicaciones||[];
  $("#comAvisosEst").textContent=r.avisos_activos?"Los avisos por correo a la comunidad están encendidos.":"Los avisos por correo a la comunidad están apagados (la dueña los enciende en Ajustes).";
  $("#comLista").innerHTML=PUBS.length?PUBS.map(p=>`<li>
      <div><b>${esc(p.titulo)}</b> <span class="note">${esc(TIPO_PUB[p.tipo])} · ${esc(EST_PUB[p.estado])}${p.visibilidad==="comunidad"?" · solo comunidad":""}</span>
        <small>${p.fecha?esc(p.fecha_larga)+(p.hora?` · ${esc(p.hora)}`:""):""}${p.tipo==="actividad"?` · ${p.apuntadas}${p.cupo?` de ${p.cupo}`:""} apuntadas${p.en_espera?` · ${p.en_espera} en espera`:""}`:""}${p.comentarios_pendientes?` · ${p.comentarios_pendientes} comentarios por revisar`:""}${p.avisada_en?" · ya avisada por correo":""}</small></div>
      <div class="eacc">
        <button class="bbtn line sm" type="button" data-pub-editar="${p.id}">Editar</button>
        ${p.estado!=="publicada"?`<button class="bbtn solid sm" type="button" data-pub-estado="publicada" data-id="${p.id}">Publicar</button>`:`<button class="bbtn line sm" type="button" data-pub-estado="archivada" data-id="${p.id}">Archivar</button>`}
        ${p.estado==="archivada"?`<button class="bbtn line sm" type="button" data-pub-estado="borrador" data-id="${p.id}">Volver a borrador</button>`:""}
        ${p.tipo==="actividad"?`<button class="bbtn line sm" type="button" data-pub-apuntadas="${p.id}">Quién se apuntó</button>`:""}
        ${p.tipo==="actividad"&&p.estado==="publicada"?`<button class="bbtn line sm" type="button" data-pub-avisar="${p.id}">Avisar a la comunidad</button>`:""}
      </div></li>`).join(""):`<li class="empty-state">Todavía no hay publicaciones. Crea la primera con «Nueva publicación».</li>`;
  const c=await hacer("estudio_comentarios",{p_estado:"pendiente"});
  const cs=(c&&c.comentarios)||[];
  $("#comComent").innerHTML=cs.length?cs.map(m=>`<li><div><b>${esc(m.nombre)}</b> en «${esc(m.publicacion)}»<small>${esc(m.texto)}</small></div>
      <div class="eacc"><button class="bbtn solid sm" type="button" data-com="aprobado" data-id="${m.id}">Aprobar</button><button class="bbtn line sm" type="button" data-com="rechazado" data-id="${m.id}">Rechazar</button></div></li>`).join("")
    :`<li class="empty-state">No hay comentarios por revisar.</li>`;
}
// Re-codificar una foto a WebP (sin metadatos) y subirla
async function subirFoto(file){
  if(!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)&&!/\.(jpe?g|png|webp|heic)$/i.test(file.name)) throw new Error("Elige una foto (JPG, PNG o WebP).");
  if(file.size>25*1024*1024) throw new Error("La foto pesa demasiado (máximo 25 MB).");
  const bmp=await createImageBitmap(file).catch(()=>{ throw new Error("No se pudo leer la foto. Prueba con un JPG."); });
  const k=Math.min(1,1600/Math.max(bmp.width,bmp.height)), w=Math.round(bmp.width*k), h=Math.round(bmp.height*k);
  const cv=document.createElement("canvas"); cv.width=w; cv.height=h; cv.getContext("2d").drawImage(bmp,0,0,w,h);
  let blob=await new Promise(ok=>cv.toBlob(ok,"image/webp",.82));
  if(!blob||blob.type!=="image/webp") throw new Error("Este navegador no puede preparar la foto. Prueba en Chrome.");
  if(blob.size>1.5*1024*1024) blob=await new Promise(ok=>cv.toBlob(ok,"image/webp",.65));
  const hex=[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,"0")).join("");
  const ruta=`${hoy().slice(0,7)}/${hex}.webp`;
  const {error}=await sb.storage.from("comunidad").upload(ruta,blob,{contentType:"image/webp",upsert:false});
  if(error) throw new Error("No se pudo subir la foto. Revisa el internet e inténtalo de nuevo.");
  return ruta;
}
function vistaPrevia(f,fotos){
  const v=k=>f.querySelector(`[name="${k}"]`).value;
  const act=v("tipo")==="actividad";
  return `<div class="pv-pub"><p class="note">Así se verá en la página Comunidad:</p>
    <h3>${esc(v("titulo")||"Sin título")}</h3>${act?`<p class="privacy">${esc([v("fecha"),v("hora"),v("lugar"),v("precio")?NB.money(+v("precio")):"Gratis",v("cupo")?`${v("cupo")} lugares`:""].filter(Boolean).join(" · "))}</p>`:""}
    ${cuerpoHtml(v("cuerpo"))}${fotos.map(x=>`<img src="${esc(fotoUrl(x))}" alt="${esc(x.alt)}" style="max-width:120px;border-radius:12px;margin:4px">`).join("")}</div>`;
}
async function editarPublicacion(p){
  p=p||{tipo:"actividad",titulo:"",cuerpo:"",fotos:[],visibilidad:"publica",permite_comentarios:false};
  let fotos=(p.fotos||[]).map(x=>({...x}));
  const ctl=new AbortController(), sig={signal:ctl.signal};   // el formulario del diálogo se reutiliza: los oyentes se van al cerrar
  const pintarFotos=f=>{ f.querySelector("[data-fotos]").innerHTML=fotos.map((x,i)=>`<div class="two"><img src="${esc(fotoUrl(x))}" alt="" style="width:72px;height:90px;object-fit:cover;border-radius:10px">
      <label class="fld">Descripción de la foto (para quien no la ve)<input data-alt="${i}" value="${esc(x.alt||"")}" maxlength="200"></label>
      <button class="bbtn line sm" type="button" data-quitar="${i}">Quitar</button></div>`).join(""); };
  const ok=await pedir({titulo:p.id?"Editar publicación":"Nueva publicación", ok:"Guardar",
    html:`<label class="fld">Tipo<select name="tipo">${Object.entries(TIPO_PUB).map(([k,n])=>`<option value="${k}" ${p.tipo===k?"selected":""}>${n}</option>`).join("")}</select></label>
      <label class="fld">Título<input name="titulo" maxlength="120" value="${esc(p.titulo)}" required></label>
      <div class="fld">Texto <span class="privacy">(**negrita** y listas empezando la línea con «- »)</span>
        <div class="eacc"><button class="bbtn line sm" type="button" data-fmt="b"><b>Negrita</b></button><button class="bbtn line sm" type="button" data-fmt="l">Lista</button></div>
        <textarea name="cuerpo" rows="6" maxlength="4000">${esc(p.cuerpo||"")}</textarea></div>
      <div data-act>
        <div class="two"><label class="fld">Fecha<input type="date" name="fecha" value="${esc(p.fecha||"")}"></label><label class="fld">Hora<input type="time" name="hora" value="${esc(p.hora||"")}"></label></div>
        <label class="fld">Lugar<input name="lugar" maxlength="120" value="${esc(p.lugar||"")}"></label>
        <div class="two"><label class="fld">Cupo (vacío: sin límite)<input type="number" min="1" max="500" name="cupo" value="${p.cupo||""}"></label><label class="fld">Precio RD$ (vacío: gratis)<input type="number" min="0" step="50" name="precio" value="${p.precio??""}"></label></div>
      </div>
      <label class="fld">Quién la ve<select name="visibilidad"><option value="publica" ${p.visibilidad!=="comunidad"?"selected":""}>Todo el mundo</option><option value="comunidad" ${p.visibilidad==="comunidad"?"selected":""}>Solo la comunidad (clientas con cuenta)</option></select></label>
      <label class="chk"><input type="checkbox" name="comentarios" ${p.permite_comentarios?"checked":""}> Permitir comentarios (cada uno se aprueba aquí antes de verse)</label>
      <div class="two"><label class="fld">Botón de WhatsApp (opcional)<input name="boton" maxlength="60" value="${esc(p.boton||"")}" placeholder="Pregunta por tu fiesta"></label><label class="fld">Mensaje que se escribe<input name="mensaje" maxlength="400" value="${esc(p.mensaje||"")}"></label></div>
      <label class="fld">Fotos (hasta 6; se preparan en WebP sin datos de ubicación)<input type="file" name="foto" accept="image/*" multiple></label>
      <div data-fotos></div><p class="note" data-subiendo hidden aria-live="polite"></p>
      <div data-prev aria-live="polite"></div>
      <p class="privacy">Recuerda: fotos solo con el fondo beige y sin hombres.</p>`,
    alAbrir:f=>{
      const act=()=>{ f.querySelector("[data-act]").hidden=f.querySelector('[name="tipo"]').value!=="actividad"; };
      const prev=()=>{ f.querySelector("[data-prev]").innerHTML=vistaPrevia(f,fotos); };
      act(); pintarFotos(f); prev();
      f.addEventListener("input",e=>{ if(e.target.dataset.alt!=null) fotos[+e.target.dataset.alt].alt=e.target.value; act(); prev(); },sig);
      f.addEventListener("change",async e=>{
        if(e.target.name!=="foto") return;
        const st=f.querySelector("[data-subiendo]"), fs=[...e.target.files].slice(0,6-fotos.length);
        for(const [i,file] of fs.entries()){
          st.hidden=false; st.textContent=`Preparando foto ${i+1} de ${fs.length}…`;
          try{ fotos.push({ruta:await subirFoto(file),alt:""}); }catch(x){ st.textContent=x.message; e.target.value=""; return; }
        }
        st.textContent=fs.length?"Listo. Escribe la descripción de cada foto.":""; e.target.value=""; pintarFotos(f); prev();
      },sig);
      f.addEventListener("click",e=>{
        const q=e.target.closest("[data-quitar]"); if(q){ fotos.splice(+q.dataset.quitar,1); pintarFotos(f); prev(); return; }
        const fm=e.target.closest("[data-fmt]"); if(!fm) return;
        const ta=f.querySelector('[name="cuerpo"]'), a=ta.selectionStart, b=ta.selectionEnd, sel=ta.value.slice(a,b);
        const nuevo=fm.dataset.fmt==="b"?`**${sel||"texto"}**`:(sel||"elemento").split("\n").map(l=>"- "+l.replace(/^\s*-\s+/,"")).join("\n");
        ta.setRangeText(nuevo,a,b,"end"); ta.focus(); prev();
      },sig);
    },
    accion:async f=>{
      const v=k=>f.querySelector(`[name="${k}"]`).value.trim();
      if(v("titulo").length<3) return "El título debe tener al menos 3 letras.";
      if(v("tipo")==="actividad"&&!v("fecha")) return "Una actividad necesita su fecha.";
      if(fotos.some(x=>(x.alt||"").trim().length<3)) return "Escribe la descripción de cada foto (lo que se ve en ella).";
      if(!!v("boton")!==!!v("mensaje")) return "Si pones un botón de WhatsApp, escribe su texto y el mensaje.";
      const act=v("tipo")==="actividad";
      const r=await hacer("estudio_guardar_publicacion",{p_id:p.id||null,p_tipo:v("tipo"),p_titulo:v("titulo"),p_cuerpo:f.querySelector('[name="cuerpo"]').value,
        p_fotos:fotos.map(x=>x.ruta?{ruta:x.ruta,alt:x.alt.trim()}:{src:x.src,alt:x.alt.trim()}),
        p_fecha:act?v("fecha")||null:null,p_hora:act?v("hora")||null:null,p_lugar:act?v("lugar")||null:null,
        p_cupo:act&&v("cupo")?+v("cupo"):null,p_precio:act&&v("precio")!==""?+v("precio"):null,
        p_visibilidad:v("visibilidad"),p_comentarios:f.querySelector('[name="comentarios"]').checked,p_boton:v("boton")||null,p_mensaje:v("mensaje")||null},{dlg:true});
      if(!r) return "No hay conexión con la base de datos.";
      if(r.ok===false) return r.mensaje||"Revisa los datos.";
      return true;
    }});
  ctl.abort();
  if(ok){ listo(p.id?"Publicación guardada":"Publicación guardada como borrador: publícala cuando esté lista."); cargarComunidad(); }
}
async function verApuntadas(id){
  const p=PUBS.find(x=>x.id===id); const r=await hacer("estudio_apuntadas",{p_id:id}); if(!r) return;
  const a=r.apuntadas||[], E={apuntada:"Apuntada",espera:"En espera",cancelada:"Canceló"};
  await pedir({titulo:`Quién se apuntó · ${p?p.titulo:""}`, ok:"Descargar CSV", no:"Cerrar",
    html:a.length?`<ul class="pays">${a.map(x=>`<li><div><b>${esc(x.nombre)}</b> <span class="note">${esc(E[x.estado]||x.estado)}</span><small>${esc(x.telefono||"")} · ${esc(x.correo||"")}</small></div></li>`).join("")}</ul>`:`<p class="privacy">Todavía nadie se apuntó.</p>`,
    accion:async()=>{ descargarCsv("apuntadas",a.map(x=>({...x,estado:E[x.estado]||x.estado})),`bale-apuntadas-${id}-${hoy()}.csv`); return true; }});
}
async function avisarComunidad(id){
  const r=await hacer("estudio_avisar_comunidad",{p_id:id,p_aplicar:false}); if(!r) return;
  const ok=await pedir({titulo:"Avisar a la comunidad por correo", ok:r.activos?"Enviar":"Cerrar", peligro:false,
    html:`<p>${r.activos?`Se enviará a <b>${r.destinatarias}</b> ${r.destinatarias===1?"clienta":"clientas"} que aceptaron recibir las actividades.`:"Los avisos a la comunidad están <b>apagados</b>: la dueña los enciende en Ajustes. Mientras tanto puedes ver cómo quedaría."}${r.ya_avisada?" Esta actividad ya se avisó.":""}</p>
      <div class="pv-pub"><p class="note">Asunto: ${esc(r.asunto)}</p><pre style="white-space:pre-wrap;font:inherit">${esc(r.cuerpo)}</pre></div>
      ${r.activos?`<label class="fld">Para probar, enviar solo a este correo (vacío: a todas)<input type="email" name="solo"></label>`:""}`,
    accion:async f=>{
      if(!r.activos) return true;
      const solo=(f.querySelector('[name="solo"]').value||"").trim();
      const x=await hacer("estudio_avisar_comunidad",{p_id:id,p_aplicar:true,p_solo_a:solo||null},{dlg:true});
      if(!x) return "No hay conexión con la base de datos."; if(x.ok===false) return x.mensaje;
      listo(`Avisos en cola: ${x.correos}`); return true;
    }});
  if(ok) cargarComunidad();
}
function eventosComunidad(){
  $("#comNueva").addEventListener("click",()=>editarPublicacion(null));
  $("#p-comunidad").addEventListener("click",async e=>{
    const b=e.target.closest("button"); if(!b) return;
    if(b.dataset.pubEditar){ editarPublicacion(PUBS.find(x=>x.id===+b.dataset.pubEditar)); return; }
    if(b.dataset.pubEstado){ const r=await hacer("estudio_publicacion_estado",{p_id:+b.dataset.id,p_estado:b.dataset.pubEstado}); if(r){ listo({publicada:"Publicada",archivada:"Archivada",borrador:"Pasó a borrador"}[b.dataset.pubEstado]); cargarComunidad(); } return; }
    if(b.dataset.pubApuntadas){ verApuntadas(+b.dataset.pubApuntadas); return; }
    if(b.dataset.pubAvisar){ avisarComunidad(+b.dataset.pubAvisar); return; }
    if(b.dataset.com){ const r=await hacer("estudio_moderar_comentario",{p_id:+b.dataset.id,p_estado:b.dataset.com}); if(r){ listo(b.dataset.com==="aprobado"?"Comentario aprobado":"Comentario rechazado"); cargarComunidad(); } }
  });
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
