/* =========================================================
   index.html — presentación: pasos, doctora, quiénes somos y fundadora
   Contenido desde data/negocio.json
   ========================================================= */
(function(){
"use strict";
const {$, esc} = NB;

NB.load("negocio").then(n=>{
  const doc = n.doctora;
  $("#lema").textContent = n.lema;

  $("#steps4").innerHTML = n.pasos_servicio.map((p,i)=>`
    <li><div class="lbl"><b>${p.n}</b><span>${esc(p.titulo)}</span></div>
      <span class="pill"><img src="${esc(p.imagen)}" alt="${esc(p.alt)}" width="449" height="114"${i>=2?' loading="lazy"':""}></span>
      <small>${esc(p.texto)}</small></li>`).join("");

  const img=$("#docImg"); img.src=doc.foto; img.alt=doc.alt;
  $("#docName").textContent = doc.nombre;
  $("#bioImg").src = doc.foto; // repetida en móvil junto a la biografía (decorativa, alt vacío)

  $("#who").textContent = n.quienes_somos;

  // "Doctora en Medicina — UCATECI" -> título + institución
  $("#creds").innerHTML = doc.titulos.map(t=>{
    const [title,inst]=t.split(/\s+—\s+/);
    return `<span>${esc(title)}${inst?`<small>${esc(inst)}</small>`:""}</span>`;
  }).join("");

  // Como en el demo, el nombre de la doctora al inicio de la biografía va en negrita
  $("#bio").innerHTML = n.biografia.map((p,i)=>{
    const at=p.indexOf(doc.nombre);
    if(i===0 && at>=0 && at<5){
      const end=at+doc.nombre.length;
      return `<p><strong>${esc(p.slice(0,end))}</strong>${esc(p.slice(end))}</p>`;
    }
    return `<p>${esc(p)}</p>`;
  }).join("");
}).catch(()=>{});
})();
