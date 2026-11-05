/* =========================================================
   balé — portada (index.html)
   - «La próxima clase con lugar»: con el sistema, la primera sesión abierta y con lugares de los
     próximos días (horario_publico); sin él, la próxima clase del horario (sin contar lugares).
   - Video de portada: solo en pantallas anchas, después de cargar la página y sin movimiento
     reducido (en el teléfono queda la foto; el LCP es siempre la foto).
   ========================================================= */
(function(){
"use strict";
const NB = window.BALE, SIS = window.BALE_SISTEMA;
const {$, esc} = NB;
const TZ = "America/Santo_Domingo";
const DK = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];
function ahora(){
  const p={}; new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date()).forEach(x=>{ p[x.type]=x.value; });
  return {fecha:`${p.year}-${p.month}-${p.day}`, hora:`${p.hour}:${p.minute}`};
}
const fromIso = s=>{ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
const iso = d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const toH = t=>{ const [h,m]=t.split(":").map(Number); return h+m/60; };
function cuando(fecha){
  const hoy=ahora().fecha, man=iso(new Date(fromIso(hoy).getTime()+864e5));
  if(fecha===hoy) return "Hoy"; if(fecha===man) return "Mañana";
  const t=fromIso(fecha).toLocaleDateString("es-DO",{weekday:"long",day:"numeric",month:"long"}); return t.charAt(0).toUpperCase()+t.slice(1);
}
function pintar(s,conCupo){
  const box=$("#proxima"); if(!box) return;
  if(!s){ box.innerHTML=`<p class="pq">Esta semana ya no quedan lugares en línea.</p><p class="pl">Mira el horario de la semana que viene o escríbenos por WhatsApp.</p><a class="btn line" href="reservar.html">Ver el horario</a>`; return; }
  const libres=conCupo?Math.max(0,(+s.capacidad||0)-(+s.ocupados||0)):null;
  const q=new URLSearchParams({clase:s.horario_id||s.id||"",fecha:s.fecha}).toString();
  box.innerHTML=`<p class="pq">${esc(cuando(s.fecha))} · ${esc(NB.fmtH(toH(s.inicio)))} · con ${esc(s.instructora)}</p>
    <p class="pn">${esc(s.titulo||s.clase)}</p>
    ${libres!=null?`<p class="pl">${libres} de ${+s.capacidad} ${s.modo==="cupos"?"máquinas libres":"lugares libres"}</p>`:""}
    <a class="btn" href="reservar.html?${esc(q)}">Reservar mi lugar</a>`;
}
async function proxima(){
  const n=ahora();
  if(SIS&&await SIS.listo){
    try{
      const hasta=iso(new Date(fromIso(n.fecha).getTime()+7*864e5));
      const j=await SIS.llamar("horario_publico",{p_desde:n.fecha,p_hasta:hasta});
      if(j&&j.ok&&Array.isArray(j.sesiones)){
        const s=j.sesiones.filter(x=>x.abierta&&x.estado==="programada"&&x.modo!=="inscripcion"&&(+x.capacidad||0)>(+x.ocupados||0))
          .sort((a,b)=>(a.fecha+a.inicio).localeCompare(b.fecha+b.inicio))[0];
        pintar(s||null,true); return;
      }
    }catch(e){ /* sin sistema: el horario de siempre */ }
  }
  const h=await NB.load("horario").catch(()=>null); if(!h) return;
  const base=fromIso(n.fecha);
  for(let k=0;k<8;k++){
    const d=new Date(base.getTime()+k*864e5), f=iso(d), dk=DK[(d.getDay()+6)%7];
    const c=h.clases.filter(x=>x.dia===dk&&!/ballet/i.test(x.clase)&&(k>0||x.inicio>n.hora)).sort((a,b)=>toH(a.inicio)-toH(b.inicio))[0];
    if(c){ pintar(Object.assign({fecha:f},c),false); return; }
  }
  pintar(null);
}
proxima();

// Video: solo en pantallas anchas, cuando ya cargó todo y si no se pidió reducir el movimiento
function video(){
  const v=$("#pvideo"); if(!v) return;
  const ancho=matchMedia("(min-width:1024px) and (min-aspect-ratio:4/5)"), calma=matchMedia("(prefers-reduced-motion: reduce)");
  if(!ancho.matches||calma.matches||(navigator.connection&&navigator.connection.saveData)) return;
  v.src="video/bale-hero-horizontal.mp4";
  v.addEventListener("playing",()=>v.classList.add("on"),{once:true});
  const p=v.play(); if(p&&p.catch) p.catch(()=>{});
  if("IntersectionObserver" in window) new IntersectionObserver(([e])=>{ if(e.isIntersecting){ const q=v.play(); if(q&&q.catch) q.catch(()=>{}); } else v.pause(); }).observe(v);
}
if(document.readyState==="complete") setTimeout(video,600); else addEventListener("load",()=>setTimeout(video,600),{once:true});
})();
