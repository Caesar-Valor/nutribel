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
  const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.remove("por-ver"); e.target.classList.add("visto"); io.unobserve(e.target); } }),{threshold:.08,rootMargin:"0px 0px -32px 0px"});
  const alto=innerHeight;
  els.forEach(el=>{
    if(el.getBoundingClientRect().top>alto) el.classList.add("por-ver");   // ya a la vista: no se esconde
    io.observe(el);
  });
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
