/* =========================================================
   NutriBEL — microinteracciones con Motion (motion.dev), sin compilación
   js/vendor/motion.mjs es Motion 14 para JavaScript puro, empaquetado una sola
   vez en un módulo ES (animate, inView y scroll).
   Duraciones y curvas salen de las variables de css/base.css (--dur-*, --ease-*).
   Con prefers-reduced-motion no se anima nada: todo aparece en su estado final.
   - Cabecera con sombra al hacer scroll (scroll)
   (El titular de la portada entra con CSS, css/index.css: así se pinta sin esperar a este módulo.)
   - Entrada suave de las secciones al aparecer en pantalla (inView)
   - Botones y tarjetas al pasar el ratón o tocar
   - El plato "vuela" al botón Pedido al agregarlo
   ========================================================= */
import { animate, inView, scroll } from "./vendor/motion.mjs";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const NB = window.NB;

// Lee las variables del sistema de diseño
const ms = (name, def) => (NB ? NB.cssMs(name, def) : def) / 1000;
const ease = (name, def) => {
  const m = (NB ? NB.cssVar(name) : "").match(/cubic-bezier\(([^)]+)\)/);
  return m ? m[1].split(",").map(Number) : def;
};
const T = {
  fast: ms("--dur-fast", 150), base: ms("--dur-base", 250), slow: ms("--dur-slow", 450), reveal: ms("--dur-reveal", 650),
  stagger: ms("--stagger", 70), out: ease("--ease-out", [.2, .8, .2, 1]),
  bounce: parseFloat(NB && NB.cssVar("--spring-bounce")) || .25
};
const spring = d => ({ type: "spring", visualDuration: d, bounce: T.bounce });

/* ---------- Entrada de secciones al hacer scroll ---------- */
const REVEAL = [".about > div", ".menuintro > *", ".svcfoot", "#menu > .big", "footer .wrap"].join(",");
function reveals() {
  if (reduce) return;
  // Solo lo que empieza fuera de pantalla: lo visible al cargar no parpadea
  const items = [...document.querySelectorAll(REVEAL)].filter(el => el.getBoundingClientRect().top > innerHeight);
  items.forEach(el => { el.style.opacity = "0"; el.style.transform = "translateY(24px)"; });
  items.forEach(el => inView(el, () => {
    const sib = el.parentElement ? [...el.parentElement.children].filter(x => items.includes(x)).indexOf(el) : 0;
    animate(el, { opacity: 1, transform: "translateY(0px)" }, { duration: T.reveal, ease: T.out, delay: Math.max(0, sib) * T.stagger * 1.5 });
  }, { amount: .15 }));
}

/* ---------- Cabecera: sombra cuando el contenido pasa por debajo ---------- */
function headerShadow() {
  const top = document.querySelector(".top");
  if (!top) return;
  scroll((_, info) => top.classList.toggle("scrolled", info.y.current > 8));
}

/* ---------- Hover y toque en botones y tarjetas ---------- */
const PRESS = ".btn,.card .add,.chip,.tabs button,.cartbtn,.modebtn,.size,.step .opts button,.summary button,.tobale,.qty button";
const LIFT = ".grid .card:not(.off),.plans .card";
function interactions() {
  if (reduce) return;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  document.addEventListener("pointerdown", e => {
    const b = e.target.closest(PRESS);
    if (!b || b.disabled) return;
    animate(b, { transform: "scale(.96)" }, { duration: T.fast, ease: T.out });
    const up = () => { animate(b, { transform: "scale(1)" }, spring(T.base)); b.removeEventListener("pointerleave", up); };
    b.addEventListener("pointerleave", up);
    addEventListener("pointerup", up, { once: true });
    addEventListener("pointercancel", up, { once: true });
  });
  if (!fine) return; // en el teléfono no hay hover: solo la respuesta al toque
  document.addEventListener("pointerover", e => {
    const c = e.target.closest(LIFT);
    if (c && !c.contains(e.relatedTarget)) animate(c, { transform: "translateY(-4px)" }, spring(T.slow));
  });
  document.addEventListener("pointerout", e => {
    const c = e.target.closest(LIFT);
    if (c && !c.contains(e.relatedTarget)) animate(c, { transform: "translateY(0px)" }, spring(T.slow));
  });
}

/* ---------- Agregar al pedido: el plato vuela hasta el botón Pedido ---------- */
let origin = null, originAt = 0;
document.addEventListener("click", e => { origin = e.target.closest("button"); originAt = performance.now(); }, true);

function flyToCart() {
  const cart = document.getElementById("openCart");
  if (!cart || reduce) return;
  const from = origin && performance.now() - originAt < 1000 ? origin : null;
  const bump = () => {
    animate(cart, { transform: ["scale(1)", "scale(1.12)", "scale(1)"] }, { duration: T.slow, ease: T.out });
    const n = document.getElementById("count");
    if (n) animate(n, { transform: ["scale(1)", "scale(1.5)", "scale(1)"] }, { duration: T.slow, ease: T.out, delay: T.fast / 2 });
  };
  if (!from) { bump(); return; }
  const a = from.getBoundingClientRect(), b = cart.getBoundingClientRect();
  const photo = from.closest(".card") && from.closest(".card").querySelector(".ph img");
  const size = photo ? 64 : 22;
  // Capa exterior: desplazamiento horizontal; interior: vertical con otra curva (dibuja un arco)
  const outer = document.createElement("div"), inner = document.createElement("div");
  outer.className = "fly"; inner.className = "fly-in" + (photo ? "" : " dot");
  if (photo) { const img = document.createElement("img"); img.src = photo.currentSrc || photo.src; img.alt = ""; inner.append(img); }
  outer.setAttribute("aria-hidden", "true");
  outer.style.cssText = `left:${a.left + a.width / 2 - size / 2}px;top:${a.top + a.height / 2 - size / 2}px;width:${size}px;height:${size}px`;
  outer.append(inner); document.body.append(outer);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const d = T.reveal + .1;
  animate(outer, { transform: ["translateX(0)", `translateX(${dx}px)`] }, { duration: d, ease: [.4, 0, .2, 1] });
  animate(inner, { transform: ["translateY(0) scale(1)", `translateY(${dy}px) scale(.35)`], opacity: [1, 1, .6] }, { duration: d, ease: [.5, -0.35, .7, 1] })
    .then(() => { outer.remove(); bump(); });
}

/* ---------- Arranque ---------- */
headerShadow();
interactions();
document.addEventListener("nb:cart-add", flyToCart);
// Las secciones se pintan con datos de data/*.json: espera a que estén
(document.readyState === "complete" ? Promise.resolve() : new Promise(r => addEventListener("load", r, { once: true })))
  .then(() => requestAnimationFrame(reveals));
