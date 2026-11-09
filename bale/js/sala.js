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
  return `<button type="button" class="seat" data-n="${n}" ${extra} ${oc?"disabled":""} aria-pressed="${mio}" tabindex="${n===foco?0:-1}" aria-label="${etiqueta(n,op)}"><span aria-hidden="true">${n}</span></button>`;
}
// Marcas sobre la foto (en modo plano, solo para mirar)
function marcas(op){
  return S.lugares.map(p=>{ const c=op.ocupados.has(p.n)?"oc":p.n===op.elegido?"mio":"";
    return `<span class="marca ${c}" data-m="${p.n}" style="${pos(p)}">${p.n}</span>`; }).join("");
}

function pintar(){
  const {cont,op}=estado; if(!cont||!op) return;
  const modo=(cont.clientWidth||0)>=ANCHO_FOTO?"foto":"plano";
  estado.modo=modo;
  const total=S.lugares.length, libres=S.lugares.filter(p=>!op.ocupados.has(p.n)).length;
  const foco=op.elegido&&!op.ocupados.has(op.elegido)?op.elegido:ORDEN.find(n=>!op.ocupados.has(n));
  const grupo=`role="group" aria-label="Sala de barre: ${total} lugares, ${libres} libres. Usa las flechas para moverte."`;
  if(modo==="foto"){
    cont.innerHTML=`<div class="sala-foto" data-modo="foto" style="--ar:${AR}">
      <div class="sf-lienzo">${foto("(min-width:1000px) 900px, 100vw")}
        <div id="seats" class="sf-botones" ${grupo}>
          ${S.lugares.map(p=>boton(p.n,op,foco,`style="${pos(p)}"`)).join("")}
        </div>
      </div>
    </div>${leyenda()}`;
  } else {
    cont.innerHTML=`<div class="sala-foto" data-modo="plano" style="--ar:${AR}">
      <button type="button" class="sf-lienzo sf-ver" aria-label="Ver la sala completa" aria-pressed="false">${foto("100vw")}<span class="sf-marcas" aria-hidden="true">${marcas(op)}</span></button>
    </div>
    <div id="seats" class="plano-lugares" ${grupo}>
      ${GRUPOS.map(g=>`<div class="pl-grupo pl-${g.id}"><p class="pl-titulo" aria-hidden="true">${g.titulo} <span>${g.ns[0]}–${g.ns[g.ns.length-1]}</span></p>
        <div class="pl-fila">${g.pares?[0,2,4].map(i=>`<span class="pl-par">${boton(g.ns[i],op,foco)}${boton(g.ns[i+1],op,foco)}</span>`).join(""):g.ns.map(n=>boton(n,op,foco)).join("")}</div></div>`).join("")}
    </div>${leyenda()}`;
    if(op.elegido) acercar(op.elegido,false);
  }
  const im=cont.querySelector(".sf-lienzo img");
  if(im) im.addEventListener("error",()=>cont.querySelector(".sala-foto").classList.add("sin-foto"),{once:true});
}
const leyenda=()=>`<ul class="leyenda" aria-hidden="true"><li><i></i>Libre</li><li><i class="l-mio"></i>Tu lugar</li><li><i class="l-oc"></i>Ocupado</li></ul>`;

// Modo plano: la foto se acerca al lugar elegido (o vuelve a la sala completa)
function acercar(n,animar=true){
  const lz=estado.cont&&estado.cont.querySelector('.sala-foto[data-modo="plano"] .sf-lienzo'); if(!lz) return;
  const p=n&&PUNTO.get(n);
  lz.classList.toggle("sin-anim",!animar||calma());
  if(p){ lz.style.setProperty("--zx",p.x+"%"); lz.style.setProperty("--zy",p.y+"%"); lz.classList.add("cerca"); lz.setAttribute("aria-pressed","false"); }
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
  if(!t) return;
  botones().forEach(x=>{ x.tabIndex=x===t?0:-1; });
  t.focus();
}
function clic(e){
  const ver=e.target.closest(".sf-ver");
  if(ver){ const cerca=ver.classList.contains("cerca"); if(cerca){ ver.classList.remove("cerca"); ver.setAttribute("aria-pressed","true"); } else if(estado.op&&estado.op.elegido) acercar(estado.op.elegido); return; }
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
        const m=(cont.clientWidth||0)>=ANCHO_FOTO?"foto":"plano";
        if(m!==estado.modo){ const a=document.activeElement, f=a&&cont.contains(a)&&a.dataset?+a.dataset.n:null; pintar(); if(f) enfocar(f); }
      });
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
    b.setAttribute("aria-label",etiqueta(k,op));
    if(mio&&!calma()){ b.classList.remove("asienta"); void b.offsetWidth; b.classList.add("asienta"); }
  });
  estado.cont.querySelectorAll(".marca").forEach(m=>m.classList.toggle("mio",+m.dataset.m===n&&!op.ocupados.has(n)));
  acercar(n);
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

window.BALE_SALA = {render, elegir, enfocar, vibrar, reformer, nombreFila, zona:zonaDe, mostrar, lugares:S.lugares.map(p=>p.n)};
})();
