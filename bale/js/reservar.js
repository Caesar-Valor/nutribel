/* =========================================================
   balé — reservar.html: horario de la semana y reserva por pasos
   (clase y día → lugar → tus datos → listo). Es el motor de la página larga de antes
   (bale.js), sin cambiar la lógica de cupos ni de concurrencia: la decide la base de datos.
   Con el sistema (config.json → sistema.activo, js/sistema.js): horario, lugares ocupados y
   reservas salen de la base de datos; la reserva se confirma al momento y la clienta recibe
   el enlace mi-reserva.html#t=… (su token se guarda en este navegador: «Tus próximas reservas»).
   Sin sistema (o si no responde): como siempre, WhatsApp de balé con la reserva, aviso por
   correo (FormSubmit si está configurado) y el .ics. Ballet niñas: inscripción por WhatsApp.
   Enlaces: reservar.html?tipo=Hot%20Barre · ?primera=1 · ?clase=lun-1730&fecha=2026-11-09
   Con la sesión de «Mi cuenta» abierta, los datos se rellenan solos.
   ========================================================= */
(function(){
"use strict";
const NB = window.BALE, SIS = window.BALE_SISTEMA, SALA = window.BALE_SALA;
const {$, esc} = NB;
const KEY = "bale-reservas";        // reservas sin sistema hechas en este navegador
const MIS_KEY = "bale-mis-reservas"; // [{t, fecha, inicio, clase, fl, hora}]: solo el token, sin datos personales
const WEEKS_AHEAD = 3;
const DKEYS = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];
const DSHORT = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const calma = ()=>matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Fechas (las de La Vega, aunque la clienta esté de viaje) ---------- */
const TZ="America/Santo_Domingo";
// Los formateadores de Intl son caros de crear: uno solo, y la hora de La Vega se recalcula como mucho cada 5 s
const FMT_LV=new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
let nowCache=null, nowAt=0;
function nowLV(){
  const t=Date.now(); if(nowCache&&t-nowAt<5000) return nowCache;
  const p={}; FMT_LV.formatToParts(new Date(t)).forEach(x=>{ p[x.type]=x.value; });
  nowAt=t; return nowCache={fecha:`${p.year}-${p.month}-${p.day}`, hora:`${p.hour}:${p.minute}`};
}
function todayLV(){ const [y,m,d]=nowLV().fecha.split("-").map(Number); return new Date(y,m-1,d); }
function todayIx(){ return (todayLV().getDay()+6)%7; }
function monday(w){ const d=todayLV(); d.setDate(d.getDate()-todayIx()+7*w); return d; }
let D, CFG;
let week=0, dayIx=todayIx(), fInst="", fType="";
let SES=null, sesAt=0;
function dayDate(w,i){ const d=monday(w); d.setDate(d.getDate()+i); return d; }
const iso = d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fromIso = s=>{ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
const FMT_DIA=new Intl.DateTimeFormat("es-DO",{weekday:"long",day:"numeric",month:"long"}), diaCache=new Map();
const fmtDay = d=>{ const k=d.getFullYear()*1e4+d.getMonth()*100+d.getDate(); let v=diaCache.get(k); if(!v){ v=FMT_DIA.format(d); diaCache.set(k,v); } return v; };
const toH = t=>{ const [h,m]=t.split(":").map(Number); return h+m/60; };
const mins = c=>Math.round((toH(c.fin)-toH(c.inicio))*60);
function range(c){ const a=NB.fmtH(toH(c.inicio)), b=NB.fmtH(toH(c.fin)); return a.slice(-2)===b.slice(-2) ? `${a.slice(0,-3)} – ${b}` : `${a} – ${b}`; }
function startOf(c,fecha){ const d=fromIso(fecha), [h,m]=c.inicio.split(":").map(Number); d.setHours(h,m,0,0); return d; }
function weekLabel(w){
  const a=dayDate(w,0), b=dayDate(w,6), ma=a.toLocaleDateString("es-DO",{month:"long"}), mb=b.toLocaleDateString("es-DO",{month:"long"});
  return ma===mb ? `${a.getDate()} – ${b.getDate()} de ${mb}` : `${a.getDate()} de ${ma} – ${b.getDate()} de ${mb}`;
}

/* ---------- Reservas sin sistema (este navegador) ---------- */
function readStore(){
  let s=null; try{ s=JSON.parse(localStorage.getItem(KEY)); }catch(e){}
  s=s||{};
  return {reservas:Array.isArray(s.reservas)?s.reservas:[], espera:Array.isArray(s.espera)?s.espera:[], aprobados:Array.isArray(s.aprobados)?s.aprobados:[]};
}
let store=readStore();
// En el navegador nunca van el nombre ni el WhatsApp (CLAUDE.md, seguridad 10/11/2026): solo una huella del
// número, para avisar de una reserva repetida. Lo que quedó guardado de antes se limpia al volver a guardar.
function huellaWa(w){ let h=2166136261; for(const ch of String(w||"").replace(/\D/g,"")){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619); } return (h>>>0).toString(36); }
const sinDatos = r=>{ const {nombre, wa, ...o}=r; if(!o.waH&&wa) o.waH=huellaWa(wa); return o; };
function save(){ try{ localStorage.setItem(KEY,JSON.stringify({reservas:store.reservas.map(sinDatos), espera:store.espera.map(sinDatos), aprobados:store.aprobados})); }catch(e){} }
const uid = ()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
// Cambios del panel del negocio (solo en este navegador): cupos, sala, lugares fijos, canceladas y aviso
function applyPanel(){
  const P=NB.panel.read();
  Object.entries(P.cupos).forEach(([k,v])=>{ if(+v>0){ D.cupos[k]=+v; if(D.cupos.nota) D.cupos.nota[k]=""; } });
  if(P.sala&&+P.sala.filas>0&&+P.sala.por_fila>0){ D.sala.filas=+P.sala.filas; D.sala.por_fila=+P.sala.por_fila; }
  D.fijos=P.fijos||D.fijos||{};
  D.canceladas=new Set(P.canceladas||D.canceladas||[]);
}
const isCancel = (c,fecha)=>D.canceladas.has(occKey(c,fecha));
function buildLugares(){ const S=D.sala, out=[]; for(let f=1;f<=S.filas;f++) for(let i=1;i<=S.por_fila;i++) out.push({n:(f-1)*S.por_fila+i, fila:f, col:i}); S.lugares=out; }

/* ---------- Sistema: sesiones de la base de datos ---------- */
const enLinea = ()=>!!(SIS&&SIS.activo()&&SES);
function fromSes(s){
  return {key:"s"+s.id, sid:s.id, id:s.horario_id||"s"+s.id, horario_id:s.horario_id, fecha:s.fecha,
    dia:DKEYS[(fromIso(s.fecha).getDay()+6)%7], inicio:s.inicio, fin:s.fin, clase:s.clase, titulo:s.titulo||"",
    instructora:s.instructora, etiqueta:s.etiqueta||undefined, edad:s.edad||undefined, modo:s.modo,
    capacidad:+s.capacidad||0, ocupados:+s.ocupados||0, lugares:Array.isArray(s.lugares_ocupados)?s.lugares_ocupados:[],
    estado:s.estado, abierta:!!s.abierta};
}
async function cargarSesiones(desde,hasta){
  const a=desde||iso(dayDate(0,0)), b=hasta||iso(dayDate(WEEKS_AHEAD,6));
  const j=await SIS.llamar("horario_publico",{p_desde:a,p_hasta:b});
  if(!j.ok||!Array.isArray(j.sesiones)){ SIS.caer(); throw new Error(j.error||"horario"); }
  const m=desde?new Map(SES||[]):new Map();
  if(desde) for(const k of [...m.keys()]) if(k>=a&&k<=b) m.delete(k);
  j.sesiones.forEach(s=>{ const o=fromSes(s); if(!m.has(o.fecha)) m.set(o.fecha,[]); m.get(o.fecha).push(o); });
  SES=m; if(!desde) sesAt=Date.now();
}
const sesDe = fecha=>(SES&&SES.get(fecha))||[];
function refrescar(desde,hasta){
  if(!enLinea()) return Promise.resolve(false);
  return cargarSesiones(desde,hasta).then(()=>true,()=>{ sinSistema(); return false; });
}

/* ---------- Ocupación ---------- */
const occKey = (c,fecha)=>`${c.id}@${fecha}`;
const clsById = id=>D.horario.find(c=>c.id===id);
const rowClass = (key,fecha)=>enLinea() ? sesDe(fecha).find(c=>c.key===key) : clsById(key);
const isBarra = c=>c.modo ? c.modo==="lugares" : D.barra_tipos.includes(c.clase);
const cap = c=>c.modo ? c.capacidad : isBarra(c) ? D.sala.lugares.length : (+D.cupos[c.clase]||12);
const cupoNota = c=>{ if(c.modo) return ""; const n=D.cupos.nota||{}; return c.clase in n ? n[c.clase] : "Cupo por confirmar"; };
function fixedSeats(c){ const v=D.fijos[c.id]; return Array.isArray(v)?v.filter(n=>n>=1&&n<=D.sala.lugares.length):[]; }
const fixedCount = c=>{ const v=D.fijos[c.id]; return Array.isArray(v)?v.length:Math.max(0,+v||0); };
function taken(c,fecha){
  if(c.modo) return new Set(c.lugares);
  const k=occKey(c,fecha), s=new Set(fixedSeats(c));
  store.reservas.forEach(r=>{ if(r.occ===k) s.add(r.lugar); });
  return s;
}
const webRes = (c,fecha)=>store.reservas.filter(r=>r.occ===occKey(c,fecha));
const used = (c,fecha)=>c.modo ? Math.max(c.ocupados,c.lugares.length) : isBarra(c) ? taken(c,fecha).size : Math.min(cap(c),fixedCount(c))+webRes(c,fecha).length;
const free = (c,fecha)=>c.modo ? Math.max(0,cap(c)-used(c,fecha)) : cap(c)-used(c,fecha);
const waitlist = (c,fecha)=>c.modo ? [] : store.espera.filter(e=>e.occ===occKey(c,fecha));
const isBallet = c=>c.modo ? c.modo==="inscripcion" : /ballet/i.test(c.clase);
const initials = n=>n.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join("").toUpperCase();
const instInfo = n=>D.instructoras.find(i=>i.nombre===n)||{nombre:n,rol:"Instructora"};
const clsName = c=>c.titulo||c.clase;
const tagOf = c=>c.etiqueta?D.etiquetas[c.etiqueta]:null;
const tagTxt = c=>{ const t=tagOf(c); return t?t.texto:""; };
const lugarOf = n=>D.sala.lugares.find(l=>l.n===n);
const lugarTxt = L=>{ const z=SALA&&SALA.zona(L.n); return `Lugar ${L.n}${z?`, ${z}`:""}`; };   // la zona real de la sala (data/sala.json)
const seatTxt = r=>{ const L=r.lugar&&lugarOf(r.lugar); return L?lugarTxt(L):"Sin lugar fijo (cupo por número)"; };
const digits = s=>String(s||"").replace(/\D/g,"");
const fmtWa = s=>{ const d=digits(s).replace(/^1(?=\d{10}$)/,""); return d.length===10?`${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`:s; };

/* ---------- Horario: días, filtros y filas ---------- */
const matches = c=>(!fInst||c.instructora===fInst)&&(!fType||fType.split("|").includes(c.clase));
const dayClasses = (i,w=week)=>(enLinea() ? sesDe(iso(dayDate(w,i))) : D.horario.filter(c=>c.dia===DKEYS[i])).filter(matches).sort((a,b)=>toH(a.inicio)-toH(b.inicio));
let cargando=false;
function renderFilters(){
  const insts=D.instructoras.map(i=>i.nombre).filter(n=>D.horario.some(c=>c.instructora===n));
  $("#fInst").innerHTML=`<option value="">Todas</option>`+insts.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");
  $("#fType").innerHTML=`<option value="">Todas</option>`+D.clases.map(t=>`<option value="${esc(t.tipos.join("|"))}">${esc(t.tipo)}</option>`).join("");
}
function setType(v){
  fType=v; const sel=$("#fType");
  if(v&&![...sel.options].some(o=>o.value===v)) sel.insertAdjacentHTML("beforeend",`<option value="${esc(v)}">${esc(v.split("|").join(", "))}</option>`);
  sel.value=v;
}
// La pastilla del día elegido se desliza hasta el día que se toca. Solo transform y sin medir nada:
// vive en la primera columna de la grilla y el CSS la corre --i columnas.
let pillWeek=null;
function placePill(pill,slide){
  pill.classList.toggle("still",!slide||calma());
  pill.style.setProperty("--i",dayIx);
  if(pill.classList.contains("still")) requestAnimationFrame(()=>requestAnimationFrame(()=>pill.classList.remove("still")));
}
let animFilas=null;
function renderWeek(dir){
  $("#wLabel").textContent=weekLabel(week);
  const strip=$("#strip"), slide=pillWeek===week;
  let pill=strip.querySelector(".dpill");
  if(!pill){ pill=document.createElement("span"); pill.className="dpill still"; pill.setAttribute("aria-hidden","true"); }
  $("#prevW").disabled=week<=0; $("#nextW").disabled=week>=WEEKS_AHEAD;
  const t=todayIx();
  strip.innerHTML=DSHORT.map((s,i)=>{
    const d=dayDate(week,i), n=dayClasses(i).length, hoy=week===0&&i===t, past=week===0&&i<t;
    return `<button type="button" class="dbtn ${hoy?"hoy":""} ${past?"past":""}" style="grid-column:${i+1}" data-d="${i}" aria-pressed="${i===dayIx}">
      <span class="dw" aria-hidden="true">${hoy?"Hoy":s}</span><span class="dn" aria-hidden="true">${d.getDate()}</span><i class="${n?"has":""}"></i><span class="sr-only">${esc(fmtDay(d))}${hoy?", hoy":""}: ${n?`${n} ${n===1?"clase":"clases"}`:"sin clases"}</span></button>`;
  }).join("");
  strip.prepend(pill);
  placePill(pill,slide); pillWeek=week;
  renderRows(dir);
}
const empezo = c=>{ const n=nowLV(); return `${c.fecha} ${c.inicio}`<=`${n.fecha} ${n.hora}`; };
function rowState(c,fecha){
  if(c.modo){
    if(c.estado==="cancelada") return "cancel";
    if(c.modo==="inscripcion") return "kid";
    if(!c.abierta) return "past";
    return free(c,fecha)>0 ? "open" : "full";
  }
  if(isCancel(c,fecha)) return "cancel";
  if(isBallet(c)) return "kid";
  if(startOf(c,fecha)<new Date()) return "past";
  return free(c,fecha)>0 ? "open" : "full";
}
function renderRows(dir){
  const d=dayDate(week,dayIx), fecha=iso(d), list=dayClasses(dayIx), hoy=week===0&&dayIx===todayIx();
  $("#dTitle").textContent=(hoy?"Hoy, ":"")+fmtDay(d);
  const rows=$("#rows");
  if(cargando){ rows.innerHTML=`<li class="empty-state">Cargando el horario…</li>`; return; }
  if(!list.length){
    let next="";
    for(let k=1;k<=7&&!next;k++){ const j=(dayIx+k)%7; if(dayClasses(j).length) next=DSHORT[j]; }
    const why=DKEYS[dayIx]==="domingo"&&!fInst&&!fType ? "Los domingos no hay clases." : "No hay clases con estos filtros este día.";
    rows.innerHTML=`<li class="empty-state">${why}${next?` Prueba el ${esc(fmtDay(dayDate(week,DSHORT.indexOf(next))).split(",")[0])}.`:" Quita algún filtro."}</li>`;
  }else rows.innerHTML=list.map(c=>{
    const st=rowState(c,fecha), libres=free(c,fecha), N=cap(c), w=waitlist(c,fecha).length, inst=instInfo(c.instructora), T=tagOf(c);
    const lbl=`${clsName(c)}, ${fmtDay(d)} a las ${NB.fmtH(toH(c.inicio))}`;
    let action;
    if(st==="cancel") action=`<span class="state full">Cancelada</span>`;
    else if(st==="kid") action=`<button class="rbtn line" type="button" data-kid="${esc(c.key)}" aria-label="Inscripción por WhatsApp: ${esc(lbl)}">Inscripción</button>`;
    else if(st==="past") action=`<span class="state">${c.modo&&!empezo(c)?"Cerrada":"Finalizada"}</span>`;
    else if(st==="full") action=`<span class="state full">Llena</span><button class="rbtn line" type="button" data-wait="${esc(c.key)}" aria-label="Lista de espera: ${esc(lbl)}">Lista de espera</button>`;
    else action=`<button class="rbtn" type="button" data-book="${esc(c.key)}" aria-label="Reservar ${esc(lbl)}">Reservar</button>`;
    return `<li class="crow ${st}">
      <div class="tm"><b>${esc(NB.fmtH(toH(c.inicio)))}</b><small>${mins(c)} min</small></div>
      <div class="cn"><h3>${esc(clsName(c))}</h3>
        ${T?(T.destacado?`<span class="badge">${esc(T.destacado)}</span><span class="note">${esc(T.texto)}</span>`:`<span class="badge soft">${esc(T.texto)}</span>`):""}
        ${c.edad?`<span class="note">${esc(c.edad)}</span>`:""}
        <span class="who">${inst.avatar?`<img class="ava" src="${esc(inst.avatar)}" alt="" width="26" height="26" loading="lazy" decoding="async">`:`<i class="ini" aria-hidden="true">${esc(initials(inst.completo||inst.nombre))}</i>`}${esc(c.instructora)}</span></div>
      <div class="ac"><span class="cupo">${st==="past"||st==="cancel"||st==="kid"?(st==="kid"?"Por inscripción":""):st==="full"?`0 de ${N} libres${w?` · ${w} en espera`:""}`:`<b>${libres}</b> de ${N} libres`}${(st==="open"||st==="full")&&!isBarra(c)&&cupoNota(c)?`<small class="tbc">${esc(cupoNota(c))}</small>`:""}</span>${action}</div>
    </li>`;
  }).join("");
  // Cambiar de día: el horario se desliza desde el lado del día nuevo (se cancela si se repite)
  if(dir&&!calma()&&rows.animate){
    if(animFilas) animFilas.cancel();
    animFilas=rows.animate([{opacity:.001,transform:`translateX(${dir*16}px)`},{opacity:1,transform:"none"}],{duration:260,easing:"cubic-bezier(.2,.8,.2,1)"});
  }
}

/* ---------- Reserva (diálogo por pasos) ---------- */
const bk={c:null, fecha:"", lugar:null, wait:false, last:null, busy:false};
const dlg=$("#book");
function paso(n,saltaLugar){
  document.querySelectorAll("#pasos li").forEach(li=>{
    const k=+li.dataset.paso;
    li.classList.toggle("hecho",k<n);
    li.classList.toggle("salta",k===2&&!!saltaLugar);
    if(k===n) li.setAttribute("aria-current","step"); else li.removeAttribute("aria-current");
  });
  const t=document.querySelector('#pasos li[data-paso="2"] .pt'); if(t) t.textContent=saltaLugar?"Por cupo":"Lugar";
}
function openBook(c,fecha,wait){
  Object.assign(bk,{c,fecha,lugar:null,wait,last:null,busy:false});
  const d=fromIso(fecha), T=tagOf(c);
  $("#bkTitle").textContent=clsName(c)+(c.edad?` · ${c.edad}`:"");
  $("#bkMeta").textContent=`${fmtDay(d)} · ${range(c)} · con ${c.instructora}`;
  const warn=$("#bkWarn");
  warn.hidden=!T; warn.className="bkwarn"+(T&&T.destacado?" good":"");
  if(T) warn.textContent=T.destacado?`${T.destacado}: ${T.texto.toLowerCase()}.`:T.aviso;
  $("#stDatos").reset(); limpiarErrores();
  $("#memWrap").hidden=!(T&&T.confirmar);
  if(T&&T.confirmar) $("#memTxt").textContent=T.confirmar;
  hideErr(); modoCampos(); textosModo(); prellenar();
  const direct=wait||!isBarra(c);
  if(direct) show("stDatos"); else { show("stLugar"); renderSeats(); }
  dlg.showModal();
  const first=direct?$("#fName"):$("#seats .seat[tabindex='0']")||$("#seats button:not(:disabled)");
  if(first) first.focus();
  if(c.modo) refrescarClase();
}
function textosModo(){
  const c=bk.c, wait=bk.wait, barra=isBarra(c), direct=wait||!barra;
  $("#bkKick").textContent=wait?"Lista de espera":"Reservar";
  $("#payLine").hidden=wait;
  $("#datosH").textContent=wait?"Tus datos para la lista de espera":"Tus datos";
  $("#confirmBtn").textContent=confirmTxt();
  $("#backLugar").hidden=direct;
  cupoInfo();
}
const confirmTxt = ()=>bk.wait?"Unirme a la lista de espera":enLinea()&&bk.c&&bk.c.modo?"Confirmar reserva":"Confirmar y enviar por WhatsApp";
function cupoInfo(){
  const c=bk.c, ci=$("#cupoInfo");
  ci.hidden=bk.wait||isBarra(c);
  if(!ci.hidden){
    const n=free(c,bk.fecha);
    ci.innerHTML=`<div class="cupo-sala"></div><p>Esta clase va por cupo, sin lugar fijo: quedan ${n} de ${cap(c)} ${cap(c)===1?"máquina":"máquinas"}${cupoNota(c)?` (${esc(cupoNota(c).toLowerCase())})`:""}. La instructora te indica tu máquina al llegar.</p>`;
    if(/reformer/i.test(c.clase)&&SALA) SALA.reformer(ci.querySelector(".cupo-sala"),{capacidad:cap(c),ocupados:used(c,bk.fecha)});
  }
}
function modoCampos(){
  const on=enLinea()&&!!(bk.c&&bk.c.modo);
  dlg.querySelectorAll(".en-linea").forEach(el=>{ el.hidden=!on; });
  if(!bk.busy) $("#confirmBtn").textContent=confirmTxt();
}
function syncClase(){
  if(!bk.c||!bk.c.modo) return null;
  const n=sesDe(bk.fecha).find(x=>x.sid===bk.c.sid);
  if(n) bk.c=n;
  return n||null;
}
function refrescarClase(){
  const sid=bk.c.sid;
  refrescar(bk.fecha,bk.fecha).then(ok=>{
    renderRows();
    if(!ok||!dlg.open||!bk.c||bk.c.sid!==sid||bk.last) return;
    const n=syncClase(); if(!n) return;
    if(bk.lugar&&n.lugares.includes(bk.lugar)){ const v=bk.lugar; bk.lugar=null; if(!$("#stLugar").hidden){ renderSeats(); SALA.vibrar(v); } }
    else if(!$("#stLugar").hidden) renderSeats();
    cupoInfo();
    const st=rowState(n,bk.fecha);
    if(st==="cancel") showErr("Esta clase se canceló. Elige otra en el horario.");
    else if(st==="past") showErr("Las reservas de esta clase ya cerraron. Escríbenos por WhatsApp y te ayudamos.",[waAyuda()]);
    else if(st==="full"&&!bk.wait) showErr("La clase se llenó. Puedes unirte a la lista de espera.",[{t:"Unirme a la lista de espera",fn:aEspera}]);
    else if(st==="open"&&bk.wait) showErr("Todavía hay lugares en esta clase: puedes reservar.",[{t:"Reservar",fn:aReserva}]);
  });
}
function showErr(msg,btns=[]){
  const box=$("#bkErr");
  $("#bkErrTxt").textContent=msg;
  const wrap=$("#bkErrBtns"); wrap.innerHTML="";
  btns.forEach(b=>{ const el=document.createElement("button"); el.type="button"; el.className="btn line sm"; el.textContent=b.t; el.addEventListener("click",b.fn); wrap.append(el); });
  wrap.hidden=!btns.length; box.hidden=false;
  box.scrollIntoView({block:"nearest"});
}
function hideErr(){ $("#bkErr").hidden=true; $("#bkErrTxt").textContent=""; $("#bkErrBtns").innerHTML=""; }
const waAyuda = ()=>({t:"Escribir por WhatsApp",fn:()=>NB.whatsapp(`Hola, balé. Quiero reservar ${clsName(bk.c)} del ${fmtDay(fromIso(bk.fecha))} a las ${NB.fmtH(toH(bk.c.inicio))}.`)});
function aEspera(){ bk.wait=true; hideErr(); textosModo(); show("stDatos"); $("#confirmBtn").focus(); }
function aReserva(){
  bk.wait=false; hideErr(); textosModo();
  if(isBarra(bk.c)){ bk.lugar=null; show("stLugar"); renderSeats(); SALA.enfocar(0); }
  else { show("stDatos"); $("#confirmBtn").focus(); }
}
function show(id){
  if(SALA&&SALA.cerrarGrande) SALA.cerrarGrande();
  ["stLugar","stDatos","stListo"].forEach(s=>{ $("#"+s).hidden=s!==id; });
  const salta=!!(bk.c&&(bk.wait||!isBarra(bk.c)));
  paso(id==="stLugar"?2:id==="stDatos"?3:4,salta);
  dlg.querySelector(".bk").scrollTop=0;
}
function renderSeats(){
  const set=taken(bk.c,bk.fecha), S=D.sala;
  SALA.render($("#sala"),{filas:S.filas, porFila:S.por_fila, ocupados:set, elegido:bk.lugar, onPick:pickSeat});
  const L=lugarOf(bk.lugar);
  $("#pick").textContent=L?`Elegiste el ${lugarTxt(L).toLowerCase()}.`:`${cap(bk.c)-set.size} de ${cap(bk.c)} lugares libres. Toca uno.`;
  botonLugar(L);
}
// Paso «Lugar»: solo la foto y este botón, que dice el lugar elegido
function botonLugar(L){ const b=$("#toDatos"); b.disabled=!L; b.textContent=L?`Continuar con el lugar ${L.n}`:"Toca tu lugar en la foto"; }
function pickSeat(n){
  if(taken(bk.c,bk.fecha).has(n)) return;
  bk.lugar=n; SALA.elegir(n);
  const L=lugarOf(n);
  $("#pick").textContent=L?`Elegiste el ${lugarTxt(L).toLowerCase()}.`:"";
  botonLugar(L);
  // Teléfono: que «Continuar» quede a la vista (suave; sin animación con movimiento reducido)
  if(L&&matchMedia("(max-width:759px)").matches){ const c=$("#toDatos"); requestAnimationFrame(()=>c.scrollIntoView({block:"nearest",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"})); }
}

/* ---------- Datos: errores junto al campo ---------- */
function limpiarErrores(){ dlg.querySelectorAll("[aria-invalid]").forEach(e=>e.removeAttribute("aria-invalid")); dlg.querySelectorAll(".error").forEach(e=>{ e.hidden=true; e.textContent=""; }); }
function invalid(el,msg){
  el.setAttribute("aria-invalid","true");
  const box=document.getElementById("e-"+el.id);
  if(box){ box.textContent=msg; box.hidden=false; } else NB.toast(msg);
  el.focus(); return false;
}
const nombreOk = s=>{ const n=s.trim().replace(/\s+/g," "); return n.length>=2&&n.length<=80; };
const conMas = s=>/^\s*(\+|00)/.test(String(s||""));
const telApi = s=>conMas(s)?"+"+digits(s).replace(/^00/,""):digits(s);
const telOk = s=>{ let d=digits(s);
  if(conMas(s)){ if(/^\s*00/.test(s)) d=d.slice(2); return d[0]==="1"?/^1[2-9]\d{9}$/.test(d):/^[2-9]\d{7,14}$/.test(d); }
  if(d.length===10) d="1"+d; return /^1[2-9]\d{9}$/.test(d); };
const correoOk = s=>{ const c=s.trim().toLowerCase(); return c.length>=6&&c.length<=254&&/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(c); };
function validate(){
  limpiarErrores();
  const sis=!$("#fMail").closest(".en-linea").hidden;
  if(!$("#fName").value.trim()) return invalid($("#fName"),"Escribe tu nombre.");
  if(sis&&!nombreOk($("#fName").value)) return invalid($("#fName"),"Escribe tu nombre completo (de 2 a 80 letras).");
  if(!telOk($("#fWa").value)) return invalid($("#fWa"),"Escribe un WhatsApp de 10 dígitos, por ejemplo 809-000-0000. Si es de otro país, empieza con + y el código (+34…).");
  if(sis&&!correoOk($("#fMail").value)) return invalid($("#fMail"),"Escribe un correo válido, por ejemplo tucorreo@gmail.com.");
  if(!$("#memWrap").hidden&&!$("#fMem").checked) return invalid($("#fMem"),"Esta clase es exclusiva para miembros: confirma que tienes una membresía activa.");
  if(sis&&!$("#fPriv").checked) return invalid($("#fPriv"),"Acepta el aviso de privacidad para continuar.");
  if(!$("#fPol").checked) return invalid($("#fPol"),"Acepta la política de cancelación para continuar.");
  return true;
}
function submit(e){
  e.preventDefault();
  if(bk.busy||!validate()) return;
  if(enLinea()&&bk.c.modo) submitSistema(); else submitLocal(null);
}

/* ---------- Reserva con el sistema ---------- */
function setBusy(on){
  bk.busy=on;
  const b=$("#confirmBtn");
  b.disabled=on; b.toggleAttribute("aria-busy",on);
  b.textContent=on?(bk.wait?"Un momento…":"Reservando…"):confirmTxt();
}
async function submitSistema(){
  const c=bk.c, abrir=!bk.wait&&SIS.cfg().abrir_whatsapp_al_reservar!==false;
  const datos={p_sesion_id:c.sid, p_nombre:$("#fName").value.trim(), p_telefono:telApi($("#fWa").value),
    p_correo:$("#fMail").value.trim(), p_acepta_whatsapp:$("#fWaOk").checked, p_acepta_privacidad:$("#fPriv").checked};
  let win=null;
  if(abrir){ try{ win=window.open("","_blank"); if(win) win.opener=null; }catch(e){ win=null; } }
  hideErr(); setBusy(true);
  let j=null;
  try{
    j=bk.wait ? await SIS.llamar("lista_espera_unirse",datos)
      : await SIS.llamar("reservar",Object.assign(datos,{p_lugar:isBarra(c)?bk.lugar:null, p_acepta_politica:$("#fPol").checked,
          p_confirma_membresia:!$("#memWrap").hidden&&$("#fMem").checked}));
  }catch(e){ j=null; }
  setBusy(false);
  if(!j){ sinSistema(); submitLocal(win); return; }
  if(!j.ok){ if(win) win.close(); errorReserva(j); return; }
  const persona={nombre:datos.p_nombre, wa:fmtWa($("#fWa").value.trim()), correo:datos.p_correo.toLowerCase()};
  if(bk.wait) bk.last=Object.assign({pos:j.posicion, fecha:bk.fecha, sis:true},persona);
  else{
    bk.last=Object.assign({R:j.reserva},persona);
    guardarMia(j.reserva); renderMias();
    if(win) win.location.href=NB.waLink(waMessage());
  }
  renderDone();
  refrescar(bk.fecha,bk.fecha).then(ok=>{ if(ok){ syncClase(); renderRows(); } });
}
function campoInvalido(){
  if(!nombreOk($("#fName").value)) return $("#fName");
  if(!telOk($("#fWa").value)) return $("#fWa");
  return $("#fMail");
}
function errorReserva(j){
  const msg=j.mensaje||"No se pudo completar. Inténtalo de nuevo o escríbenos por WhatsApp.";
  switch(j.error){
    case "lugar_ocupado": {
      const v=bk.lugar;
      if(Array.isArray(j.lugares_ocupados)){ bk.c.lugares=j.lugares_ocupados; bk.c.ocupados=Math.max(bk.c.ocupados,j.lugares_ocupados.length); }
      bk.lugar=null; show("stLugar"); renderSeats(); showErr(msg);
      if(v) SALA.vibrar(v);
      SALA.enfocar(0);
      break;
    }
    case "clase_llena": showErr(msg,[{t:"Unirme a la lista de espera",fn:aEspera}]); break;
    case "hay_lugares": showErr(msg,[{t:"Reservar",fn:aReserva}]); break;
    case "clase_cerrada": case "fuera_de_ventana": case "limite_reservas": case "demasiados_intentos": case "clase_cancelada":
      showErr(msg,[waAyuda()]); break;
    case "datos_invalidos": showErr(msg); invalid(campoInvalido(),msg); break;
    case "falta_consentimiento": showErr(msg); invalid(!$("#fPriv").checked?$("#fPriv"):$("#fPol"),msg); break;
    case "solo_miembros": showErr(msg); if(!$("#memWrap").hidden) invalid($("#fMem"),msg); break;
    default: showErr(msg);
  }
  refrescar(bk.fecha,bk.fecha).then(ok=>{
    if(!ok) return;
    renderRows();
    const n=syncClase();
    if(n&&j.error==="lugar_ocupado"&&!$("#stLugar").hidden) renderSeats();
  });
}

/* ---------- Mis reservas: solo el token (sin nombre ni teléfono) ---------- */
const TOKEN_RE=/^\d{1,18}-[0-9a-f]{32}$/;
function escribirMias(a){ try{ a.length?localStorage.setItem(MIS_KEY,JSON.stringify(a)):localStorage.removeItem(MIS_KEY); }catch(e){} }
function leerMias(){
  let a=null; try{ a=JSON.parse(localStorage.getItem(MIS_KEY)); }catch(e){}
  a=Array.isArray(a)?a:[];
  const hoy=nowLV().fecha, ok=a.filter(x=>x&&TOKEN_RE.test(x.t)&&/^\d{4}-\d{2}-\d{2}$/.test(x.fecha)&&x.fecha>=hoy);
  if(ok.length!==a.length) escribirMias(ok);
  return ok;
}
function guardarMia(R){
  const a=leerMias().filter(x=>x.t!==R.token);
  a.push({t:R.token, fecha:R.fecha, inicio:R.inicio, clase:R.clase, fl:R.fecha_larga, hora:R.hora});
  a.sort((x,y)=>(x.fecha+x.inicio).localeCompare(y.fecha+y.inicio));
  escribirMias(a.slice(0,20));
}
function renderMias(){
  const box=$("#mias"); if(!box) return;
  const a=enLinea()?leerMias():[];
  box.hidden=!a.length;
  $("#miasList").innerHTML=a.map(x=>`<li><a href="mi-reserva.html#t=${esc(x.t)}"><b>${esc(x.clase)}</b><span>${esc(x.fl)} · ${esc(x.hora)}</span></a></li>`).join("");
}
const enlaceMia = t=>NB.sitioUrl(`mi-reserva.html#t=${t}`);   // en el dominio de balé (config.json → sitio.url)

/* ---------- La base de datos no responde: la página sigue como siempre ---------- */
let caidoUI=false;
function sinSistema(){
  if(caidoUI) return;
  caidoUI=true; SES=null; cargando=false;
  const msg=SIS?SIS.AVISO:"";
  ["#sisAviso","#bkSis"].forEach(s=>{ const el=$(s); if(el){ el.textContent=msg; el.hidden=false; } });
  textoHorario(); renderMias();
  if(dlg.open&&!bk.last) modoCampos();
  if(D) renderWeek();
}
function textoHorario(){   // los dos textos vienen en el HTML (compilado con el del sistema si está encendido)
  const p=$("#schedTxt"); if(!p) return;
  const t=enLinea()||cargando ? p.dataset.con : p.dataset.sin;
  if(t&&p.textContent!==t) p.textContent=t;
}

/* ---------- Reserva sin sistema (como siempre) ---------- */
function submitLocal(win){
  store=readStore(); prune();
  const c=bk.c;
  const base={id:uid(), occ:occKey(c,bk.fecha), claseId:c.id, fecha:bk.fecha,
    nombre:$("#fName").value.trim(), wa:fmtWa($("#fWa").value.trim()), nina:"", creada:new Date().toISOString()};
  const no=()=>{ if(win) win.close(); };
  if(store.reservas.some(r=>r.occ===base.occ&&(r.waH||huellaWa(r.wa))===huellaWa(base.wa)&&(r.nina||"")===base.nina)){ no(); NB.toast("Ya hay una reserva con ese WhatsApp en esta clase."); return; }
  if(bk.wait){
    if(free(c,bk.fecha)>0){ no(); NB.toast("¡Se liberó un lugar! Ya puedes reservarlo."); dlg.close(); renderWeek(); return; }
    store.espera.push(base); save();
    bk.last=Object.assign({pos:waitlist(c,bk.fecha).length},base);
  }else{
    if(isBarra(c)&&taken(c,bk.fecha).has(bk.lugar)){ const v=bk.lugar; no(); NB.toast("Ese lugar se acaba de ocupar. Elige otro."); bk.lugar=null; show("stLugar"); renderSeats(); SALA.vibrar(v); return; }
    if(!isBarra(c)&&free(c,bk.fecha)<=0){ no(); NB.toast("La clase se acaba de llenar. Puedes unirte a la lista de espera."); dlg.close(); renderWeek(); return; }
    const r=Object.assign(base,{lugar:isBarra(c)?bk.lugar:null, pago:"por confirmar", metodo:"Transferencia"});
    store.reservas.push(r); save();
    bk.last=r;
  }
  if(win) win.location.href=NB.waLink(waMessage()); else NB.whatsapp(waMessage());
  renderDone();
  if(!bk.wait) sendMail(bk.last,c); else $("#mailSt").textContent="";
  renderWeek();
}
function summary(r,c){
  const wait=r.pos!=null;
  return [["Clase",clsName(c)+(c.edad?` (${c.edad})`:"")+(tagTxt(c)?` · ${tagTxt(c)}`:"")],["Fecha",fmtDay(fromIso(r.fecha))],["Hora",range(c)],
    ["Instructora",c.instructora],wait?["Lista de espera",`Posición ${r.pos}`]:["Lugar",seatTxt(r)],
    ["Nombre",r.nombre],["WhatsApp",r.wa],wait?null:["Pago",CFG.pago.texto]].filter(Boolean);
}
function summarySis(){
  const L=bk.last, R=L.R, c=bk.c;
  return [["Clase",R.clase+(c.edad?` (${c.edad})`:"")+(tagTxt(c)?` · ${tagTxt(c)}`:"")],["Fecha",R.fecha_larga],["Hora",range({inicio:R.inicio,fin:R.fin})],
    ["Instructora",R.instructora],["Lugar",R.lugar_texto],["Nombre",L.nombre],["WhatsApp",L.wa],["Pago",R.pago_texto]];
}
const dlRows = rows=>rows.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
function renderDone(){
  const r=bk.last, c=bk.c, R=r.R, sisWait=bk.wait&&r.sis;
  $("#payBox").hidden=true; $("#payBox").innerHTML="";
  $("#verMia").hidden=!R;
  $("#sendWa").hidden=sisWait;
  if(R){
    $("#okTitle").textContent="¡Reserva confirmada!";
    $("#okMsg").textContent=`Te enviamos la confirmación a ${r.correo}. Ahí está el enlace para ver o cancelar tu reserva.`;
    $("#sum").innerHTML=dlRows(summarySis())+(R.cancelacion_texto?`<div class="pol"><dt>Cancelación</dt><dd>${esc(R.cancelacion_texto)}</dd></div>`:"");
    pintarPago(R);
    $("#sendWa").textContent=SIS.cfg().abrir_whatsapp_al_reservar!==false?"Enviar la reserva por WhatsApp":"Escribir al estudio";
    $("#icsMine").hidden=false;
    $("#verMia").href=`mi-reserva.html#t=${R.token}`;
    $("#mailSt").textContent=""; $("#mailSt").className="mailst";
    show("stListo"); $("#stListo").focus();
    return;
  }
  $("#okTitle").textContent=bk.wait?"Estás en la lista de espera":"¡Reserva enviada!";
  $("#okMsg").textContent=sisWait?`Estás en la lista de espera (posición ${r.pos}). Si se libera un lugar te avisamos por correo y, si lo marcaste, por WhatsApp.`
    :bk.wait?"Te escribimos por WhatsApp si se libera un lugar."
    :"Se abrió WhatsApp con tu reserva: envía el mensaje y el estudio te la confirma. Si no se abrió, usa el botón de abajo.";
  $("#sum").innerHTML=dlRows(summary(r,c))+(bk.wait?"":`<div class="pol"><dt>Cancelación</dt><dd>${esc(CFG.cancelacion.texto)}</dd></div>`);
  $("#sendWa").textContent=bk.wait?"Avisar por WhatsApp":"Enviar la reserva por WhatsApp";
  $("#icsMine").hidden=bk.wait;
  $("#mailSt").textContent=bk.wait?"":"Avisando al estudio por correo…"; $("#mailSt").className="mailst";
  show("stListo"); $("#stListo").focus();
}
// Pago: «Pagar con tarjeta» (CardNET por cobro), datos de la transferencia y «Ya transferí»
function pintarPago(R){
  const box=$("#payBox");
  if(R.pago_estado==="membresia"){ box.innerHTML=`<p class="payinc">Incluida en tu membresía</p>`; box.hidden=false; return; }
  if(R.pago_estado!=="pendiente") return;
  const T=R.pago_transferencia&&typeof R.pago_transferencia==="object"?R.pago_transferencia:null;
  const fila=(k,v,extra="")=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}${extra}</dd></div>`;
  box.innerHTML=`<p class="paytit">Pago${typeof R.monto==="number"?` · ${esc(NB.money(R.monto))}`:""}</p>
    ${R.pagar_con_tarjeta&&SIS.tarjeta?SIS.tarjeta.html(R):""}
    ${T?`<dl class="bankd">${fila("Banco",T.banco)}${fila("Tipo de cuenta",T.tipo_cuenta)}${fila("Número",T.cuenta,` <button class="linkbtn" type="button" data-copy="${esc(T.cuenta)}">Copiar número</button>`)}${fila("Titular",T.titular)}</dl>`:""}
    ${R.por_pagar&&SIS.transferencia?SIS.transferencia.html(R):""}
    <button class="linkbtn" type="button" id="comprobante">O envía el comprobante por WhatsApp</button>`;
  box.hidden=false;
}
function waMessage(){
  const r=bk.last, c=bk.c;
  if(r.R) return "Hola, balé. Reservé esta clase en la página:\n"+summarySis().map(([k,v])=>`${k}: ${v}`).join("\n")+(r.R.cancelacion_texto?`\n\n${r.R.cancelacion_texto}`:"");
  const head=bk.wait?"Hola, balé. Me anoté en la lista de espera:":"Hola, balé. Quiero reservar esta clase:";
  return head+"\n"+summary(r,c).map(([k,v])=>`${k}: ${v}`).join("\n")+(bk.wait?"":`\n\n${CFG.cancelacion.texto}`);
}
function sendMail(r,c){
  const st=$("#mailSt"), A=CFG.aviso_correo;
  const fail=()=>{ st.textContent="Escríbenos por WhatsApp para confirmar."; st.className="mailst fail"; };
  if(!A||!A.endpoint||!window.fetch){ fail(); return; }
  const body={_subject:`Nueva reserva · ${clsName(c)} ${fmtDay(fromIso(r.fecha))} ${NB.fmtH(toH(c.inicio))}`,_template:"table",_captcha:"false"};
  summary(r,c).forEach(([k,v])=>{ body[k]=v; });
  body["Cancelación"]=CFG.cancelacion.texto;
  const ctl=window.AbortController?new AbortController():null, t=setTimeout(()=>ctl&&ctl.abort(),12000);
  fetch(A.endpoint,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(body),signal:ctl?ctl.signal:undefined})
    .then(res=>res.json()).then(j=>{ clearTimeout(t); if(String(j.success)==="true"){ st.textContent="El estudio también recibió un aviso por correo."; st.className="mailst sent"; } else fail(); })
    .catch(()=>{ clearTimeout(t); fail(); });
}

/* ---------- Calendario .ics (js/calendario.js, se carga después) ---------- */
const icsFile = (name,events)=>window.BALE_ICS.archivo(name,events.map(ev=>({uid:ev.uid, fecha:ev.fecha, inicio:ev.c.inicio, fin:ev.c.fin, resumen:ev.summary, descripcion:ev.desc, lugar:`balé, ${CFG.direccion}`})));
function cargarIcs(){ if(window.BALE_ICS||document.querySelector('script[src="js/calendario.js"]')) return; const s=document.createElement("script"); s.src="js/calendario.js"; document.head.append(s); }
if(document.readyState==="complete") setTimeout(cargarIcs,0); else addEventListener("load",()=>setTimeout(cargarIcs,0),{once:true});
function myIcs(){
  const r=bk.last, c=bk.c; if(!r||bk.wait||!window.BALE_ICS) return;
  if(r.R){
    const R=r.R, desc=`Clase de ${R.clase} con ${R.instructora}.\n${R.lugar_texto}.\n\n${R.cancelacion_texto||CFG.cancelacion.texto}\nPara ver o cancelar tu reserva: ${enlaceMia(R.token)}`;
    window.BALE_ICS.descargar(icsFile("balé",[{uid:`reserva-${R.id}@bale`,fecha:R.fecha,c:{inicio:R.inicio,fin:R.fin},summary:`balé · ${R.clase}`,desc}]),`bale-${R.fecha}-${R.inicio.replace(":","")}.ics`);
    return;
  }
  const desc=`Clase de ${clsName(c)} con ${c.instructora}.\n${seatTxt(r)}.\n\n${CFG.cancelacion.texto}\nPara cancelar, escríbenos por WhatsApp: ${CFG.whatsapp_texto}.`;
  window.BALE_ICS.descargar(icsFile("balé",[{uid:`${r.id}@bale`,fecha:r.fecha,c,summary:`balé · ${clsName(c)}`,desc}]),`bale-${c.id}-${r.fecha}.ics`);
}

// Ballet niñas: inscripción por WhatsApp (el estudio envía el formulario)
function kidWA(c,d){
  const dia=d.toLocaleDateString("es-DO",{weekday:"long"});
  NB.whatsapp(`Hola, balé. Quiero inscribir a mi hija en ${clsName(c)}, grupo de ${c.edad} (${dia} ${NB.fmtH(toH(c.inicio))} con ${c.instructora}). ¿Me envían el formulario de inscripción?`);
}
// Lleva el horario al primer día (desde hoy) con una clase que cumpla «test»
function goToClass(test,type,fecha){
  fInst=""; $("#fInst").value=""; setType(type||"");
  const now=new Date();
  search: for(let w=0;w<=WEEKS_AHEAD;w++) for(let i=0;i<7;i++){
    const f=iso(dayDate(w,i)); if(fecha&&f<fecha) continue;
    const hay=enLinea() ? sesDe(f).some(c=>test(c)&&["open","full","kid"].includes(rowState(c,f)))
      : D.horario.some(c=>test(c)&&c.dia===DKEYS[i]&&startOf(c,f)>now);
    if(hay){ week=w; dayIx=i; break search; }
  }
  renderWeek();
}
// Enlaces de las otras páginas: ?tipo= · ?primera=1 · ?clase=lun-1730[&fecha=AAAA-MM-DD]
function desdeEnlace(){
  const q=new URLSearchParams(location.search);
  if(q.get("primera")) goToClass(c=>c.etiqueta==="primera");
  else if(q.get("clase")){ const id=q.get("clase"), f=/^\d{4}-\d{2}-\d{2}$/.test(q.get("fecha")||"")?q.get("fecha"):null; goToClass(c=>(c.horario_id||c.id)===id,"",f); }
  else if(q.get("tipo")){ const t=q.get("tipo").split("|"); goToClass(c=>t.includes(c.clase),q.get("tipo")); }
}

/* ---------- Con la sesión de «Mi cuenta»: los datos se rellenan solos ----------
   Solo si hay una sesión guardada: entonces se cargan supabase-js y cuenta-sesion.js. */
let MIOS=null;
function hayCuenta(){ try{ return !!localStorage.getItem("bale-cuenta-auth"); }catch(e){ return false; } }
function cargarScript(src){ return new Promise((ok,no)=>{ if(document.querySelector(`script[src="${src}"]`)) return ok(); const s=document.createElement("script"); s.src=src; s.onload=ok; s.onerror=no; document.head.append(s); }); }
function buscarMios(){
  if(!hayCuenta()) return;
  cargarScript("js/vendor/supabase.js").then(()=>cargarScript("js/cuenta-sesion.js")).then(()=>window.BALE_CUENTA&&window.BALE_CUENTA.yo())
    .then(yo=>{ if(yo&&yo.vinculada&&yo.clienta){ MIOS=yo.clienta; if(dlg.open&&!bk.last) prellenar(); } }).catch(()=>{});
}
function prellenar(){
  const p=$("#prellenado"); if(!MIOS){ p.hidden=true; return; }
  const set=(id,v)=>{ const el=$(id); if(el&&!el.value&&v) el.value=v; };
  set("#fName",MIOS.nombre); set("#fWa",MIOS.telefono); set("#fMail",MIOS.correo);
  if(MIOS.acepta_whatsapp) $("#fWaOk").checked=true;
  p.textContent="Tus datos vienen de tu cuenta. Puedes cambiarlos para esta reserva."; p.hidden=false;
}

function semana(dir){ renderWeek(dir); if(enLinea()&&Date.now()-sesAt>60000) refrescar().then(ok=>{ if(ok) renderWeek(); }); }
function prune(){ const ok=r=>D.horario.some(c=>c.id===r.claseId); store.reservas=store.reservas.filter(ok); store.espera=store.espera.filter(ok); }

function init(){
  if(SIS) SIS.alCaer(sinSistema);
  if(SIS&&SIS.activo()) cargando=true;
  textoHorario();
  $("#polTxt").textContent=CFG.cancelacion.texto;
  $("#payLine").textContent=`Pago: ${CFG.pago.texto}.`;
  renderFilters(); renderWeek(); renderMias(); buscarMios();
  const listo=()=>{ cargando=false; desdeEnlace(); if(!new URLSearchParams(location.search).toString()) renderWeek(); renderMias(); };
  if(cargando) cargarSesiones().then(listo,()=>sinSistema()); else desdeEnlace();
  $("#prevW").addEventListener("click",()=>{ if(week>0){ week--; dayIx=week===0?todayIx():0; semana(-1); } });
  $("#nextW").addEventListener("click",()=>{ if(week<WEEKS_AHEAD){ week++; dayIx=0; semana(1); } });
  $("#strip").addEventListener("click",e=>{ const b=e.target.closest("[data-d]"); if(!b) return; const n=+b.dataset.d, dir=n===dayIx?0:n>dayIx?1:-1; dayIx=n; renderWeek(dir); $(`#strip [data-d="${dayIx}"]`).focus(); });
  $("#fInst").addEventListener("change",e=>{ fInst=e.target.value; renderWeek(); });
  $("#fType").addEventListener("change",e=>{ fType=e.target.value; renderWeek(); });
  $("#rows").addEventListener("click",e=>{
    const fecha=iso(dayDate(week,dayIx)), k=e.target.closest("[data-kid]");
    if(k){ const c=rowClass(k.dataset.kid,fecha); if(c) kidWA(c,dayDate(week,dayIx)); return; }
    const b=e.target.closest("[data-book],[data-wait]"); if(!b) return;
    const c=rowClass(b.dataset.book||b.dataset.wait,fecha);
    if(!c||rowState(c,fecha)==="past"||rowState(c,fecha)==="cancel"){ renderRows(); return; }
    openBook(c,fecha,!!b.dataset.wait);
  });
  $("#toDatos").addEventListener("click",()=>{ show("stDatos"); $("#fName").focus(); });
  $("#backLugar").addEventListener("click",()=>{ show("stLugar"); renderSeats(); SALA.enfocar(bk.lugar); });
  $("#stDatos").addEventListener("submit",submit);
  $("#stDatos").addEventListener("input",e=>{ e.target.removeAttribute("aria-invalid"); const b=document.getElementById("e-"+e.target.id); if(b){ b.hidden=true; b.textContent=""; } });
  $("#stDatos").addEventListener("focusout",e=>{   // validar al salir del campo (solo los que ya se tocaron)
    const el=e.target; if(!el.value) return;
    const sis=!$("#fMail").closest(".en-linea").hidden;
    if(el.id==="fWa"&&!telOk(el.value)) invalidSinFoco(el,"Escribe un WhatsApp de 10 dígitos, por ejemplo 809-000-0000. Si es de otro país, empieza con + y el código (+34…).");
    if(el.id==="fMail"&&sis&&!correoOk(el.value)) invalidSinFoco(el,"Escribe un correo válido, por ejemplo tucorreo@gmail.com.");
  });
  $("#sendWa").addEventListener("click",()=>NB.whatsapp(waMessage()));
  $("#icsMine").addEventListener("click",myIcs);
  $("#payBox").addEventListener("click",e=>{
    const tj=e.target.closest("[data-tarjeta]");
    if(tj&&bk.last&&bk.last.R){ SIS.tarjeta.pedir(bk.last.R,tj).then(ok=>{ if(ok){ pintarPago(bk.last.R); const b=$("#payBox [data-tarjeta]"); if(b) b.focus(); } }); return; }
    const cp=e.target.closest("[data-copy]");
    if(cp){ const v=cp.dataset.copy, ok=()=>NB.toast("Número de cuenta copiado"), no=()=>NB.toast(`Número de cuenta: ${v}`);
      if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(ok,no); else no(); return; }
    if(e.target.closest("#comprobante")&&bk.last&&bk.last.R){ const R=bk.last.R;
      NB.whatsapp(`Hola, balé. Te envío el comprobante de pago de mi reserva: ${R.clase}, ${R.fecha_larga}, ${R.hora}. Nombre: ${bk.last.nombre}.`); }
  });
  if(SIS&&SIS.transferencia) SIS.transferencia.conectar($("#payBox"),()=>bk.last&&bk.last.R,()=>{ if(bk.last&&bk.last.R) pintarPago(bk.last.R); });
  $("#bkClose").addEventListener("click",()=>dlg.close());
  $("#bkDone").addEventListener("click",()=>dlg.close());
  dlg.addEventListener("click",e=>{ if(e.target===dlg) dlg.close(); });
  let opener=null;
  dlg.addEventListener("close",()=>{ if(SALA&&SALA.cerrarGrande) SALA.cerrarGrande(); if(opener&&document.contains(opener)) opener.focus(); else { const f=$("#rows .rbtn"); if(f) f.focus(); } });
  document.addEventListener("click",e=>{ const b=e.target.closest("[data-book],[data-wait]"); if(b) opener=b; },true);
}
function invalidSinFoco(el,msg){ el.setAttribute("aria-invalid","true"); const b=document.getElementById("e-"+el.id); if(b){ b.textContent=msg; b.hidden=false; } }

Promise.all([NB.load("bale"),NB.load("horario"),NB.ready,SIS?SIS.listo:null]).then(([b,h,cfg])=>{
  D=Object.assign({},b,{horario:h.clases, etiquetas:h.etiquetas});
  D.horario.forEach(c=>{ c.key=c.id; });
  D.canceladas=new Set(D.canceladas||[]);
  CFG=cfg;
  applyPanel(); buildLugares(); prune();
  init();
  addEventListener("storage",e=>{ if(e.key===MIS_KEY){ renderMias(); return; } if(e.key!==KEY||enLinea()) return; store=readStore(); prune(); renderWeek(); });
}).catch(()=>{});
})();
