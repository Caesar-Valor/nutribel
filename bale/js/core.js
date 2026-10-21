/* =========================================================
   balé — utilidades propias (copia mínima de la base de NutriBEL)
   Datos (data/*.json), WhatsApp de balé (data/config.json), cambios del
   panel del negocio (panel.html, guardados en este navegador), modo
   oscuro con transición circular y aviso emergente.
   No depende de nada fuera de la carpeta bale/.
   ========================================================= */
(function(){
"use strict";
const MODE_KEY = "bale-mode";        // "dark" | "light"
const PANEL_KEY = "bale-panel";      // cambios del panel del negocio (ver js/panel.js)

const $ = (s,el=document)=>el.querySelector(s);
const esc = s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n=>typeof n==="number"?"RD$"+n.toLocaleString("es-DO"):"Precio por confirmar";
const cssVar = name=>getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const fmtH = h=>{const hh=Math.floor(h), mm=Math.round((h-hh)*60), h12=hh%12||12;return `${h12}:${String(mm).padStart(2,"0")} ${hh>=12?"pm":"am"}`};
// Fotos de img/ con variantes -480/-800
function srcset(src){
  if(!/^img\/[^/]+\.webp$/.test(src||"")||/-(480|800)\.webp$/.test(src)) return "";
  const b=src.slice(0,-5);
  return `${b}-480.webp 480w, ${b}-800.webp 800w`;
}

function toast(msg){
  const t=$("#toast"); if(!t) return;
  t.textContent=msg; t.classList.add("show");
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("show"),3200);
}

/* ---------- Datos ---------- */
const cache={};
function load(name){
  if(!cache[name]){
    cache[name]=fetch(`data/${name}.json`).then(r=>{
      if(!r.ok) throw new Error(`data/${name}.json: ${r.status}`);
      return r.json();
    }).catch(err=>{ showDataError(); throw err; });
  }
  return cache[name];
}
function showDataError(){
  if($(".devnote")) return;
  const n=document.createElement("div");
  n.className="devnote"; n.setAttribute("role","alert");
  n.textContent=location.protocol==="file:"
    ? "Para ver el contenido abre la web con un servidor local (por ejemplo: npx serve), no con doble clic en el archivo."
    : "No se pudo cargar parte del contenido. Recarga la página en unos segundos.";
  document.body.prepend(n);
}

/* ---------- Panel del negocio (demo: solo en este navegador) ---------- */
const panel={
  read(){
    let s=null; try{ s=JSON.parse(localStorage.getItem(PANEL_KEY)); }catch(e){}
    s=s||{};
    return {cfg:s.cfg||{}, precios:s.precios||{}, cupos:s.cupos||{}, sala:s.sala||null,
      canceladas:Array.isArray(s.canceladas)?s.canceladas:null, eventos:Array.isArray(s.eventos)?s.eventos:null,
      aviso:typeof s.aviso==="string"?s.aviso:null};
  },
  save(v){ try{ localStorage.setItem(PANEL_KEY,JSON.stringify(v)); return true; }catch(e){ return false; } },
  clear(){ try{ localStorage.removeItem(PANEL_KEY); }catch(e){} }
};
const digitsOf = s=>String(s||"").replace(/\D/g,"");
const fmtPhone = s=>{ const d=digitsOf(s); return d.length===11&&d[0]==="1" ? `+1 ${d.slice(1,4)}-${d.slice(4,7)}-${d.slice(7)}` : d?`+${d}`:""; };
const igUser = url=>{ const m=String(url||"").match(/instagram\.com\/([^/?#]+)/i); return m?`@${m[1]}`:""; };
// config.json con los datos de contacto cambiados en el panel
function mergeCfg(c){
  const o=panel.read().cfg, r=JSON.parse(JSON.stringify(c));
  if(o.whatsapp){ r.whatsapp=digitsOf(o.whatsapp); r.whatsapp_texto=fmtPhone(o.whatsapp); }
  if(o.instagram){ r.instagram=o.instagram; r.instagram_usuario=igUser(o.instagram)||r.instagram_usuario; }
  if(o.direccion){ r.direccion=o.direccion; r.maps=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.direccion+", República Dominicana")}`; }
  if(o.maps) r.maps=o.maps;
  if(o.correo&&r.aviso_correo) r.aviso_correo.endpoint=`https://formsubmit.co/ajax/${o.correo}`;
  return r;
}

/* ---------- WhatsApp de balé ---------- */
let cfg=null;
const ready=load("config").then(c=>(cfg=mergeCfg(c)));
function waLink(text){
  const num=((cfg&&cfg.whatsapp)||"").replace(/\D/g,"");
  return num?`https://wa.me/${num}${text?`?text=${encodeURIComponent(text)}`:""}`:"";
}
function openWA(text){
  const url=waLink(text);
  if(!url){ toast("Cargando los datos de balé, inténtalo de nuevo en un momento."); return; }
  window.open(url,"_blank","noopener");
}

/* ---------- Modo oscuro ---------- */
function applyMode(m){
  const dark=m==="dark";
  if(dark) document.documentElement.setAttribute("data-mode","dark"); else document.documentElement.removeAttribute("data-mode");
  const b=$("#modeBtn"); if(b) b.setAttribute("aria-label",dark?"Cambiar a modo claro":"Cambiar a modo oscuro");
}
function toggleMode(){
  const root=document.documentElement, m=root.getAttribute("data-mode")==="dark"?"light":"dark";
  const save=()=>{applyMode(m);try{localStorage.setItem(MODE_KEY,m)}catch(e){}};
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){save();return}
  if(!document.startViewTransition){
    root.classList.add("mode-anim"); save(); setTimeout(()=>root.classList.remove("mode-anim"),550); return;
  }
  const r=$("#modeBtn").getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
  const end=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
  const tr=document.startViewTransition(save);
  tr.ready.then(()=>{
    root.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${end}px at ${x}px ${y}px)`]},
      {duration:650,easing:cssVar("--ease-in-out")||"cubic-bezier(.65,0,.35,1)",pseudoElement:"::view-transition-new(root)"});
  }).catch(()=>{});
}
let m="light"; try{m=localStorage.getItem(MODE_KEY)||"light"}catch(e){}
applyMode(m);
const mb=$("#modeBtn"); if(mb) mb.addEventListener("click",toggleMode);
addEventListener("storage",e=>{ if(e.key===MODE_KEY) applyMode(e.newValue||"light"); });
document.body.insertAdjacentHTML("beforeend",`<div class="toast" id="toast" role="status" aria-live="polite"></div>`);

window.BALE = {$, esc, money, toast, load, ready, srcset, fmtH, whatsapp:openWA, waLink, cfg:()=>cfg, panel, mergeCfg, fmtPhone, igUser, PANEL_KEY};
})();
