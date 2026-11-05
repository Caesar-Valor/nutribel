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

// «Ya transferí»: la clienta dice cuándo y desde qué banco transfirió y, si quiere, sube la foto
// del comprobante. La foto se vuelve a dibujar en el navegador (así pierde la ubicación, la fecha
// y el modelo del teléfono que traen las fotos), se reduce y se sube a un espacio privado del
// estudio, a una ruta que la base de datos acepta una sola vez. Si la foto falla, el aviso queda igual.
const BANCOS = ["Banco Popular","Banreservas","BHD","Scotiabank","Banco Santa Cruz","APAP","Asociación Cibao","Banco Caribe","Banesco","Promerica","Banco López de Haro","Banco Vimenca","Qik"];
const FOTO_MAX = 1572864;   // 1,5 MB (igual que el límite del espacio privado)
const hoyLV = ()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Santo_Domingo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const fechaCorta = s=>{ const [y,m,d]=String(s||"").split("-").map(Number); return y?new Date(y,m-1,d).toLocaleDateString("es-DO",{day:"numeric",month:"long"}):""; };
function transfHtml(R,abierto){
  const T=R.transferencia, e=NB.esc;
  if(T&&T.estado==="por_confirmar"&&!abierto)
    return `<div class="transf"><p class="paynote">Nos avisaste tu transferencia del ${e(fechaCorta(T.fecha))} desde ${e(T.banco)}${T.comprobante?", con el comprobante":""}. El estudio la revisa y te avisa por correo.</p>
      <button class="linkbtn" type="button" data-transf-abrir>Corregir los datos</button></div>`;
  const rech=T&&T.estado==="rechazada"&&!abierto?`<p class="paynote mal">No pudimos confirmar tu transferencia: ${e(T.motivo||"")} Escríbenos por WhatsApp o avísanos de nuevo.</p>`:"";
  if(!abierto) return `<div class="transf">${rech}<button class="bbtn line" type="button" data-transf-abrir>Ya transferí</button></div>`;
  const hoy=hoyLV();
  return `<form class="transf transf-form form" data-transf-form novalidate>
    <p class="paytit">Avisar la transferencia</p>
    <label class="fld">¿Cuándo transferiste?<input type="date" name="fecha" max="${hoy}" value="${e(T&&T.fecha||hoy)}" required></label>
    <label class="fld">¿Desde qué banco?<input name="banco" maxlength="60" list="bancosTransf" autocomplete="off" value="${e(T&&T.banco||"")}" required></label>
    <datalist id="bancosTransf">${BANCOS.map(b=>`<option value="${e(b)}">`).join("")}</datalist>
    <label class="fld">Foto del comprobante (opcional)<input type="file" name="foto" accept="image/jpeg,image/png,image/webp"></label>
    <p class="paynote">La foto la ve solo el estudio. Antes de subirla le quitamos los datos ocultos (como la ubicación).</p>
    <div class="transf-btns"><button class="bbtn solid" type="submit">Avisar al estudio</button><button class="linkbtn" type="button" data-transf-cerrar>Cancelar</button></div>
  </form>`;
}
// Imagen → WebP (o JPEG en los navegadores que no saben WebP), como mucho 1600 px y 1,5 MB, sin metadatos
async function recodificar(archivo){
  if(!/^image\/(jpeg|png|webp)$/.test(archivo.type)) throw new Error("La foto debe ser JPG, PNG o WebP.");
  if(archivo.size>15*1024*1024) throw new Error("La foto pesa demasiado (máximo 15 MB).");
  let img;
  try{ img=await createImageBitmap(archivo); }catch(e){ throw new Error("No pudimos abrir esa foto. Prueba con otra."); }
  for(const [lado,calidad] of [[1600,.82],[1280,.72],[1024,.62]]){
    const k=Math.min(1,lado/Math.max(img.width,img.height)), c=document.createElement("canvas");
    c.width=Math.max(1,Math.round(img.width*k)); c.height=Math.max(1,Math.round(img.height*k));
    const g=c.getContext("2d"); g.fillStyle="#fff"; g.fillRect(0,0,c.width,c.height); g.drawImage(img,0,0,c.width,c.height);
    let b=await new Promise(r=>c.toBlob(r,"image/webp",calidad));
    if(!b||b.type!=="image/webp") b=await new Promise(r=>c.toBlob(r,"image/jpeg",calidad));
    if(b&&b.size<=FOTO_MAX) return {blob:b, ext:b.type==="image/webp"?"webp":"jpg"};
  }
  throw new Error("La foto pesa demasiado incluso reducida. Prueba con una captura de pantalla.");
}
async function subirFoto(ruta,f){
  const ctl=new AbortController(), t=setTimeout(()=>ctl.abort(),30000);
  try{
    const res=await fetch(`${base()}/storage/v1/object/comprobantes/${ruta.split("/").map(encodeURIComponent).join("/")}`,{
      method:"POST", signal:ctl.signal, headers:{"apikey":S.clave_publicable,"Content-Type":f.blob.type,"x-upsert":"false","cache-control":"no-store"}, body:f.blob});
    return res.ok;
  }catch(e){ return false; }
  finally{ clearTimeout(t); }
}
async function avisarTransferencia(R,form){
  const fecha=form.querySelector('[name="fecha"]').value, banco=form.querySelector('[name="banco"]').value.trim(), archivo=form.querySelector('[name="foto"]').files[0];
  if(!fecha||fecha>hoyLV()) return {error:"Elige la fecha de la transferencia (hoy o antes)."};
  if(banco.length<2) return {error:"Escribe el banco desde el que transferiste."};
  let foto=null;
  if(archivo){ try{ foto=await recodificar(archivo); }catch(e){ return {error:e.message}; } }
  let j=null;
  try{ j=await llamar("avisar_transferencia",{p_token:R.token,p_fecha:fecha,p_banco:banco,p_foto:foto?foto.ext:null}); }catch(e){ j=null; }
  if(!j) return {error:"Ahora mismo no podemos avisar al estudio. Escríbenos por WhatsApp con el comprobante."};
  if(!j.ok) return {error:j.mensaje||"No se pudo avisar."};
  let fotoOk=!foto;
  if(foto&&j.subir) fotoOk=await subirFoto(j.subir,foto);
  R.transferencia={estado:"por_confirmar",fecha,banco,comprobante:!!(foto&&fotoOk)||!!(R.transferencia&&R.transferencia.comprobante)};
  return {ok:true, mensaje:fotoOk?"Listo. El estudio revisa la transferencia y te avisa.":"Avisamos al estudio, pero la foto no se pudo subir. Si quieres, mándala por WhatsApp."};
}
// Conecta un contenedor: R() devuelve la reserva (o membresía) actual; repintar() vuelve a dibujar el pago
function transfConectar(caja,R,repintar){
  caja.addEventListener("click",e=>{
    if(e.target.closest("[data-transf-abrir]")){ const t=caja.querySelector(".transf"); if(t&&R()){ t.outerHTML=transfHtml(R(),true); const f=caja.querySelector('[data-transf-form] [name="fecha"]'); if(f) f.focus(); } }
    else if(e.target.closest("[data-transf-cerrar]")){ repintar(); const n=caja.querySelector("[data-transf-abrir]"); if(n) n.focus(); }
  });
  caja.addEventListener("submit",async e=>{
    const form=e.target.closest("[data-transf-form]"); if(!form||!R()) return;
    e.preventDefault();
    const b=form.querySelector('[type="submit"]'); b.disabled=true; b.setAttribute("aria-busy","true"); b.textContent="Enviando…";
    const r=await avisarTransferencia(R(),form);
    b.disabled=false; b.removeAttribute("aria-busy"); b.textContent="Avisar al estudio";
    NB.toast(r.error||r.mensaje);
    if(r.ok){ repintar(); const n=caja.querySelector("[data-transf-abrir]"); if(n) n.focus(); }
  });
}

window.BALE_SISTEMA = {
  activo, llamar, listo, caer, AVISO,
  tarjeta:{html:tarjetaHtml, pedir:pedirTarjeta},
  transferencia:{html:transfHtml, conectar:transfConectar},
  cfg:()=>Object.assign({abrir_whatsapp_al_reservar:true},S||{}),
  alCaer:fn=>{ oyentes.push(fn); }
};
})();
