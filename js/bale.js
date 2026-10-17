/* =========================================================
   bale.html — demo de Balé Studio
   Página pública: bienvenida con video, estudio, clases, horario con
   reservas (tira de 7 días, filtros, mapa de la sala con 16 lugares en
   las clases de barra y cupo por número en las demás, lista de espera,
   pago por transferencia simulado), paquetes, comunidad, equipo,
   preguntas frecuentes y ubicación.
   Vista del estudio (bale.html?vista=estudio): reservas por clase,
   clientes, pagos por aprobar y calendario .ics por instructora.
   Es una demostración: todo se guarda solo en este navegador
   ("nutribel-bale-demo"). Nunca se guardan datos de salud.
   ========================================================= */
(function(){
"use strict";
const {$, esc} = NB;
const KEY = "nutribel-bale-demo";   // {reservas:[], espera:[], aprobados:[]}
const WEEKS_AHEAD = 3;
const DKEYS = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];
const DSHORT = ["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"];
const ESTUDIO = new URLSearchParams(location.search).get("vista")==="estudio";
// Recorte de la foto de la sala (en % de la foto) para que los números se vean grandes en el teléfono
const CROP = {x:14, y:22, w:64, h:50};

let D, BIZ=null;
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
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(store)); }catch(e){ NB.toast("Este navegador no permite guardar la reserva."); } }
const uid = ()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);

/* ---------- Ocupación de cada clase en una fecha ---------- */
const occKey = (c,fecha)=>`${c.id}@${fecha}`;
const clsById = id=>D.horario.find(c=>c.id===id);
// Clases de barra: lugar concreto en la sala. Las demás: cupo por número (bale.json → cupos)
const isBarra = c=>D.barra_tipos.includes(c.clase);
const cap = c=>isBarra(c) ? D.sala.lugares.length : (+D.cupos[c.clase]||12);
function demoSeats(c){ const v=D.demo.ocupados[c.id]; return Array.isArray(v)?v.slice():[]; }
const demoCount = c=>{ const v=D.demo.ocupados[c.id]; return Array.isArray(v)?v.length:(+v||0); };
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
const typeOf = c=>D.clases.find(t=>t.tipos.includes(c.clase));
const clsName = c=>{ const t=typeOf(c); return t&&t.nombre&&t.tipos.length===1 ? t.nombre : c.clase; };
const seatTxt = r=>{ const L=r.lugar&&D.sala.lugares.find(l=>l.n===r.lugar); return L?`${L.n}, ${L.barra}`:"Sin lugar fijo (cupo por número)"; };
const digits = s=>String(s||"").replace(/\D/g,"");
const fmtWa = s=>{ const d=digits(s).replace(/^1(?=\d{10}$)/,""); return d.length===10?`${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`:s; };

// Lista de alumnas de una clase: las de ejemplo más las reservas de este navegador.
// pos = lugar en la sala (clases de barra) u orden de reserva (cupo por número)
function roster(c,fecha){
  const cl=D.demo.clientes;
  const off=parseInt(c.inicio,10)+c.dia.length;           // cada clase empieza en una clienta distinta, sin repetir
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
  const F=D.fundadora;
  $("#mfName").textContent=F.nombre;
  $(".founder .role").textContent=F.rol;
  $(".founder .bio").textContent=F.texto;
  $("#queBarre").textContent=D.que_es_barre;
  $("#certs").innerHTML=F.certificaciones.map(c=>`<li><b>${esc(c.nombre)}</b><span>${esc(c.detalle)}</span></li>`).join("");

  // Clases: una tarjeta por tipo, con sus días, horas e instructoras tomados del horario
  $("#ctypes").innerHTML=D.clases.map((t,i)=>{
    const list=D.horario.filter(c=>t.tipos.includes(c.clase));
    const who=[...new Set(list.map(c=>c.instructora))].join(", ");
    const ages=[...new Set(list.map(c=>c.nota).filter(n=>/años/.test(n||"")))];
    const tag=[...new Set(list.map(c=>c.etiqueta).filter(Boolean))];
    const days=[...new Set(list.map(c=>c.dia))].sort((a,b)=>DKEYS.indexOf(a)-DKEYS.indexOf(b)).map(k=>DSHORT[DKEYS.indexOf(k)].toLowerCase()).map(s=>s[0].toUpperCase()+s.slice(1)).join(" · ");
    const ph=t.fotos.length
      ? `<div class="phs n${Math.min(t.fotos.length,2)}">${t.fotos.slice(0,2).map(f=>`<img src="${esc(f.src)}" srcset="${esc(NB.srcset(f.src))}" sizes="(max-width:700px) 50vw, 220px" alt="${esc(f.alt)}" width="900" height="1350" loading="lazy" decoding="async">`).join("")}</div>`
      : `<div class="phs none"><span class="pending-mark">Foto por confirmar</span></div>`;
    return `<article class="ctype" data-reveal style="--r:${i%3}">
      ${ph}
      <div class="ct">
        <span class="b-kick">${esc(t.grupo)}</span>
        <h3>${esc(t.nombre||t.tipo)}</h3>
        ${tag.map(x=>`<span class="badge">${esc(x)}</span>`).join("")}
        <p>${esc(t.texto)}</p>
        ${ages.length?`<ul class="ages" aria-label="Grupos por edad">${ages.map(a=>`<li>${esc(a)}</li>`).join("")}</ul>`:""}
        <p class="meta"><span>${esc(days)}</span><span>Con ${esc(who)}</span></p>
        <a class="more" href="#horario" data-type="${esc(t.tipos.join("|"))}">Ver horario <span aria-hidden="true">→</span></a>
      </div>
    </article>`;
  }).join("");

  // Paquetes
  $("#packs").innerHTML=D.paquetes.map((p,i)=>`<article class="pack ${p.destacado?"star":""}" data-reveal style="--r:${i%3}">
      <span class="num" aria-hidden="true">${p.clases==null?"∞":p.clases}</span>
      <h3>${esc(p.nombre)}</h3>
      <p>${esc(p.frase)}</p>
      <p class="price">${p.precio==null?"Precio por definir":esc(NB.money(p.precio))}</p>
      <p class="valid">Vigencia por definir</p>
      <button class="bbtn ${p.destacado?"solid":"line"}" type="button" data-pack="${esc(p.id)}">Lo quiero</button>
    </article>`).join("");

  // Equipo
  $("#eqText").textContent=D.equipo_texto;
  $("#team").innerHTML=D.instructoras.map((p,i)=>{
    const types=[...new Set(D.horario.filter(c=>c.instructora===p.nombre).map(c=>clsName(c)))];
    const full=p.completo||p.nombre;
    return `<article class="member ${p.completo?"lead":""}" data-reveal style="--r:${i}">
      <span class="ini" aria-hidden="true">${esc(initials(full))}</span>
      <div><h3>${esc(full)}</h3>${p.completo?`<p class="nick">«${esc(p.nombre)}»</p>`:""}
      <p class="role">${esc(p.rol)}</p>
      ${types.length?`<p class="types">${types.map(esc).join(" · ")}</p>`:""}</div>
    </article>`;
  }).join("");

  // Comunidad: un evento de ejemplo y la colaboración con NutriBEL
  const E=D.comunidad.evento, C=D.comunidad.colaboracion;
  $("#comu").innerHTML=`<article class="ccard" data-reveal>
      <figure><img src="${esc(E.foto)}" srcset="${esc(NB.srcset(E.foto))}" sizes="(max-width:700px) 90vw, 420px" alt="${esc(E.alt)}" width="900" height="1124" loading="lazy" decoding="async"></figure>
      <div><span class="b-kick">${esc(E.kick)}</span><h3>${esc(E.titulo)}</h3><p>${esc(E.texto)}</p><span class="pending-mark">${esc(E.proximos)}</span></div>
    </article>
    <article class="ccard" data-reveal style="--r:1">
      <figure><img src="${esc(C.foto)}" srcset="${esc(NB.srcset(C.foto))}" sizes="(max-width:700px) 90vw, 420px" alt="${esc(C.alt)}" width="900" height="1125" loading="lazy" decoding="async"></figure>
      <div><span class="b-kick">${esc(C.kick)}</span><h3>${esc(C.titulo)}</h3><p>${esc(C.texto)}</p><a class="bbtn line" href="${esc(C.enlace)}">${esc(C.enlace_texto)}</a></div>
    </article>`;

  // Preguntas frecuentes
  $("#faqList").innerHTML=D.faq.map((q,i)=>`<details data-reveal style="--r:${i%3}"><summary>${esc(q.p)}</summary>
    <div><p>${esc(q.r)}</p>${q.pendiente?`<span class="pending-mark">${esc(q.pendiente)}</span>`:""}</div></details>`).join("");

  // Ubicación y pago
  $("#where").textContent=D.ubicacion;
  const pay=D.pago;
  $("#bank").innerHTML=`<span class="pending-mark">${esc(pay.banco)}</span><span class="pending-mark">${esc(pay.cuenta)}</span><span class="pending-mark">${esc(pay.titular)}</span>`;
  $("#polTxt").textContent=D.politica_cancelacion;
}

/* ---------- Horario: tira de días, filtros y filas ---------- */
const matches = c=>(!fInst||c.instructora===fInst)&&(!fType||fType.split("|").includes(c.clase));
const dayClasses = i=>D.horario.filter(c=>c.dia===DKEYS[i]&&matches(c)).sort((a,b)=>toH(a.inicio)-toH(b.inicio));

function renderFilters(){
  const insts=D.instructoras.map(i=>i.nombre).filter(n=>D.horario.some(c=>c.instructora===n));
  $("#fInst").innerHTML=`<option value="">Todas</option>`+insts.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");
  $("#fType").innerHTML=`<option value="">Todas</option>`+D.clases.map(t=>`<option value="${esc(t.tipos.join("|"))}">${esc(t.nombre||t.tipo)}</option>`).join("");
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
    const st=rowState(c,fecha), libres=free(c,fecha), N=cap(c), w=waitlist(c,fecha).length, inst=instInfo(c.instructora);
    const lbl=`${clsName(c)}, ${fmtDay(d)} a las ${NB.fmtH(toH(c.inicio))}`;
    let action;
    if(st==="past") action=`<span class="state">Finalizada</span>`;
    else if(st==="full") action=`<span class="state full">Llena</span><button class="rbtn line" type="button" data-wait="${c.id}" aria-label="Lista de espera: ${esc(lbl)}">Lista de espera</button>`;
    else action=`<button class="rbtn" type="button" data-book="${c.id}" aria-label="Reservar ${esc(lbl)}">Reservar</button>`;
    return `<li class="crow ${st}" style="--i:${n}">
      <div class="tm"><b>${esc(NB.fmtH(toH(c.inicio)))}</b><small>${mins(c)} min</small></div>
      <div class="cn">
        <h4>${esc(clsName(c))}</h4>
        ${c.etiqueta?`<span class="badge" title="${esc(c.nota||"")}">${esc(c.etiqueta)}</span>`:c.nota?`<span class="note">${esc(c.nota)}</span>`:""}
        <span class="who"><i class="ini sm" aria-hidden="true">${esc(initials(inst.completo||inst.nombre))}</i>${esc(c.instructora)}</span>
      </div>
      <div class="ac">
        <span class="cupo">${st==="past"?"":st==="full"?`0 de ${N} libres${w?` · ${w} en espera`:""}`:`<b>${libres}</b> de ${N} libres`}${st!=="past"&&!isBarra(c)?`<small class="tbc">Cupo por confirmar</small>`:""}</span>
        ${action}
      </div>
    </li>`;
  }).join("");
}

/* ---------- Mapa de la sala ---------- */
function salaHTML(set,mine,interactive){
  const S=D.sala;
  const img=`<img src="${esc(S.foto)}" alt="" width="${S.ancho}" height="${S.alto}" loading="lazy" style="width:${100*100/CROP.w}%;left:${-100*CROP.x/CROP.w}%;top:${-100*CROP.y/CROP.h}%">`;
  const marks=S.lugares.map(l=>{
    const st=l.n===mine?"mine":set.has(l.n)?"busy":"free";
    return `<span class="mk ${st}" ${interactive&&st==="free"?`data-n="${l.n}"`:""} style="left:${(l.x-CROP.x)/CROP.w*100}%;top:${(l.y-CROP.y)/CROP.h*100}%">${l.n}</span>`;
  }).join("");
  return img+marks;
}

/* ---------- Reserva (diálogo) ---------- */
const bk={c:null, fecha:"", lugar:null, wait:false, file:"", last:null};
const dlg=$("#book");

function openBook(c,fecha,wait){
  Object.assign(bk,{c,fecha,lugar:null,wait,file:"",last:null});
  const d=fromIso(fecha);
  $("#bkKick").textContent=wait?"Lista de espera":"Reservar";
  $("#bkTitle").textContent=clsName(c)+(c.etiqueta?` · ${c.etiqueta}`:c.nota?` · ${c.nota}`:"");
  $("#bkMeta").textContent=`${fmtDay(d)} · ${range(c)} · con ${c.instructora}`;
  $("#stDatos").reset();
  const kid=isBallet(c);
  $("#kids").hidden=!kid;
  $("#nameWrap").hidden=kid;
  $("#waLbl").textContent=kid?"WhatsApp del padre, la madre o el tutor":"WhatsApp";
  $("#payF").hidden=wait;
  const barra=isBarra(c), direct=wait||!barra;
  $("#datosH").textContent=wait?"Tus datos para la lista de espera":barra?"2. Tus datos y el pago":"Tus datos y el pago";
  $("#confirmBtn").textContent=wait?"Unirme a la lista de espera":"Confirmar reserva";
  $("#backLugar").hidden=direct;
  const ci=$("#cupoInfo");
  ci.hidden=wait||barra;
  if(!ci.hidden){ const n=free(c,fecha); ci.textContent=`Esta clase no tiene lugar fijo en la sala: quedan ${n} de ${cap(c)} ${n===1?"lugar":"lugares"}. ${D.cupos.nota}.`; }
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
  const set=taken(bk.c,bk.fecha);
  $("#sala").innerHTML=salaHTML(set,bk.lugar,true);
  const row=(a,b,name)=>`<div class="srow" role="group" aria-label="${name}"><span class="bar">${name}</span><div>${
    D.sala.lugares.filter(l=>l.n>=a&&l.n<=b).map(l=>{
      const busy=set.has(l.n), mine=l.n===bk.lugar;
      return `<button type="button" class="seat ${busy?"busy":""}" data-n="${l.n}" ${busy?"disabled":""} aria-pressed="${mine}" aria-label="Lugar ${l.n}, ${name}${busy?", ocupado":mine?", elegido":", libre"}">${l.n}</button>`;
    }).join("")}</div></div>`;
  $("#seats").innerHTML=row(1,8,"Primera barra")+row(9,16,"Segunda barra");
  const L=D.sala.lugares.find(l=>l.n===bk.lugar);
  $("#pick").textContent=L?`Elegiste el lugar ${L.n}, ${L.barra}.`:`${cap(bk.c)-set.size} de ${cap(bk.c)} lugares libres. Toca uno.`;
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
    const f=$("#fFile").files[0];
    const r=Object.assign(base,{lugar:isBarra(c)?bk.lugar:null, pago:"por confirmar", metodo:"Transferencia", comprobante:f?f.name:""});
    store.reservas.push(r); save();
    bk.last=r;
  }
  renderDone(); renderWeek(); renderBubbles();
}

function summary(r,c){
  const wait=r.pos!=null;
  return [["Clase",clsName(c)+(c.etiqueta?` (${c.etiqueta})`:c.nota?` (${c.nota})`:"")],["Día",fmtDay(fromIso(r.fecha))],["Hora",range(c)],
    wait?["Lista de espera",`Posición ${r.pos}`]:["Lugar",seatTxt(r)],["Instructora",c.instructora],
    r.nina?["Alumna",r.nina]:null,[r.nina?"Padre, madre o tutor":"Nombre",r.nombre],["WhatsApp",r.wa],
    wait?null:["Pago",`Transferencia, por confirmar${r.comprobante?` (comprobante: ${r.comprobante})`:" (sin comprobante adjunto)"}`]].filter(Boolean);
}
function renderDone(){
  const r=bk.last, c=bk.c;
  $("#okTitle").textContent=bk.wait?"Estás en la lista de espera":"¡Reserva confirmada!";
  $("#sum").innerHTML=summary(r,c).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
  $("#sendWa").textContent=bk.wait?"Avisar por WhatsApp":"Enviar confirmación por WhatsApp";
  show("stListo"); $("#stListo").focus();
}
function waMessage(){
  const r=bk.last, c=bk.c;
  const head=bk.wait?"Hola, balé. Me anoté en la lista de espera:":"Hola, balé. Confirmo mi reserva:";
  return head+"\n"+summary(r,c).map(([k,v])=>`${k}: ${v}`).join("\n");
}

/* ---------- Vista previa de los mensajes automáticos ---------- */
function renderBubbles(){
  const mine=store.reservas[store.reservas.length-1];
  let c, fecha, lugar, name;
  if(mine&&clsById(mine.claseId)){ c=clsById(mine.claseId); fecha=mine.fecha; lugar=mine.lugar; name=(mine.nina?mine.nombre:mine.nombre).split(" ")[0]; }
  else{ c=D.horario.find(x=>x.clase==="Hot Barre"&&!x.etiqueta)||D.horario[0]; fecha=iso(dayDate(1,DKEYS.indexOf(c.dia))); lugar=7; name="Laura"; }
  const L=lugar&&D.sala.lugares.find(l=>l.n===lugar), d=fmtDay(fromIso(fecha)), h=NB.fmtH(toH(c.inicio)), n=clsName(c);
  const msgs=[
    ["Al reservar",`¡Hola, ${name}! Tu lugar en balé está reservado.\n${n} · ${d} · ${h}\n${L?`Lugar ${L.n} (${L.barra}) · `:""}con ${c.instructora}`],
    ["24 horas antes",`${name}, te recordamos tu clase de mañana: ${n} a las ${h}${L?`, lugar ${L.n}`:""}. Si no puedes venir, avísanos para liberar tu lugar.`],
    ["2 horas antes",`¡Nos vemos en 2 horas! ${n} a las ${h} con ${c.instructora}.${L?` Tu lugar: ${L.n}, ${L.barra}.`:""}`],
    ["Lista de espera",`¡Buenas noticias, ${name}! Se liberó un lugar en ${n} del ${d} a las ${h}. Responde SÍ para quedártelo.`]
  ];
  $("#bubbles").innerHTML=`<div class="wa-top"><span class="ini sm" aria-hidden="true">b</span><span><b>balé</b><small>Mensajes automáticos</small></span></div>`+
    msgs.map(([k,t])=>`<div class="bub"><span class="when">${esc(k)}</span><p>${esc(t).replace(/\n/g,"<br>")}</p></div>`).join("")+
    `<p class="wa-note">${mine?"Con los datos de tu última reserva en esta demo.":"Ejemplo. Reserva una clase y verás tus datos aquí."}</p>`;
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
    v.poster=`assets/video/bale/bale-hero-${k}-poster.webp`;
    if(calm.matches){ v.pause(); if(v.dataset.src){ delete v.dataset.src; v.removeAttribute("src"); v.load(); } v.classList.remove("on"); return; }
    const src=`assets/video/bale/bale-hero-${k}.mp4`;
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

function initPublic(){
  renderStatic(); renderFilters(); renderWeek(); renderBubbles(); initHero();
  // "Reserva tu primera clase": va al próximo sábado de primera clase
  $("#firstBtn").addEventListener("click",()=>{
    fInst=""; fType=""; $("#fInst").value=""; $("#fType").value="";
    const now=new Date();
    search: for(let w=0;w<=WEEKS_AHEAD;w++) for(let i=0;i<7;i++){
      if(D.horario.some(c=>c.etiqueta&&c.dia===DKEYS[i]&&startOf(c,iso(dayDate(w,i)))>now)){ week=w; dayIx=i; break search; }
    }
    renderWeek();
  });
  $("#prevW").addEventListener("click",()=>{ if(week>0){ week--; dayIx=week===0?todayIx():0; renderWeek(); } });
  $("#nextW").addEventListener("click",()=>{ if(week<WEEKS_AHEAD){ week++; dayIx=0; renderWeek(); } });
  $("#strip").addEventListener("click",e=>{ const b=e.target.closest("[data-d]"); if(!b) return; dayIx=+b.dataset.d; renderWeek(); $(`#strip [data-d="${dayIx}"]`).focus(); });
  $("#fInst").addEventListener("change",e=>{ fInst=e.target.value; renderWeek(); });
  $("#fType").addEventListener("change",e=>{ fType=e.target.value; renderWeek(); });
  $("#rows").addEventListener("click",e=>{
    const b=e.target.closest("[data-book],[data-wait]"); if(!b) return;
    const c=clsById(b.dataset.book||b.dataset.wait), fecha=iso(dayDate(week,dayIx));
    if(rowState(c,fecha)==="past"){ renderRows(); return; }
    openBook(c,fecha,!!b.dataset.wait);
  });
  // "Ver horario" desde una tarjeta de clase: filtra por ese tipo y va al primer día con clase
  $("#ctypes").addEventListener("click",e=>{
    const a=e.target.closest("[data-type]"); if(!a) return;
    fType=a.dataset.type; $("#fType").value=fType;
    const t=week===0?todayIx():0;
    for(let k=0;k<7;k++){ const j=(t+k)%7; if(dayClasses(j).length){ dayIx=j; break; } }
    renderWeek();
  });
  $("#packs").addEventListener("click",e=>{
    const b=e.target.closest("[data-pack]"); if(!b) return;
    const p=D.paquetes.find(x=>x.id===b.dataset.pack);
    NB.whatsapp(`Hola, balé. Me interesa: ${p.nombre}. ¿Cuál es el precio y cómo lo pago?`);
  });

  // Diálogo
  $("#seats").addEventListener("click",e=>{ const b=e.target.closest("[data-n]"); if(b&&!b.disabled) pickSeat(+b.dataset.n); });
  $("#sala").addEventListener("click",e=>{ const m=e.target.closest("[data-n]"); if(m) pickSeat(+m.dataset.n); });
  $("#toDatos").addEventListener("click",()=>{ show("stDatos"); (isBallet(bk.c)?$("#kName"):$("#fName")).focus(); });
  $("#backLugar").addEventListener("click",()=>{ renderSeats(); show("stLugar"); const s=$(`#seats [aria-pressed="true"]`); if(s) s.focus(); });
  $("#stDatos").addEventListener("submit",submit);
  $("#stDatos").addEventListener("input",e=>e.target.removeAttribute("aria-invalid"));
  $("#sendWa").addEventListener("click",()=>NB.whatsapp(waMessage()));
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
      <span class="c ${n>=N?"full":""}">${n}/${N}${w?` · ${w} en espera`:""}</span></button></li>`;
  }).join("")||`<li class="empty-state">Sin clases esta semana.</li>`;
  renderVDetail();
  renderCalPrev();
}

function renderVDetail(){
  const box=$("#vDetail");
  if(!vSel){ box.innerHTML=""; return; }
  const [id,fecha]=vSel.split("@"), c=clsById(id), list=roster(c,fecha), wl=waitlist(c,fecha), barra=isBarra(c);
  box.innerHTML=`<h2>${esc(clsName(c))}${c.etiqueta||c.nota?` <small>${esc(c.etiqueta||c.nota)}</small>`:""}</h2>
    <p class="meta">${esc(fmtDay(fromIso(fecha)))} · ${esc(range(c))} · ${esc(c.instructora)} · <b>${used(c,fecha)} de ${cap(c)}</b> lugares ocupados</p>
    ${barra?`<div class="sala mini" aria-hidden="true">${salaHTML(taken(c,fecha),null,false)}</div>`:`<p class="cupoinfo">Cupo por número, sin lugar fijo en la sala: ${cap(c)}. ${esc(D.cupos.nota)}.</p>`}
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
  const items=D.demo.pagos.map(p=>({id:p.id, who:p.cliente, what:p.concepto, file:p.comprobante, demo:true}))
    .concat(store.reservas.map(r=>{ const c=clsById(r.claseId); return {id:r.id, who:r.nina?`${r.nombre} (por ${r.nina})`:r.nombre, what:`${clsName(c)} · ${fmtDay(fromIso(r.fecha))}${r.lugar?` · lugar ${r.lugar}`:""}`, file:r.comprobante, done:r.pago==="aprobado"}; }));
  const li=p=>`<li><div><b>${esc(p.who)}</b>${p.demo?' <span class="tagx">Ejemplo</span>':""}<small>${esc(p.what)}</small><small>Transferencia · ${p.file?`comprobante: ${esc(p.file)}`:"sin comprobante adjunto"}</small></div>
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
// La Vega usa UTC−4 todo el año (sin horario de verano)
const utc = d=>new Date(d.getTime()).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
function localToUtc(fecha,t){ const [y,m,d]=fecha.split("-").map(Number), [h,mi]=t.split(":").map(Number); return new Date(Date.UTC(y,m-1,d,h+4,mi)); }
function buildIcs(inst){
  const addr=BIZ?BIZ.direccion:"", now=utc(new Date());
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//bale//Demo reservas//ES","CALSCALE:GREGORIAN","METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEsc("balé · "+inst)}`,"X-WR-TIMEZONE:America/Santo_Domingo"];
  weekOccs(vWeek,inst).forEach(o=>{
    const list=roster(o.c,o.fecha);
    const desc=`Instructora: ${inst}\n${list.length} de ${cap(o.c)} lugares ocupados\n\nAlumnas:\n`+
      list.map(r=>`${r.pos}. ${r.nombre}${r.tutor?` (tutor: ${r.tutor})`:""}`).join("\n")+
      (waitlist(o.c,o.fecha).length?`\n\nLista de espera: ${waitlist(o.c,o.fecha).map(e=>e.nina||e.nombre).join(", ")}`:"")+
      "\n\nDemo: datos de ejemplo.";
    lines.push("BEGIN:VEVENT",`UID:${o.c.id}-${o.fecha}@bale-demo`,`DTSTAMP:${now}`,
      `DTSTART:${utc(localToUtc(o.fecha,o.c.inicio))}`,`DTEND:${utc(localToUtc(o.fecha,o.c.fin))}`,
      `SUMMARY:${icsEsc(`${clsName(o.c)}${o.c.etiqueta||o.c.nota?` (${o.c.etiqueta||o.c.nota})`:""} · ${list.length}/${cap(o.c)}`)}`,
      `DESCRIPTION:${icsEsc(desc)}`,`LOCATION:${icsEsc("balé"+(addr?", "+addr:""))}`,"END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n")+"\r\n";
}
function downloadIcs(){
  const inst=calInst();
  if(!weekOccs(vWeek,inst).length){ NB.toast(`${inst} no tiene clases esta semana.`); return; }
  const blob=new Blob([buildIcs(inst)],{type:"text/calendar;charset=utf-8"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`bale-${inst.toLowerCase()}-${iso(dayDate(vWeek,0))}.ics`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
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
// Descarta reservas de clases que ya no están en el horario (p. ej., de una versión anterior de la demo)
function prune(){
  const ok=r=>D.horario.some(c=>c.id===r.claseId);
  store.reservas=store.reservas.filter(ok); store.espera=store.espera.filter(ok);
}
NB.load("bale").then(data=>{
  D=data; prune();
  NB.ready.then(biz=>{
    BIZ=biz;
    if(ESTUDIO) return;
    $("#addr").textContent=biz.direccion;
    $("#mapsBtn").href=biz.google_maps||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(biz.direccion)}`;
    const wa=NB.waLink("Hola, balé. Quisiera información sobre las clases.");
    if(wa) $("#waBtn").href=wa; else $("#waBtn").hidden=true;
  }).catch(()=>{});
  if(ESTUDIO) initStudio(); else initPublic();
  // Otra pestaña cambió las reservas: vuelve a pintar
  addEventListener("storage",e=>{ if(e.key!==KEY) return; store=readStore(); prune();
    if(ESTUDIO){ renderVWeek(); renderClients(); renderPays(); } else { renderWeek(); renderBubbles(); } });
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
NB.load("bale").then(()=>setTimeout(watchReveal,0)).catch(()=>{});
})();
