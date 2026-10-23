/* =========================================================
   balé — página propia (bale/)
   Página pública: bienvenida con video, estudio, clases, nuevo espacio de
   Reformer, horario con reservas (tira de 7 días, filtros, esquema de la sala
   en las clases de barra y cupo por número en las demás), precios, certificado
   de regalo, comunidad, equipo, preguntas frecuentes y ubicación.
   Reserva: abre WhatsApp de balé con la reserva completa, avisa al estudio por
   correo (FormSubmit) y ofrece el .ics de la clase.
   Vista del estudio (?vista=estudio): demo con reservas por clase, clientes,
   pagos y calendario .ics por instructora.
   Panel del negocio (panel.html): sus cambios (guardados en este navegador,
   "bale-panel") se aplican aquí con applyPanel().
   Lo que se guarda en este navegador ("bale-reservas") es solo para la demo.
   Nunca se guardan datos de salud.
   Datos: data/config.json, horario.json, precios.json, comunidad.json y bale.json.
   ========================================================= */
(function(){
"use strict";
const NB = window.BALE;
const {$, esc} = NB;
const KEY = "bale-reservas";        // {reservas:[], espera:[], aprobados:[]}
const WEEKS_AHEAD = 3;
const DKEYS = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];
const DSHORT = ["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"];
const ESTUDIO = new URLSearchParams(location.search).get("vista")==="estudio";

let D, CFG;
let week=0, dayIx=todayIx(), fInst="", fType="";
let vWeek=0, vInst="", vSel=null;

/* ---------- Fechas ---------- */
function todayIx(){ return (new Date().getDay()+6)%7; }        // lunes = 0
function monday(w){ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-todayIx()+7*w); return d; }
function dayDate(w,i){ const d=monday(w); d.setDate(d.getDate()+i); return d; }
const iso = d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fromIso = s=>{ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
const fmtDay = d=>d.toLocaleDateString("es-DO",{weekday:"long",day:"numeric",month:"long"});
const toH = t=>{ const [h,m]=t.split(":").map(Number); return h+m/60; };
const mins = c=>Math.round((toH(c.fin)-toH(c.inicio))*60);
function range(c){
  const a=NB.fmtH(toH(c.inicio)), b=NB.fmtH(toH(c.fin));
  return a.slice(-2)===b.slice(-2) ? `${a.slice(0,-3)} – ${b}` : `${a} – ${b}`;
}
function startOf(c,fecha){ const d=fromIso(fecha), [h,m]=c.inicio.split(":").map(Number); d.setHours(h,m,0,0); return d; }
function weekLabel(w){
  const a=dayDate(w,0), b=dayDate(w,6);
  const ma=a.toLocaleDateString("es-DO",{month:"long"}), mb=b.toLocaleDateString("es-DO",{month:"long"});
  return ma===mb ? `${a.getDate()} – ${b.getDate()} de ${mb}` : `${a.getDate()} de ${ma} – ${b.getDate()} de ${mb}`;
}

/* ---------- Almacén de la demo (este navegador) ---------- */
function readStore(){
  let s=null; try{ s=JSON.parse(localStorage.getItem(KEY)); }catch(e){}
  s=s||{};
  return {reservas:Array.isArray(s.reservas)?s.reservas:[], espera:Array.isArray(s.espera)?s.espera:[], aprobados:Array.isArray(s.aprobados)?s.aprobados:[]};
}
let store=readStore();
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(store)); }catch(e){} }
const uid = ()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);

/* ---------- Cambios del panel del negocio ----------
   Precios, cupos, sala, próximos eventos, clases canceladas y aviso. Lo que
   no se cambió en el panel sale de los JSON (bale.json → canceladas y aviso). */
function applyPanel(){
  const P=NB.panel.read(), pr=D.precios, num=v=>typeof v==="number"&&isFinite(v)&&v>=0;
  pr.individual.items.concat(pr.membresia.items).forEach(it=>{ if(num(P.precios[it.id])) it.precio=P.precios[it.id]; });
  if(num(P.precios["inf-inscripcion"])) pr.infantil.inscripcion=P.precios["inf-inscripcion"];
  if(num(P.precios["inf-mensualidad"])) pr.infantil.mensualidad=P.precios["inf-mensualidad"];
  pr.infantil.accesorios.forEach((a,i)=>{ if(num(P.precios["acc-"+i])) a.precio=P.precios["acc-"+i]; });
  // Un cupo puesto en el panel lo da el estudio: deja de ser "por confirmar"
  Object.entries(P.cupos).forEach(([k,v])=>{ if(+v>0){ D.cupos[k]=+v; if(D.cupos.nota) D.cupos.nota[k]=""; } });
  if(P.sala&&+P.sala.filas>0&&+P.sala.por_fila>0){ D.sala.filas=+P.sala.filas; D.sala.por_fila=+P.sala.por_fila; }
  if(P.eventos) D.comunidad.proximos=P.eventos;
  D.canceladas=new Set(P.canceladas||D.canceladas||[]);
  D.aviso=P.aviso!=null?P.aviso:(D.aviso||"");
}
const isCancel = (c,fecha)=>D.canceladas.has(occKey(c,fecha));

/* ---------- Sala: filas × lugares (bale.json → sala) ---------- */
function buildLugares(){
  const S=D.sala, out=[];
  for(let f=1;f<=S.filas;f++) for(let i=1;i<=S.por_fila;i++) out.push({n:(f-1)*S.por_fila+i, fila:f, col:i});
  S.lugares=out;
}

/* ---------- Ocupación de cada clase en una fecha ---------- */
const occKey = (c,fecha)=>`${c.id}@${fecha}`;
const clsById = id=>D.horario.find(c=>c.id===id);
// Clases de barra: lugar concreto en la sala. Las demás: cupo por número (bale.json → cupos)
const isBarra = c=>D.barra_tipos.includes(c.clase);
const cap = c=>isBarra(c) ? D.sala.lugares.length : (+D.cupos[c.clase]||12);
const cupoNota = c=>{ const n=D.cupos.nota||{}; return c.clase in n ? n[c.clase] : "Cupo por confirmar"; };
function demoSeats(c){ const v=D.demo.ocupados[c.id]; return Array.isArray(v)?v.filter(n=>n<=D.sala.lugares.length):[]; }
const demoCount = c=>{ const v=D.demo.ocupados[c.id]; return Array.isArray(v)?v.length:Math.min(+v||0,cap(c)); };
function taken(c,fecha){
  const k=occKey(c,fecha), s=new Set(demoSeats(c));
  store.reservas.forEach(r=>{ if(r.occ===k) s.add(r.lugar); });
  return s;
}
const webRes = (c,fecha)=>store.reservas.filter(r=>r.occ===occKey(c,fecha));
const used = (c,fecha)=>isBarra(c) ? taken(c,fecha).size : demoCount(c)+webRes(c,fecha).length;
const free = (c,fecha)=>cap(c)-used(c,fecha);
const waitlist = (c,fecha)=>store.espera.filter(e=>e.occ===occKey(c,fecha));
const isBallet = c=>/ballet/i.test(c.clase);
const initials = n=>n.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join("").toUpperCase();
const instInfo = n=>D.instructoras.find(i=>i.nombre===n)||{nombre:n,rol:"Instructora"};
const clsName = c=>c.clase;
const tagOf = c=>c.etiqueta?D.etiquetas[c.etiqueta]:null;
const tagTxt = c=>{ const t=tagOf(c); return t?t.texto:""; };
const lugarOf = n=>D.sala.lugares.find(l=>l.n===n);
const lugarTxt = L=>`Lugar ${L.n}, fila ${L.fila}`;
const seatTxt = r=>{ const L=r.lugar&&lugarOf(r.lugar); return L?lugarTxt(L):"Sin lugar fijo (cupo por número)"; };
const digits = s=>String(s||"").replace(/\D/g,"");
const fmtWa = s=>{ const d=digits(s).replace(/^1(?=\d{10}$)/,""); return d.length===10?`${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`:s; };
const imgTag = (f,sizes,w,h,extra="")=>`<img src="${esc(f.src||f.foto)}" srcset="${esc(NB.srcset(f.src||f.foto))}" sizes="${sizes}" alt="${esc(f.alt)}" width="${w}" height="${h}" loading="lazy" decoding="async"${extra}>`;

// Lista de alumnas de una clase: las de ejemplo más las reservas de este navegador.
function roster(c,fecha){
  const cl=D.demo.clientes;
  const off=parseInt(c.inicio,10)+c.dia.length;
  const person=(i,lugar)=>{ const p=cl[(i+off)%cl.length];
    return {lugar, nombre:isBallet(c)?`Alumna de ejemplo ${i+1}`:p.nombre, tutor:isBallet(c)?p.nombre:"", wa:p.whatsapp, demo:true}; };
  const demo=isBarra(c) ? demoSeats(c).map((n,i)=>person(i,n)) : Array.from({length:demoCount(c)},(_,i)=>person(i,null));
  const web=webRes(c,fecha).map(r=>({lugar:r.lugar||null, nombre:r.nina||r.nombre, tutor:r.nina?r.nombre:"", wa:r.wa, pago:r.pago, id:r.id}));
  const all=demo.concat(web);
  if(isBarra(c)) all.sort((a,b)=>a.lugar-b.lugar);
  return all.map((r,i)=>Object.assign(r,{pos:r.lugar||i+1}));
}

/* =========================================================
   PÁGINA PÚBLICA
   ========================================================= */
function renderStatic(){
  $("#historia").innerHTML=D.historia.map(p=>`<p>${esc(p)}</p>`).join("");
  $("#queBarre").textContent=D.que_es_barre;

  // Clases: una tarjeta por tipo
  $("#ctypes").innerHTML=D.clases.map((t,i)=>{
    const list=D.horario.filter(c=>t.tipos.includes(c.clase));
    const tags=[...new Set(list.map(c=>c.etiqueta).filter(Boolean))].map(k=>D.etiquetas[k]).filter(x=>x.destacado);
    const ph=t.fotos.length
      ? `<div class="phs n${Math.min(t.fotos.length,2)}">${t.fotos.slice(0,2).map(f=>imgTag(f,"(max-width:700px) 50vw, 220px",1200,1500)).join("")}</div>`
      : `<div class="phs none"><span class="pending-mark">Foto por confirmar</span></div>`;
    return `<article class="ctype" data-reveal style="--r:${i%3}">
      ${ph}
      <div class="ct">
        <span class="b-kick">${esc(t.grupo)}</span>
        <h3>${esc(t.tipo)}</h3>
        ${tags.map(x=>`<span class="badge">${esc(x.destacado)}</span>`).join("")}
        ${t.texto?`<p>${esc(t.texto)}</p>`:""}
        ${t.edades?`<ul class="ages" aria-label="Grupos por edad">${t.edades.map(a=>`<li>${esc(a)}</li>`).join("")}</ul>`:""}
        <p class="meta"><span>${esc(t.dias)}</span></p>
        <a class="more" href="#horario" data-type="${esc(t.tipos.join("|"))}">Ver horario <span aria-hidden="true">→</span></a>
      </div>
    </article>`;
  }).join("");

  // Nuevo espacio de Reformer
  const R=D.reformer, rf=D.horario.filter(c=>c.clase==="Pilates Reformer");
  $("#refTitle").textContent=R.titulo;
  $("#refText").textContent=R.texto;
  $("#refMeta").innerHTML=`<span>Viernes · ${rf.map(c=>NB.fmtH(toH(c.inicio)).replace(":00","")).join(", ")}</span><span>Cupo: ${cap(rf[0]||{clase:"Pilates Reformer"})} máquinas${cupoNota({clase:"Pilates Reformer"})?` <small>(${esc(cupoNota({clase:"Pilates Reformer"}).toLowerCase())})</small>`:""}</span>`;
  $("#refBtn").textContent=R.boton;
  $("#refPh").innerHTML=R.fotos.map((f,i)=>imgTag(f,i?"(max-width:700px) 45vw, 240px":"(max-width:700px) 92vw, 520px",1200,1500,i?"":' class="big"')).join("");

  renderPrices();

  // Equipo: la foto es lo principal de la tarjeta; mientras llega, iniciales
  $("#eqText").textContent=D.equipo_texto;
  $("#team").innerHTML=D.instructoras.map((p,i)=>{
    const full=p.completo||p.nombre;
    return `<article class="member" data-reveal style="--r:${i%4}">
      <div class="mph">${p.foto?`<img src="${esc(p.foto)}" alt="${esc(full)}, ${esc(p.rol.toLowerCase())} de balé" width="600" height="750" loading="lazy" decoding="async">`:`<span class="ini" aria-hidden="true">${esc(initials(full))}</span><span class="soonph">Foto próximamente</span>`}</div>
      <div class="mtx"><h3>${esc(full)}</h3>${p.completo&&!p.completo.startsWith(p.nombre)?`<p class="nick">«${esc(p.nombre)}»</p>`:""}
      <p class="role">${esc(p.rol)}</p>
      <p class="types">${esc(p.clases)}</p>
      ${p.bio?`<p class="mbio" id="bio-${i}">${esc(p.bio)}</p><button class="biomore" type="button" aria-expanded="false" aria-controls="bio-${i}" hidden>Leer más</button>`:""}</div>
    </article>`;
  }).join("");
  // Bio: 4 líneas y "Leer más" solo si el texto no cabe
  document.querySelectorAll("#team .mbio").forEach(b=>{
    const btn=b.nextElementSibling;
    b.classList.add("clamp");
    if(b.scrollHeight<=b.clientHeight+2){ b.classList.remove("clamp"); return; }
    btn.hidden=false;
    btn.addEventListener("click",()=>{
      const open=btn.getAttribute("aria-expanded")==="true";
      b.classList.toggle("clamp",open);
      btn.setAttribute("aria-expanded",String(!open));
      btn.textContent=open?"Leer más":"Leer menos";
    });
  });

  renderCommunity();

  // Preguntas frecuentes
  $("#faqList").innerHTML=D.faq.map((q,i)=>`<details data-reveal style="--r:${i%3}"><summary>${esc(q.p)}</summary>
    <div><p>${esc(q.r)}</p>${q.pendiente?`<span class="pending-mark">${esc(q.pendiente)}</span>`:""}</div></details>`).join("");

  // Aviso para las clientas (panel del negocio)
  const av=$("#aviso"); av.hidden=!D.aviso; av.textContent=D.aviso||"";

  // Ubicación y contacto (data/config.json)
  $("#where").textContent=CFG.ubicacion;
  $("#addr").textContent=CFG.direccion;
  $("#mapsBtn").href=CFG.maps;
  $("#waBtn").href=NB.waLink("Hola, balé. Quisiera información sobre las clases.");
  $("#waBtn").textContent=`WhatsApp ${CFG.whatsapp_texto}`;
  $("#igBtn").href=CFG.instagram;
  $("#igBtn").textContent=`Instagram ${CFG.instagram_usuario}`;
  $("#polTxt").textContent=CFG.cancelacion.texto;
  $("#payLine").textContent=`Pago: ${CFG.pago.texto}.`;
}

/* ---------- Precios: individual, membresía e infantil ---------- */
function renderPrices(){
  const P=D.precios, m=NB.money;
  $("#payTxt").textContent=`Pago por ${CFG.pago.texto.charAt(0).toLowerCase()+CFG.pago.texto.slice(1)}.`;
  const I=P.individual, M=P.membresia, K=P.infantil, G=P.regalo;
  $("#prices").innerHTML=`
    <article class="pblock" data-reveal>
      <span class="b-kick">${esc(I.nota)}</span><h3>${esc(I.titulo)}</h3>
      <ul class="plist">${I.items.map(it=>`<li><span class="pn">${esc(it.nombre)}</span><b>${esc(m(it.precio))}</b>
        <button class="bbtn line sm" type="button" data-book-type="${esc(it.tipo)}" aria-label="Reservar una clase de ${esc(it.nombre)}">Reservar</button></li>`).join("")}</ul>
    </article>
    <article class="pblock mem" data-reveal style="--r:1">
      <span class="b-kick">${esc(M.nota)}</span><h3>${esc(M.titulo)}</h3>
      <ul class="plist">${M.items.map(it=>`<li class="${it.destacado?"star":""}"><span class="pn">${esc(it.nombre)}<small>${esc(it.detalle)}</small></span><b>${esc(m(it.precio))}</b>
        <button class="bbtn ${it.destacado?"hot":"solid"} sm" type="button" data-pack="${esc(it.id)}" aria-label="Lo quiero: ${esc(it.nombre)}, ${esc(it.detalle)}">Lo quiero</button></li>`).join("")}</ul>
    </article>
    <article class="pblock kid" data-reveal style="--r:2">
      <span class="b-kick">${esc(K.edades)}</span><h3>${esc(K.titulo)}</h3>
      <p class="kname">${esc(K.nombre)}</p>
      <ul class="plist"><li><span class="pn">Inscripción</span><b>${esc(m(K.inscripcion))}</b></li><li><span class="pn">Mensualidad</span><b>${esc(m(K.mensualidad))}</b></li></ul>
      <button class="bbtn solid" type="button" id="kidBtn">Inscribir a mi hija</button>
      <h4>${esc(K.accesorios_titulo)}</h4>
      <ul class="plist acc">${K.accesorios.map(a=>`<li><span class="pn">${esc(a.nombre)}</span><b>${esc(m(a.precio))}</b></li>`).join("")}</ul>
    </article>`;
  $("#gift").innerHTML=`
    <div class="gcard" aria-hidden="true"><img src="img/bale-logo-transparente.webp" alt="" width="1040" height="538"><span>Certificado de regalo</span><i></i></div>
    <div class="gtx"><span class="b-kick">Certificado de regalo</span><h3 id="giftTitle">${esc(G.titulo)}</h3><p>${esc(G.texto)}</p>
    <button class="bbtn hot" type="button" id="giftBtn">${esc(G.boton)}</button></div>`;
}
function packLabel(it){ return it.detalle&&it.detalle.length<45 ? `${it.nombre}, ${it.detalle}` : it.nombre; }

/* ---------- Comunidad: próximos eventos (con fecha) y momentos ---------- */
function renderCommunity(){
  const C=D.comunidad, hoy=iso(new Date());
  const next=(C.proximos||[]).filter(e=>e.fecha>=hoy).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  $("#soon").hidden=!next.length;
  $("#soon").innerHTML=next.map(e=>{
    const d=fromIso(e.fecha), h=e.hora?NB.fmtH(toH(e.hora)):"";
    return `<article class="event" data-reveal>
      <div class="edate" aria-hidden="true"><b>${d.getDate()}</b><span>${esc(d.toLocaleDateString("es-DO",{month:"short"}).replace(".",""))}</span></div>
      <div class="etx"><span class="b-kick">Próximo evento</span><h3>${esc(e.titulo)}</h3>
      <p class="emeta">${esc(fmtDay(d))}${h?` · ${esc(h)}`:""}${e.precio!=null?` · ${esc(NB.money(e.precio))}`:""}</p>
      <p>${esc(e.texto)}</p></div>
      ${e.mensaje?`<button class="bbtn hot" type="button" data-wa="${esc(e.mensaje)}">${esc(e.boton||"Reservar por WhatsApp")}</button>`:""}
    </article>`;
  }).join("");
  $("#comu").innerHTML=(C.momentos||[]).map((k,i)=>`<article class="ccard" data-reveal style="--r:${i%2}">
      ${k.foto?`<figure>${imgTag({src:k.foto,alt:k.alt},"(max-width:700px) 90vw, 260px",1200,1500)}</figure>`:""}
      <div><span class="b-kick">${esc(k.kick)}${k.fecha_texto?` · ${esc(k.fecha_texto)}`:""}</span><h3>${esc(k.titulo)}</h3><p>${esc(k.texto)}</p>
      ${k.mensaje?`<button class="bbtn line" type="button" data-wa="${esc(k.mensaje)}">${esc(k.boton)}</button>`:""}</div>
    </article>`).join("");
}

/* ---------- Horario: tira de días, filtros y filas ---------- */
const matches = c=>(!fInst||c.instructora===fInst)&&(!fType||fType.split("|").includes(c.clase));
const dayClasses = i=>D.horario.filter(c=>c.dia===DKEYS[i]&&matches(c)).sort((a,b)=>toH(a.inicio)-toH(b.inicio));

function renderFilters(){
  const insts=D.instructoras.map(i=>i.nombre).filter(n=>D.horario.some(c=>c.instructora===n));
  $("#fInst").innerHTML=`<option value="">Todas</option>`+insts.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");
  $("#fType").innerHTML=`<option value="">Todas</option>`+D.clases.map(t=>`<option value="${esc(t.tipos.join("|"))}">${esc(t.tipo)}</option>`).join("");
}
function setType(v){
  fType=v; const sel=$("#fType");
  if(![...sel.options].some(o=>o.value===v)) sel.insertAdjacentHTML("beforeend",`<option value="${esc(v)}">${esc(v.split("|").join(", "))}</option>`);
  sel.value=v;
}

function renderWeek(){
  $("#wLabel").textContent=weekLabel(week);
  $("#prevW").disabled=week<=0;
  $("#nextW").disabled=week>=WEEKS_AHEAD;
  const t=todayIx();
  $("#strip").innerHTML=DSHORT.map((s,i)=>{
    const d=dayDate(week,i), n=dayClasses(i).length, hoy=week===0&&i===t, past=week===0&&i<t;
    return `<button type="button" class="dbtn ${hoy?"hoy":""} ${past?"past":""}" data-d="${i}" aria-pressed="${i===dayIx}">
      <span class="dw" aria-hidden="true">${hoy?"Hoy":s}</span><span class="dn" aria-hidden="true">${d.getDate()}</span><i class="${n?"has":""}"></i><span class="sr-only">${esc(fmtDay(d))}${hoy?", hoy":""}: ${n?`${n} ${n===1?"clase":"clases"}`:"sin clases"}</span></button>`;
  }).join("");
  renderRows();
}

function rowState(c,fecha){
  if(isCancel(c,fecha)) return "cancel";
  if(startOf(c,fecha)<new Date()) return "past";
  return free(c,fecha)>0 ? "open" : "full";
}

function renderRows(){
  const d=dayDate(week,dayIx), fecha=iso(d), list=dayClasses(dayIx);
  const hoy=week===0&&dayIx===todayIx();
  $("#dTitle").textContent=(hoy?"Hoy, ":"")+fmtDay(d);
  if(!list.length){
    let next="";
    for(let k=1;k<=7&&!next;k++){ const j=(dayIx+k)%7; if(dayClasses(j).length) next=DSHORT[j]; }
    const why=DKEYS[dayIx]==="domingo"&&!fInst&&!fType ? "Los domingos no hay clases." : "No hay clases con estos filtros este día.";
    $("#rows").innerHTML=`<li class="empty-state">${why}${next?` Prueba el ${esc(next.toLowerCase())}.`:" Quita algún filtro."}</li>`;
    return;
  }
  $("#rows").innerHTML=list.map((c,n)=>{
    const st=rowState(c,fecha), libres=free(c,fecha), N=cap(c), w=waitlist(c,fecha).length, inst=instInfo(c.instructora), T=tagOf(c);
    const lbl=`${clsName(c)}, ${fmtDay(d)} a las ${NB.fmtH(toH(c.inicio))}`;
    let action;
    if(st==="cancel") action=`<span class="state full">Cancelada</span>`;
    else if(st==="past") action=`<span class="state">Finalizada</span>`;
    else if(st==="full") action=`<span class="state full">Llena</span><button class="rbtn line" type="button" data-wait="${c.id}" aria-label="Lista de espera: ${esc(lbl)}">Lista de espera</button>`;
    else action=`<button class="rbtn" type="button" data-book="${c.id}" aria-label="Reservar ${esc(lbl)}">Reservar</button>`;
    return `<li class="crow ${st}" style="--i:${n}">
      <div class="tm"><b>${esc(NB.fmtH(toH(c.inicio)))}</b><small>${mins(c)} min</small></div>
      <div class="cn">
        <h4>${esc(clsName(c))}</h4>
        ${T?(T.destacado?`<span class="badge">${esc(T.destacado)}</span><span class="note">${esc(T.texto)}</span>`:`<span class="badge soft">${esc(T.texto)}</span>`):""}
        ${c.edad?`<span class="note">${esc(c.edad)}</span>`:""}
        <span class="who">${inst.avatar?`<img class="ava" src="${esc(inst.avatar)}" alt="" width="26" height="26" loading="lazy" decoding="async">`:`<i class="ini sm" aria-hidden="true">${esc(initials(inst.completo||inst.nombre))}</i>`}${esc(c.instructora)}</span>
      </div>
      <div class="ac">
        <span class="cupo">${st==="past"||st==="cancel"?"":st==="full"?`0 de ${N} libres${w?` · ${w} en espera`:""}`:`<b>${libres}</b> de ${N} libres`}${(st==="open"||st==="full")&&!isBarra(c)&&cupoNota(c)?`<small class="tbc">${esc(cupoNota(c))}</small>`:""}</span>
        ${action}
      </div>
    </li>`;
  }).join("");
}

/* ---------- Esquema de la sala (SVG): espejo arriba y lugares en filas ---------- */
function salaSVG(set,mine,interactive){
  const S=D.sala, W=S.por_fila*44+16, Hh=S.filas*50+44;
  const marks=S.lugares.map(l=>{
    const st=l.n===mine?"mine":set.has(l.n)?"busy":"free", x=8+22+(l.col-1)*44, y=44+12+(l.fila-1)*50;
    return `<g class="mk ${st}" ${interactive&&st==="free"?`data-n="${l.n}"`:""}><line x1="${x-14}" y1="${y-15}" x2="${x+14}" y2="${y-15}"/><circle cx="${x}" cy="${y+4}" r="15"/><text x="${x}" y="${y+9}">${l.n}</text></g>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${Hh}" role="presentation"><rect class="mirror" x="8" y="6" width="${W-16}" height="16" rx="4"/><text class="mtxt" x="${W/2}" y="18">ESPEJO</text>${marks}</svg>`;
}

/* ---------- Reserva (diálogo) ---------- */
const bk={c:null, fecha:"", lugar:null, wait:false, last:null};
const dlg=$("#book");

function openBook(c,fecha,wait){
  Object.assign(bk,{c,fecha,lugar:null,wait,last:null});
  const d=fromIso(fecha), T=tagOf(c);
  $("#bkKick").textContent=wait?"Lista de espera":"Reservar";
  $("#bkTitle").textContent=clsName(c)+(c.edad?` · ${c.edad}`:"");
  $("#bkMeta").textContent=`${fmtDay(d)} · ${range(c)} · con ${c.instructora}`;
  const warn=$("#bkWarn");
  warn.hidden=!T; warn.className="bkwarn"+(T&&T.destacado?" good":"");
  if(T) warn.textContent=T.destacado?`${T.destacado}: ${T.texto.toLowerCase()}.`:T.aviso;
  $("#stDatos").reset();
  const kid=isBallet(c);
  $("#kids").hidden=!kid;
  $("#nameWrap").hidden=kid;
  $("#waLbl").textContent=kid?"WhatsApp del padre, la madre o el tutor":"WhatsApp";
  $("#memWrap").hidden=!(T&&T.confirmar);
  if(T&&T.confirmar) $("#memTxt").textContent=T.confirmar;
  $("#payLine").hidden=wait;
  const barra=isBarra(c), direct=wait||!barra;
  $("#datosH").textContent=wait?"Tus datos para la lista de espera":barra?"2. Tus datos":"Tus datos";
  $("#confirmBtn").textContent=wait?"Unirme a la lista de espera":"Confirmar y enviar por WhatsApp";
  $("#backLugar").hidden=direct;
  const ci=$("#cupoInfo");
  ci.hidden=wait||barra;
  if(!ci.hidden){ const n=free(c,fecha); ci.textContent=`Esta clase no tiene lugar fijo: quedan ${n} de ${cap(c)} ${n===1?"cupo":"cupos"}${cupoNota(c)?` (${cupoNota(c).toLowerCase()})`:""}.`; }
  if(direct) show("stDatos"); else { renderSeats(); show("stLugar"); }
  dlg.showModal();
  const first=direct?(kid?$("#kName"):$("#fName")):$("#seats button:not(:disabled)");
  if(first) first.focus();
}
function show(id){
  ["stLugar","stDatos","stListo"].forEach(s=>{ $("#"+s).hidden=s!==id; });
  dlg.querySelector(".bk").scrollTop=0;
}
function renderSeats(){
  const set=taken(bk.c,bk.fecha), S=D.sala;
  $("#sala").innerHTML=salaSVG(set,bk.lugar,true);
  const f=$("#salaFoto"); if(!f.src){ f.src=S.foto; f.srcset=NB.srcset(S.foto); f.sizes="200px"; f.alt=S.alt; }
  $("#salaNota").textContent=S.nota;
  let html="";
  for(let r=1;r<=S.filas;r++){
    const name=`Fila ${r}`;
    html+=`<div class="srow" role="group" aria-label="${name}"><span class="bar">${name}${r===1?" (junto al espejo)":""}</span><div style="--n:${S.por_fila}">${
      S.lugares.filter(l=>l.fila===r).map(l=>{
        const busy=set.has(l.n), mine=l.n===bk.lugar;
        return `<button type="button" class="seat ${busy?"busy":""}" data-n="${l.n}" ${busy?"disabled":""} aria-pressed="${mine}" aria-label="Lugar ${l.n}, ${name}${busy?", ocupado":mine?", elegido":", libre"}">${l.n}</button>`;
      }).join("")}</div></div>`;
  }
  $("#seats").innerHTML=html;
  const L=lugarOf(bk.lugar);
  $("#pick").textContent=L?`Elegiste el ${lugarTxt(L).toLowerCase()}.`:`${cap(bk.c)-set.size} de ${cap(bk.c)} lugares libres. Toca uno.`;
  $("#toDatos").disabled=!L;
}
function pickSeat(n){
  bk.lugar=n; renderSeats();
  const b=$(`#seats [data-n="${n}"]`); if(b) b.focus();
}

function invalid(el,msg){ el.setAttribute("aria-invalid","true"); NB.toast(msg); el.focus(); return false; }
function validate(){
  dlg.querySelectorAll("[aria-invalid]").forEach(e=>e.removeAttribute("aria-invalid"));
  const kid=isBallet(bk.c);
  if(kid){
    if(!$("#kName").value.trim()) return invalid($("#kName"),"Escribe el nombre de la niña.");
    if(!$("#gName").value.trim()) return invalid($("#gName"),"Escribe el nombre del padre, la madre o el tutor.");
  }else if(!$("#fName").value.trim()) return invalid($("#fName"),"Escribe tu nombre.");
  const wa=digits($("#fWa").value);
  if(wa.length<10||wa.length>11) return invalid($("#fWa"),"Escribe un WhatsApp de 10 dígitos, por ejemplo 809-000-0000.");
  if(!$("#memWrap").hidden&&!$("#fMem").checked) return invalid($("#fMem"),"Esta clase es exclusiva para miembros: confirma que tienes una membresía activa.");
  if(!$("#fPol").checked) return invalid($("#fPol"),"Acepta la política de cancelación para continuar.");
  return true;
}

function submit(e){
  e.preventDefault();
  if(!validate()) return;
  store=readStore(); prune();              // por si otra pestaña reservó mientras tanto
  const c=bk.c, kid=isBallet(c);
  const base={id:uid(), occ:occKey(c,bk.fecha), claseId:c.id, fecha:bk.fecha,
    nombre:(kid?$("#gName"):$("#fName")).value.trim(), wa:fmtWa($("#fWa").value.trim()),
    nina:kid?$("#kName").value.trim():"", creada:new Date().toISOString()};
  if(store.reservas.some(r=>r.occ===base.occ&&digits(r.wa)===digits(base.wa)&&(r.nina||"")===base.nina)){
    NB.toast("Ya hay una reserva con ese WhatsApp en esta clase."); return;
  }
  if(bk.wait){
    if(free(c,bk.fecha)>0){ NB.toast("¡Se liberó un lugar! Ya puedes reservarlo."); dlg.close(); renderWeek(); return; }
    store.espera.push(base); save();
    bk.last=Object.assign({pos:waitlist(c,bk.fecha).length},base);
  }else{
    if(isBarra(c)&&taken(c,bk.fecha).has(bk.lugar)){ NB.toast("Ese lugar se acaba de ocupar. Elige otro."); renderSeats(); show("stLugar"); return; }
    if(!isBarra(c)&&free(c,bk.fecha)<=0){ NB.toast("La clase se acaba de llenar. Puedes unirte a la lista de espera."); dlg.close(); renderWeek(); return; }
    const r=Object.assign(base,{lugar:isBarra(c)?bk.lugar:null, pago:"por confirmar", metodo:"Transferencia"});
    store.reservas.push(r); save();
    bk.last=r;
  }
  // 1) WhatsApp de balé con la reserva completa (dentro del clic: no lo bloquea el navegador)
  NB.whatsapp(waMessage());
  renderDone();
  // 2) Aviso al estudio por correo (si falla, la reserva sigue por WhatsApp)
  if(!bk.wait) sendMail(bk.last,c); else $("#mailSt").textContent="";
  renderWeek();
}

function summary(r,c){
  const wait=r.pos!=null;
  return [["Clase",clsName(c)+(c.edad?` (${c.edad})`:"")+(tagTxt(c)?` · ${tagTxt(c)}`:"")],["Fecha",fmtDay(fromIso(r.fecha))],["Hora",range(c)],
    ["Instructora",c.instructora],wait?["Lista de espera",`Posición ${r.pos}`]:["Lugar",seatTxt(r)],
    r.nina?["Alumna",r.nina]:null,[r.nina?"Padre, madre o tutor":"Nombre",r.nombre],["WhatsApp",r.wa],
    wait?null:["Pago",CFG.pago.texto]].filter(Boolean);
}
function renderDone(){
  const r=bk.last, c=bk.c;
  $("#okTitle").textContent=bk.wait?"Estás en la lista de espera":"¡Reserva enviada!";
  $("#okMsg").textContent=bk.wait?"Te escribimos por WhatsApp si se libera un lugar."
    :"Se abrió WhatsApp con tu reserva: envía el mensaje y el estudio te la confirma. Si no se abrió, usa el botón de abajo.";
  $("#sum").innerHTML=summary(r,c).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")+
    (bk.wait?"":`<div class="pol"><dt>Cancelación</dt><dd>${esc(CFG.cancelacion.texto)}</dd></div>`);
  $("#sendWa").textContent=bk.wait?"Avisar por WhatsApp":"Enviar la reserva por WhatsApp";
  $("#icsMine").hidden=bk.wait;
  $("#mailSt").textContent=bk.wait?"":"Avisando al estudio por correo…"; $("#mailSt").className="mailst";
  show("stListo"); $("#stListo").focus();
}
function waMessage(){
  const r=bk.last, c=bk.c;
  const head=bk.wait?"Hola, balé. Me anoté en la lista de espera:":"Hola, balé. Quiero reservar esta clase:";
  return head+"\n"+summary(r,c).map(([k,v])=>`${k}: ${v}`).join("\n")+(bk.wait?"":`\n\n${CFG.cancelacion.texto}`);
}

/* ---------- Aviso por correo (FormSubmit) ---------- */
function sendMail(r,c){
  const st=$("#mailSt"), A=CFG.aviso_correo;
  const fail=()=>{ st.textContent="No pudimos avisar al estudio por correo. Tu reserva sigue por WhatsApp: asegúrate de enviar el mensaje."; st.className="mailst fail"; };
  if(!A||!A.endpoint||!window.fetch){ fail(); return; }
  const body={_subject:`Nueva reserva · ${clsName(c)} ${fmtDay(fromIso(r.fecha))} ${NB.fmtH(toH(c.inicio))}`,_template:"table",_captcha:"false"};
  summary(r,c).forEach(([k,v])=>{ body[k]=v; });
  body["Cancelación"]=CFG.cancelacion.texto;
  const ctl=window.AbortController?new AbortController():null, t=setTimeout(()=>ctl&&ctl.abort(),12000);
  fetch(A.endpoint,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(body),signal:ctl?ctl.signal:undefined})
    .then(res=>res.json()).then(j=>{
      clearTimeout(t);
      if(String(j.success)==="true"){ st.textContent="El estudio también recibió un aviso por correo."; st.className="mailst sent"; }
      else fail();
    }).catch(()=>{ clearTimeout(t); fail(); });
}

/* ---------- Calendario .ics ---------- */
// Texto iCalendar: escapa y pliega líneas a 75 octetos (RFC 5545)
const icsEsc = s=>String(s).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");
function fold(line){
  const enc=new TextEncoder(); let out="", cur="", n=0;
  for(const ch of line){
    const b=enc.encode(ch).length;
    if(n+b>(out?74:75)){ out+=(out?"\r\n ":"")+cur; cur=""; n=0; }
    cur+=ch; n+=b;
  }
  return out+(out?"\r\n ":"")+cur;
}
const utc = d=>new Date(d.getTime()).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
const localStamp = (fecha,t)=>fecha.replace(/-/g,"")+"T"+t.replace(":","")+"00";
// La Vega usa UTC−4 todo el año (sin horario de verano)
const VTZ=["BEGIN:VTIMEZONE","TZID:America/Santo_Domingo","BEGIN:STANDARD","DTSTART:19700101T000000","TZOFFSETFROM:-0400","TZOFFSETTO:-0400","TZNAME:AST","END:STANDARD","END:VTIMEZONE"];
function icsFile(name,events){
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//bale//Reservas//ES","CALSCALE:GREGORIAN","METHOD:PUBLISH",`X-WR-CALNAME:${icsEsc(name)}`,"X-WR-TIMEZONE:America/Santo_Domingo"].concat(VTZ);
  const now=utc(new Date());
  events.forEach(ev=>lines.push("BEGIN:VEVENT",`UID:${ev.uid}`,`DTSTAMP:${now}`,
    `DTSTART;TZID=America/Santo_Domingo:${localStamp(ev.fecha,ev.c.inicio)}`,`DTEND;TZID=America/Santo_Domingo:${localStamp(ev.fecha,ev.c.fin)}`,
    `SUMMARY:${icsEsc(ev.summary)}`,`DESCRIPTION:${icsEsc(ev.desc)}`,`LOCATION:${icsEsc(`balé, ${CFG.direccion}`)}`,"END:VEVENT"));
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n")+"\r\n";
}
function download(text,file){
  const blob=new Blob([text],{type:"text/calendar;charset=utf-8"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download=file;
  document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function myIcs(){
  const r=bk.last, c=bk.c; if(!r||bk.wait) return;
  const desc=`Clase de ${clsName(c)} con ${c.instructora}.\n${seatTxt(r)}.\n\n${CFG.cancelacion.texto}\nPara cancelar, escríbenos por WhatsApp: ${CFG.whatsapp_texto}.`;
  download(icsFile("balé",[{uid:`${r.id}@bale`,fecha:r.fecha,c,summary:`balé · ${clsName(c)}`,desc}]),`bale-${c.id}-${r.fecha}.ics`);
}

/* ---------- Portada: video vertical en el teléfono, horizontal en el escritorio ----------
   Sin autoplay en el HTML: el video solo se carga y se reproduce si el usuario no pidió
   reducir el movimiento; en ese caso se queda el póster. Se pausa fuera de la pantalla. */
function initHero(){
  const v=$("#heroVid"); if(!v) return;
  const wide=matchMedia("(min-aspect-ratio:4/5)"), calm=matchMedia("(prefers-reduced-motion: reduce)");
  let visible=true;
  const play=()=>{ const p=v.play(); if(p&&p.catch) p.catch(()=>{}); };
  const pick=()=>{
    const k=wide.matches?"horizontal":"vertical";
    v.poster=`video/bale-hero-${k}-poster.webp`;
    if(calm.matches){ v.pause(); if(v.dataset.src){ delete v.dataset.src; v.removeAttribute("src"); v.load(); } v.classList.remove("on"); return; }
    const src=`video/bale-hero-${k}.mp4`;
    if(v.dataset.src!==src){ v.dataset.src=src; v.src=src; }
    if(visible) play();
  };
  v.addEventListener("playing",()=>v.classList.add("on"));
  [wide,calm].forEach(m=>m.addEventListener?m.addEventListener("change",pick):m.addListener(pick));
  if("IntersectionObserver" in window) new IntersectionObserver(([e])=>{
    visible=e.isIntersecting;
    if(!visible) v.pause(); else if(v.dataset.src) play();
  }).observe(v);
  pick();
}

// Lleva el horario al primer día (desde hoy) con una clase que cumpla "test"
function goToClass(test,type){
  fInst=""; $("#fInst").value=""; setType(type||"");
  const now=new Date();
  search: for(let w=0;w<=WEEKS_AHEAD;w++) for(let i=0;i<7;i++){
    if(D.horario.some(c=>test(c)&&c.dia===DKEYS[i]&&startOf(c,iso(dayDate(w,i)))>now)){ week=w; dayIx=i; break search; }
  }
  renderWeek();
}
function scrollToHorario(){ $("#horario").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}); }

function initPublic(){
  renderStatic(); renderFilters(); renderWeek(); initHero();
  // "Reserva tu primera clase": va al próximo sábado de primera clase
  $("#firstBtn").addEventListener("click",()=>goToClass(c=>c.etiqueta==="primera"));
  $("#refBtn").addEventListener("click",()=>{ goToClass(c=>c.clase==="Pilates Reformer","Pilates Reformer"); scrollToHorario(); });
  $("#prevW").addEventListener("click",()=>{ if(week>0){ week--; dayIx=week===0?todayIx():0; renderWeek(); } });
  $("#nextW").addEventListener("click",()=>{ if(week<WEEKS_AHEAD){ week++; dayIx=0; renderWeek(); } });
  $("#strip").addEventListener("click",e=>{ const b=e.target.closest("[data-d]"); if(!b) return; dayIx=+b.dataset.d; renderWeek(); $(`#strip [data-d="${dayIx}"]`).focus(); });
  $("#fInst").addEventListener("change",e=>{ fInst=e.target.value; renderWeek(); });
  $("#fType").addEventListener("change",e=>{ fType=e.target.value; renderWeek(); });
  $("#rows").addEventListener("click",e=>{
    const b=e.target.closest("[data-book],[data-wait]"); if(!b) return;
    const c=clsById(b.dataset.book||b.dataset.wait), fecha=iso(dayDate(week,dayIx));
    if(rowState(c,fecha)==="past"||rowState(c,fecha)==="cancel"){ renderRows(); return; }
    openBook(c,fecha,!!b.dataset.wait);
  });
  // "Ver horario" desde una tarjeta de clase: filtra por ese tipo y va al primer día con clase
  $("#ctypes").addEventListener("click",e=>{
    const a=e.target.closest("[data-type]"); if(!a) return;
    const types=a.dataset.type.split("|");
    goToClass(c=>types.includes(c.clase),a.dataset.type);
  });
  // Precios
  $("#precios").addEventListener("click",e=>{
    const t=e.target.closest("[data-book-type]");
    if(t){ const types=t.dataset.bookType.split("|"); goToClass(c=>types.includes(c.clase),t.dataset.bookType); scrollToHorario(); return; }
    const b=e.target.closest("[data-pack]");
    if(b){ const it=D.precios.membresia.items.find(x=>x.id===b.dataset.pack);
      NB.whatsapp(`Hola, balé. Quiero ${packLabel(it)} (${NB.money(it.precio)}). ¿Cómo hago el pago?`); return; }
    if(e.target.closest("#kidBtn")){ const K=D.precios.infantil;
      NB.whatsapp(`Hola, balé. Quiero inscribir a mi hija en ${K.nombre} (inscripción ${NB.money(K.inscripcion)} y mensualidad ${NB.money(K.mensualidad)}). ¿Cómo hago el pago?`); return; }
    if(e.target.closest("#giftBtn")) NB.whatsapp(D.precios.regalo.mensaje);
  });
  // Comunidad: botones de WhatsApp
  $("#comunidad").addEventListener("click",e=>{ const b=e.target.closest("[data-wa]"); if(b) NB.whatsapp(b.dataset.wa); });

  // Diálogo
  $("#seats").addEventListener("click",e=>{ const b=e.target.closest("[data-n]"); if(b&&!b.disabled) pickSeat(+b.dataset.n); });
  $("#sala").addEventListener("click",e=>{ const m=e.target.closest("[data-n]"); if(m) pickSeat(+m.dataset.n); });
  $("#toDatos").addEventListener("click",()=>{ show("stDatos"); (isBallet(bk.c)?$("#kName"):$("#fName")).focus(); });
  $("#backLugar").addEventListener("click",()=>{ renderSeats(); show("stLugar"); const s=$(`#seats [aria-pressed="true"]`); if(s) s.focus(); });
  $("#stDatos").addEventListener("submit",submit);
  $("#stDatos").addEventListener("input",e=>e.target.removeAttribute("aria-invalid"));
  $("#sendWa").addEventListener("click",()=>NB.whatsapp(waMessage()));
  $("#icsMine").addEventListener("click",myIcs);
  $("#bkClose").addEventListener("click",()=>dlg.close());
  $("#bkDone").addEventListener("click",()=>dlg.close());
  dlg.addEventListener("click",e=>{ if(e.target===dlg) dlg.close(); });   // clic en el fondo
  let opener=null;
  dlg.addEventListener("close",()=>{ if(opener&&document.contains(opener)) opener.focus(); else { const f=$("#rows .rbtn"); if(f) f.focus(); } });
  document.addEventListener("click",e=>{ const b=e.target.closest("[data-book],[data-wait]"); if(b) opener=b; },true);

  // Menú interno: marca la sección visible
  const links=[...document.querySelectorAll(".bnav .pub a")];
  if("IntersectionObserver" in window){
    const io=new IntersectionObserver(es=>es.forEach(en=>{
      if(!en.isIntersecting) return;
      links.forEach(a=>a.classList.toggle("on",a.getAttribute("href")==="#"+en.target.id));
    }),{rootMargin:"-45% 0px -50% 0px"});
    links.forEach(a=>{ const s=$(a.getAttribute("href")); if(s) io.observe(s); });
  }
}

/* =========================================================
   VISTA DEL ESTUDIO (demo)
   ========================================================= */
function weekOccs(w,inst){
  const out=[];
  DKEYS.forEach((k,i)=>{
    const fecha=iso(dayDate(w,i));
    D.horario.filter(c=>c.dia===k&&(!inst||c.instructora===inst)).sort((a,b)=>toH(a.inicio)-toH(b.inicio))
      .forEach(c=>out.push({c,fecha,i}));
  });
  return out;
}

function renderVWeek(){
  $("#vLabel").textContent=weekLabel(vWeek);
  $("#vPrev").disabled=vWeek<=0; $("#vNext").disabled=vWeek>=WEEKS_AHEAD;
  const occs=weekOccs(vWeek,vInst);
  if(!vSel||!occs.some(o=>occKey(o.c,o.fecha)===vSel)){
    const now=new Date(), up=occs.find(o=>startOf(o.c,o.fecha)>now)||occs[0];
    vSel=up?occKey(up.c,up.fecha):null;
  }
  let lastDay=-1;
  $("#vList").innerHTML=occs.map(o=>{
    const k=occKey(o.c,o.fecha), n=used(o.c,o.fecha), N=cap(o.c), w=waitlist(o.c,o.fecha).length;
    const head=o.i!==lastDay?`<li class="vday">${esc(fmtDay(fromIso(o.fecha)))}</li>`:""; lastDay=o.i;
    return head+`<li><button type="button" class="vcls" data-occ="${k}" aria-pressed="${k===vSel}">
      <span class="t">${esc(NB.fmtH(toH(o.c.inicio)))}</span><span class="n">${esc(clsName(o.c))}<small>${esc(o.c.instructora)}</small></span>
      <span class="c ${n>=N||isCancel(o.c,o.fecha)?"full":""}">${isCancel(o.c,o.fecha)?"Cancelada":`${n}/${N}${w?` · ${w} en espera`:""}`}</span></button></li>`;
  }).join("")||`<li class="empty-state">Sin clases esta semana.</li>`;
  renderVDetail();
  renderCalPrev();
}

function renderVDetail(){
  const box=$("#vDetail");
  if(!vSel){ box.innerHTML=""; return; }
  const [id,fecha]=vSel.split("@"), c=clsById(id), list=roster(c,fecha), wl=waitlist(c,fecha), barra=isBarra(c);
  const extra=c.edad||tagTxt(c);
  box.innerHTML=`<h2>${esc(clsName(c))}${extra?` <small>${esc(extra)}</small>`:""}</h2>
    <p class="meta">${esc(fmtDay(fromIso(fecha)))} · ${esc(range(c))} · ${esc(c.instructora)} · <b>${used(c,fecha)} de ${cap(c)}</b> lugares ocupados</p>
    ${barra?`<div class="sala mini" aria-hidden="true">${salaSVG(taken(c,fecha),null,false)}</div>`:`<p class="cupoinfo">Cupo por número, sin lugar fijo: ${cap(c)}${cupoNota(c)?` (${esc(cupoNota(c).toLowerCase())})`:""}.</p>`}
    <h3>Alumnas</h3>
    <ol class="roster">${list.map(r=>`<li><span class="seatno" title="${barra?"Lugar":"Orden de reserva"}"><span class="sr-only">${barra?"Lugar":"Número"} </span>${r.pos}</span>
      <span class="nm">${esc(r.nombre)}${r.tutor?`<small>Tutor: ${esc(r.tutor)}</small>`:""}</span>
      <span class="tagx ${r.demo?"":"web"}">${r.demo?"Ejemplo":r.pago==="aprobado"?"Web · pagado":"Web · pago por confirmar"}</span>
      ${r.id?`<button class="linkbtn" type="button" data-cancel="${r.id}">Cancelar</button>`:""}</li>`).join("")||"<li>Sin reservas.</li>"}</ol>
    <h3>Lista de espera</h3>
    ${wl.length?`<ol class="roster">${wl.map((e,i)=>`<li><span class="seatno">${i+1}</span><span class="nm">${esc(e.nina||e.nombre)}${e.nina?`<small>Tutor: ${esc(e.nombre)}</small>`:""}</span><span class="tagx">${esc(e.wa)}</span></li>`).join("")}</ol>`:`<p class="privacy">Nadie en espera.</p>`}`;
}

function cancelRes(id){
  const r=store.reservas.find(x=>x.id===id); if(!r) return;
  store.reservas=store.reservas.filter(x=>x.id!==id); save();
  const c=clsById(r.claseId), first=waitlist(c,r.fecha)[0];
  renderVWeek(); renderPays(); renderClients();
  if(first){
    const num=digits(first.wa), link=`https://wa.me/${num.length===10?"1"+num:num}?text=${encodeURIComponent(`¡Buenas noticias, ${first.nombre.split(" ")[0]}! Se liberó un lugar en ${clsName(c)} del ${fmtDay(fromIso(r.fecha))} a las ${NB.fmtH(toH(c.inicio))}. Responde SÍ para quedártelo.`)}`;
    $("#vDetail").insertAdjacentHTML("afterbegin",`<p class="note">${r.lugar?`Lugar ${r.lugar} liberado`:"Cupo liberado"}. <a href="${esc(link)}" target="_blank" rel="noopener">Avisar a ${esc(first.nina||first.nombre)} por WhatsApp</a> (primera en la lista de espera).</p>`);
  }else NB.toast(r.lugar?`Lugar ${r.lugar} liberado`:"Cupo liberado");
}

function renderClients(){
  const map=new Map();
  const add=(nombre,wa,cred,demo)=>{ const k=digits(wa)||nombre; if(!map.has(k)) map.set(k,{nombre,wa,res:0,cred,demo}); return map.get(k); };
  D.demo.clientes.forEach(p=>add(p.nombre,p.whatsapp,p.creditos,true));
  weekOccs(vWeek,"").forEach(o=>roster(o.c,o.fecha).forEach(r=>{ if(r.demo) add(r.tutor||r.nombre,r.wa,0,true).res++; }));
  store.reservas.forEach(r=>add(r.nombre,r.wa,0,false).res++);
  $("#cliBody").innerHTML=[...map.values()].sort((a,b)=>a.demo-b.demo||b.res-a.res).map(p=>`<tr>
    <th scope="row">${esc(p.nombre)}${p.demo?"":' <span class="tagx web">Web</span>'}</th><td>${esc(p.wa)}</td><td>${p.res}</td><td>${p.cred}</td></tr>`).join("");
  $("#cliNote").textContent=`${D.demo.nota} Las reservas de las clientas de ejemplo son de la semana elegida; las de la web, todas las hechas en este navegador. Créditos de demostración.`;
}

function renderPays(){
  const ok=new Set(store.aprobados);
  const items=D.demo.pagos.map(p=>({id:p.id, who:p.cliente, what:p.concepto, demo:true}))
    .concat(store.reservas.map(r=>{ const c=clsById(r.claseId); return {id:r.id, who:r.nina?`${r.nombre} (por ${r.nina})`:r.nombre, what:`${clsName(c)} · ${fmtDay(fromIso(r.fecha))}${r.lugar?` · lugar ${r.lugar}`:""}`, done:r.pago==="aprobado"}; }));
  const li=p=>`<li><div><b>${esc(p.who)}</b>${p.demo?' <span class="tagx">Ejemplo</span>':""}<small>${esc(p.what)}</small><small>Transferencia · por confirmar</small></div>
    ${ok.has(p.id)||p.done?`<span class="tagx web">Aprobado</span>`:`<button class="bbtn solid sm" type="button" data-approve="${esc(p.id)}">Aprobar</button>`}</li>`;
  const pend=items.filter(p=>!(ok.has(p.id)||p.done)), done=items.filter(p=>ok.has(p.id)||p.done);
  $("#payPend").innerHTML=pend.map(li).join("")||`<li class="empty-state">No hay transferencias por confirmar.</li>`;
  $("#payDone").innerHTML=done.map(li).join("")||`<li class="empty-state">Todavía no hay pagos aprobados.</li>`;
}
function approve(id){
  const r=store.reservas.find(x=>x.id===id);
  if(r) r.pago="aprobado"; else if(!store.aprobados.includes(id)) store.aprobados.push(id);
  save(); renderPays(); renderVDetail(); NB.toast("Pago aprobado");
}

/* ---------- Calendario .ics de la instructora ---------- */
function calInst(){ return vInst||D.horario[0].instructora; }
function renderCalPrev(){
  const inst=calInst(), occs=weekOccs(vWeek,inst);
  $("#icsBtn").textContent=`Descargar calendario de ${inst} (.ics)`;
  $("#calPrev").innerHTML=occs.map(o=>`<li><span class="vcls static"><span class="t">${esc(DSHORT[o.i])} ${fromIso(o.fecha).getDate()} · ${esc(NB.fmtH(toH(o.c.inicio)))}</span>
    <span class="n">${esc(clsName(o.c))}<small>${roster(o.c,o.fecha).length} alumnas</small></span></span></li>`).join("")||`<li class="empty-state">${esc(inst)} no tiene clases esta semana.</li>`;
}
function downloadIcs(){
  const inst=calInst(), occs=weekOccs(vWeek,inst);
  if(!occs.length){ NB.toast(`${inst} no tiene clases esta semana.`); return; }
  const events=occs.map(o=>{
    const list=roster(o.c,o.fecha), wl=waitlist(o.c,o.fecha), extra=o.c.edad||tagTxt(o.c);
    const desc=`Instructora: ${inst}\n${list.length} de ${cap(o.c)} lugares ocupados\n\nAlumnas:\n`+
      list.map(r=>`${r.pos}. ${r.nombre}${r.tutor?` (tutor: ${r.tutor})`:""}`).join("\n")+
      (wl.length?`\n\nLista de espera: ${wl.map(e=>e.nina||e.nombre).join(", ")}`:"")+
      `\n\n${CFG.cancelacion.texto}\nDemo: datos de ejemplo.`;
    return {uid:`${o.c.id}-${o.fecha}@bale`,fecha:o.fecha,c:o.c,summary:`${clsName(o.c)}${extra?` (${extra})`:""} · ${list.length}/${cap(o.c)}`,desc};
  });
  download(icsFile(`balé · ${inst}`,events),`bale-${inst.toLowerCase()}-${iso(dayDate(vWeek,0))}.ics`);
}

function initStudio(){
  document.title="balé · Vista del estudio (demo)";
  $("#publico").hidden=true; $("#vistaEstudio").hidden=false;
  const insts=D.instructoras.map(i=>i.nombre).filter(n=>D.horario.some(c=>c.instructora===n));
  $("#vInst").innerHTML=`<option value="">Todas</option>`+insts.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");
  renderVWeek(); renderClients(); renderPays();
  $("#vPrev").addEventListener("click",()=>{ if(vWeek>0){ vWeek--; renderVWeek(); renderClients(); } });
  $("#vNext").addEventListener("click",()=>{ if(vWeek<WEEKS_AHEAD){ vWeek++; renderVWeek(); renderClients(); } });
  $("#vInst").addEventListener("change",e=>{ vInst=e.target.value; renderVWeek(); });
  $("#vList").addEventListener("click",e=>{ const b=e.target.closest("[data-occ]"); if(!b) return; vSel=b.dataset.occ; renderVWeek(); $(`#vList [data-occ="${vSel}"]`).focus();
    if(matchMedia("(max-width:820px)").matches) $("#vDetail").scrollIntoView({behavior:"smooth",block:"start"}); });
  $("#vDetail").addEventListener("click",e=>{ const b=e.target.closest("[data-cancel]"); if(b) cancelRes(b.dataset.cancel); });
  $("#p-pag").addEventListener("click",e=>{ const b=e.target.closest("[data-approve]"); if(b) approve(b.dataset.approve); });
  $("#icsBtn").addEventListener("click",downloadIcs);
  $("#resetDemo").addEventListener("click",()=>{
    store={reservas:[],espera:[],aprobados:[]}; save();
    renderVWeek(); renderClients(); renderPays(); NB.toast("Reservas de la demo borradas");
  });
  // Pestañas (con flechas del teclado)
  const tabs=[...document.querySelectorAll('[role="tab"]')];
  const sel=t=>{ tabs.forEach(x=>{ const on=x===t; x.setAttribute("aria-selected",on); x.tabIndex=on?0:-1; $("#"+x.getAttribute("aria-controls")).hidden=!on; });
    $(".vinst").firstChild.textContent=t.id==="t-cal"?"Calendario de":"Instructora"; };
  tabs.forEach((t,i)=>{
    t.addEventListener("click",()=>sel(t));
    t.addEventListener("keydown",e=>{ const d=e.key==="ArrowRight"?1:e.key==="ArrowLeft"?-1:0; if(!d) return; const n=tabs[(i+d+tabs.length)%tabs.length]; sel(n); n.focus(); });
  });
}

/* ---------- Arranque ---------- */
// Descarta reservas de clases que ya no están en el horario (p. ej., de una versión anterior)
function prune(){
  const ok=r=>D.horario.some(c=>c.id===r.claseId);
  store.reservas=store.reservas.filter(ok); store.espera=store.espera.filter(ok);
}
Promise.all([NB.load("bale"),NB.load("horario"),NB.load("precios"),NB.load("comunidad"),NB.ready]).then(([b,h,p,com,cfg])=>{
  D=Object.assign({},b,{horario:h.clases, etiquetas:h.etiquetas, precios:p, comunidad:com});
  CFG=cfg;
  applyPanel(); buildLugares(); prune();
  if(ESTUDIO) initStudio(); else initPublic();
  setTimeout(watchReveal,0);
  // Otra pestaña cambió las reservas: vuelve a pintar
  addEventListener("storage",e=>{ if(e.key===NB.PANEL_KEY){ location.reload(); return; } if(e.key!==KEY) return; store=readStore(); prune();
    if(ESTUDIO){ renderVWeek(); renderClients(); renderPays(); } else renderWeek(); });
}).catch(()=>{});

/* ---------- Entrada: el telón se salta con un clic o una tecla ---------- */
const intro=$("#bintro");
if(intro){
  if(ESTUDIO) intro.remove();
  else{
    const done=()=>{removeEventListener("pointerdown",skip);removeEventListener("keydown",skip);intro.remove()};
    const skip=()=>{document.body.classList.add("no-intro");done()};
    addEventListener("pointerdown",skip);
    addEventListener("keydown",skip);
    setTimeout(done,2400); // terminó solo
  }
}

/* ---------- Aparición al desplazarse (una sola vez por elemento) ---------- */
function watchReveal(){
  const els=[...document.querySelectorAll("[data-reveal]:not(.in)")];
  if(!("IntersectionObserver" in window)){ els.forEach(el=>el.classList.add("in")); return; }
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.12,rootMargin:"0px 0px -40px 0px"});
  els.forEach(el=>io.observe(el));
}
watchReveal();
})();
