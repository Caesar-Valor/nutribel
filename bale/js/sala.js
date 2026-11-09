/* =========================================================
   balé — la sala: selector de lugar (barra) y dibujo del Reformer
   Sobre la foto oficial «Ubicación de espacios» (img/sala-espacios*.webp): los centros de los 16
   círculos están medidos en data/sala.json (→ js/sala-datos.js, lo genera construir.mjs).
   Distribución real: barra del espejo 9–16, barra del fondo 7–8 (junto a las cortinas) y tres barras
   de adelante 1–2, 3–4 y 5–6. Los números no cambian: solo dónde se dibuja cada uno.
   Se elige siempre sobre la foto (9/11/2026): un botón encima de cada círculo. La foto se recorta a la
   franja de las barras (sin techo ni piso de más) para que quepa entera con «Continuar» a la vista. En
   el teléfono no cabe a un tamaño que se pueda tocar: la franja mide al menos 720 px (círculos a 44 px
   o más de distancia) y se desliza de lado, empezando por el lugar elegido o el centro de la sala.
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
// Franja de la foto que se muestra al elegir (en % del alto): de encima de los números al pie de las barras
const RECORTE = {arriba:28, abajo:81};
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
  const alto=RECORTE.abajo-RECORTE.arriba;
  const corte=`--ar:${AR};--ar-corte:${S.imagen.ancho}/${(S.imagen.alto*alto/100).toFixed(1)};--sube:${(-S.imagen.alto*RECORTE.arriba/S.imagen.ancho).toFixed(3)}%`;
  cont.innerHTML=`<div class="sala-foto sala-elige" style="${corte}">
    <p class="sf-desliza" aria-hidden="true">Desliza la foto de lado para ver toda la sala.</p>
    <div class="sf-ventana">
      <div class="sf-corte">
        <div class="sf-lienzo">${foto("(min-width:1000px) 920px, 720px")}
          <div id="seats" class="sf-botones" role="group" aria-label="Sala de barre: ${total} lugares, ${libres} libres. El espejo queda al fondo. Usa Tab o las flechas para moverte.">
            ${S.lugares.map(p=>boton(p.n,op,`style="${pos(p)}"`)).join("")}
          </div>
        </div>
      </div>
    </div>
  </div>`;
  const im=cont.querySelector(".sf-lienzo img");
  if(im) im.addEventListener("error",()=>cont.querySelector(".sala-foto").classList.add("sin-foto"),{once:true});
  requestAnimationFrame(()=>centrar(op.elegido,false));
}
// Teléfono: deja a la vista el lugar elegido (o el centro de la sala)
function centrar(n,animar=true){
  const v=estado.cont&&estado.cont.querySelector(".sf-ventana"); if(!v) return;
  const desliza=v.scrollWidth>v.clientWidth+1;
  v.closest(".sala-elige").classList.toggle("desliza",desliza);
  if(!desliza) return;
  const p=n&&PUNTO.get(n), fx=p?p.x/100:.5;
  v.scrollTo({left:fx*v.scrollWidth-v.clientWidth/2, behavior:animar&&!calma()?"smooth":"auto"});
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
  centrar(n);
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
