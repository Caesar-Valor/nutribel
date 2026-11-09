/* =========================================================
   balé — lo común a todas las páginas del sitio
   - Menú del teléfono: cortina a pantalla completa (Esc la cierra, el foco no se pierde, el fondo no se desplaza).
   - Revelado al desplazarse: una sola vez por bloque, sin escalonar (solo opacity y transform).
   - Botones con data-wa: abren el WhatsApp de balé con el texto ya escrito.
   Sin dependencias: usa window.BALE (core.js).
   ========================================================= */
(function(){
"use strict";
const NB = window.BALE;
const $ = (s,el=document)=>el.querySelector(s);
const calma = ()=>matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Menú ---------- */
const btn=$("#menuBtn"), menu=$("#menu");
let abierto=false;
function menuAbrir(on){
  if(!btn||!menu) return;
  abierto=on;
  btn.setAttribute("aria-expanded",String(on));
  btn.setAttribute("aria-label",on?"Cerrar el menú":"Abrir el menú");
  menu.classList.toggle("abierto",on);
  document.body.classList.toggle("menu-abierto",on);
  if(on){ const a=menu.querySelector("a"); if(a) setTimeout(()=>a.focus(),calma()?0:120); }
  else btn.focus();
}
if(btn&&menu){
  btn.addEventListener("click",()=>menuAbrir(!abierto));
  addEventListener("keydown",e=>{
    if(!abierto) return;
    if(e.key==="Escape"){ e.preventDefault(); menuAbrir(false); return; }
    if(e.key==="Tab"){   // el foco se queda en el menú y su botón mientras está abierto
      const f=[btn,...menu.querySelectorAll("a")], i=f.indexOf(document.activeElement);
      if(e.shiftKey&&i<=0){ e.preventDefault(); f[f.length-1].focus(); }
      else if(!e.shiftKey&&i===f.length-1){ e.preventDefault(); f[0].focus(); }
    }
  });
  menu.addEventListener("click",e=>{ if(e.target.closest("a")&&abierto){ abierto=false; btn.setAttribute("aria-expanded","false"); menu.classList.remove("abierto"); document.body.classList.remove("menu-abierto"); } });
  matchMedia("(min-width:900px)").addEventListener("change",m=>{ if(m.matches&&abierto) menuAbrir(false); });
}

/* ---------- Revelado ----------
   El contenido es visible por defecto (sin JS, o si algo falla, se ve todo). Aquí, ya en marcha, se
   esconde solo lo que está por debajo de la pantalla y se revela una vez al llegar. */
function revelar(){
  const els=[...document.querySelectorAll("[data-reveal]:not(.visto)")];
  if(calma()||!("IntersectionObserver" in window)){ els.forEach(el=>{ el.classList.remove("por-ver"); el.classList.add("visto"); }); return; }
  let activo=false;
  const ver=el=>{ el.classList.remove("por-ver"); el.classList.add("visto"); };
  const io=new IntersectionObserver(es=>{ activo=true; es.forEach(e=>{ if(e.isIntersecting){ ver(e.target); io.unobserve(e.target); } }); },{threshold:.08,rootMargin:"0px 0px -32px 0px"});
  // Lo que apunta el # de la dirección (p. ej. nosotras.html#equipo) se ve desde el principio
  const destino=()=>{ try{ return location.hash.length>1?document.getElementById(decodeURIComponent(location.hash.slice(1))):null; }catch(e){ return null; } };
  const enDestino=(el,d)=>d&&(el.contains(d)||d.contains(el));
  const d=destino(), alto=innerHeight;
  els.forEach(el=>{
    if(!enDestino(el,d)&&el.getBoundingClientRect().top>alto) el.classList.add("por-ver");   // ya a la vista: no se esconde
    else ver(el);
    io.observe(el);
  });
  addEventListener("hashchange",()=>{ const t=destino(); if(t) document.querySelectorAll("[data-reveal].por-ver").forEach(el=>{ if(enDestino(el,t)) ver(el); }); });
  // Respaldo: si el observador no llegó a avisar en 2,5 s, se muestra todo
  setTimeout(()=>{ if(!activo) document.querySelectorAll("[data-reveal].por-ver").forEach(ver); },2500);
}
revelar();   // sitio.js va con defer: corre con el HTML ya leído

/* ---------- Cabecera: se compacta al bajar ---------- */
(function(){
  const h=document.documentElement; let on=false;
  const ver=()=>{ const v=scrollY>24; if(v!==on){ on=v; h.classList.toggle("cab-compacta",v); } };
  addEventListener("scroll",ver,{passive:true}); ver();
})();

/* ---------- Teléfono: la barra «Reservar» aparece al pasar la portada (allí ya está el botón) ---------- */
(function(){
  const p=document.querySelector(".portada"), b=document.querySelector(".barra-movil");
  if(!p||!b||!("IntersectionObserver" in window)) return;
  document.body.classList.add("barra-oculta");
  new IntersectionObserver(([e])=>document.body.classList.toggle("barra-oculta",e.isIntersecting),{rootMargin:"0px 0px -35% 0px"}).observe(p);
})();

/* ---------- Telón de la portada: se salta con un clic o una tecla ---------- */
(function(){
  const t=document.getElementById("telon"); if(!t) return;
  const h=document.documentElement;
  if(!h.classList.contains("con-telon")){ t.remove(); return; }
  const fin=()=>{ removeEventListener("pointerdown",saltar); removeEventListener("keydown",saltar); t.remove(); };
  const saltar=()=>{ h.classList.add("telon-saltado"); fin(); };
  addEventListener("pointerdown",saltar);
  addEventListener("keydown",saltar);
  setTimeout(fin,2400);
})();

/* ---------- Equipo: la biografía en 4 líneas y «Leer más» solo si no cabe ---------- */
document.querySelectorAll(".member .mbio").forEach(b=>{
  const bt=b.nextElementSibling; if(!bt||!bt.classList.contains("biomore")) return;
  b.classList.add("clamp");
  if(b.scrollHeight<=b.clientHeight+2){ b.classList.remove("clamp"); return; }
  bt.hidden=false;
  bt.addEventListener("click",()=>{
    const open=bt.getAttribute("aria-expanded")==="true";
    b.classList.toggle("clamp",open);
    bt.setAttribute("aria-expanded",String(!open));
    bt.textContent=open?"Leer más":"Leer menos";
  });
});

/* ---------- Instagram en Comunidad: el embed oficial solo al pulsar «Ver aquí» ---------- */
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-ig]"); if(!b) return;
  const url=b.dataset.ig; if(!/^https:\/\/www\.instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+\/embed\/$/.test(url)) return;
  const li=b.closest(".ig-post"), marco=li&&li.querySelector("[data-ig-marco]"); if(!marco) return;
  const f=document.createElement("iframe");
  f.src=url; f.title="Publicación de Instagram de balé"; f.loading="lazy"; f.className="ig-embed";
  f.setAttribute("referrerpolicy","strict-origin-when-cross-origin");
  marco.replaceChildren(f); marco.classList.add("con-embed");
  b.remove();
  f.focus();
});

/* ---------- Mapa de la portada: solo se carga al tocar «Ver el mapa» ---------- */
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-ver-mapa]"); if(!b) return;
  const fig=b.closest("[data-mapa]"), url=fig&&fig.dataset.mapa; if(!url||!/^https:\/\/www\.google\.com\/maps\?/.test(url)) return;
  const f=document.createElement("iframe");
  f.src=url; f.title="Mapa: balé en La Vega"; f.loading="lazy"; f.setAttribute("referrerpolicy","no-referrer-when-downgrade");
  fig.replaceChildren(f); f.focus();
});

/* ---------- Entradas: la de Comunidad, en cada sección ----------
   Cabecera de página: la anima el CSS al cargar; si el navegador la trae de su memoria (atrás/adelante,
   bfcache), se reinicia para que se vea otra vez. Secciones: cada vez que entran en pantalla, el título
   hace el relevé, el texto y las tarjetas llegan escalonados y las fotos suben como telón; al salir del
   todo quedan listas para la próxima. Aquí solo se marcan (.a-titulo, .a-sube, .a-arco); el equipo
   conserva su propio telón. Nada con movimiento reducido ni sin IntersectionObserver. */
(function(){
  addEventListener("pageshow",e=>{ if(e.persisted&&!calma()){ const h=document.documentElement; h.classList.add("reinicia"); void h.offsetWidth; h.classList.remove("reinicia"); } });
  if(calma()||!("IntersectionObserver" in window)) return;
  const BLOQUES="main section.sec, main section.clase, main .precios > *";
  const LISTAS=".cl-lista > li, .momentos > li, .pbreve > li, .faq > details, .insta-fotos > li, .salas > *, .prices > *, .pinfo > *";
  const FOTOS=".estfoto, .refo-ph, .cfoto, .ubic-mapa, .mapa, .mpair, .gcard";
  const SUELTOS=".historia, .proxima-tarjeta, .pnota-clara, .acciones.fin, .otra";
  const tope=n=>Math.min(n,5);
  const bloques=[...document.querySelectorAll(BLOQUES)].filter(b=>!b.closest(".portada"));
  if(!bloques.length) return;
  bloques.forEach(b=>{
    // El revelado general cede su sitio a esta entrada (salvo el telón del equipo)
    [b,...b.querySelectorAll("[data-reveal]")].forEach(el=>{ if(el.matches("[data-reveal]")&&!el.classList.contains("member")){ el.removeAttribute("data-reveal"); el.classList.remove("por-ver"); } });
    const items=[...b.querySelectorAll(LISTAS)];
    const enItem=el=>items.some(i=>i!==el&&i.contains(el));
    b.querySelectorAll("h2").forEach(h=>{
      if(enItem(h)) return;
      h.classList.add("a-titulo");
      let k=1; for(let s=h.nextElementSibling;s;s=s.nextElementSibling){ s.classList.add("a-sube"); s.style.setProperty("--k",tope(k++)); }
    });
    b.querySelectorAll(SUELTOS).forEach(el=>{ if(!enItem(el)&&!el.classList.contains("a-sube")){ el.classList.add("a-sube"); el.style.setProperty("--k",3); } });
    const grupos=new Map(); items.forEach(i=>{ const p=i.parentElement; grupos.set(p,(grupos.get(p)||0)+1); i.classList.add("a-sube"); i.style.setProperty("--k",tope(grupos.get(p))); });
    b.querySelectorAll(FOTOS).forEach(f=>{ if(f.closest(".team")) return; f.classList.remove("a-sube"); f.classList.add("a-arco"); });
    b.classList.add("sec-anima");
  });
  // Entra cuando su borde superior pasa el 88 % de la pantalla; sale cuando ya no se ve nada
  let avisa=false;
  const entra=new IntersectionObserver(es=>es.forEach(e=>{ avisa=true; if(e.isIntersecting) e.target.classList.add("sec-entra"); }),{rootMargin:"0px 0px -12% 0px"});
  const sale=new IntersectionObserver(es=>es.forEach(e=>{ if(!e.isIntersecting) e.target.classList.remove("sec-entra"); }));
  bloques.forEach(b=>{ entra.observe(b); sale.observe(b); });
  // Respaldo: si el observador no llegó a avisar en 2,5 s, nada se queda escondido
  setTimeout(()=>{ if(!avisa) bloques.forEach(b=>b.classList.remove("sec-anima")); },2500);
})();

/* ---------- WhatsApp ---------- */
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-wa]"); if(!b) return;
  e.preventDefault();
  NB.ready.then(()=>NB.whatsapp(b.dataset.wa)).catch(()=>NB.whatsapp(b.dataset.wa));
});

window.BALE_SITIO = {revelar, calma};
})();

/* ---------- Icono de «Mi cuenta»: dice si hay una sesión abierta en este navegador ---------- */
(function(){
  const b=document.getElementById("cuentaBtn"); if(!b) return;
  let s=false; try{ s=!!localStorage.getItem("bale-cuenta-auth"); }catch(e){}
  if(s){ b.setAttribute("aria-label","Mi cuenta (sesión abierta)"); b.classList.add("con-sesion"); }
})();
