/* Generado por _fuente/construir.mjs desde data/config.json (sitio.url): no editar a mano.
   balé tiene su dominio propio: quien entre por caesar-valor.github.io/nutribel/bale/… va a la misma página en
   https://balestudiord.com, con su ?… y su #… Solo en github.io: nunca en localhost ni en el dominio nuevo. */
(function(){
  if(!/(^|\.)github\.io$/i.test(location.hostname)) return;
  var ruta=location.pathname.replace(/^.*?\/bale(?=\/|$)/,"")||"/";
  location.replace("https://balestudiord.com"+ruta+location.search+location.hash);
})();
