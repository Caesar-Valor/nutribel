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

// CardNET por cobro (no hay enlace fijo): el botón pide el cobro con la firma del enlace de la
// reserva (pedir_enlace_pago) y abre el WhatsApp del estudio con el texto que arma la base de
// datos (nombre, clase, fecha, monto y n.º de reserva; nunca el token). WhatsApp se abre dentro
// del clic, como al reservar.
const NOTA_TARJETA = "El cobro te llega por WhatsApp de CardNET a nombre de NUTRIBEL NUTRICION PERSONALIZADA Y BIENESTAR.";
function tarjetaHtml(R){
  const pedido=R.cobro_tarjeta==="pedido"||R.cobro_tarjeta==="enviado";
  return `<div class="paycard"><button class="bbtn solid" type="button" data-tarjeta>Pagar con tarjeta</button>
    <p class="paynote">${pedido?"Ya pediste el cobro. ":""}${NB.esc(NOTA_TARJETA)}</p></div>`;
}
async function pedirTarjeta(R,boton){
  let win=null;
  try{ win=window.open("","_blank"); if(win) win.opener=null; }catch(e){ win=null; }
  const txt=boton.textContent;
  boton.disabled=true; boton.setAttribute("aria-busy","true"); boton.textContent="Un momento…";
  let j=null;
  try{ j=await llamar("pedir_enlace_pago",{p_token:R.token}); }catch(e){ j=null; }
  boton.disabled=false; boton.removeAttribute("aria-busy"); boton.textContent=txt;
  if(!j||!j.ok){
    if(win) win.close();
    NB.toast((j&&j.mensaje)||"Ahora mismo no podemos pedir el cobro. Escríbenos por WhatsApp y te lo enviamos.");
    return false;
  }
  const url=NB.waLink(j.texto);
  if(win) win.location.href=url; else location.href=url;
  R.cobro_tarjeta=j.cobro||"pedido";
  return true;
}

window.BALE_SISTEMA = {
  activo, llamar, listo, caer, AVISO,
  tarjeta:{html:tarjetaHtml, pedir:pedirTarjeta},
  cfg:()=>Object.assign({abrir_whatsapp_al_reservar:true},S||{}),
  alCaer:fn=>{ oyentes.push(fn); }
};
})();
