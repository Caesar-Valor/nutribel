/* =========================================================
   balé — sesión de la clienta («Mi cuenta»), aparte de la del estudio
   Supabase Auth con un código de 6 números por correo (sin contraseña). La sesión se guarda en
   este navegador con su propia clave (bale-cuenta-auth): nunca se mezcla con la del área del
   estudio (bale-estudio-auth), que sigue entrando con contraseña por estudio.html.
   La librería de Supabase (js/vendor/supabase.js) se carga solo cuando hace falta.
   Se enciende con data/config.json → sistema.cuenta_clientas = true, y solo si la base de datos
   ya tiene las funciones de la cuenta (cuenta_disponible). Hasta entonces, «Mi cuenta» dice
   que llega muy pronto y el resto del sitio funciona igual.
   La sesión caduca: el token se renueva solo, pero a los 30 días desde que entró hay que volver
   a pedir el código.
   ========================================================= */
(function(){
"use strict";
const NB = window.BALE;
const KEY = "bale-cuenta-auth", DESDE = "bale-cuenta-desde", MAX_MS = 30*864e5, ESPERA_MS = 10000;
let S = null, sb = null;
const listo = NB.ready.then(c=>{ S=(c&&c.sistema)||null; return S; }).catch(()=>null);
const base = ()=>String((S&&S.url)||"").trim().replace(/\/+$/,"");
const conf = ()=>!!(S&&S.activo===true&&/^https?:\/\/[^\s/]+$/.test(base())&&/^sb_publishable_[\w-]+$/.test(S.clave_publicable||""));
const leer = k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
const escribir = (k,v)=>{ try{ v==null?localStorage.removeItem(k):localStorage.setItem(k,v); }catch(e){} };

// Funciones públicas sin sesión (no apagan el sistema si fallan: la página decide qué mostrar)
async function publica(fn,args){
  await listo; if(!conf()) throw new Error("sin_sistema");
  const ctl=new AbortController(), t=setTimeout(()=>ctl.abort(),ESPERA_MS);
  try{
    const r=await fetch(`${base()}/rest/v1/rpc/${encodeURIComponent(fn)}`,{method:"POST",cache:"no-store",signal:ctl.signal,
      headers:{"apikey":S.clave_publicable,"Content-Type":"application/json"},body:JSON.stringify(args||{})});
    const j=await r.json().catch(()=>null);
    if(!r.ok||!j||typeof j.ok!=="boolean"){ const e=new Error(r.status===404?"sin_funcion":"sin_conexion"); e.status=r.status; throw e; }
    return j;
  }finally{ clearTimeout(t); }
}
let disp=null;
function disponible(){
  if(!disp) disp=listo.then(()=>conf()&&S.cuenta_clientas===true ? publica("cuenta_disponible").then(j=>!!(j.ok&&j.cuentas),()=>false) : false);
  return disp;
}
function cargarLib(){
  if(window.supabase&&window.supabase.createClient) return Promise.resolve();
  return new Promise((ok,no)=>{ const s=document.createElement("script"); s.src="js/vendor/supabase.js"; s.onload=ok; s.onerror=()=>no(new Error("sin_libreria")); document.head.append(s); });
}
async function cliente(){
  await listo; if(!conf()) throw new Error("sin_sistema");
  if(sb) return sb;
  await cargarLib();
  sb=window.supabase.createClient(base(),S.clave_publicable,{auth:{storageKey:KEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  return sb;
}
const haySesionGuardada = ()=>!!leer(KEY);
async function sesion(){
  if(!haySesionGuardada()) return null;
  const c=await cliente();
  const {data}=await c.auth.getSession();
  const s=data&&data.session; if(!s) return null;
  let d=+leer(DESDE)||0;
  if(!d){ d=Date.now(); escribir(DESDE,String(d)); }
  if(Date.now()-d>MAX_MS){ await salir(); return null; }
  return s;
}
async function enviarCodigo(correo){
  const c=await cliente();
  const {error}=await c.auth.signInWithOtp({email:correo,options:{shouldCreateUser:true}});
  if(error) throw error;
}
async function verificar(correo,codigo){
  const c=await cliente();
  const {data,error}=await c.auth.verifyOtp({email:correo,token:codigo,type:"email"});
  if(error) throw error;
  escribir(DESDE,String(Date.now()));
  return data&&data.session;
}
async function rpc(fn,args){
  const c=await cliente();
  const {data,error}=await c.rpc(fn,args||{});
  if(error){ const e=new Error(error.message||"error"); e.code=error.code; e.hint=error.hint; throw e; }
  return data;
}
async function yo(){ if(!await sesion()) return null; return rpc("cliente_yo"); }
async function salir(){
  try{ if(sb||haySesionGuardada()){ const c=await cliente(); await c.auth.signOut({scope:"local"}); } }catch(e){}
  escribir(KEY,null); escribir(DESDE,null);
}
// Mensajes para la clienta (Supabase responde en inglés)
function mensaje(e){
  const m=String((e&&(e.message||e.msg))||"").toLowerCase(), st=e&&(e.status||e.code);
  if(st===429||/rate limit|too many|security purposes/.test(m)) return "Pediste varios códigos seguidos. Espera unos minutos y vuelve a intentarlo.";
  if(/expired|invalid|otp/.test(m)) return "Ese código no es válido o ya venció. Revisa los 6 números o pide uno nuevo.";
  if(/signups not allowed|signup is disabled/.test(m)) return "Todavía no se pueden crear cuentas. Escríbenos por WhatsApp y te ayudamos.";
  if(/email/.test(m)&&/valid/.test(m)) return "Escribe un correo válido, por ejemplo tucorreo@gmail.com.";
  if(/sin_ficha/.test(m)) return "Completa tu ficha para continuar.";
  if(/no_autorizado|jwt|session/.test(m)) return "Tu sesión terminó. Entra de nuevo con tu correo.";
  return "No pudimos completar eso. Revisa tu conexión e inténtalo de nuevo.";
}

window.BALE_CUENTA = {listo, disponible, publica, cliente, sesion, haySesionGuardada, enviarCodigo, verificar, rpc, yo, salir, mensaje};
})();
