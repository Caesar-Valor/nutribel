/* =========================================================
   balé — conexión con la base de datos (Supabase), sin librerías
   Llama las funciones públicas de la API (docs/API.md de bale-sistema):
   POST {url}/rest/v1/rpc/<función> con la clave PUBLICABLE (sb_publishable_…).
   Siempre POST: con GET la API corre en solo lectura y horario_publico
   puede necesitar crear las sesiones que falten.
   Se activa con data/config.json → sistema.activo. Si la red o la base de
   datos fallan, se apaga para esta visita y la página vuelve al modo de
   siempre (horario de los JSON, reserva por WhatsApp y FormSubmit).
   Las respuestas {ok:false, error, mensaje} se devuelven tal cual: el
   mensaje ya viene escrito para la clienta.
   ========================================================= */
(function(){
"use strict";
const NB = window.BALE;
const AVISO = "Ahora mismo no podemos confirmar en línea. Tu reserva se envía por WhatsApp y el estudio te la confirma.";
const ESPERA_MS = 10000;
let S=null, caido=false;
const oyentes=[];

// Solo con la clave publicable y una URL de verdad; una clave secreta nunca se usa aquí
function configurado(){
  return !!(S&&S.activo===true&&/^https?:\/\/[^\s/]+$/.test(base())&&/^sb_publishable_[\w-]+$/.test(S.clave_publicable||""));
}
const base = ()=>String((S&&S.url)||"").trim().replace(/\/+$/,"");
const activo = ()=>configurado()&&!caido;

const listo = NB.ready.then(c=>{ S=(c&&c.sistema)||null; return activo(); }).catch(()=>false);

// Una sola vez por visita: avisa a la página (que vuelve al modo de siempre)
function caer(){
  if(caido) return;
  caido=true;
  if(oyentes.length) oyentes.forEach(fn=>{ try{ fn(AVISO); }catch(e){} });
  else NB.toast(AVISO);
}

async function llamar(fn,args){
  if(!activo()) throw new Error("sin_sistema");
  const ctl=new AbortController(), t=setTimeout(()=>ctl.abort(),ESPERA_MS);
  let j=null, ok=false;
  try{
    const res=await fetch(`${base()}/rest/v1/rpc/${encodeURIComponent(fn)}`,{
      method:"POST", cache:"no-store", signal:ctl.signal,
      headers:{"apikey":S.clave_publicable,"Content-Type":"application/json"},
      body:JSON.stringify(args||{})
    });
    ok=res.ok;
    j=await res.json().catch(()=>null);
  }catch(e){ ok=false; }
  finally{ clearTimeout(t); }
  if(!ok||!j||typeof j!=="object"||typeof j.ok!=="boolean"){ caer(); throw new Error("sin_conexion"); }
  return j;
}

window.BALE_SISTEMA = {
  activo, llamar, listo, caer, AVISO,
  cfg:()=>Object.assign({abrir_whatsapp_al_reservar:true},S||{}),
  alCaer:fn=>{ oyentes.push(fn); }
};
})();
