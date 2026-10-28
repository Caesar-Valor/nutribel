/* balé — aplica el modo oscuro antes de pintar (archivo aparte: estudio.html, mi-reserva.html y privacidad.html no permiten scripts en línea) */
try{ if(localStorage.getItem("bale-mode")==="dark") document.documentElement.setAttribute("data-mode","dark"); }catch(e){}
