/* TEMPORAL — pruebas de la fase 1. Se borra en la fase 6. */
(function(){
"use strict";
const {$, esc, money} = NB;
const tags = {proteina:"Alto en proteína", ligero:"Ligero"};

NB.load("menu").then(m=>{
  const color = id=>`var(--${m.secciones.find(s=>s.id===id).color})`;
  // Un plato con foto y tamaños, uno sin foto y una bebida sin precio
  const pick = ["fritaca","dominicanisimo","nutrishot"].map(id=>m.platos.find(p=>p.id===id));
  $("#tCards").innerHTML = pick.map(d=>`
    <article class="card" style="--accent:${color(d.seccion)}" data-id="${d.id}">
      ${d.imagen?`<div class="ph"><img loading="lazy" src="${esc(d.imagen)}" alt="${esc(d.nombre)}"></div>`:""}
      <h3>${esc(d.nombre)}</h3>
      <p>${esc(d.descripcion)}</p>
      ${d.etiquetas.length?`<div class="tags">${d.etiquetas.map(t=>`<span class="tag">${tags[t]||t}</span>`).join("")}</div>`:""}
      <div class="sizes">${d.precios.map((p,i)=>`<button class="size" type="button" aria-pressed="${i===0}" data-i="${i}">${p.precio!=null?`<span>${esc(p.tamano)}</span>`:""}<span>${money(p.precio)}</span></button>`).join("")}</div>
      <button class="add" type="button">Agregar al pedido</button>
    </article>`).join("");
  $("#tCards").querySelectorAll(".card").forEach(card=>{
    const d=pick.find(x=>x.id===card.dataset.id);
    card.querySelectorAll(".size").forEach(b=>b.onclick=()=>{card.querySelectorAll(".size").forEach(x=>x.setAttribute("aria-pressed","false"));b.setAttribute("aria-pressed","true")});
    card.querySelector(".add").onclick=()=>{
      const p=d.precios[+card.querySelector('.size[aria-pressed="true"]').dataset.i];
      NB.cart.add({name:d.nombre,size:(p.tamano==="Único"||p.precio==null)?"":p.tamano,opt:"",price:p.precio});
    };
  });
}).catch(()=>{});

$("#tWa").onclick=()=>NB.whatsapp("Hola NutriBEL, esto es una prueba de la web.");
document.addEventListener("nb:horario",e=>{
  $("#tHours").textContent = `Horario: ${e.detail.text}. ` + e.detail.rows.map(([d,h,hoy])=>`${d}: ${h}${hoy?" (hoy)":""}`).join(" · ");
});
})();
