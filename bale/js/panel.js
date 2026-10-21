/* =========================================================
   balé — panel del negocio (panel.html), demo
   Guarda en este navegador ("bale-panel") solo lo que cambia respecto de
   los JSON publicados:
   {cfg:{whatsapp,instagram,direccion,maps,correo}, aviso:"", canceladas:["id@fecha"],
    cupos:{clase:n}, sala:{filas,por_fila}, precios:{id:n}, eventos:[...]}
   La página (js/bale.js y js/core.js) aplica esos cambios. "Descargar archivos
   para publicar" genera config.json, precios.json, comunidad.json y bale.json
   ya actualizados para subirlos a data/. Aquí no hay datos de clientas.
   ========================================================= */
(function(){
"use strict";
const B = window.BALE;
const {$, esc} = B;
const DKEYS = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];
let CFG, H, PR, COM, BL, week=0, cancel=new Set(), events=[], dirty=false;

/* ---------- Fechas ---------- */
const todayIx = ()=>(new Date().getDay()+6)%7;
function dayDate(w,i){ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-todayIx()+7*w+i); return d; }
const iso = d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fromIso = s=>{ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
const fmtDay = d=>d.toLocaleDateString("es-DO",{weekday:"long",day:"numeric",month:"long"});
const toH = t=>{ const [h,m]=t.split(":").map(Number); return h+m/60; };
const hoy = ()=>iso(new Date());

function setDirty(v){
  dirty=v;
  const s=$("#saveState");
  s.textContent=v?"Tienes cambios sin guardar":"Todo guardado";
  s.classList.toggle("dirty",v);
}

/* ---------- Pintar ---------- */
function render(){
  const P=B.panel.read(), c=Object.assign({}, {whatsapp:CFG.whatsapp, instagram:CFG.instagram, direccion:CFG.direccion, maps:"", correo:CFG.aviso_correo.endpoint.split("/").pop()}, P.cfg);
  $("#cWa").value=c.whatsapp||""; $("#cIg").value=c.instagram||""; $("#cDir").value=c.direccion||"";
  $("#cMaps").value=c.maps||""; $("#cMail").value=c.correo||"";
  $("#aviso").value=P.aviso!=null?P.aviso:(BL.aviso||"");
  $("#cupReformer").value=P.cupos["Pilates Reformer"]||BL.cupos["Pilates Reformer"];
  $("#cupBallet").value=P.cupos["Ballet niñas"]||BL.cupos["Ballet niñas"];
  const sala=P.sala||BL.sala;
  $("#salaFilas").value=sala.filas; $("#salaPorFila").value=sala.por_fila;
  salaTotal();
  cancel=new Set(P.canceladas||BL.canceladas||[]);
  events=JSON.parse(JSON.stringify(P.eventos||COM.proximos||[]));
  renderCancel(); renderPrices(P); renderEvents();
  setDirty(false);
}
function salaTotal(){
  const f=+$("#salaFilas").value||0, n=+$("#salaPorFila").value||0;
  $("#salaTotal").textContent=f&&n?`${f} × ${n} = ${f*n} lugares en las clases de barra.`:"";
}

function renderCancel(){
  const a=dayDate(week,0), b=dayDate(week,6);
  $("#cLabel").textContent=`${a.getDate()} ${a.toLocaleDateString("es-DO",{month:"short"})} – ${b.getDate()} ${b.toLocaleDateString("es-DO",{month:"short"})}`.replace(/\./g,"");
  $("#cPrev").disabled=week<=0; $("#cNext").disabled=week>=3;
  const now=new Date();
  $("#cancelList").innerHTML=DKEYS.map((k,i)=>{
    const list=H.clases.filter(c=>c.dia===k).sort((x,y)=>toH(x.inicio)-toH(y.inicio));
    if(!list.length) return "";
    const d=dayDate(week,i), f=iso(d);
    return `<p class="cday">${esc(fmtDay(d))}</p>`+list.map(c=>{
      const key=`${c.id}@${f}`, on=cancel.has(key), st=new Date(d); const [hh,mm]=c.inicio.split(":").map(Number); st.setHours(hh,mm);
      return `<label class="citem ${on?"on":""} ${st<now?"past":""}"><input type="checkbox" data-c="${esc(key)}" ${on?"checked":""}>
        <span class="t">${esc(B.fmtH(toH(c.inicio)))}</span><span class="n">${esc(c.clase)}${c.edad?` · ${esc(c.edad)}`:""}<small>${esc(c.instructora)}${on?" · Cancelada":""}</small></span></label>`;
    }).join("");
  }).join("");
}

function priceRows(){
  const rows=[];
  rows.push(["g","Clase individual"]);
  PR.individual.items.forEach(it=>rows.push([it.id,it.nombre,"",it.precio]));
  rows.push(["g","Con membresía"]);
  PR.membresia.items.forEach(it=>rows.push([it.id,it.nombre,it.detalle,it.precio]));
  rows.push(["g","Clase infantil"]);
  rows.push(["inf-inscripcion","Inscripción","",PR.infantil.inscripcion],["inf-mensualidad","Mensualidad","",PR.infantil.mensualidad]);
  rows.push(["g","Uniformes y accesorios"]);
  PR.infantil.accesorios.forEach((a,i)=>rows.push(["acc-"+i,a.nombre,"",a.precio]));
  return rows;
}
function renderPrices(P){
  $("#priceList").innerHTML=priceRows().map(r=>r[0]==="g"?`<p class="pgroup">${esc(r[1])}</p>`:
    `<label class="prow"><span>${esc(r[1])}${r[2]&&r[2].length<60?`<small>${esc(r[2])}</small>`:""}</span>
      <input type="number" min="0" step="50" inputmode="numeric" data-p="${esc(r[0])}" value="${esc(P.precios[r[0]]??r[3])}" aria-label="Precio de ${esc(r[1])}${r[2]&&r[2].length<60?", "+esc(r[2]):""} en pesos"></label>`).join("");
}

function renderEvents(){
  $("#eventList").innerHTML=events.map((e,i)=>`<div class="ev" data-i="${i}">
    <div class="form">
      <label class="fld full">Título<input type="text" data-f="titulo" value="${esc(e.titulo)}" maxlength="80"></label>
      <label class="fld">Fecha<input type="date" data-f="fecha" value="${esc(e.fecha)}"></label>
      <label class="fld">Hora<input type="time" data-f="hora" value="${esc(e.hora||"")}"></label>
      <label class="fld">Precio RD$ (opcional)<input type="number" min="0" step="50" data-f="precio" value="${e.precio??""}"></label>
      <label class="fld full">Texto corto<input type="text" data-f="texto" value="${esc(e.texto||"")}" maxlength="140"></label>
      <label class="fld full">Mensaje de WhatsApp para reservar (opcional)<textarea data-f="mensaje" rows="2" maxlength="300">${esc(e.mensaje||"")}</textarea></label>
    </div>
    <div class="evfoot"><small class="${e.fecha&&e.fecha<hoy()?"gone":""}">${e.fecha&&e.fecha<hoy()?"Ya pasó: no se muestra":"Se muestra hasta su fecha"}</small>
      <button class="linkbtn" type="button" data-del="${i}">Quitar evento</button></div>
  </div>`).join("")||`<p class="empty-state">No hay próximos eventos. La sección Comunidad muestra solo los momentos.</p>`;
}
function readEvents(){
  return [...document.querySelectorAll("#eventList .ev")].map(el=>{
    const g=f=>el.querySelector(`[data-f="${f}"]`).value.trim(), old=events[+el.dataset.i]||{};
    const precio=g("precio")===""?null:+g("precio");
    return {id:old.id||"", titulo:g("titulo"), fecha:g("fecha"), hora:g("hora"), precio, texto:g("texto"), foto:old.foto||null, boton:"Reservar por WhatsApp", mensaje:g("mensaje")};
  });
}

/* ---------- Guardar ---------- */
const slug = s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
function invalid(el,msg){ el.setAttribute("aria-invalid","true"); B.toast(msg); el.focus(); return false; }
function save(){
  document.querySelectorAll("[aria-invalid]").forEach(e=>e.removeAttribute("aria-invalid"));
  const wa=$("#cWa").value.replace(/\D/g,"");
  if(wa.length<10) return invalid($("#cWa"),"Revisa el WhatsApp: con código de país y solo números (ej. 18496386337).");
  const ig=$("#cIg").value.trim();
  if(ig&&!/^https:\/\/(www\.)?instagram\.com\/[^/?#]+/i.test(ig)) return invalid($("#cIg"),"El Instagram debe ser un enlace como https://www.instagram.com/balestudio.rd/");
  const maps=$("#cMaps").value.trim();
  if(maps&&!/^https:\/\//i.test(maps)) return invalid($("#cMaps"),"El enlace de Google Maps debe empezar por https://");
  for(const id of ["cupReformer","cupBallet","salaFilas","salaPorFila"]){ const el=$("#"+id); if(!(+el.value>=1)) return invalid(el,"Los cupos y la sala deben ser números mayores que cero."); }
  const badP=[...document.querySelectorAll("[data-p]")].find(i=>i.value===""||!(+i.value>=0));
  if(badP) return invalid(badP,"Cada precio debe ser un número (0 o más).");
  const ev=readEvents();
  for(let i=0;i<ev.length;i++){
    const box=document.querySelectorAll("#eventList .ev")[i];
    if(!ev[i].titulo) return invalid(box.querySelector('[data-f="titulo"]'),"Cada evento necesita un título.");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(ev[i].fecha)) return invalid(box.querySelector('[data-f="fecha"]'),"Cada evento necesita una fecha.");
    if(ev[i].precio!=null&&!(ev[i].precio>=0)) return invalid(box.querySelector('[data-f="precio"]'),"El precio del evento debe ser un número.");
    ev[i].id=ev[i].id||`${slug(ev[i].titulo)}-${ev[i].fecha}`;
    if(!ev[i].mensaje){ const d=fromIso(ev[i].fecha); ev[i].mensaje=`Hola, balé. Quiero reservar mi lugar en ${ev[i].titulo} del ${fmtDay(d)}${ev[i].hora?` a las ${B.fmtH(toH(ev[i].hora))}`:""}.`; }
  }

  // Solo se guarda lo que difiere de los JSON publicados
  const base={whatsapp:CFG.whatsapp, instagram:CFG.instagram, direccion:CFG.direccion, maps:"", correo:CFG.aviso_correo.endpoint.split("/").pop()};
  const now={whatsapp:wa, instagram:ig||CFG.instagram, direccion:$("#cDir").value.trim()||CFG.direccion, maps, correo:$("#cMail").value.trim()||base.correo};
  const cfg={}; Object.keys(now).forEach(k=>{ if(now[k]!==base[k]) cfg[k]=now[k]; });
  const precios={}; priceRows().filter(r=>r[0]!=="g").forEach(r=>{ const v=+$(`[data-p="${r[0]}"]`).value; if(v!==r[3]) precios[r[0]]=v; });
  const cupos={}; [["Pilates Reformer","cupReformer"],["Ballet niñas","cupBallet"]].forEach(([k,id])=>{ const v=+$("#"+id).value; if(v!==BL.cupos[k]) cupos[k]=v; });
  const f=+$("#salaFilas").value, n=+$("#salaPorFila").value;
  const sala=f!==BL.sala.filas||n!==BL.sala.por_fila?{filas:f,por_fila:n}:null;
  const avisoTxt=$("#aviso").value.trim();
  const canc=[...cancel].filter(k=>k.split("@")[1]>=hoy()).sort();
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const store={cfg, precios, cupos, sala,
    aviso:avisoTxt!==(BL.aviso||"")?avisoTxt:null,
    canceladas:same(canc,[...(BL.canceladas||[])].sort())?null:canc,
    eventos:same(ev,COM.proximos)?null:ev};
  if(!B.panel.save(store)){ B.toast("Este navegador no permite guardar los cambios."); return false; }
  events=ev; render(); B.toast("Cambios guardados. Ya se ven en la página en este navegador.");
  return true;
}

function reset(){
  if(!confirm("¿Volver a los datos publicados? Se borran los cambios del panel guardados en este navegador.")) return;
  B.panel.clear(); render(); B.toast("Datos publicados restaurados");
}

/* ---------- Descargar archivos para publicar ---------- */
function download(name,obj){
  const blob=new Blob([JSON.stringify(obj,null,2)+"\n"],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name;
  document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}
function exportFiles(){
  if(dirty&&!save()) return;
  const P=B.panel.read();
  const cfg=B.mergeCfg(CFG);
  const pr=JSON.parse(JSON.stringify(PR)), num=v=>typeof v==="number";
  pr.individual.items.concat(pr.membresia.items).forEach(it=>{ if(num(P.precios[it.id])) it.precio=P.precios[it.id]; });
  if(num(P.precios["inf-inscripcion"])) pr.infantil.inscripcion=P.precios["inf-inscripcion"];
  if(num(P.precios["inf-mensualidad"])) pr.infantil.mensualidad=P.precios["inf-mensualidad"];
  pr.infantil.accesorios.forEach((a,i)=>{ if(num(P.precios["acc-"+i])) a.precio=P.precios["acc-"+i]; });
  const com=Object.assign({},COM,{proximos:(P.eventos||COM.proximos).filter(e=>e.fecha>=hoy())});
  const bl=JSON.parse(JSON.stringify(BL));
  Object.assign(bl.cupos,P.cupos);
  Object.keys(P.cupos).forEach(k=>{ if(bl.cupos.nota) bl.cupos.nota[k]=""; });   // confirmado por el estudio
  if(P.sala) Object.assign(bl.sala,P.sala);
  if(P.aviso!=null) bl.aviso=P.aviso;
  bl.canceladas=(P.canceladas||BL.canceladas||[]).filter(k=>k.split("@")[1]>=hoy());
  [["config.json",cfg],["precios.json",pr],["comunidad.json",com],["bale.json",bl]].forEach(([n,o],i)=>setTimeout(()=>download(n,o),i*400));
  B.toast("Se descargan 4 archivos: reemplázalos en bale/data/ y publica.");
}

/* ---------- Arranque ---------- */
Promise.all([B.load("config"),B.load("horario"),B.load("precios"),B.load("comunidad"),B.load("bale")]).then(([c,h,p,com,bl])=>{
  CFG=c; H=h; PR=p; COM=com; BL=bl;
  render();
  const form=$("#panelForm");
  form.addEventListener("input",e=>{ e.target.removeAttribute("aria-invalid"); setDirty(true); if(/^sala/.test(e.target.id)) salaTotal(); });
  form.addEventListener("change",e=>{
    const c=e.target.closest("[data-c]");
    if(c){ c.checked?cancel.add(c.dataset.c):cancel.delete(c.dataset.c); c.closest(".citem").classList.toggle("on",c.checked); setDirty(true); }
  });
  form.addEventListener("submit",e=>{ e.preventDefault(); save(); });
  $("#cPrev").addEventListener("click",()=>{ if(week>0){ week--; renderCancel(); } });
  $("#cNext").addEventListener("click",()=>{ if(week<3){ week++; renderCancel(); } });
  $("#addEvent").addEventListener("click",()=>{
    events=readEvents(); events.push({id:"",titulo:"",fecha:"",hora:"",precio:null,texto:"",foto:null,boton:"Reservar por WhatsApp",mensaje:""});
    renderEvents(); setDirty(true);
    const last=[...document.querySelectorAll('#eventList [data-f="titulo"]')].pop(); if(last) last.focus();
  });
  $("#eventList").addEventListener("click",e=>{
    const b=e.target.closest("[data-del]"); if(!b) return;
    events=readEvents(); events.splice(+b.dataset.del,1); renderEvents(); setDirty(true); $("#addEvent").focus();
  });
  $("#exportBtn").addEventListener("click",exportFiles);
  $("#resetBtn").addEventListener("click",reset);
  addEventListener("beforeunload",e=>{ if(dirty){ e.preventDefault(); e.returnValue=""; } });
}).catch(()=>{});
})();
