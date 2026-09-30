/* =========================================================
   bale.html — entrada de telón, apariciones al desplazarse y
   horario interactivo desde data/bale.json (filtros por día y
   por clase, clase de hoy destacada y reserva por WhatsApp,
   de momento con el número de NutriBEL).
   ========================================================= */
(function(){
"use strict";
const {$, esc} = NB;
const DAYS = [["lunes","Lunes"],["martes","Martes"],["miercoles","Miércoles"],["jueves","Jueves"],["viernes","Viernes"],["sabado","Sábado"]];
const dayName = k=>(DAYS.find(d=>d[0]===k)||[k,k])[1];
let D, day="todos", type="todas";

const toH = t=>{const [h,m]=t.split(":").map(Number);return h+m/60};
// "17:30"–"18:30" -> "5:30 – 6:30 pm" (el am/pm se escribe una vez si coincide)
function range(c){
  const a=NB.fmtH(toH(c.inicio)), b=NB.fmtH(toH(c.fin));
  return a.slice(-2)===b.slice(-2) ? `${a.slice(0,-3)} – ${b}` : `${a} – ${b}`;
}
function todayKey(){ const d=new Date().getDay(); return d>=1&&d<=6 ? DAYS[d-1][0] : null; }
function isNow(c){
  if(c.dia!==todayKey()) return false;
  const n=new Date(), h=n.getHours()+n.getMinutes()/60;
  return h>=toH(c.inicio) && h<toH(c.fin);
}

function renderFilters(){
  const tk=todayKey(), types=[...new Set(D.horario.map(c=>c.clase))];
  $("#fDay").innerHTML=[["todos","Todos"]].concat(DAYS).map(([k,v])=>`<button class="chip" type="button" data-day="${k}" aria-pressed="${day===k}">${v}${k===tk?'<i class="hoy">hoy</i>':""}</button>`).join("");
  $("#fType").innerHTML=[["todas","Todas"]].concat(types.map(t=>[t,t])).map(([k,v])=>`<button class="chip" type="button" data-type="${esc(k)}" aria-pressed="${type===k}">${esc(v)}</button>`).join("");
}

function renderSchedule(){
  const tk=todayKey();
  const cols=DAYS.filter(([k])=>day==="todos"||day===k).map(([k,label])=>{
    const list=D.horario.filter(c=>c.dia===k&&(type==="todas"||c.clase===type));
    return {k,label,list};
  }).filter(c=>c.list.length);

  if(!cols.length){
    const t=type==="todas"?"clases":`clases de ${type}`;
    $("#days").innerHTML=`<div class="empty-state">No hay ${esc(t)} ${day==="todos"?"esta semana":"el "+esc(dayName(day).toLowerCase())}. Prueba otro día o quita el filtro.</div>`;
    return;
  }
  $("#days").innerHTML=cols.map(({k,label,list},col)=>`
    <section class="day ${k===tk?"today":""}" aria-labelledby="d-${k}">
      <h3 id="d-${k}">${label}${k===tk?'<span class="badge-b">Hoy</span>':""}</h3>
      <ol>${list.map((c,n)=>{
        const i=D.horario.indexOf(c), now=isNow(c);
        return `<li class="cls ${now?"now":""}" style="--i:${n+col*2}">
          ${now?'<span class="badge-b">En curso</span>':""}
          <time>${range(c)}</time>
          <b>${esc(c.clase)}</b>
          ${c.nota?`<span class="note">${esc(c.nota)}</span>`:""}
          <span class="who">Instructora: <strong>${esc(c.instructora)}</strong></span>
          <button class="res" type="button" data-i="${i}" aria-label="Reservar ${esc(c.clase)}, el ${label.toLowerCase()} de ${range(c).replace(" – "," a ")}">Reservar <span aria-hidden="true">→</span></button>
        </li>`}).join("")}</ol>
    </section>`).join("");
}

function reserve(c){
  NB.whatsapp(`Hola, quiero reservar una clase en balé:\nClase: ${c.clase}${c.nota?` (${c.nota})`:""}\nDía: ${dayName(c.dia)}\nHora: ${range(c)}\nInstructora: ${c.instructora}`);
}

NB.load("bale").then(data=>{
  D=data;
  if(!todayKey()) $("#todayNote").textContent="Hoy domingo no hay clases.";
  // En móvil la semana completa es muy larga: empieza por hoy si hay clases
  const tk=todayKey();
  if(matchMedia("(max-width:760px)").matches && tk && D.horario.some(c=>c.dia===tk)) day=tk;
  renderFilters(); renderSchedule();
  $("#fDay").addEventListener("click",e=>{const b=e.target.closest("[data-day]"); if(!b) return; day=b.dataset.day; renderFilters(); renderSchedule(); $(`#fDay [data-day="${day}"]`).focus()});
  $("#fType").addEventListener("click",e=>{const b=e.target.closest("[data-type]"); if(!b) return; type=b.dataset.type; renderFilters(); renderSchedule(); $(`#fType [data-type="${CSS.escape(type)}"]`).focus()});
  $("#days").addEventListener("click",e=>{const b=e.target.closest(".res"); if(b) reserve(D.horario[+b.dataset.i])});
  // "En curso" se actualiza solo: repinta solo si cambió, conservando el foco
  let lastNow=D.horario.filter(isNow).map(c=>c.inicio+c.dia).join();
  setInterval(()=>{
    const sig=D.horario.filter(isNow).map(c=>c.inicio+c.dia).join();
    if(sig===lastNow) return;
    lastNow=sig;
    const f=document.activeElement&&document.activeElement.dataset.i;
    renderSchedule();
    if(f){const el=$(`.res[data-i="${f}"]`); if(el) el.focus();}
  },60000);
}).catch(()=>{});

/* ---------- Entrada: el telón se salta con un clic o una tecla ---------- */
const intro=$("#bintro");
if(intro){
  const done=()=>{removeEventListener("pointerdown",skip);removeEventListener("keydown",skip);intro.remove()};
  const skip=()=>{document.body.classList.add("no-intro");done()};
  addEventListener("pointerdown",skip);
  addEventListener("keydown",skip);
  setTimeout(done,2400); // terminó solo
}

/* ---------- Aparición al desplazarse (una sola vez por elemento) ---------- */
const reveal=[...document.querySelectorAll("[data-reveal]")];
if("IntersectionObserver" in window){
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.12,rootMargin:"0px 0px -40px 0px"});
  reveal.forEach(el=>io.observe(el));
}else reveal.forEach(el=>el.classList.add("in"));

$("#trialBtn").addEventListener("click",()=>NB.whatsapp("Hola, me interesa una clase de prueba de Barre. ¿Qué horarios tienen disponibles?"));
})();
