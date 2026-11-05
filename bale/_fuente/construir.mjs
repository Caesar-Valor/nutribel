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

// ---------- Bloques que salen de los JSON ----------
const bloques = {
  // Inicio: las clases en breve
  'clases-breve': () => `<ul class="clist" role="list">${B.clases.map((cl) => {
    const h = horarioDe(cl);
    return `<li><a class="crow-link" href="clases.html#${esc(cl.slug)}"><span class="cname">${esc(cl.tipo)}</span><span class="cmeta">${esc(h.mins.join('–'))} min · ${esc(cl.reserva === 'inscripcion' ? 'Inscripción por WhatsApp' : h.insts.join(', '))}</span></a></li>`;
  }).join('')}</ul>`,

  // Clases: una sección por clase, foto a un lado (alterna en escritorio)
  'clases-detalle': () => B.clases.map((cl, i) => {
    const h = horarioDe(cl), f = cl.fotos[0];
    const accion = cl.reserva === 'inscripcion'
      ? `<p class="mode wa-mode">Inscripción por WhatsApp</p><button class="btn" type="button" ${wa(`Hola, balé. Quiero inscribir a mi hija en ${cl.tipo}. ¿Me envían el formulario de inscripción?`)}>Pedir la inscripción</button>`
      : `<p class="mode">Se reserva en línea</p><a class="btn" href="reservar.html?tipo=${encodeURIComponent(cl.tipos.join('|'))}">Reservar ${esc(cl.tipo)}</a>`;
    return `<section class="clase ${i % 2 ? 'alt' : ''}" id="${esc(cl.slug)}" aria-labelledby="t-${esc(cl.slug)}" data-reveal>
  <figure class="cfoto">${f ? img(f, '(min-width:1024px) 460px, 92vw', { lazy: i > 0, prioridad: i === 0 }) : ''}</figure>
  <div class="ctexto">
    <h2 id="t-${esc(cl.slug)}">${esc(cl.tipo)}</h2>
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

  // Inicio: los planes en breve (los tres precios que más se preguntan)
  'planes-breve': () => {
    const ind = P.individual.items, mem = P.membresia.items;
    const desde = Math.min(...ind.filter((x) => !/ballet/i.test(x.tipo)).map((x) => x.precio));
    const memMin = Math.min(...mem.filter((x) => !x.destacado).map((x) => x.precio));
    const ilim = mem.find((x) => x.destacado) || mem[mem.length - 1];
    return `<ul class="pbreve" role="list">
  <li><span class="pq">Clase suelta</span><span class="pv">desde ${esc(dinero(desde))}</span></li>
  <li><span class="pq">Membresía del mes</span><span class="pv">desde ${esc(dinero(memMin))}</span></li>
  <li class="dest"><span class="pq">${esc(ilim.nombre)}</span><span class="pv">${esc(dinero(ilim.precio))}</span></li>
</ul>`;
  },

  'precios': () => {
    const I = P.individual, M = P.membresia, K = P.infantil, S = P.medias, G = P.regalo;
    const reservaDe = (it) => /ballet/i.test(it.tipo)
      ? `<button class="btn line sm" type="button" ${wa(`Hola, balé. Quiero inscribir a mi hija en ${K.nombre}. ¿Me envían el formulario de inscripción?`)}>Inscripción</button>`
      : `<a class="btn line sm" href="reservar.html?tipo=${encodeURIComponent(it.tipo)}">Reservar</a>`;
    return `<section class="psec" aria-labelledby="t-ind" data-reveal>
  <div class="psec-head"><h2 id="t-ind">${esc(I.titulo)}</h2><p>${esc(I.nota)}.</p></div>
  <ul class="plist" role="list">${I.items.map((it) => `<li><span class="pn">${esc(it.nombre)}</span><span class="pp">${esc(dinero(it.precio))}</span>${reservaDe(it)}</li>`).join('')}</ul>
</section>
<section class="psec" aria-labelledby="t-mem" data-reveal>
  <div class="psec-head"><h2 id="t-mem">Membresías</h2><p>${esc(M.nota)}.</p></div>
  <ul class="pgrid" role="list">${M.items.map((it) => `<li class="plan ${it.destacado ? 'dest' : ''}">
    <h3>${esc(it.nombre)}</h3><p class="pdet">${esc(it.detalle)}</p><p class="pcifra">${esc(dinero(it.precio))}<small> al mes</small></p>
    <button class="btn ${it.destacado ? 'claro' : 'line'}" type="button" ${wa(`Hola, balé. Quiero ${it.nombre}${it.detalle && it.detalle.length < 45 ? `, ${it.detalle}` : ''} (${dinero(it.precio)}). ¿Cómo hago el pago?`)}>La quiero</button></li>`).join('')}</ul>
  ${M.aviso ? `<p class="pnota">${esc(M.aviso)}</p>` : ''}
</section>
<section class="psec dos" aria-labelledby="t-kid" data-reveal>
  <div>
    <h2 id="t-kid">${esc(K.titulo)}</h2>
    <p>${esc(K.nombre)}, ${esc(K.edades)}. Se inscribe por WhatsApp: te enviamos el formulario.</p>
    <ul class="plist" role="list"><li><span class="pn">Inscripción</span><span class="pp">${esc(dinero(K.inscripcion))}</span></li><li><span class="pn">Mensualidad</span><span class="pp">${esc(dinero(K.mensualidad))}</span></li></ul>
    <button class="btn" type="button" ${wa(`Hola, balé. Quiero inscribir a mi hija en ${K.nombre}. ¿Me envían el formulario de inscripción?`)}>Pedir la inscripción</button>
  </div>
  <div>
    <h3>${esc(K.accesorios_titulo)}</h3>
    <ul class="plist" role="list">${K.accesorios.map((a) => `<li><span class="pn">${esc(a.nombre)}</span><span class="pp">${esc(dinero(a.precio))}</span></li>`).join('')}</ul>
    ${K.nota_accesorios ? `<p class="pnota">${esc(K.nota_accesorios)}</p>` : ''}
  </div>
</section>
${S ? `<section class="psec medias" id="medias" aria-labelledby="t-medias" data-reveal>
  <div class="mfotos">${S.items.map((it) => `<figure>${it.foto ? `<img src="${esc(it.foto)}" srcset="${esc(it.foto.replace(/\.webp$/, '-400.webp'))} 400w, ${esc(it.foto)} 720w" sizes="(min-width:900px) 240px, 42vw" width="720" height="720" loading="lazy" decoding="async" alt="${esc(it.alt || `Medias antideslizantes ${it.nombre.toLowerCase()}`)}">` : ''}<figcaption>${esc(it.nombre)} · ${esc(dinero(it.precio))}</figcaption></figure>`).join('')}</div>
  <div>
    <h2 id="t-medias">${esc(S.titulo)}</h2>
    <p>${esc(S.texto)}</p>
    <button class="btn line" type="button" ${wa(`Hola, balé. Quiero pedir medias antideslizantes (${S.items.map((it) => `${it.nombre.toLowerCase()} ${dinero(it.precio)}`).join(' / ')}). ¿Cómo hago el pago?`)}>${esc(S.boton || 'Pedir mis medias')}</button>
  </div>
</section>` : ''}
<section class="psec dos" aria-labelledby="t-pago" data-reveal>
  <div>
    <h2 id="t-pago">Cómo pagar</h2>
    <ul class="lista">
      <li><b>Transferencia.</b> Los datos salen en la confirmación de tu reserva. Cuando transfieras, pulsa «Ya transferí» y el estudio la confirma.</li>
      <li><b>Pagar con tarjeta.</b> Pulsa «Pagar con tarjeta» en la confirmación o en «Ver mi reserva». El cobro te llega por WhatsApp de CardNET a nombre de NUTRIBEL NUTRICION PERSONALIZADA Y BIENESTAR.</li>
    </ul>
  </div>
  <div>
    <h2 id="t-cancel">Si cancelas</h2>
    <p>${esc(CFG.cancelacion.texto)} Antes de ese día, cancelas sin costo desde el enlace de tu reserva.</p>
  </div>
</section>
<section class="psec regalo" aria-labelledby="t-regalo" data-reveal>
  <div class="gcard" aria-hidden="true"><img src="img/bale-logo-transparente.webp" alt="" width="1040" height="538" loading="lazy" decoding="async"><span>Certificado de regalo</span></div>
  <div><h2 id="t-regalo">${esc(G.titulo)}</h2><p>${esc(G.texto)}</p><button class="btn" type="button" ${wa(G.mensaje)}>${esc(G.boton)}</button></div>
</section>`;
  },

  'historia': () => B.historia.map((p, i) => `<p${i === 0 ? ' class="lead"' : ''}>${esc(p)}</p>`).join(''),

  'equipo': () => `<ul class="equipo" role="list">${B.instructoras.map((p) => {
    const full = p.completo || p.nombre;
    return `<li class="persona" data-reveal>
    <figure>${p.foto ? `<img src="${esc(p.foto)}" alt="${esc(full)}, ${esc((p.rol || '').toLowerCase())} de balé" width="800" height="1000" loading="lazy" decoding="async">` : ''}</figure>
    <h3>${esc(full)}</h3><p class="rol">${esc(p.rol)}${p.clases ? ` · ${esc(p.clases)}` : ''}</p>
    ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
  </li>`;
  }).join('')}</ul>`,

  'preguntas': () => `<div class="faq">${B.faq.map((q) => `<details><summary>${esc(q.p)}</summary><div><p>${esc(q.r)}</p></div></details>`).join('')}</div>`,

  // Comunidad: lo de comunidad.json, por si la base de datos todavía no tiene las publicaciones
  'comunidad-respaldo': () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const prox = (C.proximos || []).filter((e) => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
    return `${prox.length ? `<section class="csec" aria-labelledby="t-prox"><h2 id="t-prox">Próximas actividades</h2><ul class="actividades" role="list">${prox.map((e) => {
      const [, m, d] = e.fecha.split('-').map(Number);
      return `<li class="actividad"><p class="afecha" aria-hidden="true"><b>${d}</b><span>${MESES[m - 1].slice(0, 3)}</span></p><div><h3>${esc(e.titulo)}</h3><p class="ameta">${d} de ${MESES[m - 1]}${e.hora ? ` · ${esc(hora(e.hora))}` : ''}${e.precio != null ? ` · ${esc(dinero(e.precio))}` : ''}</p><p>${esc(e.texto)}</p>${e.mensaje ? `<button class="btn line sm" type="button" ${wa(e.mensaje)}>${esc(e.boton || 'Reservar por WhatsApp')}</button>` : ''}</div></li>`;
    }).join('')}</ul></section>` : ''}
<section class="csec" aria-labelledby="t-mom"><h2 id="t-mom">Momentos</h2><ul class="momentos" role="list">${(C.momentos || []).map((k, i) => `<li class="momento"${i ? ' data-reveal' : ''}>
  ${k.foto ? `<figure>${img({ src: k.foto, alt: k.alt }, '(min-width:1024px) 340px, 92vw', i ? {} : { lazy: false, prioridad: true })}</figure>` : ''}
  <h3>${esc(k.titulo)}</h3><p>${esc(k.texto)}</p>${k.mensaje ? `<button class="btn line sm" type="button" ${wa(k.mensaje)}>${esc(k.boton)}</button>` : ''}
</li>`).join('')}</ul></section>`;
  },

  // Inicio: un momento de la comunidad como prueba social
  'comunidad-breve': () => {
    const k = (C.momentos || []).find((m) => m.foto) || null;
    return k ? `<figure class="cbreve">${img({ src: k.foto, alt: k.alt }, '(min-width:1024px) 520px, 92vw')}<figcaption><b>${esc(k.titulo)}.</b> ${esc(k.texto)}</figcaption></figure>` : '';
  },

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

// ---------- Armar ----------
const nombres = readdirSync(join(FUENTE, 'paginas')).filter((f) => f.endsWith('.html')).sort();
const hechas = [];
let distintas = 0;
for (const n of nombres) {
  const fuente = readFileSync(join(FUENTE, 'paginas', n), 'utf8');
  const html = pagina(n, fuente);
  const meta = JSON.parse(fuente.match(/^<!--@([\s\S]*?)@-->/)[1]);
  const destino = join(BALE, n);
  const igual = existsSync(destino) && readFileSync(destino, 'utf8').replace(/\r\n/g, '\n') === html;
  hechas.push({ nombre: n, meta, igual });
  if (igual) continue;
  distintas++;
  if (COMPROBAR) console.error(`No está al día: bale/${n}`);
  else writeFileSync(destino, html);
}
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
