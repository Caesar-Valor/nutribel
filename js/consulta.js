/* =========================================================
   consulta.html — cita por WhatsApp
   Motivos desde data/servicios.json y data/planes.json.
   ?plan=Nombre preselecciona el plan. Los domingos no hay consultas.
   Nada de este formulario se guarda en el navegador.
   ========================================================= */
(function(){
"use strict";
const {$, esc} = NB;
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;   // fecha local, no UTC
const parseYmd=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d,12)};
const SUNDAY_MSG="Los domingos no hay consultas. Elige otro día.";

function fillReasons(sv,pl){
  const groups=[
    ["Consulta",["Primera consulta","Seguimiento"].concat(sv.nutricion_y_bienestar.filter(s=>!/Nutrición pediátrica|Nutrición geriátrica/.test(s)))],
    ["Condición de salud",sv.seguimiento_condiciones.map(s=>"Seguimiento: "+s)],
    ["Planes",pl.planes.map(p=>p.nombre)]
  ];
  $("#cReason").innerHTML=groups.map(([g,opts])=>`<optgroup label="${esc(g)}">${opts.map(o=>`<option>${esc(o)}</option>`).join("")}</optgroup>`).join("");
}

// Horas cada 30 min dentro del horario del día elegido; si es hoy, solo las que faltan
function fillTimes(){
  const sel=$("#cTime"), prev=sel.value, v=$("#cDate").value, ranges=NB.ranges();
  const date=v?parseYmd(v):null, r=date&&ranges?ranges[date.getDay()]:null;
  const slots=[];
  if(r){
    const now=new Date(), isToday=v===ymd(now), nowH=now.getHours()+now.getMinutes()/60;
    for(let h=r[0];h<r[1];h+=.5) if(!isToday||h>nowH) slots.push(NB.fmtH(h));
  }
  const sunday=!!date&&date.getDay()===0;
  $("#cDate").setAttribute("aria-invalid",sunday?"true":"false");
  $("#dateNote").textContent=sunday?SUNDAY_MSG:(date&&!slots.length?"No quedan horarios para este día. Elige otro.":"");
  sel.innerHTML=slots.length?slots.map(s=>`<option>${s}</option>`).join(""):`<option value="">Sin horarios</option>`;
  sel.disabled=!slots.length;
  if(slots.includes(prev)) sel.value=prev;
}

function book(e){
  e.preventDefault();
  const name=$("#cName").value.trim();
  if(!name){NB.toast("Escribe tu nombre para pedir la cita.");$("#cName").focus();return}
  const date=$("#cDate").value;
  if(!date){NB.toast("Elige una fecha.");$("#cDate").focus();return}
  if(parseYmd(date).getDay()===0){NB.toast(SUNDAY_MSG);$("#cDate").focus();return}
  if(!$("#cTime").value){NB.toast("No quedan horarios para ese día. Elige otro.");$("#cDate").focus();return}
  const f=parseYmd(date).toLocaleDateString("es-DO",{weekday:"long",day:"numeric",month:"long"});
  const note=$("#cNote").value.trim();
  NB.whatsapp(`Hola Dra. Bielka Eusebio, quiero agendar una consulta.\nNombre: ${name}\nMotivo: ${$("#cReason").value}\nFecha: ${f}\nHora: ${$("#cTime").value}${note?`\nNota: ${note}`:""}`);
}

Promise.all([NB.load("servicios"),NB.load("planes"),NB.ready]).then(([sv,pl,biz])=>{
  $("#docImg").src=biz.doctora.foto;
  $("#docName").textContent=biz.doctora.nombre;
  fillReasons(sv,pl);

  // Fecha: desde hoy; por defecto mañana (o el lunes si mañana es domingo)
  const today=new Date(), def=new Date(); def.setDate(def.getDate()+1);
  if(def.getDay()===0) def.setDate(def.getDate()+1);
  $("#cDate").min=ymd(today); $("#cDate").value=ymd(def);
  fillTimes();
  $("#cDate").addEventListener("change",()=>{fillTimes(); if($("#cDate").getAttribute("aria-invalid")==="true") NB.toast(SUNDAY_MSG)});

  // Plan preseleccionado desde planes.html
  const plan=new URLSearchParams(location.search).get("plan");
  if(plan&&[...$("#cReason").options].some(o=>o.value===plan)){
    $("#cReason").value=plan;
    NB.toast(`Elegiste “${plan}”. Completa tus datos para pedir la cita.`);
  }
  $("#bookForm").addEventListener("submit",book);
}).catch(()=>{});
})();
