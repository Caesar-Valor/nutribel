/* =========================================================
   NutriBEL — lógica compartida por todas las páginas
   Cabecera y navegación, modo oscuro, horario abierto/cerrado,
   WhatsApp, carrito persistente (localStorage) y utilidades.
   Cada página declara <body data-page="..."> y carga este archivo con defer.
   ========================================================= */
(function(){
"use strict";

/* ============ CONFIGURACIÓN ============ */
const PAGES = [
  ["index","Inicio"],["metodo","Método 1 al 6"],["menu","Menú"],["servicios","Servicios"],
  ["planes","Planes"],["bale","balé"],["consulta","Consulta"],["contacto","Visítanos"]
];
const MODE_KEY  = "nutribel-mode";    // "dark" | "light"
const CART_KEY  = "nutribel-pedido";  // {items:[{name,size,opt,price,qty}], mode}
const PANEL_KEY = "nutribel-panel";   // {overrides:{id:{t,nu,off}}, week:[], cfg:{whatsapp,address,maps}} (formato del demo)
const DAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const MODE_TXT = {recoger:"Para recoger", local:"Comer en el local", cerca:"Delivery cercano", lejos:"Delivery zona retirada"};

/* ============ UTILIDADES ============ */
const $ = (s,el=document)=>el.querySelector(s);
const esc = s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n=>typeof n==="number"?"RD$"+n.toLocaleString("es-DO"):"Precio por confirmar";
function readLS(key){try{return JSON.parse(localStorage.getItem(key))}catch(e){return null}}
function writeLS(key,val){try{localStorage.setItem(key,JSON.stringify(val))}catch(e){}}

function toast(msg){
  const t=$("#toast"); if(!t) return;
  t.textContent=msg; t.classList.add("show");
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("show"),2600);
}

/* ============ DATOS (data/*.json) ============ */
const cache = {};
function load(name){
  if(!cache[name]){
    cache[name] = fetch(`data/${name}.json`).then(r=>{
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
  n.textContent = location.protocol==="file:"
    ? "Para ver el contenido abre la web con un servidor local (por ejemplo: npx serve), no con doble clic en el archivo."
    : "No se pudo cargar parte del contenido. Recarga la página en unos segundos.";
  document.body.prepend(n);
}

/* ============ PANEL DEL NEGOCIO (demo en este navegador) ============ */
const panel = {
  read(){
    const s=readLS(PANEL_KEY)||{};
    return {overrides:s.overrides||{}, week:Array.isArray(s.week)?s.week:null, cfg:s.cfg||{}};
  },
  save(store){ writeLS(PANEL_KEY,store); },
  clear(){ try{localStorage.removeItem(PANEL_KEY)}catch(e){} }
};

/* Datos del negocio con los cambios del panel aplicados */
let biz = null;
function mergeCfg(n){
  const c=panel.read().cfg;
  return Object.assign({}, n, {
    whatsapp: c.whatsapp!==undefined ? c.whatsapp : n.whatsapp,
    direccion: c.address || n.direccion,
    google_maps: c.maps || n.google_maps
  });
}
const ready = load("negocio").then(n=>{ biz=mergeCfg(n); return biz; });

/* ============ WHATSAPP ============ */
function waNumber(){ return ((biz&&biz.whatsapp)||"").replace(/\D/g,""); }
function waLink(text){
  const num=waNumber();
  return num ? `https://wa.me/${num}${text?`?text=${encodeURIComponent(text)}`:""}` : "";
}
function openWA(text){
  if(!biz){toast("Cargando datos del negocio, inténtalo de nuevo en un momento.");return}
  const url=waLink(text);
  if(!url){toast("Falta el número de WhatsApp del negocio. Agrégalo en el panel.");return}
  window.open(url,"_blank","noopener");
}

/* ============ HORARIO ============ */
// "8:00 am – 8:00 pm" -> [8, 20]; "Cerrado" -> null
function parseRange(txt){
  const m=[...String(txt||"").matchAll(/(\d{1,2}):(\d{2})\s*(am|pm)/gi)];
  if(m.length<2) return null;
  const h=x=>{let v=(+x[1])%12+(+x[2])/60; if(x[3].toLowerCase()==="pm") v+=12; return v};
  return [h(m[0]),h(m[1])];
}
const fmtH = h=>{const hh=Math.floor(h), mm=Math.round((h-hh)*60), h12=hh%12||12;return `${h12}:${String(mm).padStart(2,"0")} ${hh>=12?"pm":"am"}`};
// {0..6: [apertura, cierre] en horas decimales, o null si cierra}
function openRanges(){
  if(!biz) return null;
  const hz=biz.horario||{}, wk=parseRange(hz.lunes_a_viernes);
  return {0:parseRange(hz.domingo),1:wk,2:wk,3:wk,4:wk,5:wk,6:parseRange(hz.sabado)};
}
function hoursState(now=new Date()){
  if(!biz) return null;
  const hz=biz.horario||{}, ranges=openRanges();
  const d=now.getDay(), h=now.getHours()+now.getMinutes()/60, r=ranges[d];
  const open=!!(r && h>=r[0] && h<r[1]);
  return {
    open, day:d,
    text: open ? `Abierto hasta las ${fmtH(r[1])}` : "Cerrado ahora",
    rows: [["Lunes a viernes",hz.lunes_a_viernes,d>=1&&d<=5],["Sábado",hz.sabado,d===6],["Domingo",hz.domingo,d===0]]
  };
}
function renderStatus(){
  const s=hoursState(); if(!s) return;
  $("#dot").classList.toggle("on",s.open);
  $("#statusTxt").textContent=s.text;
  document.dispatchEvent(new CustomEvent("nb:horario",{detail:s}));
}

/* ============ CABECERA, NAVEGACIÓN Y PIE ============ */
const ICON_MOON = `<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
const ICON_SUN  = `<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;

function renderHeader(){
  const page=document.body.dataset.page;
  let top=$("#cabecera");
  if(!top){top=document.createElement("header");top.id="cabecera";document.body.prepend(top)}
  top.className="top";
  top.innerHTML = `
  <div class="wrap bar">
    <a class="home" href="index.html" aria-label="NutriBEL, ir al inicio">
      <img src="assets/img/marca/logo-circulo.webp" alt="Logo de NutriBEL" width="40" height="40">
      <span class="brand">NutriBEL<small>Dra. Bielka Eusebio</small></span>
    </a>
    <div class="status"><i class="dot" id="dot"></i><span id="statusTxt">…</span></div>
    <button class="modebtn" id="modeBtn" type="button" aria-label="Cambiar a modo oscuro" title="Modo oscuro / claro">${ICON_MOON}${ICON_SUN}</button>
    <button class="cartbtn" id="openCart" type="button" aria-label="Ver pedido">Pedido <b id="count">0</b></button>
  </div>
  <nav class="nav" aria-label="Páginas"><div class="wrap">
    ${PAGES.map(([id,label])=>`<a href="${id}.html"${id===page?' aria-current="page"':""}>${label}</a>`).join("")}
  </div></nav>`;
  // En móvil la navegación se desplaza: deja visible la página actual
  const cur=$('.nav a[aria-current="page"]',top), strip=$(".nav .wrap",top);
  if(cur && strip.scrollWidth>strip.clientWidth){
    strip.scrollLeft = cur.offsetLeft - (strip.clientWidth-cur.offsetWidth)/2;
  }
}

function renderFooter(){
  const f=document.createElement("footer");
  f.innerHTML=`<div class="wrap"><span>NutriBEL, nutrición personalizada y bienestar integral. La Vega, República Dominicana.</span><a class="linkbtn" href="panel.html">Panel del negocio</a></div>`;
  const main=$("main"); main ? main.after(f) : document.body.append(f);
}

/* ============ MODO OSCURO ============ */
function applyMode(m){
  const dark=m==="dark";
  if(dark) document.documentElement.setAttribute("data-mode","dark"); else document.documentElement.removeAttribute("data-mode");
  const b=$("#modeBtn"); if(b) b.setAttribute("aria-label",dark?"Cambiar a modo claro":"Cambiar a modo oscuro");
}
function toggleMode(){
  const root=document.documentElement, m=root.getAttribute("data-mode")==="dark"?"light":"dark";
  const save=()=>{applyMode(m);try{localStorage.setItem(MODE_KEY,m)}catch(e){}};
  const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduce){save();return}
  if(!document.startViewTransition){
    root.classList.add("mode-anim"); save(); setTimeout(()=>root.classList.remove("mode-anim"),550); return;
  }
  const r=$("#modeBtn").getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
  const end=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
  const tr=document.startViewTransition(save);
  tr.ready.then(()=>{
    root.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${end}px at ${x}px ${y}px)`]},
      {duration:650,easing:"cubic-bezier(.65,0,.35,1)",pseudoElement:"::view-transition-new(root)"});
  }).catch(()=>{});
}
function initMode(){
  let m="light"; try{m=localStorage.getItem(MODE_KEY)||"light"}catch(e){}
  applyMode(m);
  $("#modeBtn").addEventListener("click",toggleMode);
}

/* ============ PEDIDO (carrito compartido entre páginas) ============ */
// Solo se guardan los productos y la modalidad. Nombre, dirección y nota
// no se guardan: viajan únicamente en el mensaje de WhatsApp.
function readCart(){
  const s=readLS(CART_KEY)||{};
  const items=(Array.isArray(s.items)?s.items:[]).filter(c=>c&&typeof c.name==="string"&&c.name)
    .map(c=>({name:c.name, size:String(c.size||""), opt:String(c.opt||""),
      price:typeof c.price==="number"&&isFinite(c.price)?c.price:null,
      qty:Math.max(1,Math.min(99,parseInt(c.qty,10)||1))}));
  return {items, mode:MODE_TXT[s.mode]?s.mode:"recoger"};
}
let cart=readCart();
const saveCart=()=>writeLS(CART_KEY,cart);

function fees(){
  const d=(biz&&biz.delivery)||{};
  return {recoger:0, local:0, cerca:d.cercano||0, lejos:d.zona_retirada||0};
}
function totals(){
  const sub=cart.items.reduce((a,c)=>a+c.qty*(c.price||0),0), fee=fees()[cart.mode]||0, pending=cart.items.some(c=>c.price==null);
  return {sub,fee,total:sub+fee,pending};
}

function addToCart(item){
  const it={name:String(item.name), size:String(item.size||""), opt:String(item.opt||""), price:typeof item.price==="number"?item.price:null};
  const same=cart.items.find(c=>c.name===it.name&&c.size===it.size&&c.opt===it.opt);
  if(same) same.qty=Math.min(99,same.qty+1); else cart.items.push(Object.assign({qty:1},it));
  saveCart(); renderCart(); toast(`${it.name} agregado al pedido`);
}

function renderDrawer(){
  const html=`
  <div class="scrim" id="scrim"></div>
  <aside class="drawer" id="cart" role="dialog" aria-modal="true" aria-labelledby="cartTitle">
    <header><h2 id="cartTitle">Tu pedido</h2><button class="x" type="button" data-close aria-label="Cerrar">×</button></header>
    <div class="body" id="cartBody"></div>
    <div class="foot">
      <div class="form">
        <div class="row2">
          <label class="fld">Nombre<input id="oName" autocomplete="name" placeholder="Tu nombre"></label>
          <label class="fld">Modalidad<select id="oMode"></select></label>
        </div>
        <label class="fld" id="dAddrWrap">Dirección de entrega<input id="oAddr" autocomplete="street-address" placeholder="Calle, número, sector y referencia"></label>
        <label class="fld">Nota para cocina (opcional)<input id="oNote" placeholder="Ej.: sin cebolla"></label>
        <button class="btn lime" id="sendOrder" type="button">Enviar pedido por WhatsApp</button>
      </div>
    </div>
  </aside>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>`;
  document.body.insertAdjacentHTML("beforeend",html);
  renderModeOptions();
}
function renderModeOptions(){
  const f=fees(), sel=$("#oMode");
  sel.innerHTML=Object.entries(MODE_TXT).map(([k,v])=>`<option value="${k}">${v}${f[k]?` (+${money(f[k])})`:""}</option>`).join("");
  sel.value=cart.mode;
}

function renderCart(){
  const n=cart.items.reduce((a,c)=>a+c.qty,0), T=totals();
  $("#count").textContent=n;
  $("#openCart").setAttribute("aria-label",n?`Ver pedido: ${n} ${n===1?"producto":"productos"}`:"Ver pedido: vacío");
  $("#dAddrWrap").classList.toggle("show",!!T.fee);
  $("#cartBody").innerHTML = !cart.items.length ? `<div class="empty-state">Tu pedido está vacío. Elige algo del menú y aparecerá aquí.</div>` :
    cart.items.map((c,i)=>`<div class="line"><div><b>${esc(c.name)}</b>${c.size?` (${esc(c.size)})`:""}<br><small>${esc(c.opt)}</small></div>
      <div class="qty"><button type="button" data-q="${i}" data-d="-1" aria-label="Quitar uno de ${esc(c.name)}">−</button>${c.qty}<button type="button" data-q="${i}" data-d="1" aria-label="Agregar uno de ${esc(c.name)}">+</button></div>
      <small>${c.price!=null?money(c.price)+" c/u":""}</small><b>${c.price!=null?money(c.price*c.qty):"Precio por confirmar"}</b></div>`).join("") +
    (T.fee?`<div class="line"><span>Delivery</span><b>${money(T.fee)}</b></div>`:"") +
    `<p class="cart-total">Total ${money(T.total)}</p>${T.pending?`<p class="privacy" style="text-align:right">Más las bebidas con precio por confirmar.</p>`:""}`;
}

function sendOrder(){
  if(!cart.items.length){toast("Agrega al menos un plato antes de enviar.");return}
  const T=totals(), mode=cart.mode, addr=$("#oAddr").value.trim(), name=$("#oName").value.trim(), note=$("#oNote").value.trim();
  if(T.fee&&!addr){toast("Escribe la dirección de entrega.");$("#oAddr").focus();return}
  const lines=cart.items.map(c=>`• ${c.qty} x ${c.name}${c.size?` (${c.size})`:""}${c.opt?` – ${c.opt}`:""}: ${c.price!=null?money(c.price*c.qty):"precio por confirmar"}`);
  openWA(`Hola NutriBEL, quiero hacer este pedido:\n${lines.join("\n")}${T.fee?`\nDelivery: ${money(T.fee)}`:""}\nTotal: ${money(T.total)}${T.pending?" (más bebidas por confirmar)":""}\n${MODE_TXT[mode]}${T.fee?`\nDirección: ${addr}`:""}${name?`\nNombre: ${name}`:""}${note?`\nNota: ${note}`:""}`);
}

/* ---------- Cajón: abrir, cerrar y foco ---------- */
let opener=null;
function openDrawer(id){
  opener=document.activeElement;
  $("#scrim").classList.add("show"); $(id).classList.add("show");
  $(id).querySelector(".x").focus();
}
function closeDrawers(){
  const wasOpen=!!$(".drawer.show");
  $("#scrim").classList.remove("show");
  document.querySelectorAll(".drawer").forEach(d=>d.classList.remove("show"));
  if(wasOpen&&opener&&opener.focus) opener.focus();
}
function trapFocus(e){
  const d=$(".drawer.show"); if(!d||e.key!=="Tab") return;
  const f=[...d.querySelectorAll('button,input,select,textarea,a[href]')].filter(x=>!x.disabled&&x.offsetParent!==null);
  if(!f.length) return;
  const first=f[0], last=f[f.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
}

function initCart(){
  renderDrawer(); renderCart();
  $("#openCart").addEventListener("click",()=>openDrawer("#cart"));
  $("#scrim").addEventListener("click",closeDrawers);
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",closeDrawers));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDrawers(); trapFocus(e)});
  $("#oMode").addEventListener("change",e=>{cart.mode=e.target.value;saveCart();renderCart()});
  $("#sendOrder").addEventListener("click",sendOrder);
  $("#cartBody").addEventListener("click",e=>{
    const b=e.target.closest("[data-q]"); if(!b) return;
    const i=+b.dataset.q, c=cart.items[i]; if(!c) return;
    c.qty+=+b.dataset.d; if(c.qty<1) cart.items.splice(i,1);
    saveCart(); renderCart();
    // Conserva el foco en el mismo botón tras volver a pintar
    const again=$(`#cartBody [data-q="${i}"][data-d="${b.dataset.d}"]`); if(again) again.focus();
  });
}

/* ============ SINCRONIZACIÓN ENTRE PESTAÑAS ============ */
window.addEventListener("storage",e=>{
  if(e.key===CART_KEY){cart=readCart();renderModeOptions();renderCart()}
  else if(e.key===MODE_KEY){applyMode(e.newValue||"light")}
  else if(e.key===PANEL_KEY&&biz){load("negocio").then(n=>{biz=mergeCfg(n);renderStatus()})}
});

/* ============ ARRANQUE ============ */
renderHeader();
renderFooter();
initMode();
initCart();
ready.then(()=>{renderModeOptions();renderCart();renderStatus();setInterval(renderStatus,60000)}).catch(()=>{});

/* ============ API PARA LAS PÁGINAS ============ */
window.NB = {
  $, esc, money, toast, load, ready, DAYS,
  whatsapp:openWA, waLink,
  cart:{add:addToCart, open:()=>openDrawer("#cart"), items:()=>cart.items.map(c=>Object.assign({},c))},
  panel,
  hours:hoursState, ranges:openRanges, fmtH,
  biz:()=>biz
};
})();
