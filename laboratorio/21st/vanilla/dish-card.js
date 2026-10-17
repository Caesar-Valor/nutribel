/* Laboratorio: comportamiento de dish-card.tsx sin React.
   whileInView → inView · whileHover/whileTap → eventos + animate ·
   layoutId → mover el resaltado con transform · AnimatePresence → salida y entrada del texto. */
import { animate, inView } from "../../../js/vendor/motion.mjs";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const sec = (n, d) => { const v = css(n); return v ? parseFloat(v) / (v.endsWith("ms") ? 1000 : 1) : d; };
const spring = d => ({ type: "spring", visualDuration: d, bounce: parseFloat(css("--spring-bounce")) || .25 });
const D = { fast: sec("--dur-fast", .15), base: sec("--dur-base", .25), slow: sec("--dur-slow", .45) };
const money = n => "RD$" + n.toLocaleString("es-DO");

document.querySelectorAll("[data-dish]").forEach(card => {
  const name = card.querySelector("h3").textContent;
  const sizes = [...card.querySelectorAll(".dsizes button")];
  const hl = card.querySelector(".hl");
  const add = card.querySelector(".dadd");
  const lbl = add.querySelector(".lbl");

  // Entrada al aparecer en pantalla
  if (!reduce) {
    card.style.opacity = "0";
    inView(card, () => { animate(card, { opacity: [0, 1], transform: ["translateY(22px) scale(.96)", "translateY(0px) scale(1)"] }, spring(D.slow)); }, { amount: .25 });
    card.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") animate(card, { transform: "translateY(-4px)" }, spring(D.slow)); });
    card.addEventListener("pointerleave", () => animate(card, { transform: "translateY(0px)" }, spring(D.slow)));
  }

  // Resaltado del tamaño
  const place = (btn, instant) => {
    const to = { width: btn.offsetWidth + "px", height: btn.offsetHeight + "px", transform: `translate(${btn.offsetLeft}px,${btn.offsetTop}px)` };
    if (instant || reduce) Object.assign(hl.style, to); else animate(hl, to, spring(D.base));
  };
  const select = (btn, focus) => {
    sizes.forEach(b => { const on = b === btn; b.setAttribute("aria-checked", on); b.tabIndex = on ? 0 : -1; });
    place(btn); if (focus) btn.focus();
  };
  place(sizes[0], true);
  addEventListener("resize", () => place(card.querySelector('[aria-checked="true"]'), true));
  sizes.forEach((b, i) => {
    b.addEventListener("click", () => select(b));
    b.addEventListener("keydown", e => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (k) { e.preventDefault(); select(sizes[(i + k + sizes.length) % sizes.length], true); }
    });
  });

  // Agregar: toque, cambio de texto a "Agregado" y vuelta
  let busy = false;
  const swap = async html => {
    if (!reduce) await animate(lbl, { transform: "translateY(-14px)", opacity: 0 }, { duration: D.fast });
    lbl.innerHTML = html;
    if (!reduce) await animate(lbl, { transform: ["translateY(14px)", "translateY(0px)"], opacity: [0, 1] }, { duration: D.base });
  };
  const original = lbl.innerHTML;
  add.addEventListener("pointerdown", () => { if (!reduce) animate(add, { transform: "scale(.96)" }, { duration: D.fast }); });
  add.addEventListener("pointerup", () => { if (!reduce) animate(add, { transform: "scale(1)" }, spring(D.base)); });
  add.addEventListener("pointerleave", () => { if (!reduce) animate(add, { transform: "scale(1)" }, spring(D.base)); });
  add.addEventListener("click", async () => {
    if (busy) return; busy = true;
    const s = card.querySelector('[aria-checked="true"]');
    document.getElementById("log").textContent = `Se agregaría: ${name} (${s.firstElementChild.textContent}), ${money(+s.dataset.price)}.`;
    await swap('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>Agregado');
    setTimeout(async () => { await swap(original); busy = false; }, 1400);
  });
});
