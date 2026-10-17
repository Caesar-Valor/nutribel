/* =========================================================
   panel.html — panel del negocio (demo)
   Guarda en localStorage ("nutribel-panel") con el formato del demo:
   {overrides:{id:{t,nu,off}}, week:[...5], cfg:{whatsapp,address,maps}}
   menu.html y contacto.html leen estos cambios. Aquí no hay datos de pacientes.
   ========================================================= */
(function(){
"use strict";
const {$, esc, DAYS} = NB;
const NU=[["kcal","kcal"],["p","Proteína g"],["c","Carbos g"],["g","Grasa g"]];
let M, BIZ, dirty=false;

function setDirty(v){
  dirty=v;
  const s=$("#saveState");
  s.textContent=v?"Tienes cambios sin guardar":"Todo guardado";
  s.classList.toggle("dirty",v);
}

function render(){
  const store=NB.panel.read();
  const cfg=Object.assign({whatsapp:BIZ.whatsapp,address:BIZ.direccion,maps:BIZ.google_maps||""},store.cfg);
  $("#aWa").value=cfg.whatsapp||"";
  $("#aAddr").value=cfg.address||"";
  $("#aMaps").value=cfg.maps||"";

  const week=store.week||M.nutrialmuerzoSemana.lunes_a_viernes;
  $("#week").innerHTML=week.map((w,i)=>`<label class="fld">${DAYS[i+1]}<input type="text" data-w="${i}" value="${esc(w)}"></label>`).join("");

  $("#dishes").innerHTML=M.secciones.filter(s=>s.id!=="bowl").map(s=>`
    <section class="sec" data-sec="${s.id}" style="--sc:var(--${esc(s.color)})">
      <h3>${esc(s.nombre)}</h3>
      ${M.platos.filter(d=>d.seccion===s.id).map(d=>{
        const o=store.overrides[d.id]||{}, t=o.t||d.etiquetas, nu=o.nu||{}, off=!!o.off;
        return `<details class="adm" data-id="${esc(d.id)}" data-name="${esc(d.nombre.toLowerCase())}">
          <summary>${esc(d.nombre)}${off?'<span class="pill off">Agotado hoy</span>':""}${Object.keys(nu).length?'<span class="pill">Info nutricional</span>':""}</summary>
          <div class="in">
            <div class="n4">${NU.map(([k,l])=>`<label class="fld">${l}<input type="number" min="0" step="1" inputmode="numeric" data-k="${k}" value="${esc(nu[k]??"")}"></label>`).join("")}</div>
            <div class="chk" role="group" aria-label="Etiquetas de ${esc(d.nombre)}">${Object.entries(M.etiquetas).map(([k,v])=>`<label><input type="checkbox" data-t="${k}" ${t.includes(k)?"checked":""}> ${esc(v)}</label>`).join("")}</div>
            <div class="chk"><label class="soldout"><input type="checkbox" data-off ${off?"checked":""}> Agotado hoy</label></div>
          </div>
        </details>`;}).join("")}
    </section>`).join("");
  filter();
  setDirty(false);
}

function filter(){
  const q=$("#search").value.trim().toLowerCase();
  let shown=0;
  document.querySelectorAll("#dishes .sec").forEach(sec=>{
    let n=0;
    sec.querySelectorAll(".adm").forEach(d=>{const ok=!q||d.dataset.name.includes(q); d.hidden=!ok; if(ok) n++;});
    sec.hidden=!n; shown+=n;
  });
  $("#noResults").hidden=!!shown;
}

function save(){
  const wa=$("#aWa").value.replace(/\D/g,"");
  if($("#aWa").value.trim()&&wa.length<10){NB.toast("Revisa el WhatsApp: escribe el número con código de país, solo dígitos.");$("#aWa").focus();return}
  const bad=[...document.querySelectorAll("#dishes [data-k]")].find(i=>i.value!==""&&(isNaN(+i.value)||+i.value<0));
  if(bad){bad.closest("details").open=true;NB.toast("Los valores nutricionales deben ser números positivos.");bad.focus();return}

  const base=M.nutrialmuerzoSemana.lunes_a_viernes;
  const store={overrides:{},week:[],cfg:{whatsapp:wa,address:$("#aAddr").value.trim()||BIZ.direccion,maps:$("#aMaps").value.trim()}};
  document.querySelectorAll("[data-w]").forEach(i=>store.week[i.dataset.w]=i.value.trim()||base[i.dataset.w]);
  document.querySelectorAll("#dishes details.adm").forEach(el=>{
    const d=M.platos.find(x=>x.id===el.dataset.id);
    const nu={}; el.querySelectorAll("[data-k]").forEach(i=>{if(i.value!=="")nu[i.dataset.k]=i.value});
    const t=[...el.querySelectorAll("[data-t]:checked")].map(i=>i.dataset.t);
    const off=el.querySelector("[data-off]").checked;
    const tagsChanged=t.join()!==d.etiquetas.join();
    if(Object.keys(nu).length||off||tagsChanged) store.overrides[d.id]={nu,t,off};
  });
  NB.panel.save(store);
  const open=[...document.querySelectorAll("details.adm[open]")].map(d=>d.dataset.id);
  render();
  open.forEach(id=>{const d=$(`details.adm[data-id="${id}"]`); if(d) d.open=true;});
  NB.toast("Cambios guardados");
}

function reset(){
  if(!confirm("¿Restaurar el menú a los datos originales? Se borran las etiquetas, la información nutricional, los agotados y el plato de la semana guardados en este navegador.")) return;
  const s=NB.panel.read();
  NB.panel.save({overrides:{},week:null,cfg:{whatsapp:s.cfg.whatsapp}});
  render();
  NB.toast("Menú restaurado a los datos originales");
}

Promise.all([NB.load("menu"),NB.ready]).then(([m,biz])=>{
  M=m; BIZ=biz;
  render();
  $("#panelForm").addEventListener("input",e=>{if(e.target.id!=="search") setDirty(true)});
  $("#panelForm").addEventListener("change",e=>{if(e.target.id!=="search") setDirty(true)});
  $("#panelForm").addEventListener("submit",e=>{e.preventDefault();save()});
  $("#search").addEventListener("input",filter);
  $("#search").addEventListener("keydown",e=>{if(e.key==="Enter") e.preventDefault()}); // buscar no guarda
  $("#resetBtn").addEventListener("click",reset);
  addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue=""}});
}).catch(()=>{});
})();
