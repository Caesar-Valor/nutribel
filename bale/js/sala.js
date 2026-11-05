/* =========================================================
   balé — la sala: selector de lugar (barra) y dibujo del Reformer
   Dibujo en SVG inspirado en la sala real (sin la foto: pedido de Marifer, 25/10/2026):
   el espejo al fondo, el lugar de la instructora, la primera barra (1–8) junto al espejo y la
   segunda (9–16) detrás, con postes negros y círculos crema con el número.
   Cada lugar es un <button> encima del dibujo (posición en % del mismo lienzo):
     libre: crema · elegido: marrón con número crema · ocupado (también el fijo de una miembro,
     sin decir de quién): atenuado, tachado y «ocupado» en su nombre. Nunca solo el color.
   Teclado: flechas para moverse, Inicio/Fin, Enter o Espacio para elegir (foco itinerante).
   Si los lugares no caben a 44 px, la sala se gira (barras en columna) en vez de achicarse.
   No decide nada de cupos: solo pinta lo que dice la base de datos.
   ========================================================= */
(function(){
"use strict";
const calma = ()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
const ANCHO_MIN = 520;    // por debajo, la sala va girada

// Geometría de cada orientación (unidades del lienzo SVG)
const GEO = {
  h:{ w:800, h:540,
    filas:[{y:250, x0:110, x1:690, d:58, barra:205}, {y:420, x0:40, x1:760, d:66, barra:368}],
    nombre:["primera barra","segunda barra"] },
  v:{ w:520, h:940,
    filas:[{x:236, y0:110, y1:850, d:66, barra:180}, {x:412, y0:70, y1:890, d:72, barra:352}],
    nombre:["primera barra","segunda barra"] }
};

function svgH(G){
  const f=G.filas, tablas=Array.from({length:11},(_,i)=>{ const t=i/10; return `<line class="tablas" x1="${90+620*t}" y1="78" x2="${800*t}" y2="540"/>`; }).join("");
  const barra=(r,yLeg)=>`<line class="barra-l" x1="${r.x0-18}" y1="${r.barra}" x2="${r.x1+18}" y2="${r.barra}"/>`+
    [r.x0-14,(r.x0+r.x1)/2,r.x1+14].map(x=>`<line class="poste" x1="${x}" y1="${r.barra}" x2="${x}" y2="${r.barra+yLeg}"/>`).join("");
  return `<svg viewBox="0 0 ${G.w} ${G.h}" aria-hidden="true" focusable="false">
    <polygon class="piso" points="90,78 710,78 800,540 0,540"/>${tablas}
    <rect class="espejo" x="120" y="18" width="560" height="46" rx="6"/>
    <line class="reflejo" x1="180" y1="56" x2="214" y2="26"/><line class="reflejo" x1="210" y1="56" x2="230" y2="38"/><line class="reflejo" x1="560" y1="56" x2="590" y2="28"/>
    <text class="tx" x="400" y="47" text-anchor="middle">ESPEJO</text>
    <ellipse class="inst" cx="400" cy="128" rx="74" ry="26"/><text class="tx" x="400" y="133" text-anchor="middle">Instructora</text>
    ${barra(f[0],22)}${barra(f[1],26)}
    <text class="tx-b" x="${f[0].x0-20}" y="${f[0].barra-14}">Primera barra · junto al espejo</text>
    <text class="tx-b" x="${f[1].x0-12}" y="${f[1].barra-14}">Segunda barra</text>
  </svg>`;
}
function svgV(G){
  const f=G.filas, tablas=Array.from({length:9},(_,i)=>`<line class="tablas" x1="70" y1="${40+i*108}" x2="520" y2="${i*117}"/>`).join("");
  const barra=(r,xLeg)=>`<line class="barra-l" x1="${r.barra}" y1="${r.y0-24}" x2="${r.barra}" y2="${r.y1+24}"/>`+
    [r.y0-20,(r.y0+r.y1)/2,r.y1+20].map(y=>`<line class="poste" x1="${r.barra}" y1="${y}" x2="${r.barra+xLeg}" y2="${y}"/>`).join("");
  return `<svg viewBox="0 0 ${G.w} ${G.h}" aria-hidden="true" focusable="false">
    <polygon class="piso" points="70,40 520,0 520,940 70,900"/>${tablas}
    <rect class="espejo" x="14" y="110" width="40" height="720" rx="6"/>
    <line class="reflejo" x1="22" y1="190" x2="46" y2="160"/><line class="reflejo" x1="22" y1="700" x2="46" y2="672"/>
    <text class="tx" transform="translate(40 470) rotate(-90)" text-anchor="middle">ESPEJO</text>
    <ellipse class="inst" cx="110" cy="470" rx="28" ry="70"/><text class="tx" transform="translate(115 470) rotate(-90)" text-anchor="middle">Instructora</text>
    ${barra(f[0],20)}${barra(f[1],24)}
    <text class="tx-b" transform="translate(${f[0].barra-14} 480) rotate(-90)" text-anchor="middle">Primera barra · junto al espejo</text>
    <text class="tx-b" transform="translate(${f[1].barra-14} 480) rotate(-90)" text-anchor="middle">Segunda barra</text>
  </svg>`;
}

// Posición de cada lugar en % del lienzo
function posiciones(o,porFila,filas){
  const G=GEO[o], out=[];
  for(let r=0;r<filas;r++){
    const F=G.filas[Math.min(r,G.filas.length-1)];
    for(let i=0;i<porFila;i++){
      const t=(i+.5)/porFila, n=r*porFila+i+1;
      const x=o==="h"?F.x0+(F.x1-F.x0)*t:F.x, y=o==="h"?F.y:F.y0+(F.y1-F.y0)*t;
      out.push({n, fila:r, col:i, x:100*x/G.w, y:100*y/G.h, d:100*F.d/G.w});
    }
  }
  return out;
}

const estado={cont:null, o:null, op:null, ro:null};
function etiqueta(p,op){
  const G=GEO[estado.o||"h"], fila=G.nombre[p.fila]||`fila ${p.fila+1}`;
  const st=op.ocupados.has(p.n)?"ocupado":p.n===op.elegido?"elegido":"libre";
  return `Lugar ${p.n}, ${fila}, ${st}`;
}
function pintar(){
  const {cont,op}=estado; if(!cont||!op) return;
  const w=cont.clientWidth||ANCHO_MIN, o=w>=ANCHO_MIN?"h":"v";
  estado.o=o;
  const G=GEO[o], ps=posiciones(o,op.porFila,op.filas);
  const libres=ps.filter(p=>!op.ocupados.has(p.n)).length;
  const foco=op.elegido&&!op.ocupados.has(op.elegido)?op.elegido:(ps.find(p=>!op.ocupados.has(p.n))||{}).n;
  cont.innerHTML=`<div class="plano" data-orient="${o}" style="--ar:${G.w}/${G.h}">
    ${o==="h"?svgH(G):svgV(G)}
    <div id="seats" role="group" aria-label="Sala de barre: ${ps.length} lugares, ${libres} libres. Usa las flechas para moverte.">
      ${ps.map(p=>{ const oc=op.ocupados.has(p.n), mio=p.n===op.elegido;
        return `<button type="button" class="seat" data-n="${p.n}" data-fila="${p.fila}" data-col="${p.col}" style="--x:${p.x.toFixed(2)}%;--y:${p.y.toFixed(2)}%;--d:${p.d.toFixed(2)}%" ${oc?"disabled":""} aria-pressed="${mio}" tabindex="${p.n===foco?0:-1}" aria-label="${etiqueta(p,op)}">${p.n}</button>`; }).join("")}
    </div>
  </div>
  <ul class="leyenda" aria-hidden="true"><li><i></i>Libre</li><li><i class="l-mio"></i>Tu lugar</li><li><i class="l-oc"></i>Ocupado</li></ul>`;
}
function botones(){ return [...estado.cont.querySelectorAll(".seat")]; }
function mover(desde,dir){
  const bs=botones(), b0=bs.find(b=>+b.dataset.n===desde); if(!b0) return null;
  const f=+b0.dataset.fila, c=+b0.dataset.col, n=estado.op.porFila, filas=estado.op.filas;
  const en=(ff,cc)=>bs.find(b=>+b.dataset.fila===ff&&+b.dataset.col===cc);
  const libre=b=>b&&!b.disabled;
  // a lo largo de la barra
  if(dir==="sig"||dir==="ant"){ const d=dir==="sig"?1:-1; for(let k=c+d;k>=0&&k<n;k+=d){ const b=en(f,k); if(libre(b)) return b; } return null; }
  if(dir==="ini"||dir==="fin"){ const ks=[...Array(n).keys()]; if(dir==="fin") ks.reverse(); for(const k of ks){ const b=en(f,k); if(libre(b)) return b; } return null; }
  // a la otra barra: el libre más cercano en la misma posición
  const d=dir==="otra+"?1:-1, ff=f+d; if(ff<0||ff>=filas) return null;
  for(let off=0;off<n;off++) for(const k of [c+off,c-off]){ const b=en(ff,k); if(k>=0&&k<n&&libre(b)) return b; }
  return null;
}
function teclado(e){
  const b=e.target.closest(".seat"); if(!b) return;
  const h=estado.o==="h", map=h
    ? {ArrowRight:"sig",ArrowLeft:"ant",ArrowUp:"otra-",ArrowDown:"otra+",Home:"ini",End:"fin"}
    : {ArrowDown:"sig",ArrowUp:"ant",ArrowLeft:"otra-",ArrowRight:"otra+",Home:"ini",End:"fin"};
  const dir=map[e.key]; if(!dir) return;
  e.preventDefault();
  const t=mover(+b.dataset.n,dir); if(!t) return;
  botones().forEach(x=>{ x.tabIndex=x===t?0:-1; });
  t.focus();
}
function clic(e){
  const b=e.target.closest(".seat"); if(!b||b.disabled) return;
  estado.op.onPick(+b.dataset.n);
}

// API
function render(cont,op){
  const nuevo=estado.cont!==cont;
  estado.cont=cont; estado.op=Object.assign({filas:2,porFila:8,ocupados:new Set(),elegido:null,onPick:()=>{}},op);
  if(nuevo){
    cont.addEventListener("keydown",teclado);
    cont.addEventListener("click",clic);
    if("ResizeObserver" in window){
      if(estado.ro) estado.ro.disconnect();
      let ultimo=null;
      estado.ro=new ResizeObserver(()=>{ const o=(cont.clientWidth||0)>=ANCHO_MIN?"h":"v"; if(o!==ultimo&&cont.isConnected&&cont.offsetParent){ ultimo=o; if(o!==estado.o){ const f=document.activeElement&&cont.contains(document.activeElement)?+document.activeElement.dataset.n:null; pintar(); if(f) enfocar(f); } } });
      estado.ro.observe(cont);
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
    b.tabIndex=mio?0:-1;
    b.setAttribute("aria-label",etiqueta({n:k,fila:+b.dataset.fila},op));
    if(mio&&!calma()){ b.classList.remove("asienta"); void b.offsetWidth; b.classList.add("asienta"); }
  });
}
function enfocar(n){ const b=estado.cont&&estado.cont.querySelector(`.seat[data-n="${n}"]`); if(b) b.focus(); else { const f=estado.cont&&estado.cont.querySelector(".seat:not(:disabled)"); if(f) f.focus(); } }
// Lugar que se acaba de ocupar: vibración corta (la explicación va en texto aparte)
function vibrar(n){
  const b=estado.cont&&estado.cont.querySelector(`.seat[data-n="${n}"]`); if(!b||calma()) return;
  b.classList.remove("vibra"); void b.offsetWidth; b.classList.add("vibra");
  b.addEventListener("animationend",()=>b.classList.remove("vibra"),{once:true});
}
const nombreFila = n=>{ const op=estado.op||{porFila:8}; return GEO.h.nombre[Math.floor((n-1)/op.porFila)]||""; };

// Reformer: las máquinas, por cupo (la base de datos no asigna máquina; la elige la instructora)
function reformer(cont,{capacidad,ocupados}){
  const n=Math.max(1,capacidad|0), oc=Math.min(n,Math.max(0,ocupados|0));
  cont.innerHTML=`<div class="reformer" role="img" aria-label="Sala de Reformer: ${n} máquinas, ${n-oc} libres">${Array.from({length:n},(_,i)=>`<span class="maq ${i<oc?"oc":""}">${i<oc?"Ocupada":"Libre"}</span>`).join("")}</div>`;
}

window.BALE_SALA = {render, elegir, enfocar, vibrar, reformer, nombreFila};
})();
