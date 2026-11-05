/* balé — antes de pintar: el modo oscuro y la clase «js» (las entradas y el revelado solo se esconden si hay JS).
   Archivo aparte: las páginas no permiten scripts en línea (CSP). */
try{ if(localStorage.getItem("bale-mode")==="dark") document.documentElement.setAttribute("data-mode","dark"); }catch(e){}
document.documentElement.classList.add("js");
/* Telón de la portada: una vez por visita (sessionStorage) y nunca con movimiento reducido */
(function(){
  var h=document.documentElement;
  if(!/(\/|index\.html)$/.test(location.pathname)) return;
  var visto=false; try{ visto=sessionStorage.getItem("bale-telon")==="1"; sessionStorage.setItem("bale-telon","1"); }catch(e){}
  var calma=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  h.classList.add(visto||calma?"sin-telon":"con-telon");
})();
