/* balé — las direcciones de la página larga de antes (/bale/#horario, #precios…) llevan a la página nueva.
   Va en el <head> de index.html, antes de pintar: replace() para que el anclaje viejo no quede en el historial. */
(function(){
  if(/\/bale$/.test(location.pathname)){ location.replace(location.pathname+"/"+location.search+location.hash); return; }
  if(/[?&]vista=estudio\b/.test(location.search)){ location.replace("estudio.html"); return; }
  var M={horario:"reservar.html",reservar:"reservar.html",precios:"precios.html",clases:"clases.html",reformer:"clases.html#pilates-reformer",
    estudio:"nosotras.html",equipo:"nosotras.html#equipo",ubicacion:"nosotras.html#ubicacion",comunidad:"comunidad.html",faq:"preguntas.html",preguntas:"preguntas.html"};
  var h=(location.hash||"").slice(1);
  if(h&&M[h]) location.replace(M[h]);
})();
