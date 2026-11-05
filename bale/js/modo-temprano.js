/* balé — antes de pintar: el modo oscuro y la clase «js» (las entradas y el revelado solo se esconden si hay JS).
   Archivo aparte: las páginas no permiten scripts en línea (CSP). */
try{ if(localStorage.getItem("bale-mode")==="dark") document.documentElement.setAttribute("data-mode","dark"); }catch(e){}
document.documentElement.classList.add("js");
