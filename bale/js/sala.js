/* =========================================================
   balé — la sala: selector de lugar (barra) y dibujo del Reformer
   Sobre la foto oficial «Ubicación de espacios» (img/sala-espacios*.webp): los centros de los 16
   círculos están medidos en data/sala.json (→ js/sala-datos.js, lo genera construir.mjs).
   Distribución real: barra del espejo 9–16, barra del fondo 7–8 (junto a las cortinas) y tres barras
   de adelante 1–2, 3–4 y 5–6. Los números no cambian: solo dónde se dibuja cada uno.
   Se elige sobre la imagen oficial completa, tal cual (img/sala-espacios-completa.webp, 1536 × 1024, con
   su título y «16 espacios · Elige tu lugar»), sin nada alrededor (9/11/2026, pedido de César): un botón
   encima de cada círculo. Las medidas de sala.json son de la foto recortada; aquí se pasan a la completa.
   En el teléfono, como los círculos de la imagen quedan pequeños, cada lugar se dibuja con su número.
   Estados, nunca solo con color: libre (anillo al pasar o enfocar), elegido (círculo marrón con el
   número en crema, se asienta) y ocupado (velo y tachado, «ocupado» en su nombre, sin decir de quién).
   Teclado: flechas según la posición en pantalla (lo de al lado, la barra de enfrente), Inicio/Fin,
   Enter o Espacio para elegir. No decide nada de cupos: pinta lo que dice la base.
   ========================================================= */
(function(){
"use strict";
const calma = ()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
const S = window.BALE_SALA_DATOS || {imagen:{ancho:1437,alto:740}, zonas:{}, lugares:[]};
const AR = `${S.imagen.ancho}/${S.imagen.alto}`;
const PUNTO = new Map(S.lugares.map(p=>[p.n,p]));

// La imagen completa y dónde cae en ella la foto recortada (data/sala.json → imagen.recorte_en_original)
const COMPLETA = {ancho:1536, alto:1024};
const RC = (S.imagen.recorte_en_original||[0,0,COMPLETA.ancho,COMPLETA.alto]);
const enCompleta = p=>({n:p.n,
  x:+((RC[0]+p.x/100*S.imagen.ancho)/COMPLETA.ancho*100).toFixed(2),
  y:+((RC[1]+p.y/100*S.imagen.alto)/COMPLETA.alto*100).toFixed(2),
  r:+(p.r*S.imagen.ancho/COMPLETA.ancho).toFixed(2)});
const ORDEN = [9,10,11,12,13,14,15,16,7,8,1,2,3,4,5,6];

const zonaDe = n=>{ const p=PUNTO.get(n); return p ? (S.zonas[p.zona]||"") : ""; };
const nombreFila = zonaDe;

function foto(sizes){
  return `<picture>
    <source type="image/avif" srcset="img/sala-espacios-800.avif 800w, img/sala-espacios-1200.avif 1200w, img/sala-espacios.avif 1437w" sizes="${sizes}">
    <img src="img/sala-espacios-1200.webp" srcset="img/sala-espacios-800.webp 800w, img/sala-espacios-1200.webp 1200w, img/sala-espacios.webp 1437w" sizes="${sizes}" width="${S.imagen.ancho}" height="${S.imagen.alto}" alt="" decoding="async">
  </picture>`;
}
const pos = p=>`--x:${p.x}%;--y:${p.y}%;--rn:${p.r}`;

const estado={cont:null, op:null};
function st(n,op){ return op.ocupados.has(n)?"ocupado":n===op.elegido?"elegido":"libre"; }
function etiqueta(n,op){ return `Lugar ${n}, ${zonaDe(n)}, ${st(n,op)}`; }
function boton(n,op,extra=""){
  const oc=op.ocupados.has(n), mio=n===op.elegido;
  return `<button type="button" class="seat" data-n="${n}" ${extra} ${oc?'disabled aria-disabled="true"':""} aria-pressed="${mio}" aria-label="${etiqueta(n,op)}"><span aria-hidden="true">${n}</span></button>`;
}

function pintar(){
  const {cont,op}=estado; if(!cont||!op) return;
  const total=S.lugares.length, libres=S.lugares.filter(p=>!op.ocupados.has(p.n)).length;
  cont.innerHTML=`<div class="sala-foto sala-elige" style="--ar:${COMPLETA.ancho}/${COMPLETA.alto}">
    <div class="sf-lienzo">
      <img src="img/sala-espacios-completa.webp" width="${COMPLETA.ancho}" height="${COMPLETA.alto}" alt="balé studio, ubicación de espacios: 16 lugares en la sala de barre" decoding="async">
      <div id="seats" class="sf-botones" role="group" aria-label="Sala de barre: ${total} lugares, ${libres} libres. Usa Tab o las flechas para moverte.">
        ${S.lugares.map(enCompleta).map(p=>boton(p.n,op,`style="${pos(p)}"`)).join("")}
      </div>
    </div>
  </div>`;
  const im=cont.querySelector(".sf-lienzo img");
  if(im) im.addEventListener("error",()=>cont.querySelector(".sala-foto").classList.add("sin-foto"),{once:true});
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
}

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

window.BALE_SALA = {render, elegir, enfocar, vibrar, reformer, nombreFila, zona:zonaDe, mostrar, cerrarGrande:()=>{}, lugares:S.lugares.map(p=>p.n)};
})();
