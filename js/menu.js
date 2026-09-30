/* =========================================================
   menu.html — plato del día, pestañas, filtros, platos y power-bowl
   Contenido desde data/menu.json + cambios del panel (agotado,
   etiquetas, info nutricional y plato de la semana).
   ========================================================= */
(function(){
"use strict";
const {$, esc, money, DAYS} = NB;

let M;                       // data/menu.json
let tab="desayuno", filter="todo";
const bowlSel={size:1,picks:{}};
const store=NB.panel.read();
const colorOf=c=>`var(--${c||"olive"})`;
const section=()=>M.secciones.find(s=>s.id===tab);
const dishes=()=>M.platos.map(d=>{
  const o=store.overrides[d.id]||{};
  return Object.assign({},d,{etiquetas:o.t||d.etiquetas,nu:o.nu||{},off:!!o.off});
});

/* ============ PLATO DEL DÍA ============ */
function renderToday(){
  const N=M.nutrialmuerzoSemana, week=store.week||N.lunes_a_viernes;
  const d=new Date().getDay(), dish=d>=1&&d<=5?week[d-1]:null;
  $("#today").innerHTML = `
    <svg class="steam" viewBox="0 0 60 70" aria-hidden="true"><path d="M14 64 C 4 50, 24 42, 14 28 S 18 8, 14 2"/><path d="M30 64 C 20 50, 40 42, 30 28 S 34 8, 30 2"/><path d="M46 64 C 36 50, 56 42, 46 28 S 50 8, 46 2"/></svg>
    <div class="day">${dish?DAYS[d]:"Hoy"}</div>
    <div>
      <h2>${dish?esc(dish):"Hoy no hay opción del día"}</h2>
      <p>${dish?"Nutrialmuerzo de hoy · "+money(N.precio):"El Nutrialmuerzo sale de lunes a viernes. Aquí está lo de esta semana:"}</p>
      ${dish?`<button class="btn lime" type="button" id="addToday">Agregar al pedido</button>`:""}
      <div class="week">${week.map((w,i)=>`<span class="${i===d-1?'cur':''}" title="${esc(w)}">${DAYS[i+1]}: ${esc(w.split(" con ")[0])}</span>`).join("")}</div>
    </div>`;
  if(dish) $("#addToday").onclick=()=>NB.cart.add({name:"Nutrialmuerzo: "+dish,size:"",opt:"",price:N.precio});
}

/* ============ PESTAÑAS Y FILTROS ============ */
function renderTabs(){
  $("#tabs").innerHTML = M.secciones.map(s=>`<button role="tab" type="button" id="tab-${s.id}" aria-controls="menuBody" style="--tc:${colorOf(s.color)}" aria-selected="${s.id===tab}" tabindex="${s.id===tab?0:-1}" data-tab="${s.id}">${esc(s.nombre)}</button>`).join("");
  // En móvil la tira se desplaza: centra la pestaña activa sin mover la página
  const strip=$("#tabs"), cur=$(`#tab-${tab}`);
  if(strip.scrollWidth>strip.clientWidth) strip.scrollLeft=cur.offsetLeft-strip.offsetLeft-(strip.clientWidth-cur.offsetWidth)/2;
}
function selectTab(id,focus){
  if(!M.secciones.some(s=>s.id===id)) return;
  tab=id; filter="todo";
  history.replaceState(null,"","#"+id);
  renderMenu();
  if(focus) $(`#tab-${id}`).focus({preventScroll:true});
}
function renderFilters(list){
  if(tab==="bowl"){$("#filters").innerHTML="";return}
  const count=k=>k==="todo"?list.length:list.filter(d=>d.etiquetas.includes(k)).length;
  $("#filters").innerHTML = [["todo","Todo"]].concat(Object.entries(M.etiquetas)).map(([k,v])=>`<button class="chip" type="button" aria-pressed="${filter===k}" data-f="${k}">${esc(v)}<i>${count(k)}</i></button>`).join("");
}

/* ============ PLATOS ============ */
function nutriHTML(nu){
  const has=["kcal","p","c","g"].some(k=>nu[k]!==undefined&&nu[k]!=="");
  if(!has) return `<div class="nutri empty">Información nutricional en preparación.</div>`;
  const v=k=>nu[k]!==undefined&&nu[k]!==""?esc(nu[k]):"–";
  return `<div class="nutri"><div><b>${v("kcal")}</b>kcal</div><div><b>${v("p")}g</b>proteína</div><div><b>${v("c")}g</b>carbos</div><div><b>${v("g")}g</b>grasa</div></div>`;
}
function cardHTML(d,n){
  return `
    <article class="card ${d.off?'off':''}" data-id="${esc(d.id)}" style="--i:${n}">
      ${d.imagen?`<div class="ph"><img loading="lazy" src="${esc(d.imagen)}" alt="${esc(d.nombre)}"></div>`:""}
      <h3>${esc(d.nombre)}</h3>
      <p>${esc(d.descripcion)}</p>
      ${d.etiquetas.length?`<div class="tags">${d.etiquetas.map(t=>`<span class="tag">${esc(M.etiquetas[t]||t)}</span>`).join("")}</div>`:""}
      ${nutriHTML(d.nu)}
      ${d.opciones.length?`<label class="fld">Elige<select class="opt">${d.opciones.map(o=>`<option>${esc(o)}</option>`).join("")}</select></label>`:""}
      <div class="sizes" role="group" aria-label="Tamaño de ${esc(d.nombre)}">${d.precios.map((p,i)=>`<button class="size" type="button" aria-pressed="${i===0}" data-i="${i}">${p.precio!=null?`<span>${esc(p.tamano)}</span>`:""}<span>${money(p.precio)}</span></button>`).join("")}</div>
      <button class="add" type="button" ${d.off?"disabled":""}>${d.off?"Agotado hoy":"Agregar al pedido"}</button>
    </article>`;
}
function renderMenu(){
  const sec=section();
  $("#menu").style.setProperty("--accent",colorOf(sec.color));
  $("#menuTitle").textContent=sec.nombre;
  $("#menuBody").setAttribute("aria-labelledby","tab-"+sec.id);
  renderTabs();
  if(tab==="bowl"){renderFilters([]);renderBowl();return}
  const all=dishes().filter(d=>d.seccion===tab);
  renderFilters(all);
  const list=filter==="todo"?all:all.filter(d=>d.etiquetas.includes(filter));
  $("#menuBody").innerHTML = list.length
    ? `<div class="grid">${list.map((d,n)=>cardHTML(d,n)).join("")}</div>`
    : `<div class="empty-state">Ningún plato de ${esc(sec.nombre.toLowerCase())} tiene la etiqueta “${esc(M.etiquetas[filter])}”. Prueba otra sección o quita el filtro.</div>`;
}

/* ============ POWER-BOWL ============ */
function renderBowl(focusSel){
  const B=M.powerBowl, sz=B.tamanos[bowlSel.size];
  $("#menuBody").innerHTML = `<div class="bowl"><div>
    <div class="step"><h3>Tamaño</h3><div class="sizes" role="group" aria-label="Tamaño del power-bowl">${B.tamanos.map((s,i)=>`<button class="size" type="button" aria-pressed="${i===bowlSel.size}" data-sz="${i}"><span>${esc(s.tamano)}</span><span>${money(s.precio)}</span></button>`).join("")}</div></div>
    ${B.pasos.map((p,si)=>`<div class="step"><h3>${esc(p.paso)}</h3><div class="opts" role="group" aria-label="${esc(p.paso)}">${p.opciones.map((o,oi)=>`<button type="button" aria-pressed="${bowlSel.picks[si]===o}" data-s="${si}" data-o="${oi}">${esc(o)}</button>`).join("")}</div></div>`).join("")}
  </div>
  <aside class="summary" aria-label="Resumen de tu power-bowl"><h3>Tu power-bowl ${esc(sz.tamano)}</h3>
    <ul>${B.pasos.map((p,si)=>`<li>${esc(p.paso)}: ${bowlSel.picks[si]?esc(bowlSel.picks[si]):"<em>por elegir</em>"}</li>`).join("")}</ul>
    <div class="total">${money(sz.precio)}</div>
    <button type="button" id="addBowl">Agregar al pedido</button></aside></div>`;
  if(focusSel){const el=$(focusSel); if(el) el.focus();}
}
function addBowl(){
  const B=M.powerBowl, sz=B.tamanos[bowlSel.size];
  const missing=B.pasos.filter((p,i)=>!bowlSel.picks[i]).map(p=>p.paso.toLowerCase());
  if(missing.length){NB.toast("Falta elegir: "+missing.join(", "));return}
  NB.cart.add({name:"Power-bowl",size:sz.tamano,opt:B.pasos.map((p,i)=>bowlSel.picks[i]).join(", "),price:sz.precio});
}

/* ============ EVENTOS (delegados: el contenido se vuelve a pintar) ============ */
function bind(){
  const tabs=$("#tabs");
  tabs.addEventListener("click",e=>{const b=e.target.closest("[data-tab]"); if(b) selectTab(b.dataset.tab,true)});
  tabs.addEventListener("keydown",e=>{
    const ids=M.secciones.map(s=>s.id), i=ids.indexOf(tab);
    const next={ArrowRight:i+1,ArrowLeft:i-1,Home:0,End:ids.length-1}[e.key];
    if(next===undefined) return;
    e.preventDefault(); selectTab(ids[(next+ids.length)%ids.length],true);
  });
  $("#filters").addEventListener("click",e=>{
    const c=e.target.closest("[data-f]"); if(!c) return;
    filter=c.dataset.f; renderMenu();
    const again=$(`#filters [data-f="${filter}"]`); if(again) again.focus();
  });
  $("#menuBody").addEventListener("click",e=>{
    // Tarjetas
    const size=e.target.closest(".card .size");
    if(size){const card=size.closest(".card");card.querySelectorAll(".size").forEach(x=>x.setAttribute("aria-pressed","false"));size.setAttribute("aria-pressed","true");return}
    const add=e.target.closest(".card .add");
    if(add){
      const card=add.closest(".card"), d=M.platos.find(x=>x.id===card.dataset.id);
      const p=d.precios[+card.querySelector('.size[aria-pressed="true"]').dataset.i];
      const opt=card.querySelector(".opt")?card.querySelector(".opt").value:"";
      NB.cart.add({name:d.nombre,size:(p.tamano==="Único"||p.precio==null)?"":p.tamano,opt,price:p.precio});
      return;
    }
    // Power-bowl
    const sz=e.target.closest("[data-sz]");
    if(sz){bowlSel.size=+sz.dataset.sz;renderBowl(`[data-sz="${sz.dataset.sz}"]`);return}
    const o=e.target.closest(".opts [data-s]");
    if(o){bowlSel.picks[o.dataset.s]=M.powerBowl.pasos[o.dataset.s].opciones[o.dataset.o];renderBowl(`[data-s="${o.dataset.s}"][data-o="${o.dataset.o}"]`);return}
    if(e.target.closest("#addBowl")) addBowl();
  });
}

/* ============ ARRANQUE ============ */
NB.load("menu").then(m=>{
  M=m;
  const fromHash=location.hash.slice(1);
  if(M.secciones.some(s=>s.id===fromHash)) tab=fromHash;
  bind(); renderToday(); renderMenu();
  // Enlaces a menu.html#seccion estando ya en la página
  addEventListener("hashchange",()=>{const id=location.hash.slice(1); if(id!==tab) selectTab(id,false)});
}).catch(()=>{});
})();
