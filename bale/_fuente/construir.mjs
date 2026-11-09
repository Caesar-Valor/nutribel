// =========================================================
// balé — compilado del sitio (sin dependencias). Uso, desde la carpeta nutribel:
//   node bale/_fuente/construir.mjs              arma bale/*.html desde _fuente/ y los JSON de bale/data/
//   node bale/_fuente/construir.mjs --comprobar  no escribe nada; falla si alguna página no está al día
// Las páginas salen de _fuente/paginas/*.html (cabecera <!--@ {...} @--> con el título y lo demás) y de los
// parciales de _fuente/parciales/. Lo que viene de los JSON (clases, precios, equipo, preguntas, comunidad
// de respaldo) se escribe en HTML estático: lo leen los buscadores y la página no parpadea.
// GitHub Pages no publica _fuente/ (Jekyll ignora las carpetas que empiezan por «_»).
// =========================================================
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const FUENTE = dirname(fileURLToPath(import.meta.url));
const BALE = join(FUENTE, '..');
const RAIZ = join(BALE, '..');
const URL_BASE = 'https://caesar-valor.github.io/nutribel/bale/';
const COMPROBAR = process.argv.includes('--comprobar');

const leer = (r) => readFileSync(join(BALE, 'data', r), 'utf8');
const json = (r) => JSON.parse(leer(r));
const B = json('bale.json'), H = json('horario.json'), P = json('precios.json'), C = json('comunidad.json'), CFG = json('config.json');
const parcial = (n) => readFileSync(join(FUENTE, 'parciales', n + '.html'), 'utf8');

// ---------- Utilidades ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dinero = (n) => (typeof n === 'number' ? 'RD$' + n.toLocaleString('en-US') : 'Precio por confirmar');
const toH = (t) => { const [h, m] = t.split(':').map(Number); return h + m / 60; };
const hora = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`; };
const DIAS = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };
const ORDEN = Object.keys(DIAS);
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const srcset = (src) => (/^img\/[^/]+\.webp$/.test(src) && existsSync(join(BALE, src.replace(/\.webp$/, '-480.webp'))) ? `${src.slice(0, -5)}-480.webp 480w, ${src.slice(0, -5)}-800.webp 800w, ${src} 1200w` : '');
function img(f, sizes, { w = 1200, h = 1500, lazy = true, cls = '', prioridad = false } = {}) {
  const ss = srcset(f.src || f.foto);
  return `<img src="${esc(f.src || f.foto)}"${ss ? ` srcset="${esc(ss)}" sizes="${esc(sizes)}"` : ''} alt="${esc(f.alt)}" width="${w}" height="${h}"${lazy ? ' loading="lazy"' : ''}${prioridad ? '' : ' decoding="async"'}${prioridad ? ' fetchpriority="high"' : ''}${cls ? ` class="${cls}"` : ''}>`;
}
const wa = (texto) => `data-wa="${esc(texto)}"`;

// Horario de cada clase (de horario.json): días y horas, duración e instructoras
function horarioDe(cl) {
  const lista = H.clases.filter((c) => cl.tipos.includes(c.clase)).sort((a, b) => ORDEN.indexOf(a.dia) - ORDEN.indexOf(b.dia) || toH(a.inicio) - toH(b.inicio));
  const mins = [...new Set(lista.map((c) => Math.round((toH(c.fin) - toH(c.inicio)) * 60)))].sort((a, b) => a - b);
  const insts = [...new Set(lista.map((c) => c.instructora))];
  const porDia = {};
  for (const c of lista) (porDia[c.dia] = porDia[c.dia] || []).push(hora(c.inicio) + (c.edad ? ` (${c.edad})` : ''));
  return { lista, mins, insts, dias: Object.entries(porDia).map(([d, hs]) => `${DIAS[d]}: ${hs.join(', ')}`) };
}
const instr = (n) => B.instructoras.find((i) => i.nombre === n) || { nombre: n, completo: n };
// Etiquetas destacadas de una clase (p. ej. «Ideal para tu primera clase»), de horario.json
const etiquetasDe = (cl) => [...new Set(H.clases.filter((c) => cl.tipos.includes(c.clase)).map((c) => c.etiqueta).filter(Boolean))]
  .map((k) => (H.etiquetas || {})[k]).filter((t) => t && t.destacado);

// Equipo: tarjetas con la foto en arco (con o sin biografía)
const equipo = (conBio) => `<ul class="team" role="list">${B.instructoras.map((p, i) => {
  const full = p.completo || p.nombre;
  return `<li class="member" data-reveal style="--r:${i % 4}">
  <div class="mph">${p.foto ? `<img src="${esc(p.foto)}" alt="${esc(full)}, ${esc((p.rol || '').toLowerCase())} de balé" width="800" height="1000" loading="lazy" decoding="async">` : ''}</div>
  <div class="mtx">
    <h3>${esc(full)}</h3>${p.completo && !p.completo.startsWith(p.nombre) ? `<p class="nick">«${esc(p.nombre)}»</p>` : ''}
    <p class="role">${esc(p.rol)}</p>
    ${p.clases ? `<p class="types">${esc(p.clases)}</p>` : ''}
    ${conBio && p.bio ? `<p class="mbio" id="bio-${i}">${esc(p.bio)}</p><button class="biomore" type="button" aria-expanded="false" aria-controls="bio-${i}" hidden>Leer más</button>` : ''}
  </div>
</li>`;
}).join('')}</ul>`;

// Momentos de la comunidad: tarjeta horizontal (foto a la izquierda en pantallas anchas)
const momentos = (pagina) => {
  const lista = `<ul class="momentos" role="list">${(C.momentos || []).map((k, i) => `<li class="momento"${pagina && i ? ' data-reveal' : ''}>
  ${k.foto ? `<figure>${img({ src: k.foto, alt: k.alt }, '(min-width:700px) 240px, 82vw', pagina && !i ? { lazy: false, prioridad: true } : {})}</figure>` : ''}
  <div class="mtexto">${k.kick ? `<span class="kick">${esc(k.kick)}${k.fecha_texto ? ` · ${esc(k.fecha_texto)}` : ''}</span>` : ''}<h3>${esc(k.titulo)}</h3><p>${esc(k.texto)}</p></div>
  ${k.mensaje ? `<div class="acciones"><button class="btn line" type="button" ${wa(k.mensaje)}>${esc(k.boton)}</button></div>` : ''}
</li>`).join('')}</ul>`;
  return pagina ? lista : `<div class="carrusel" role="region" aria-label="Momentos de la comunidad" tabindex="0">${lista}</div>`;
};


// ---------- Bloques que salen de los JSON ----------
const bloques = {
  // Inicio: lista editorial de clases, cada una con su foto en arco y el texto completo (nada cortado)
  'clases-tarjetas': () => `<ul class="cl-lista" role="list">${B.clases.map((cl) => {
    const tags = etiquetasDe(cl), f = cl.fotos[0];
    return `<li class="cl-item">
  <figure class="cl-foto">${f ? img(f, '(min-width:900px) 180px, 120px', { w: 1200, h: 1500 }) : ''}</figure>
  <div class="cl-tx">
    <h3>${esc(cl.tipo)}</h3>
    ${tags.map((t) => `<p class="badge">${esc(t.destacado)}</p>`).join('')}
    <p>${esc(cl.texto)}</p>
    <div class="cl-datos">
      ${cl.edades ? `<ul class="ages" aria-label="Grupos por edad">${cl.edades.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
      <p class="cl-meta">${esc(cl.dias)}</p>
      <p class="mode${cl.reserva === 'inscripcion' ? ' wa-mode' : ''}">${cl.reserva === 'inscripcion' ? 'Inscripción por WhatsApp' : 'Se reserva en línea'}</p>
      <a class="enlace" href="clases.html#${esc(cl.slug)}">Ver la clase<span class="sr-only"> ${esc(cl.tipo)}</span></a>
    </div>
  </div>
</li>`;
  }).join('')}</ul>`,

  // Clases: una sección por clase, foto en arco a un lado (alterna en escritorio)
  'clases-detalle': () => B.clases.map((cl, i) => {
    const h = horarioDe(cl), f = cl.fotos[0], tags = etiquetasDe(cl);
    const accion = cl.reserva === 'inscripcion'
      ? `<div class="cacc"><button class="btn" type="button" ${wa(`Hola, balé. Quiero inscribir a mi hija en ${cl.tipo}. ¿Me envían el formulario de inscripción?`)}>Pedir la inscripción</button><p class="mode wa-mode">Inscripción por WhatsApp</p></div>`
      : `<div class="cacc"><a class="btn" href="reservar.html?tipo=${encodeURIComponent(cl.tipos.join('|'))}">Reservar ${esc(cl.tipo)}</a><p class="mode">Se reserva en línea</p></div>`;
    return `<section class="clase ${i % 2 ? 'alt' : ''}" id="${esc(cl.slug)}" aria-labelledby="t-${esc(cl.slug)}" data-reveal>
  <figure class="cfoto">${f ? img(f, '(min-width:1024px) 460px, 92vw', { lazy: i > 0, prioridad: i === 0 }) : ''}</figure>
  <div class="ctexto">
    <h2 id="t-${esc(cl.slug)}">${esc(cl.tipo)}</h2>
    ${tags.length || cl.edades ? `<div class="chips">${tags.map((t) => `<span class="badge">${esc(t.destacado)}</span>`).join('')}${(cl.edades || []).map((a) => `<span class="chip">${esc(a)}</span>`).join('')}</div>` : ''}
    <p class="lead">${esc(cl.texto)}</p>
    <dl class="datos">
      <div><dt>Para quién</dt><dd>${esc(cl.para)}</dd></div>
      <div><dt>Nivel</dt><dd>${esc(cl.nivel)}</dd></div>
      <div><dt>Duración</dt><dd>${esc(h.mins.join(' o '))} minutos</dd></div>
      <div><dt>${h.insts.length > 1 ? 'Instructoras' : 'Instructora'}</dt><dd>${esc(h.insts.map((n) => instr(n).completo || n).join(', '))}</dd></div>
      <div><dt>Horario</dt><dd>${h.dias.map((d) => esc(d)).join('<br>')}</dd></div>
    </dl>
    ${accion}
  </div>
</section>`;
  }).join('\n'),

  // Inicio: el espacio de Reformer (mosaico de fotos en arco) y el horario en una frase
  'reformer': () => {
    const R = B.reformer, ses = H.clases.filter((c) => c.clase === 'Pilates Reformer').sort((a, b) => ORDEN.indexOf(a.dia) - ORDEN.indexOf(b.dia) || toH(a.inicio) - toH(b.inicio));
    const porDia = {};
    for (const c of ses) (porDia[c.dia] = porDia[c.dia] || []).push(c.inicio);
    const yLista = (xs) => xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : xs.join('');
    const horas = (hs) => { const t = hs.map(hora), suf = t[0].slice(-2); return t.every((x) => x.endsWith(suf)) ? `${yLista(t.map((x) => x.slice(0, -3).replace(':00', '')))} ${suf}` : yLista(t.map((x) => x.replace(':00', ''))); };
    const insts = [...new Set(ses.map((c) => instr(c.instructora).nombre))];
    const cupo = (B.cupos || {})['Pilates Reformer'];
    const frase = `${cupo ? `${cupo} máquinas. ` : ''}${Object.entries(porDia).map(([d, hs]) => `${DIAS[d]} ${horas(hs)}`).join('; ')}${insts.length ? `, con ${yLista(insts)}` : ''}.`;
    return `<div class="refo">
  <div class="refo-ph">${R.fotos.map((f, i) => img(f, i ? '(min-width:900px) 260px, 44vw' : '(min-width:900px) 360px, 56vw', { cls: `r${i}` })).join('')}</div>
  <div class="refo-tx">
    <h2 id="t-reformer">${esc(R.titulo)}</h2>
    <p class="refo-meta">${esc(frase)}</p>
    <p>${esc(R.texto)}</p>
    <a class="btn" href="reservar.html?tipo=${encodeURIComponent('Pilates Reformer')}">${esc(R.boton)}</a>
  </div>
</div>`;
  },

  // Inicio: los precios en breve. Verticales; la recomendada (ilimitada) con el arco de la sala
  'precios-breve': () => {
    const ind = P.individual.items, mem = P.membresia.items;
    const desde = Math.min(...ind.filter((x) => !/ballet/i.test(x.tipo)).map((x) => x.precio));
    const memMin = Math.min(...mem.filter((x) => !x.destacado).map((x) => x.precio));
    const ilim = mem.find((x) => x.destacado) || mem[mem.length - 1];
    return `<ul class="pbreve" role="list">
  <li class="pblock"><h3>${esc(P.individual.titulo)}</h3><p class="pdesde"><small>Desde</small> ${esc(dinero(desde))}</p><p class="pdet">Barre, Pilates Reformer o ballet clásico, cuando quieras. ${esc(P.individual.nota)}.</p></li>
  <li class="pblock"><h3>${esc(P.membresia.titulo)}</h3><p class="pdesde"><small>Desde</small> ${esc(dinero(memMin))}<small> al mes</small></p><p class="pdet">4 u 8 clases al mes, o el combo de Pilates y Barre. ${esc(P.membresia.nota)}.</p></li>
  <li class="pblock dest"><p class="badge">Sin límite de clases</p><h3>${esc(ilim.nombre)}</h3><p class="pdesde">${esc(dinero(ilim.precio))}<small> al mes</small></p><p class="pdet">${esc(ilim.detalle)}</p></li>
</ul>`;
  },

  // Inicio: medias y cancelación en una nota clara (no en letra pequeña)
  'precios-nota': () => `<div class="pnota-clara"><p><b>Medias antideslizantes obligatorias</b> en todas las clases: te dan agarre en la barra y en el Reformer. <a href="precios.html#medias">Pide las tuyas</a>.</p><p><b>Cancelación:</b> ${esc(CFG.cancelacion.texto)}</p></div>`,

  // Inicio: testimonios reales (bale.json → testimonios). Sin testimonios no sale nada
  'testimonios': () => {
    const T = (B.testimonios || []).filter((t) => t && t.texto && t.nombre);
    if (!T.length) return '';
    return `<section class="sec suave" aria-labelledby="t-testimonios">
  <div class="cont">
    <h2 id="t-testimonios">Lo que dicen en balé</h2>
    <ul class="testimonios" role="list">${T.map((t) => `<li><blockquote><p>${esc(t.texto)}</p></blockquote><p class="quien">${esc(t.nombre)}${t.clase ? ` · ${esc(t.clase)}` : ''}</p></li>`).join('')}</ul>
  </div>
</section>`;
  },

  // Inicio: Instagram con fotos propias de la web (sin widgets de terceros)
  'instagram-fotos': () => {
    const fotos = [...B.clases.map((c) => c.fotos[c.fotos.length > 1 ? 1 : 0]), ...(C.momentos || []).filter((m) => m.foto).map((m) => ({ src: m.foto, alt: m.alt }))].filter(Boolean).slice(0, 6);
    return `<div class="insta">
  <div class="insta-tx">
    <h2 id="t-insta">Síguenos en Instagram</h2>
    <p>Clases, eventos y el día a día del estudio.</p>
    <a class="btn line" href="${esc(CFG.instagram)}" target="_blank" rel="noopener">${esc(CFG.instagram_usuario)} en Instagram</a>
  </div>
  <ul class="insta-fotos" role="list">${fotos.map((f) => `<li>${img(f, '(min-width:900px) 200px, 30vw', { w: 1200, h: 1200 })}</li>`).join('')}</ul>
</div>`;
  },

  'precios': () => {
    const I = P.individual, M = P.membresia, K = P.infantil, S = P.medias, G = P.regalo;
    const inscribir = `Hola, balé. Quiero inscribir a mi hija en ${K.nombre}. ¿Me envían el formulario de inscripción?`;
    const reservaDe = (it) => /ballet/i.test(it.tipo)
      ? `<button class="btn line sm" type="button" ${wa(inscribir)}>Inscripción</button>`
      : `<a class="btn line sm" href="reservar.html?tipo=${encodeURIComponent(it.tipo)}">Reservar<span class="sr-only"> ${esc(it.nombre)}</span></a>`;
    const quiero = (it) => wa(`Hola, balé. Quiero ${it.nombre}${it.detalle && it.detalle.length < 45 ? `, ${it.detalle}` : ''} (${dinero(it.precio)}). ¿Cómo hago el pago?`);
    return `<div class="prices">
  <article class="pblock" aria-labelledby="t-ind" data-reveal>
    <span class="kick">${esc(I.nota)}</span>
    <h2 id="t-ind">${esc(I.titulo)}</h2>
    <ul class="plist" role="list">${I.items.map((it) => `<li><span class="pn">${esc(it.nombre)}</span><b>${esc(dinero(it.precio))}</b>${reservaDe(it)}</li>`).join('')}</ul>
  </article>
  <article class="pblock" aria-labelledby="t-mem" data-reveal>
    <span class="kick">${esc(M.nota)}</span>
    <h2 id="t-mem">${esc(M.titulo)}</h2>
    <ul class="plist" role="list">${M.items.map((it) => `<li${it.destacado ? ' class="star"' : ''}><span class="pn">${esc(it.nombre)}<small>${esc(it.detalle)}</small></span><b>${esc(dinero(it.precio))}</b><button class="btn sm" type="button" ${quiero(it)}>La quiero<span class="sr-only">: ${esc(it.nombre)}, ${esc(it.detalle)}</span></button></li>`).join('')}</ul>
    ${M.aviso ? `<p class="pnote">${esc(M.aviso)}</p>` : ''}
  </article>
  <article class="pblock" aria-labelledby="t-kid" data-reveal>
    <span class="kick">${esc(K.edades)}</span>
    <h2 id="t-kid">${esc(K.titulo)}</h2>
    <p class="kname">${esc(K.nombre)}</p>
    <ul class="plist" role="list"><li><span class="pn">Inscripción</span><b>${esc(dinero(K.inscripcion))}</b></li><li><span class="pn">Mensualidad</span><b>${esc(dinero(K.mensualidad))}</b></li></ul>
    <button class="btn" type="button" ${wa(inscribir)}>Pedir la inscripción</button>
    <h3 class="sub">${esc(K.accesorios_titulo)}</h3>
    <ul class="plist acc" role="list">${K.accesorios.map((a) => `<li><span class="pn">${esc(a.nombre)}</span><b>${esc(dinero(a.precio))}</b></li>`).join('')}</ul>
    ${K.nota_accesorios ? `<p class="pnote">${esc(K.nota_accesorios)}</p>` : ''}
  </article>
</div>
${S ? `<article class="socks" id="medias" aria-labelledby="t-medias" data-reveal>
  <div class="mpair">${S.items.map((it) => `<figure>${it.foto ? `<img src="${esc(it.foto)}" srcset="${esc(it.foto.replace(/\.webp$/, '-400.webp'))} 400w, ${esc(it.foto)} 720w" sizes="(min-width:900px) 240px, 42vw" width="720" height="720" loading="lazy" decoding="async" alt="${esc(it.alt || `Medias antideslizantes ${it.nombre.toLowerCase()}`)}">` : ''}<figcaption><span>${esc(it.nombre)}</span><b>${esc(dinero(it.precio))}</b></figcaption></figure>`).join('')}</div>
  <div>
    <span class="kick">Obligatorias</span>
    <h2 id="t-medias">${esc(S.titulo)}</h2>
    <p>${esc(S.texto)}</p>
    <button class="btn" type="button" ${wa(`Hola, balé. Quiero pedir medias antideslizantes (${S.items.map((it) => `${it.nombre.toLowerCase()} ${dinero(it.precio)}`).join(' / ')}). ¿Cómo hago el pago?`)}>${esc(S.boton || 'Pedir mis medias')}</button>
  </div>
</article>` : ''}
<div class="pinfo">
  <article class="pcaja" aria-labelledby="t-pago" data-reveal>
    <span class="kick">Pago</span>
    <h2 id="t-pago">Cómo pagar</h2>
    <ul class="lista">
      <li><b>Transferencia.</b> Los datos salen en la confirmación de tu reserva. Cuando transfieras, pulsa «Ya transferí» y el estudio la confirma.</li>
      <li><b>Pagar con tarjeta.</b> Pulsa «Pagar con tarjeta» en la confirmación o en «Ver mi reserva». El cobro te llega por WhatsApp de CardNET a nombre de NUTRIBEL NUTRICION PERSONALIZADA Y BIENESTAR.</li>
    </ul>
  </article>
  <article class="pcaja" aria-labelledby="t-cancel" data-reveal>
    <span class="kick">Cancelación</span>
    <h2 id="t-cancel">Si cancelas</h2>
    <p>${esc(CFG.cancelacion.texto)} Antes de ese día, cancelas sin costo desde el enlace de tu reserva.</p>
  </article>
</div>
<article class="gift" aria-labelledby="t-regalo" data-reveal>
  <div class="gcard" aria-hidden="true"><img src="img/bale-logo-transparente.webp" alt="" width="1040" height="538" loading="lazy" decoding="async"><span>Certificado de regalo</span><i></i></div>
  <div>
    <span class="kick">Certificado de regalo</span>
    <h2 id="t-regalo">${esc(G.titulo)}</h2>
    <p>${esc(G.texto)}</p>
    <button class="btn" type="button" ${wa(G.mensaje)}>${esc(G.boton)}</button>
  </div>
</article>`;
  },

  'historia': () => B.historia.map((p) => `<p>${esc(p)}</p>`).join(''),
  'que-es-barre': () => esc(B.que_es_barre),
  'equipo-texto': () => esc(B.equipo_texto),

  // Equipo: la foto en arco es lo principal. Inicio: sin la biografía; El estudio: con «Leer más» (sitio.js)
  'equipo': () => equipo(true),
  'equipo-breve': () => equipo(false),

  'preguntas': () => `<div class="faq">${B.faq.map((q) => `<details><summary>${esc(q.p)}</summary><div><p>${esc(q.r)}</p></div></details>`).join('')}</div>`,

  // Comunidad: lo de comunidad.json, por si la base de datos todavía no tiene las publicaciones
  'comunidad-respaldo': () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const prox = (C.proximos || []).filter((e) => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
    return `${prox.length ? `<section class="csec" aria-labelledby="t-prox"><h2 id="t-prox">Próximas actividades</h2><ul class="actividades" role="list">${prox.map((e) => {
      const [, m, d] = e.fecha.split('-').map(Number);
      return `<li class="actividad"><p class="afecha" aria-hidden="true"><b>${d}</b><span>${MESES[m - 1].slice(0, 3)}</span></p><div><span class="kick">Próximo evento</span><h3>${esc(e.titulo)}</h3><p class="ameta">${d} de ${MESES[m - 1]}${e.hora ? ` · ${esc(hora(e.hora))}` : ''}${e.precio != null ? ` · ${esc(dinero(e.precio))}` : ''}</p><p>${esc(e.texto)}</p>${e.mensaje ? `<button class="btn sm" type="button" ${wa(e.mensaje)}>${esc(e.boton || 'Reservar por WhatsApp')}</button>` : ''}</div></li>`;
    }).join('')}</ul></section>` : `<section class="csec"><p class="vacio-com">Pronto anunciamos la próxima actividad. <a href="${esc(CFG.instagram)}" target="_blank" rel="noopener">Síguenos en Instagram</a>.</p></section>`}
<section class="csec" aria-labelledby="t-mom"><h2 id="t-mom">Momentos</h2>${momentos(true)}</section>`;
  },

  // Comunidad: publicaciones de Instagram de @balestudio.rd (comunidad.json → instagram). El embed oficial
  // solo se carga si la clienta pulsa «Ver aquí» (sitio.js); al abrir la página no se pide nada a Instagram.
  'instagram-posts': () => {
    const RE = /^https:\/\/www\.instagram\.com\/(p|reel)\/([A-Za-z0-9_-]{5,40})\/?$/;
    const L = (C.instagram || []).map((x) => ({ ...x, m: RE.exec(String(x.url || '').trim()) })).filter((x) => x.m && x.foto && x.alt);
    if (!L.length) return '';
    return `<section class="csec" aria-labelledby="t-ig"><h2 id="t-ig">En Instagram</h2><ul class="momentos ig-posts" role="list">${L.map((x) => {
      const url = `https://www.instagram.com/${x.m[1]}/${x.m[2]}/`;
      return `<li class="momento ig-post"><figure data-ig-marco>${img({ src: x.foto, alt: x.alt }, '(min-width:700px) 240px, 92vw', { w: 1080, h: 1350 })}</figure>
  <div class="mtexto">${x.fecha_texto ? `<span class="kick">${esc(x.fecha_texto)}</span>` : ''}${x.titulo ? `<h3>${esc(x.titulo)}</h3>` : ''}${x.texto ? `<p>${esc(x.texto)}</p>` : ''}
    <div class="acciones"><button class="btn line sm" type="button" data-ig="${esc(url)}embed/">Ver aquí</button><a class="btn texto" href="${esc(url)}" target="_blank" rel="noopener">Ver en Instagram</a></div></div>
</li>`;
    }).join('')}</ul><p class="ig-nota">Al pulsar «Ver aquí» se carga la publicación desde Instagram.</p></section>`;
  },

  // Inicio: los momentos de la comunidad en tarjetas
  'comunidad-tarjetas': () => momentos(false),

  'direccion': () => esc(CFG.direccion),
  'ubicacion': () => esc(CFG.ubicacion),
  'maps': () => esc(CFG.maps),
  'mapa-embed': () => esc(`https://www.google.com/maps?q=${encodeURIComponent(CFG.direccion + ', La Vega, República Dominicana')}&output=embed`),
  'whatsapp-texto': () => esc(CFG.whatsapp_texto),
  'whatsapp-url': () => esc(`https://wa.me/${CFG.whatsapp}`),
  'instagram-url': () => esc(CFG.instagram),
  'instagram-usuario': () => esc(CFG.instagram_usuario),
  'correo': () => esc(CFG.correo_reservas),
  'cancelacion': () => esc(CFG.cancelacion.texto),
  'frase': () => esc(B.frase),
  // Reservar: con el sistema encendido se compila su texto (así no cambia al cargar y el horario no salta)
  'texto-horario': () => { const sin = 'Elige el día y la clase. En las clases de barra escoges tu lugar en la sala. Tu reserva se confirma por WhatsApp.';
    const con = 'Elige el día y la clase. En las clases de barra escoges tu lugar en la sala. Tu reserva se confirma al momento y te llega por correo.';
    return `<p class="lead" id="schedTxt" data-sin="${esc(sin)}" data-con="${esc(con)}">${esc(CFG.sistema && CFG.sistema.activo ? con : sin)}</p>`; },
};

// ---------- Datos estructurados (schema.org) ----------
const jsonld = {
  estudio: () => ({ '@context': 'https://schema.org', '@type': 'ExerciseGym', name: 'balé', alternateName: 'balé Barre, Ballet & Pilates',
    description: 'Estudio de Barre, Pilates Reformer y Ballet para niñas en La Vega, para todos los niveles.', url: URL_BASE,
    image: URL_BASE + 'img/bale-og.jpg', logo: URL_BASE + 'img/bale-favicon.png', telephone: '+1-849-638-6337', sameAs: [CFG.instagram],
    address: { '@type': 'PostalAddress', streetAddress: 'C. José Horacio Rodríguez #30, frente al Country Club', addressLocality: 'La Vega', addressRegion: 'La Vega', addressCountry: 'DO' } }),
  eventos: () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const ev = (C.proximos || []).filter((e) => e.fecha >= hoy).map((e) => ({ '@context': 'https://schema.org', '@type': 'Event', name: e.titulo, description: e.texto,
      startDate: `${e.fecha}${e.hora ? `T${e.hora}:00-04:00` : ''}`, eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', eventStatus: 'https://schema.org/EventScheduled',
      location: { '@type': 'Place', name: 'balé', address: CFG.direccion }, organizer: { '@type': 'Organization', name: 'balé', url: URL_BASE },
      ...(e.precio != null ? { offers: { '@type': 'Offer', price: e.precio, priceCurrency: 'DOP', url: URL_BASE + 'comunidad.html' } } : {}) }));
    return ev.length ? ev : null;
  },
};

// ---------- Encabezado, pie y <head> ----------
const MENU = [['clases', 'clases.html', 'Clases'], ['reservar', 'reservar.html', 'Reservar'], ['precios', 'precios.html', 'Precios'], ['comunidad', 'comunidad.html', 'Comunidad'], ['nosotras', 'nosotras.html', 'El estudio']];
const enlaces = (actual) => MENU.map(([id, href, txt]) => `<a href="${href}"${id === actual ? ' aria-current="page"' : ''}>${txt}</a>`).join('');
function rellenar(t, vars) { return t.replace(/\{\{([a-z_-]+)\}\}/g, (m, k) => (k in vars ? vars[k] : bloques[k] ? bloques[k]() : m)); }

function head(meta) {
  const titulo = meta.titulo === 'balé' ? 'balé · Barre, Ballet & Pilates en La Vega' : `${meta.titulo} · balé`;
  const url = URL_BASE + (meta.ruta === 'index.html' ? '' : meta.ruta);
  const ld = (meta.jsonld || []).map((k) => jsonld[k] && jsonld[k]()).filter(Boolean).flat();
  return rellenar(parcial('head'), {
    titulo: esc(titulo), descripcion: esc(meta.descripcion), canonical: esc(url),
    robots: meta.noindex ? '<meta name="robots" content="noindex, nofollow">\n' : '',
    og: meta.noindex ? '' : `<meta property="og:type" content="website">
<meta property="og:locale" content="es_DO">
<meta property="og:site_name" content="balé">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(meta.descripcion)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${URL_BASE}img/bale-og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
`,
    jsonld: ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>\n`).join(''),
    previos: (meta.previos || []).join('\n') + ((meta.previos || []).length ? '\n' : ''),
    precarga_letra: meta.sin_precarga_letra ? '' : '<link rel="preload" href="fonts/montserrat-latin.woff2" as="font" type="font/woff2" crossorigin>\n',
    css: ['css/base.css', 'css/sitio.css'].concat(meta.css || []).map((h) => `<link rel="stylesheet" href="${h}">`).join('\n'),
    scripts: ['js/core.js', 'js/sitio.js'].concat(meta.scripts || []).map((s) => `<script src="${s}" defer></script>`).join('\n'),
    csp: (meta.csp_extra || '').trim(),
  });
}

function pagina(nombre, fuente) {
  const m = fuente.match(/^<!--@([\s\S]*?)@-->\s*/);
  if (!m) throw new Error(`${nombre}: falta la cabecera <!--@ {...} @-->`);
  const meta = Object.assign({ ruta: nombre }, JSON.parse(m[1]));
  const cuerpo = rellenar(fuente.slice(m[0].length), {});
  const vars = { menu: enlaces(meta.actual), actual: meta.actual || '' };
  return `<!DOCTYPE html>
<!-- Generado por bale/_fuente/construir.mjs desde _fuente/paginas/${nombre}: no lo edites aquí (ver bale/COMO-ACTUALIZAR.md) -->
<html lang="es">
<head>
${head(meta)}
</head>
<body class="sitio${meta.sin_barra ? '' : ' con-barra'}" data-page="${esc(meta.actual || nombre.replace('.html', ''))}">
<a class="saltar" href="#contenido">Ir al contenido</a>
${rellenar(parcial('cabecera'), vars)}
${CFG.aviso || B.aviso ? `<p class="aviso-sitio" role="status">${esc(CFG.aviso || B.aviso)}</p>\n` : ''}<main id="contenido" class="${esc(meta.main || '')}">
${cuerpo.trim()}
</main>
${rellenar(parcial('pie'), vars)}
${meta.sin_barra ? '' : rellenar(parcial('barra'), vars)}
</body>
</html>
`;
}

// ---------- Sitemap del sitio (las páginas públicas de balé en el sitemap de la raíz) ----------
function sitemap(paginas, fecha) {
  const ruta = join(RAIZ, 'sitemap.xml');
  if (!existsSync(ruta)) return null;
  const actual = readFileSync(ruta, 'utf8');
  const sinBale = actual.split('\n').filter((l) => !l.includes('/nutribel/bale/'));
  const fin = sinBale.findIndex((l) => l.includes('</urlset>'));
  const nuevas = paginas.filter((p) => !p.meta.noindex && p.nombre !== '404.html').map((p) => {
    const loc = URL_BASE + (p.nombre === 'index.html' ? '' : p.nombre);
    const viejo = actual.split('\n').find((l) => l.includes(`<loc>${loc}</loc>`));
    const lastmod = (viejo && p.igual && (viejo.match(/<lastmod>([^<]+)</) || [])[1]) || fecha;
    return `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><priority>${p.nombre === 'index.html' ? '0.9' : '0.7'}</priority></url>`;
  });
  return [...sinBale.slice(0, fin), ...nuevas, ...sinBale.slice(fin)].join('\n');
}

let salaDistinta = false;
// La sala (data/sala.json → js/sala-datos.js): el selector la necesita al momento, sin esperar un fetch
{
  const S = json('sala.json');
  const datos = `/* Generado por _fuente/construir.mjs desde data/sala.json: no editar a mano. */\nwindow.BALE_SALA_DATOS = ${JSON.stringify({ imagen: S.imagen, zonas: S.zonas, lugares: S.lugares })};\n`;
  const ruta = join(BALE, 'js', 'sala-datos.js');
  if (!existsSync(ruta) || readFileSync(ruta, 'utf8').replace(/\r\n/g, '\n') !== datos) {
    salaDistinta = true;
    if (COMPROBAR) console.error('No está al día: bale/js/sala-datos.js');
    else writeFileSync(ruta, datos);
  }
}
// ---------- Versiones de CSS y JS ----------
// Cada página pide sus archivos con ?v=<huella del contenido>: al cambiar un archivo cambia la dirección y
// el navegador (o GitHub Pages, que guarda 10 min) no puede servir la versión vieja. Sin cambios, la misma.
const huellas = new Map();
function huella(rel) {
  if (!huellas.has(rel)) {
    const ruta = join(BALE, rel);
    huellas.set(rel, existsSync(ruta) ? createHash('sha1').update(readFileSync(ruta, 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 8) : null);
  }
  return huellas.get(rel);
}
const conVersion = (html) => html.replace(/(<(?:link|script)\b[^>]*?\b(?:href|src)=")((?:css|js)\/[^"?#]+\.(?:css|js))"/g, (m, a, rel) => { const h = huella(rel); return h ? `${a}${rel}?v=${h}"` : m; });

// ---------- Armar ----------
const nombres = readdirSync(join(FUENTE, 'paginas')).filter((f) => f.endsWith('.html')).sort();
const hechas = [];
let distintas = 0;
for (const n of nombres) {
  const fuente = readFileSync(join(FUENTE, 'paginas', n), 'utf8');
  const html = conVersion(pagina(n, fuente));
  const meta = JSON.parse(fuente.match(/^<!--@([\s\S]*?)@-->/)[1]);
  const destino = join(BALE, n);
  const igual = existsSync(destino) && readFileSync(destino, 'utf8').replace(/\r\n/g, '\n') === html;
  hechas.push({ nombre: n, meta, igual });
  if (igual) continue;
  distintas++;
  if (COMPROBAR) console.error(`No está al día: bale/${n}`);
  else writeFileSync(destino, html);
}
if (salaDistinta) distintas++;
const mapa = sitemap(hechas, new Date().toISOString().slice(0, 10));
if (mapa != null) {
  const ruta = join(RAIZ, 'sitemap.xml'), viejo = readFileSync(ruta, 'utf8').replace(/\r\n/g, '\n');
  if (viejo !== mapa) {
    // solo cuenta como distinto si cambian las direcciones (la fecha sola no)
    const locs = (s) => (s.match(/<loc>[^<]+<\/loc>/g) || []).join();
    if (locs(viejo) !== locs(mapa)) { distintas++; if (COMPROBAR) console.error('No está al día: sitemap.xml'); }
    if (!COMPROBAR) writeFileSync(ruta, mapa);
  }
}
if (COMPROBAR) {
  if (distintas) { console.error(`\n${distintas} archivo(s) sin compilar: ejecuta  node bale/_fuente/construir.mjs`); process.exit(1); }
  console.log(`Al día: ${nombres.length} páginas.`);
} else console.log(`Listo: ${nombres.length} páginas (${distintas} cambiaron) y sitemap.xml.`);
