/* =========================================================
   balé — la sala: selector de lugar (barra) y dibujo del Reformer
   Sobre la foto oficial «Ubicación de espacios» (img/sala-espacios*.webp, 5/11/2026): los centros de
   los 16 círculos están medidos en data/sala.json (→ js/sala-datos.js, lo genera construir.mjs).
   Distribución real: barra del espejo 9–16, barra del fondo 7–8 (junto a las cortinas) y tres barras
   de adelante 1–2, 3–4 y 5–6. Los números no cambian: solo dónde se dibuja cada uno.
   Dos modos, con un solo juego de botones (id="seats", data-n):
     foto  (contenedor ≥ 760 px): un botón invisible encima de cada círculo de la foto;
     plano (más estrecho): la foto arriba, solo para mirar, y debajo un plano de botones de 44 px
           ordenado como la sala; al elegir, la foto se acerca a ese lugar.
   Estados, nunca solo con color: libre (anillo al pasar o enfocar), elegido (círculo marrón con el
   número en crema, se asienta) y ocupado (velo y tachado, «ocupado» en su nombre, sin decir de quién).
   Teclado: flechas según la posición en pantalla (lo de al lado, la barra de enfrente), Inicio/Fin,
   Enter o Espacio para elegir (foco itinerante). No decide nada de cupos: pinta lo que dice la base.
   ========================================================= */
(function(){
"use strict";
const calma = ()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
const ANCHO_FOTO = 760;   // por debajo, plano de botones
const S = window.BALE_SALA_DATOS || {imagen:{ancho:1437,alto:740}, zonas:{}, lugares:[]};
const AR = `${S.imagen.ancho}/${S.imagen.alto}`;
const PUNTO = new Map(S.lugares.map(p=>[p.n,p]));
// Plano del teléfono: como se ve la sala desde la puerta (el espejo al fondo, arriba)
const GRUPOS = [
  {id:"espejo", titulo:"Barra del espejo", ns:[9,10,11,12,13,14,15,16]},
  {id:"fondo", titulo:"Barra del fondo", ns:[7,8]},
  {id:"delante", titulo:"Barras de adelante", ns:[1,2,3,4,5,6], pares:true}
];
const ORDEN = GRUPOS.flatMap(g=>g.ns);

const zonaDe = n=>{ const p=PUNTO.get(n); return p ? (S.zonas[p.zona]||"") : ""; };
const nombreFila = zonaDe;

function foto(sizes){
  return `<picture>
    <source type="image/avif" srcset="img/sala-espacios-800.avif 800w, img/sala-espacios-1200.avif 1200w, img/sala-espacios.avif 1437w" sizes="${sizes}">
    <img src="img/sala-espacios-1200.webp" srcset="img/sala-espacios-800.webp 800w, img/sala-espacios-1200.webp 1200w, img/sala-espacios.webp 1437w" sizes="${sizes}" width="${S.imagen.ancho}" height="${S.imagen.alto}" alt="" decoding="async">
  </picture>`;
}
const pos = p=>`--x:${p.x}%;--y:${p.y}%;--rn:${p.r}`;

const estado={cont:null, op:null, modo:null, ro:null};
function st(n,op){ return op.ocupados.has(n)?"ocupado":n===op.elegido?"elegido":"libre"; }
function etiqueta(n,op){ return `Lugar ${n}, ${zonaDe(n)}, ${st(n,op)}`; }
function boton(n,op,foco,extra=""){
  const oc=op.ocupados.has(n), mio=n===op.elegido;
  return `<button type="button" class="seat" data-n="${n}" ${extra} ${oc?'disabled aria-disabled="true"':""} aria-pressed="${mio}" aria-label="${etiqueta(n,op)}"><span aria-hidden="true">${n}</span></button>`;
}
// Marcas sobre la foto (en modo plano, solo para mirar)
function marcas(op){
  return S.lugares.map(p=>{ const c=op.ocupados.has(p.n)?"oc":p.n===op.elegido?"mio":"";
    return `<span class="marca ${c}" data-m="${p.n}" style="${pos(p)}">${p.n}</span>`; }).join("");
}

function pintar(){
  const {cont,op}=estado; if(!cont||!op) return;
  const modo=modoDe(cont);
  estado.modo=modo;
  const total=S.lugares.length, libres=S.lugares.filter(p=>!op.ocupados.has(p.n)).length;
  const foco=op.elegido&&!op.ocupados.has(op.elegido)?op.elegido:ORDEN.find(n=>!op.ocupados.has(n));
  const grupo=`role="group" aria-label="Sala de barre: ${total} lugares, ${libres} libres. Usa Tab o las flechas para moverte."`;
  if(modo==="foto"){
    cont.innerHTML=`<div class="sala-foto" data-modo="foto" style="--ar:${AR}">
      <div class="sf-lienzo">${foto("(min-width:1000px) 900px, 100vw")}
        <div id="seats" class="sf-botones" ${grupo}>
          ${S.lugares.map(p=>boton(p.n,op,foco,`style="${pos(p)}"`)).join("")}
        </div>
      </div>
    </div>`;
  } else {
    cont.innerHTML=`<div class="sala-foto" data-modo="plano" style="--ar:${AR}">
      <button type="button" class="sf-lienzo sf-ver" aria-label="Ver la sala en grande para elegir sobre la foto" aria-haspopup="dialog">${foto("100vw")}<span class="sf-marcas" aria-hidden="true">${marcas(op)}</span></button>
    </div>
    <div id="seats" class="plano-lugares" ${grupo}>
      ${GRUPOS.map(g=>`<div class="pl-grupo pl-${g.id}"><p class="pl-titulo" aria-hidden="true">${g.titulo} <span>${g.ns[0]}–${g.ns[g.ns.length-1]}</span></p>
        <div class="pl-fila">${g.pares?[0,2,4].map(i=>`<span class="pl-par">${boton(g.ns[i],op,foco)}${boton(g.ns[i+1],op,foco)}</span>`).join(""):g.ns.map(n=>boton(n,op,foco)).join("")}</div></div>`).join("")}
    </div>`;
    if(op.elegido) acercar(op.elegido,false);
  }
  const im=cont.querySelector(".sf-lienzo img");
  if(im) im.addEventListener("error",()=>cont.querySelector(".sala-foto").classList.add("sin-foto"),{once:true});
}
// La foto se limita a min(52vh, 480 px) de alto: el modo foto se decide con el ancho que de verdad tendrá
function modoDe(cont){
  const alto=Math.min(innerHeight*.52,480), ancho=Math.min(cont.clientWidth||0, alto*S.imagen.ancho/S.imagen.alto);
  return ancho>=ANCHO_FOTO-60?"foto":"plano";
}

// Modo plano: la foto se acerca al lugar elegido (o vuelve a la sala completa)
function acercar(n,animar=true){
  const lz=estado.cont&&estado.cont.querySelector('.sala-foto[data-modo="plano"] .sf-lienzo'); if(!lz) return;
  const p=n&&PUNTO.get(n);
  lz.classList.toggle("sin-anim",!animar||calma());
  if(p){ lz.style.setProperty("--zx",p.x+"%"); lz.style.setProperty("--zy",p.y+"%"); lz.classList.add("cerca"); }
  else lz.classList.remove("cerca");
}

function botones(){ return [...estado.cont.querySelectorAll("#seats .seat")]; }
// Vecino en una dirección según dónde está cada botón en pantalla (sirve igual en la foto y en el plano)
function vecino(b0,dir){
  const r0=b0.getBoundingClientRect(), c0={x:r0.left+r0.width/2,y:r0.top+r0.height/2};
  let mejor=null, dMin=Infinity;
  const lado=dir==="der"||dir==="izq";
  // a los lados: primero en la misma barra (misma altura); si no hay libre, el más cercano
  const misma=lado?botones().filter(b=>{ const r=b.getBoundingClientRect(); return Math.abs(r.top+r.height/2-c0.y)<=r0.height*.75; }):null;
  for(const b of (misma&&misma.some(x=>x!==b0&&!x.disabled&&({der:1,izq:-1}[dir])*(x.getBoundingClientRect().left-r0.left)>4)?misma:botones())){
    if(b===b0||b.disabled) continue;
    const r=b.getBoundingClientRect(), dx=r.left+r.width/2-c0.x, dy=r.top+r.height/2-c0.y;
    const prim={der:dx,izq:-dx,abajo:dy,arriba:-dy}[dir], sec=dir==="der"||dir==="izq"?Math.abs(dy):Math.abs(dx);
    if(prim<=4) continue;
    const d=prim+sec*3;
    if(d<dMin){ dMin=d; mejor=b; }
  }
  return mejor;
}
function teclado(e){
  const b=e.target.closest("#seats .seat"); if(!b) return;
  let t=null;
  const dir={ArrowRight:"der",ArrowLeft:"izq",ArrowDown:"abajo",ArrowUp:"arriba"}[e.key];
  if(dir) t=vecino(b,dir);
  else if(e.key==="Home"||e.key==="End"){ const ls=ORDEN.map(n=>botones().find(x=>+x.dataset.n===n)).filter(x=>x&&!x.disabled); t=e.key==="Home"?ls[0]:ls[ls.length-1]; }
  else return;
  e.preventDefault();
  if(t) t.focus();
}
function clic(e){
  if(e.target.closest(".sf-ver")){ abrirGrande(); return; }
  const b=e.target.closest("#seats .seat"); if(!b||b.disabled) return;
  estado.op.onPick(+b.dataset.n);
}

// API
function render(cont,op){
  const nuevo=estado.cont!==cont;
  estado.cont=cont; estado.op=Object.assign({ocupados:new Set(),elegido:null,onPick:()=>{}},op);
  if(nuevo){
    cont.addEventListener("keydown",teclado);
    cont.addEventListener("click",clic);
    if("ResizeObserver" in window){
      if(estado.ro) estado.ro.disconnect();
      estado.ro=new ResizeObserver(()=>{
        if(!cont.isConnected||!cont.offsetParent) return;
        const m=modoDe(cont);
        if(m!==estado.modo){ const a=document.activeElement, f=a&&cont.contains(a)&&a.dataset?+a.dataset.n:null; pintar(); if(f) enfocar(f); }
      });
      estado.ro.observe(cont);
      addEventListener("resize",()=>{ if(cont.isConnected&&cont.offsetParent&&modoDe(cont)!==estado.modo) pintar(); });
    }
  }
  pintar();
}
// Elegir: se marca sin volver a pintar (así no se pierde el foco) y el círculo «se asienta»
function elegir(n){
  const op=estado.op; if(!op) return;
  op.elegido=n;
  botones().forEach(b=>{
    const k=+b.dataset.n, mio=k===n;
    b.setAttribute("aria-pressed",String(mio));
    b.setAttribute("aria-label",etiqueta(k,op));
    if(mio&&!calma()){ b.classList.remove("asienta"); void b.offsetWidth; b.classList.add("asienta"); }
  });
  estado.cont.querySelectorAll(".marca").forEach(m=>m.classList.toggle("mio",+m.dataset.m===n&&!op.ocupados.has(n)));
  if(grande){
    grande.querySelectorAll(".seat").forEach(b=>{ const k=+b.dataset.g; b.setAttribute("aria-pressed",String(k===n)); b.setAttribute("aria-label",etiqueta(k,op)); });
    const t=grande.querySelector(".sg-estado"); if(t) t.textContent=`Elegiste el lugar ${n}, ${zonaDe(n)}.`;
  }
  acercar(n);
}

// ---------- Teléfono: la sala en grande, para elegir sobre la foto (zoom y desplazamiento) ----------
let grande=null, zoom=2;
const ZOOMS=[2,3,4];
function abrirGrande(){
  const op=estado.op; if(!op||grande) return;
  const casa=estado.cont.closest("dialog")||document.body;   // dentro del diálogo: fuera de él, todo es inerte
  grande=document.createElement("div");
  grande.className="sala-grande"; grande.setAttribute("role","dialog"); grande.setAttribute("aria-modal","true"); grande.setAttribute("aria-label","La sala en grande");
  grande.innerHTML=`<div class="sg-barra">
      <p class="sg-estado" aria-live="polite">${op.elegido?`Elegiste el lugar ${op.elegido}, ${zonaDe(op.elegido)}.`:"Toca un lugar libre para elegirlo."}</p>
      <div class="sg-acc">
        <button type="button" class="icono" data-zoom="-1" aria-label="Alejar">−</button>
        <button type="button" class="icono" data-zoom="1" aria-label="Acercar">+</button>
        <button type="button" class="btn sm sg-listo">Listo</button>
      </div>
    </div>
    <div class="sg-vista" tabindex="-1">
      <div class="sf-lienzo sg-lienzo" style="--ar:${AR}">${foto("400vw")}
        <div class="sf-botones" role="group" aria-label="Lugares de la sala">${S.lugares.map(p=>{ const oc=op.ocupados.has(p.n);
          return `<button type="button" class="seat" data-g="${p.n}" style="${pos(p)}" ${oc?'disabled aria-disabled="true"':""} aria-pressed="${p.n===op.elegido}" aria-label="${etiqueta(p.n,op)}"><span aria-hidden="true">${p.n}</span></button>`; }).join("")}</div>
      </div>
    </div>`;
  casa.appendChild(grande);
  document.documentElement.classList.add("sala-grande-abierta");
  ponerZoom(zoom, op.elegido||12);
  grande.addEventListener("click",e=>{
    const z=e.target.closest("[data-zoom]"); if(z){ const i=ZOOMS.indexOf(zoom)+ +z.dataset.zoom; if(ZOOMS[i]) ponerZoom(ZOOMS[i]); return; }
    if(e.target.closest(".sg-listo")){ cerrarGrande(); return; }
    const b=e.target.closest(".seat[data-g]"); if(b&&!b.disabled) op.onPick(+b.dataset.g);
  });
  grande.addEventListener("keydown",e=>{
    if(e.key==="Tab"){ const f=[...grande.querySelectorAll("button:not(:disabled)")], i=f.indexOf(document.activeElement);
      if(e.shiftKey&&i<=0){ e.preventDefault(); f[f.length-1].focus(); } else if(!e.shiftKey&&i===f.length-1){ e.preventDefault(); f[0].focus(); } }
  });
  grande.querySelector(".sg-listo").focus();
}
// Acercar o alejar manteniendo el centro (o centrar en un lugar)
function ponerZoom(z,centrarEn){
  const v=grande.querySelector(".sg-vista"), lz=grande.querySelector(".sg-lienzo");
  const cx=(v.scrollLeft+v.clientWidth/2)/(lz.clientWidth||1), cy=(v.scrollTop+v.clientHeight/2)/(lz.clientHeight||1);
  zoom=z; lz.style.width=`${z*100}%`;
  const p=centrarEn&&PUNTO.get(centrarEn), fx=p?p.x/100:cx, fy=p?p.y/100:cy;
  v.scrollLeft=fx*lz.clientWidth-v.clientWidth/2; v.scrollTop=fy*lz.clientHeight-v.clientHeight/2;
  grande.querySelector('[data-zoom="-1"]').disabled=z===ZOOMS[0];
  grande.querySelector('[data-zoom="1"]').disabled=z===ZOOMS[ZOOMS.length-1];
}
function cerrarGrande(){
  if(!grande) return;
  grande.remove(); grande=null;
  document.documentElement.classList.remove("sala-grande-abierta");
  const t=estado.cont&&estado.cont.querySelector(".sf-ver"); if(t) t.focus();
}
// Esc cierra la vista grande, no la reserva entera
addEventListener("cancel",e=>{ if(grande){ e.preventDefault(); cerrarGrande(); } },true);
addEventListener("keydown",e=>{ if(grande&&e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); cerrarGrande(); } },true);
function enfocar(n){ const b=estado.cont&&estado.cont.querySelector(`#seats .seat[data-n="${n}"]`); if(b) b.focus(); else { const f=estado.cont&&estado.cont.querySelector("#seats .seat:not(:disabled)"); if(f) f.focus(); } }
// Lugar que se acaba de ocupar: vibración corta (la explicación va en texto aparte)
function vibrar(n){
  const b=estado.cont&&estado.cont.querySelector(`#seats .seat[data-n="${n}"]`); if(!b||calma()) return;
  b.classList.remove("vibra"); void b.offsetWidth; b.classList.add("vibra");
  b.addEventListener("animationend",()=>b.classList.remove("vibra"),{once:true});
}

// Solo para mirar (mi-reserva): la foto con tu lugar marcado
function mostrar(cont,n){
  const p=PUNTO.get(n); if(!cont||!p){ if(cont) cont.hidden=true; return; }
  cont.innerHTML=`<figure class="sala-foto tu-lugar" style="--ar:${AR}">
    <div class="sf-lienzo">${foto("(min-width:700px) 640px, 100vw")}<span class="sf-marcas" aria-hidden="true"><span class="marca mio" style="${pos(p)}">${n}</span></span></div>
    <figcaption>Tu lugar: el ${n}, ${zonaDe(n)}.</figcaption>
  </figure>`;
  cont.hidden=false;
}

// Reformer: las máquinas, por cupo (la base de datos no asigna máquina; la elige la instructora)
function reformer(cont,{capacidad,ocupados}){
  const n=Math.max(1,capacidad|0), oc=Math.min(n,Math.max(0,ocupados|0));
  cont.innerHTML=`<div class="reformer" role="img" aria-label="Sala de Reformer: ${n} máquinas, ${n-oc} libres">${Array.from({length:n},(_,i)=>`<span class="maq ${i<oc?"oc":""}">${i<oc?"Ocupada":"Libre"}</span>`).join("")}</div>`;
}

window.BALE_SALA = {render, elegir, enfocar, vibrar, reformer, nombreFila, zona:zonaDe, mostrar, cerrarGrande, lugares:S.lugares.map(p=>p.n)};
})();
