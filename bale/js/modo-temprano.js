/* balé — antes de pintar: el modo oscuro y la clase «js» (las entradas y el revelado solo se esconden si hay JS).
   Archivo aparte: las páginas no permiten scripts en línea (CSP). */
(function(){   // modo oscuro: lo elegido con el botón; si no hay elección, el del sistema
  var m=null; try{ m=localStorage.getItem("bale-mode"); }catch(e){}
  var sis=window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches;
  if(m==="dark"||(m!=="light"&&sis)) document.documentElement.setAttribute("data-mode","dark");
})();
document.documentElement.classList.add("js");
/* Telón de la portada: cada vez que se abre la portada, como en la página única de octubre
   (pedido de César, 8/11/2026). Un clic o una tecla lo salta; nunca con movimiento reducido. */
(function(){
  var h=document.documentElement;
  if(!/(\/|index\.html)$/.test(location.pathname)) return;
  var calma=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  h.classList.add(calma?"sin-telon":"con-telon");
})();
