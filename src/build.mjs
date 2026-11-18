/* ═══════════════════════════════════════════════════════════════════════════
   Alma Digital Studio — generador del sitio
   Lee src/projects.json, src/site.json y src/i18n/*.json y escribe el HTML
   estático en inglés (raíz) y español (/es/):

     index.html            landing
     work/index.html       índice de obras con filtros
     work/<obra>.html      una ficha por obra
     studio.html           equipo y spin-offs
     sitemap.xml

   Sin framework ni dependencias. Se corre a mano antes de commitear:
       node src/build.mjs
   Netlify NO lo corre: publica el HTML ya generado (tools/deploy_copy.py).
   Las páginas generadas no se editan a mano: se pisan en el próximo build.
   Parte de la estructura viene del prototipo de Beltrán (prototype/build.mjs).

   Cada página es un documento completo (sirve sola, se indexa sola), pero al
   navegar dentro del sitio js/app.js sólo reemplaza <header>, <main>, <footer>
   y el modal de contacto: el fluido y la ameba siguen vivos entre páginas.
   Por eso todo lo que cambia de una página a otra tiene que estar dentro de
   esas cuatro piezas, en el <head> (que también se sincroniza) o en #alma-data.
   ═══════════════════════════════════════════════════════════════════════ */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const readJSON = async (p, fallback) => {
  try { return JSON.parse(await readFile(new URL(p, ROOT), 'utf8')); }
  catch (e) {
    if (fallback === undefined) throw e;
    console.warn(`aviso: falta ${p}; se usa el texto en inglés`);
    return fallback;
  }
};

const site = await readJSON('src/site.json');
const { projects } = await readJSON('src/projects.json');
const esProjects = await readJSON('src/i18n/projects.es.json', {});
const studio = await readJSON('src/i18n/studio.json', { about: { en: [], es: [] }, team: [], spinoffs: [] });

/* Versión de cada archivo de estilos y de código: 8 letras que salen de su
   contenido y van en su dirección (site.css?v=…). Cuando el archivo cambia,
   cambia la dirección y el navegador lo vuelve a pedir en vez de usar la copia
   que tenía guardada. Sin esto se veían páginas nuevas con estilos viejos. */
const vCache = {};
const v = f => (vCache[f] ??= createHash('md5').update(readFileSync(new URL(f, ROOT))).digest('hex').slice(0, 8));

const LANGS = ['en', 'es'];
const prefixOf = l => (l === 'en' ? '' : l + '/');
const other = l => (l === 'en' ? 'es' : 'en');

const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/* Títulos a dos voces: en site.json, *palabra* marca la parte en cursiva fina. */
const em = s => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');
const plain = s => String(s ?? '').replace(/\*/g, '');
const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k]);
const clip = (s, n) => {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  return s.slice(0, s.lastIndexOf(' ', n - 1)).replace(/[,;:.]$/, '') + '…';
};

/* Contexto de una página: idioma + ruta relativa dentro del idioma. */
function ctx(lang, rel) {
  const path = prefixOf(lang) + rel;
  const up = '../'.repeat(path.split('/').length - 1);
  return { lang, rel, path, up, t: site.t[lang] };
}
const asset = (c, p) => c.up + String(p).split('/').map(encodeURIComponent).join('/');
const dir = rel => rel.replace(/index\.html$/, '');
const link = (c, rel, lang = c.lang) => (c.up + prefixOf(lang) + dir(rel)) || './';
const abs = (lang, rel) => `${site.origin}/${prefixOf(lang)}${dir(rel)}`;
const absAsset = p => `${site.origin}/${String(p).split('/').map(encodeURIComponent).join('/')}`;

/* Los filtros dependen de formatKey: es una decisión editorial del estudio. */
const orphan = projects.filter(p => !site.formats[p.formatKey]);
if (orphan.length) throw new Error('formatKey sin etiqueta: ' + orphan.map(p => `${p.slug}=${p.formatKey}`).join(', '));
const missing = site.featured.filter(s => !projects.some(p => p.slug === s));
if (missing.length) throw new Error('featured con slug inexistente: ' + missing.join(', '));

/* Proyecto en el idioma pedido. El español vive en src/i18n/projects.es.json;
   si falta un campo o no coincide el largo de una lista, cae al inglés. */
function loc(p, lang) {
  if (lang === 'en') return { ...p, tech: (p.tech || []).map(x => site.techEn[x] || x), presentedAt: p.presentedAt || [] };
  const e = esProjects[p.slug] || {};
  const same = (a, b) => Array.isArray(a) && a.length === (b || []).length;
  return {
    ...p,
    format: e.format || p.format,
    desc: e.desc || p.desc,
    body: same(e.body, p.body) ? e.body : p.body,
    credits: same(e.credits, p.credits) ? e.credits : p.credits,
    presentedAt: same(e.presentedAt, p.presentedAt) ? e.presentedAt : (p.presentedAt || []),
  };
}
const ogFor = slug => {
  const f = `Asset/og/${slug}.jpg`;
  return existsSync(fileURLToPath(new URL(f, ROOT))) ? f : 'Asset/Web Icons/og-alma-digital.jpg';
};

/* ── Piezas comunes ─────────────────────────────────────────────────────── */
function head(c, { title, desc, ogImage, jsonld, noindex }) {
  const alt = LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${abs(l, c.rel)}">`).join('\n');
  return `<!doctype html>
<!-- Generado por src/build.mjs. No editar a mano: se pisa en el próximo build. -->
<html lang="${c.lang}" data-theme="aura">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">${noindex ? `
<meta name="robots" content="noindex">` : ''}
<link rel="canonical" href="${abs(c.lang, c.rel)}">
${alt}
<link rel="alternate" hreflang="x-default" href="${abs('en', c.rel)}">
<link rel="icon" type="image/x-icon" href="${asset(c, 'Asset/Web Icons/1-271c3808.ico')}">
<link rel="apple-touch-icon" href="${asset(c, 'Asset/Web Icons/PERFIL 3.png')}">
<meta property="og:site_name" content="Alma Digital Studio">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${absAsset(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${abs(c.lang, c.rel)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="${c.lang === 'es' ? 'es_CL' : 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${absAsset(ogImage)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,200;0,300;0,400;0,500;1,200&display=swap" rel="stylesheet">
<script>
/* Tema: "aura" (claro, por defecto) o "night". ?theme=night lo cambia para comparar. */
(function(){try{var p=new URLSearchParams(location.search).get('theme');if(p)sessionStorage.setItem('alma-theme',p);var t=p||sessionStorage.getItem('alma-theme');if(t==='night'||t==='aura')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();
/* Analítica: Cloudflare Web Analytics (sin cookies). Token vacío = no carga nada. */
(function(){var T='${site.analyticsToken}';if(!T)return;var s=document.createElement('script');s.type='module';s.src='https://static.cloudflareinsights.com/beacon.min.js';s.setAttribute('data-cf-beacon',JSON.stringify({token:T}));document.head.appendChild(s);})();
</script>
<style>@media (prefers-reduced-motion: no-preference){@view-transition{navigation:auto}}</style>
<link rel="stylesheet" href="${c.up}css/site.css?v=${v('css/site.css')}">
<!-- En el tema claro las partículas del cursor se tiñen de tinta con un filtro del
     propio documento; va acá porque url(#id) desde un CSS externo no es confiable. -->
<style>html[data-theme="aura"] .cursor-particle{filter:url(#cursor-ink)}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>`;
}

/* Música de ambiente (site.json → sound). Con enabled en false no se genera ni
   el botón ni el script. */
const sound = site.sound && site.sound.enabled && site.sound.src ? site.sound : null;

/* El mundo interior es la portada (site.json → world). Con enabled en false
   la portada vuelve a ser el landing de bloques (buildLanding). */
const world = site.world && site.world.enabled ? site.world : null;

function header(c, current) {
  const t = c.t;
  const cur = k => (current === k ? ' aria-current="page"' : '');
  const mask = p => `-webkit-mask-image:url('${asset(c, p)}');mask-image:url('${asset(c, p)}')`;
  return `<header class="hdr" id="hdr">
  <a class="hdr__logo" href="${link(c, 'index.html')}" aria-label="${esc(t.homeLabel)}">
    <span class="hdr__mark hdr__mark--full" style="${mask('Asset/Asset 34.png')}"></span>
    <span class="hdr__mark hdr__mark--icon" style="${mask('Asset/Web Icons/icon-alma.png')}"></span>
  </a>
  <nav class="hdr__nav">
    <a href="${link(c, 'work/index.html')}"${cur('work')}>${esc(t.navWork)}</a>
    <a href="${link(c, 'studio.html')}"${cur('studio')}>${esc(t.navStudio)}</a>
    <button type="button" data-contact>${esc(t.navContact)}</button>${sound ? `
    <button class="hdr__sound" type="button" data-sound aria-pressed="false"><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="hdr__sound-txt">${esc(t.soundLabel)}</span></button>` : ''}
    <a class="hdr__lang" href="${link(c, c.rel, other(c.lang))}" lang="${other(c.lang)}" hreflang="${other(c.lang)}" aria-label="${esc(t.otherLangLabel)}">${esc(t.otherLang)}</a>
  </nav>
</header>`;
}

/* Contacto con dos caminos: cada botón abre el formulario con su asunto. La
   ameba viaja hasta acá (data-ameba-slot) cuando el bloque entra en pantalla. */
function contactBand(c) {
  const t = c.t;
  return `<section class="cta" aria-labelledby="cta-title">
  <div class="cta__txt">
    <h2 id="cta-title">${em(t.contactTitle)}</h2>
    <div class="cta__row">
      <button class="btn btn--solid" type="button" data-contact data-contact-subject="${esc(t.contactCommissionSubject)}">${esc(t.contactCommission)}</button>
      <button class="btn" type="button" data-contact data-contact-subject="${esc(t.contactFestivalSubject)}">${esc(t.contactFestival)}</button>
    </div>
    <p class="cta__mail">${esc(t.contactOr)} <a href="mailto:${site.email}">${site.email}</a></p>
  </div>
  <div class="cta__slot" data-ameba-slot="contact"></div>
</section>`;
}

function footer(c) {
  const t = c.t;
  const socials = site.socials.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join('');
  const spin = studio.spinoffs.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(' · ');
  return `<footer class="ftr">
  <div class="ftr__row">
    <p>© ${site.year} Alma Digital Studio · ${esc(t.footerTagline)}</p>
    <p class="ftr__links">${socials}<a href="mailto:${site.email}">${site.email}</a></p>
  </div>
  ${spin ? `<p class="ftr__also">${esc(t.footerAlso)}: ${spin}</p>` : ''}
</footer>`;
}

function modal(c) {
  const t = c.t;
  return `<div class="cm" id="contact-modal" role="dialog" aria-modal="true" aria-labelledby="cm-title" hidden>
  <div class="cm__backdrop" data-cm-close></div>
  <div class="cm__card">
    <button class="cm__close" type="button" data-cm-close aria-label="${esc(t.modalClose)}">✕</button>
    <h2 class="cm__title" id="cm-title">${esc(t.modalTitle)}</h2>
    <p class="cm__sub">${esc(t.modalSub)} <a href="mailto:${site.email}">${site.email}</a>.</p>
    <p class="label cm__about" id="cm-about" hidden></p>
    <form id="cm-form" novalidate>
      <label class="cm__field"><span>${esc(t.modalName)}</span>
        <input id="cm-name" name="name" type="text" placeholder="${esc(t.modalNamePh)}" autocomplete="name" required></label>
      <label class="cm__field"><span>${esc(t.modalEmail)}</span>
        <input id="cm-email" name="email" type="email" placeholder="${esc(t.modalEmailPh)}" autocomplete="email" required></label>
      <label class="cm__field"><span>${esc(t.modalMessage)}</span>
        <textarea id="cm-message" name="message" placeholder="${esc(t.modalMessagePh)}" required></textarea></label>
      <button class="btn btn--solid cm__submit" type="submit" id="cm-submit">${esc(t.modalSend)}</button>
      <p class="cm__feedback" id="cm-feedback" role="status" aria-live="polite"></p>
    </form>
  </div>
</div>`;
}

const RUNTIME_KEYS = ['modalSend', 'modalSending', 'modalSent', 'modalOk', 'modalFail', 'modalFill', 'modalBadEmail',
  'modalAbout', 'indexCount', 'indexCountOne', 'indexAll', 'reelSound', 'reelMute', 'reelUnmute', 'reelClose',
  'lbClose', 'lbPrev', 'lbNext', 'lbZoom', 'lbZoomOut', 'lbHint', 'lbLabel',
  'breathStart', 'breathStop', 'breathIn', 'breathOut', 'breathEnd'];

function page(c, { title, desc, ogImage, jsonld, current, body, bodyClass, runtime, noindex }) {
  const t = c.t;
  const rt = {
    lang: c.lang, email: site.email, endpoint: site.formspree, legacy: Object.values(site.legacyPages),
    t: Object.fromEntries(RUNTIME_KEYS.map(k => [k, t[k]])),
    ...(sound ? { sound: { src: sound.src, level: sound.level } } : {}),
    ...(world ? { world: true } : {}),
    v: { world: v('js/world.js'), particles: v('js/particles.js') },   // los módulos que js/app.js pide después
    ...(runtime || {}),
  };
  return `${head(c, { title, desc, ogImage: ogImage || 'Asset/Web Icons/og-alma-digital.jpg', jsonld, noindex })}
<body class="${bodyClass || ''}">
<a class="skip" href="#main">${esc(t.skip)}</a>
<canvas id="fluid" aria-hidden="true"></canvas>
<div class="veil" aria-hidden="true"></div>
<svg class="defs" width="0" height="0" aria-hidden="true" focusable="false"><filter id="cursor-ink" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0.129  0 0 0 0 0.122  0 0 0 0 0.42  0 0 0 1 0"/></filter></svg>
<div id="cursor-ring" aria-hidden="true"></div>
${header(c, current)}
<main class="page" id="main">
${body}
</main>
${footer(c)}
${modal(c)}
<!-- La ameba vive fuera de <main>: no se recarga al navegar. js/ameba.js la
     ubica sobre el [data-ameba-slot] de la página que esté más en pantalla. -->
<div class="ameba" id="ameba-wrap" aria-hidden="true">
  <img class="ameba__fallback" src="${asset(c, 'Asset/Logo Studio/Version 2/Logo.webp')}" alt="" width="1920" height="1080">
  <canvas id="ameba"></canvas>
</div>
<script type="application/json" id="alma-data">${JSON.stringify(rt).replace(/</g, '\\u003c')}</script>
<script>window.__ALMA__=JSON.parse(document.getElementById('alma-data').textContent);</script>
<script src="${c.up}js/fluid.js?v=${v('js/fluid.js')}"></script>
<script src="${c.up}js/cursor.js?v=${v('js/cursor.js')}"></script>
<script src="${c.up}js/ameba.js?v=${v('js/ameba.js')}"></script>${sound ? `
<script src="${c.up}js/sound.js?v=${v('js/sound.js')}"></script>` : ''}
<script src="${c.up}js/app.js?v=${v('js/app.js')}"></script>
</body>
</html>
`;
}

/* Cabecera de página interior, con el lugar donde se posa la ameba. */
const phead = (inner) => `<header class="phead phead--slot">
    <div>
${inner}
    </div>
    <div class="phead__slot" data-ameba-slot="page"></div>
  </header>`;

/* Con quién trabajamos: dos franjas en movimiento y el reconocimiento. Va en
   Studio (y en el landing de bloques, si se vuelve a él). */
function credsBlock(c) {
  const t = c.t;
  const track = arr => arr.map(x => `<span class="marquee__item">${esc(x)}</span>`).join('');
  const marquee = (arr, rev) => `    <div class="marquee${rev ? ' marquee--rev' : ''}">
      <div class="marquee__track">${track(arr)}</div>
      <div class="marquee__track" aria-hidden="true">${track(arr)}</div>
    </div>`;
  return `<section class="sec creds" aria-labelledby="cl-title">
  <div class="sec__head">
    <h2 id="cl-title">${em(t.clientsTitle)}</h2>
    <button class="creds__pause" type="button" aria-pressed="false" data-pause="${esc(t.credsPause)}" data-play="${esc(t.credsPlay)}">${esc(t.credsPause)}</button>
  </div>
  <div class="creds__rows">
${marquee(site.clients.institutions, false)}
${marquee(site.clients.brands, true)}
  </div>
  <p class="creds__award"><span class="label">${esc(t.clientsAward)}</span>${esc(site.clients.award[c.lang])}</p>
</section>`;
}

/* El reel del estudio, con el póster: el video se descarga recién al reproducir
   (ver js/app.js y site.json → reelAutoplayOnView). */
function reelBlock(c) {
  const t = c.t;
  return `<div class="reel" data-reel="${site.reelAutoplayOnView ? 'view' : 'click'}">
    <video id="reel-video" muted loop playsinline preload="none"
           poster="${asset(c, 'Asset/Reel Portfolio/Reel Poster.webp')}"
           data-src="${asset(c, 'Asset/Reel Portfolio/Reel Portfolio.mp4')}"
           data-src-mobile="${asset(c, 'Asset/Reel Portfolio/Reel Vertical Web.mp4')}"
           data-poster-mobile="${asset(c, 'Asset/Reel Portfolio/Reel Vertical Poster.webp')}"></video>
    <button class="reel__btn" type="button" data-reel-sound><span class="reel__play" aria-hidden="true"></span>${esc(site.reelAutoplayOnView ? t.reelSound : t.reelPlay)}</button>
  </div>`;
}

/* ── Landing de bloques (EN RESERVA) ──────────────────────────────────────
   Fue la portada hasta el 2026-11-18. Hoy la portada es el mundo interior
   (buildWorld); esto sólo se genera si site.json → world.enabled es false. */
function buildLanding(lang) {
  const c = ctx(lang, 'index.html');
  const t = c.t;
  const featured = site.featured.map(s => loc(projects.find(p => p.slug === s), lang));

  const cards = featured.map(p => `    <a class="wcard" href="${link(c, `work/${p.slug}.html`)}">
      <img loading="lazy" decoding="async" width="1920" height="1080" src="${asset(c, p.cover)}" alt="">${p.video ? `
      <video class="wcard__v" muted loop playsinline preload="none" data-src="${asset(c, p.video)}" aria-hidden="true" tabindex="-1"></video>` : ''}
      <span class="wcard__t"><b>${esc(p.title)}</b><span>${esc(p.format)}</span></span>
    </a>`).join('\n');

  /* Manifiesto: el segundo párrafo del "about", palabra por palabra para que
     el CSS pueda encenderlas con el scroll. */
  const manifesto = (studio.about[lang]?.length ? studio.about[lang] : studio.about.en)[1] || '';
  const words = manifesto.split(/\s+/).filter(Boolean)
    .map((w, i) => `<span style="--i:${i}">${esc(w)}</span>`).join(' ');

  /* Lo que hacemos: una fila por formato, con la portada de su primera obra. */
  const disc = Object.entries(site.formats).map(([key, label]) => {
    const list = projects.filter(p => p.formatKey === key);
    if (!list.length) return '';
    const n = list.length;
    const count = n === 1 ? t.indexCountOne : fill(t.indexCount, { n });
    return `      <a class="row" href="${link(c, 'work/index.html')}?format=${key}"
        data-title="${esc(label[lang])}" data-format="${esc(site.formatsDesc[key][lang])}"
        data-cover="${asset(c, list[0].cover)}" data-video="">
        <img class="row__thumb" loading="lazy" decoding="async" src="${asset(c, list[0].cover)}" alt="">
        <span class="row__name">${esc(label[lang])}</span>
        <span class="row__meta">${esc(count)}</span>
      </a>`;
  }).join('\n');

  const body = `<section class="hero" aria-labelledby="hero-title">
  <div class="hero__txt">
    <p class="eyebrow">${esc(t.heroEyebrow)}</p>
    <h1 id="hero-title">${em(t.heroTitle)}</h1>
    <p class="hero__lead">${esc(t.heroLead)}</p>
    <div class="hero__cta">
      <a class="btn btn--solid" href="${link(c, 'work/index.html')}">${esc(t.heroCtaWork)}</a>
      <button class="btn" type="button" data-contact>${esc(t.heroCtaContact)}</button>
    </div>
    <p class="hero__proof"><span class="label">${esc(t.heroProof)}</span>${site.proof.map(esc).join(' · ')}</p>
  </div>
  <div class="hero__stage">
    <div class="hero__slot" data-ameba-slot="hero"><noscript><img src="${asset(c, 'Asset/Logo Studio/Version 2/Logo.webp')}" alt=""></noscript></div>
${site.breathing ? `    <!-- Minuto de respiración guiada. js/ameba.js lo muestra sólo si la ameba está viva. -->
    <div class="breath" id="breath" role="group" aria-label="${esc(t.breathLabel)}" hidden>
      <p class="breath__cue" aria-live="polite"><span id="breath-cue"></span><span class="label" id="breath-count"></span></p>
      <button class="btn breath__btn" type="button" id="breath-btn" aria-pressed="false">${esc(t.breathStart)}</button>
    </div>
` : ''}  </div>
</section>

<section class="manifesto" aria-labelledby="man-label">
  <div class="manifesto__slot" data-ameba-slot="manifesto"></div>
  <div>
    <p class="eyebrow" id="man-label">${esc(t.manifestoLabel)}</p>
    <p class="manifesto__txt">${words}</p>
    <a class="more" href="${link(c, 'studio.html')}">${esc(t.manifestoMore)} <i aria-hidden="true">→</i></a>
  </div>
</section>

<section class="sec disc" aria-labelledby="disc-title">
  <h2 id="disc-title">${em(t.discTitle)}</h2>
  <div class="idx__body">
    <div class="list">
${disc}
    </div>
    <div class="preview" aria-hidden="true">
      <div class="preview__media">
        <img class="preview__img" alt="">
        <video class="preview__vid" muted loop playsinline></video>
      </div>
      <div class="preview__idle">${esc(t.discHover)}</div>
      <div class="preview__cap"><h3></h3><p></p></div>
    </div>
  </div>
</section>

<section class="sec" aria-labelledby="sel-title">
  <div class="sec__head">
    <h2 id="sel-title">${em(t.selectedTitle)}</h2>
    <a class="more" href="${link(c, 'work/index.html')}">${esc(fill(t.selectedAll, { n: projects.length }))} <i aria-hidden="true">→</i></a>
  </div>
  <div class="wgrid wgrid--mosaic">
${cards}
  </div>
</section>

<section class="sec" id="reel" aria-labelledby="reel-title">
  <h2 id="reel-title">${esc(t.reelTitle)}</h2>
  ${reelBlock(c)}
</section>

${credsBlock(c)}

${contactBand(c)}`;

  return [c.path, page(c, {
    title: t.siteTitle, desc: t.siteDesc, current: 'home', body, bodyClass: 'pg-home',
    jsonld: {
      '@context': 'https://schema.org', '@type': 'Organization', name: 'Alma Digital Studio',
      url: abs(lang, 'index.html'), logo: absAsset('Asset/Web Icons/PERFIL 3.png'),
      description: t.siteDesc, email: site.email, sameAs: site.socials.map(s => s.url),
    },
  })];
}

/* ── El mundo interior: la portada ─────────────────────────────────────────
   Un recorrido en 3D (js/world.js): la entrada, la ameba del estudio, el reel
   flotando, el paso a "Obras seleccionadas", una ameba por obra y el cierre.
   El HTML trae todo eso como una página común (título, reel, lista de obras en
   tarjetas, botones): es lo que se ve sin JavaScript o si el 3D no arranca
   (class "world--flat"; js/app.js la quita al montarlo) y lo que leen los
   buscadores. */
function buildWorld(lang) {
  const c = ctx(lang, 'index.html');
  const t = c.t;
  const slugs = world.works && world.works.length ? world.works : site.featured;
  const works = slugs.map(s => loc(projects.find(p => p.slug === s), lang));
  /* Forma y colores de cada obra: los de su ficha (site.json → particles) o, si
     no tiene, los de world.forms. Con esos colores se pinta su ameba y se arma
     el enjambre de partículas que la rodea. */
  const formOf = slug => (world.forms && world.forms[slug]) || (site.particles && site.particles[slug]) || { formation: 'halo', colors: [] };
  const items = works.map(p => {
    const f = formOf(p.slug);
    return `      <li><a class="wcard" data-w-item href="${link(c, `work/${p.slug}.html`)}" data-cover="${asset(c, p.cover)}" data-title="${esc(p.title)}" data-format="${esc(p.format)}" data-form="${esc(f.formation)}" data-colors="${esc((f.colors || []).join(','))}" data-stage="${esc(f.stage || '')}">
        <img loading="lazy" decoding="async" width="1920" height="1080" src="${asset(c, p.cover)}" alt="">
        <span class="wcard__t"><b>${esc(p.title)}</b><span>${esc(p.format)}</span></span>
      </a></li>`;
  }).join('\n');
  /* El reel flotante (site.json → world.reel): una versión liviana y sin audio
     que arranca sola al llegar a su parada. Sin esa entrada no hay parada. */
  const reel = world.reel && world.reel.src ? world.reel : null;
  /* Tramos del recorrido: uno entre cada par de paradas (estudio, reel, obras)
     y uno más antes de la primera obra, para el paso a "Obras seleccionadas".
     El CSS saca de acá el alto de la sección. */
  const tramos = works.length + (reel ? 1 : 0) + 1;
  const mask = p => `-webkit-mask-image:url('${asset(c, p)}');mask-image:url('${asset(c, p)}')`;

  const body = `<section class="world world--flat" data-world aria-labelledby="world-title" style="--n:${tramos}">
  <div class="world__stage">
    <div class="world__depth" aria-hidden="true"></div>
    <div class="world__canvas" aria-hidden="true"></div>
    <!-- Primera pantalla: el título y el logo. La descripción va adentro, en la
         ameba del estudio; acá queda sólo para cuando no hay 3D. -->
    <div class="world__intro">
      <h1 id="world-title">${em(t.heroTitle)}</h1>
      <span class="world__logo" role="img" aria-label="Alma Digital" style="${mask('Asset/Logo Studio/lockup-alma-digital.webp')}"></span>
      <p class="world__lead">${esc(t.heroLead)}</p>
    </div>
    <!-- La invitación va sobre la ameba de entrada. Un clic lleva hasta la primera parada. -->
    <button class="world__invite" type="button" data-w-enter>
      <span class="world__invite-t">${em(t.worldTitle)}</span>
      <span class="label">${esc(t.worldHint)} <i aria-hidden="true">↓</i></span>
    </button>
    <div class="world__hud">
      <p class="label" data-w-count></p>
      <p class="world__name" data-w-title></p>
      <p class="world__fmt" data-w-fmt></p>
      <p class="world__desc" data-w-desc hidden></p>
      <a class="btn" data-w-open href="${link(c, 'studio.html')}"><span data-w-cta data-default="${esc(t.worldOpen)}">${esc(t.worldOpen)}</span> <i aria-hidden="true">→</i></a>
    </div>
    <nav class="world__dots" aria-label="${esc(t.worldListLabel)}"></nav>${reel ? `
    <!-- El reel con su póster: lo que se ve sin 3D, y lo que abre "Ver con sonido". -->
    <div class="world__reel" id="reel">
      ${reelBlock(c)}
    </div>` : ''}
    <!-- El paso a las obras: en el recorrido aparece entre el reel y la primera ameba. -->
    <h2 class="world__chapter" data-w-chapter>${em(t.selectedTitle)}</h2>
    <!-- Cierre: el resto de las obras, el estudio y el contacto. -->
    <div class="world__end">
      <h2>${em(t.worldEndTitle)}</h2>
      <p class="world__end-txt">${esc(t.worldEndLead)}</p>
      <div class="world__row">
        <a class="btn btn--solid" href="${link(c, 'work/index.html')}">${esc(t.worldEndAll)}</a>
        <a class="btn" href="${link(c, 'studio.html')}">${esc(t.worldEndStudio)}</a>
        <button class="btn" type="button" data-contact>${esc(t.heroCtaContact)}</button>
      </div>
    </div>
    <ol class="world__list wgrid" aria-label="${esc(t.worldListLabel)}">
      <!-- Primera parada: la ameba del estudio, con su descripción. -->
      <li class="world__only3d"><a class="wcard" data-w-item data-kind="studio" href="${link(c, 'studio.html')}" data-title="Alma Digital" data-format="${esc(t.worldStoryLabel)}" data-desc="${esc(t.heroLead)}" data-cta="${esc(t.worldEndStudio)}" data-form="logo" data-colors="#c99ef9,#8a4ee0,#f2b8dd,#ffffff" data-stage="#2a1c58">
        <span class="wcard__t"><b>Alma Digital</b><span>${esc(t.worldStoryLabel)}</span></span>
      </a></li>${reel ? `
      <!-- Segunda parada: el reel, flotando y en reproducción automática. -->
      <li class="world__only3d"><a class="wcard" data-w-item data-kind="reel" href="#reel" data-title="${esc(t.reelTitle)}" data-cta="${esc(t.reelSound)}"
        data-video="${asset(c, reel.src)}" data-video-mobile="${asset(c, reel.srcMobile || reel.src)}"
        data-poster="${asset(c, 'Asset/Reel Portfolio/Reel Poster.webp')}" data-poster-mobile="${asset(c, 'Asset/Reel Portfolio/Reel Vertical Poster.webp')}">
        <span class="wcard__t"><b>${esc(t.reelTitle)}</b></span>
      </a></li>` : ''}
${items}
    </ol>
  </div>
</section>`;

  return [c.path, page(c, {
    title: t.siteTitle, desc: t.siteDesc, current: 'home', body, bodyClass: 'pg-home pg-world',
    jsonld: {
      '@context': 'https://schema.org', '@type': 'Organization', name: 'Alma Digital Studio',
      url: abs(lang, 'index.html'), logo: absAsset('Asset/Web Icons/PERFIL 3.png'),
      description: t.siteDesc, email: site.email, sameAs: site.socials.map(s => s.url),
    },
  })];
}

/* ── Índice de obras ────────────────────────────────────────────────────── */
function buildIndex(lang) {
  const c = ctx(lang, 'work/index.html');
  const t = c.t;
  const list = projects.map(p => loc(p, lang));

  const rows = list.map(p => `      <a class="row" href="${link(c, `work/${p.slug}.html`)}"
        data-track="${p.track}" data-format-key="${p.formatKey}"
        data-title="${esc(p.title)}" data-format="${esc(p.format)}"
        data-cover="${asset(c, p.cover)}" data-video="${p.video ? asset(c, p.video) : ''}"${site.perProjectPalette ? `
        data-palette='${JSON.stringify(p.palette || [])}' data-back="${p.back || ''}"` : ''}>
        <img class="row__thumb" loading="lazy" decoding="async" src="${asset(c, p.cover)}" alt="">
        <span class="row__name">${esc(p.title)}</span>
        <span class="row__meta">${esc(p.format)}</span>
      </a>`).join('\n');

  const chip = (dim, val, label) => `<button class="chip" type="button" data-dim="${dim}" data-val="${val}" aria-pressed="${val === 'all'}">${esc(label)}</button>`;
  const group = (label, dim, opts) => `      <div class="fgroup" role="group" aria-label="${esc(label)}">
        <span class="label">${esc(label)}</span>
        ${[chip(dim, 'all', t.filterAll), ...opts.map(([v, l]) => chip(dim, v, l))].join('\n        ')}
      </div>`;

  const body = `<div class="idx">
  ${phead(`      <h1>${esc(t.indexTitle)}</h1>
      <p class="label idx__count" aria-live="polite">${esc(t.indexAll)}</p>`)}

  <div class="filters">
${group(t.filterLine, 'track', Object.entries(site.tracks).map(([k, v]) => [k, v[lang]]))}
${group(t.filterFormat, 'format', Object.entries(site.formats).map(([k, v]) => [k, v[lang]]))}
  </div>

  <div class="idx__body">
    <div class="list">
${rows}
      <p class="empty" hidden>${esc(t.indexEmpty)}</p>
    </div>
    <div class="preview" aria-hidden="true">
      <div class="preview__media">
        <img class="preview__img" alt="">
        <video class="preview__vid" muted loop playsinline></video>
      </div>
      <div class="preview__idle">${esc(t.indexHover)}</div>
      <div class="preview__cap"><h3></h3><p></p></div>
    </div>
  </div>
</div>`;

  return [c.path, page(c, {
    title: `${t.indexTitle} — Alma Digital Studio`, desc: t.indexDesc, current: 'work', body, bodyClass: 'pg-index',
  })];
}

/* ── Ficha de obra ──────────────────────────────────────────────────────── */
function buildProject(raw, rawNext, lang) {
  const p = loc(raw, lang), next = loc(rawNext, lang);
  const c = ctx(lang, `work/${p.slug}.html`);
  const t = c.t;
  const track = p.track === 'studio' ? t.pStudio : t.pCommission;

  /* Ficha técnica, al lado del resumen. Las sedes no van acá: están en el
     historial de exhibición. */
  const meta = [[t.pFormat, p.format, ''], [t.pLine, track, '']];
  if (p.year) meta.push([t.pYear, p.year, '']);
  if (p.commissionedBy) meta.push([t.pCommissionedBy, p.commissionedBy, '']);
  if (p.tech?.length) meta.push([t.pTech, p.tech.join(' · '), ' class="pj-meta__wide"']);
  const metaHtml = meta.map(([k, v, cls]) => `      <div${cls}><dt class="label">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('\n');

  /* ── Recorrido de imágenes y video ─────────────────────────────────────
     Referencia: unseen.co/projects/blue-marine-foundation. El diseño completo:
       imagen ancha · teléfono 3D + foto al lado (o dos teléfonos) + texto ·
       galería dispersa de 6 imágenes chicas · imagen a sangre
     Con pocas fotos se llenan primero los lugares que más rinden: la foto al
     lado del teléfono, dos de la galería, la ancha, tres más de la galería, la
     imagen a sangre y la sexta de la galería. Los lugares que faltan: en el
     sitio publicado no salen (un bloque sin fotos se oculta); en localhost y
     en las vistas previas se ven marcados, para saber qué sumar. Más de 9
     fotos siguen en dúos.
     El movimiento (entrada curva, parallax, giro del teléfono) lo pone
     js/app.js (initMotion) en los elementos con data-m; el aspecto, css/site.css. */
  /* La primera de la fila es la que va al lado del teléfono, recortada en vertical.
     Si ese recorte le queda mal (un afiche con texto, por ejemplo), "sidePhoto"
     en projects.json elige otra. La portada va en la galería. */
  const side = p.sidePhoto && p.photos.includes(p.sidePhoto) && p.sidePhoto !== p.cover ? p.sidePhoto : null;
  const others = p.photos.filter(x => x !== p.cover && x !== side);
  if (side) others.unshift(side);
  const queue = [...others.slice(0, 1), ...p.photos.filter(x => x === p.cover), ...others.slice(1)];
  let num = 0;
  const shot = (ph, cls, m) => `<figure class="shot${cls ? ' ' + cls : ''}" data-m="${m || 'shot'}"><img loading="lazy" decoding="async" width="1920" height="1080" src="${asset(c, ph)}" alt="${esc(p.title)}, ${esc(t.pImage)} ${++num}"></figure>`;
  const gap = (cls, text) => `<div class="slot${cls ? ' ' + cls : ''}" aria-hidden="true"><span>${text}</span></div>`;

  /* Videos verticales: el reel de la obra y, si hay, "verticals" (projects.json: .mp4 o imagen 9:16). */
  const verticals = [p.video || p.reelImage, ...(p.verticals || [])].filter(Boolean).slice(0, 2);
  const pick = { side: null, wide: null, bleed: null, wall: [] };
  if (verticals.length < 2) pick.side = queue.shift() || null;
  pick.wall.push(...queue.splice(0, 2));
  pick.wide = queue.shift() || null;
  pick.wall.push(...queue.splice(0, 3));
  pick.bleed = queue.shift() || null;
  pick.wall.push(...queue.splice(0, 1));

  /* El teléfono es un objeto 3D: una cara con la pantalla y ocho capas detrás
     que le dan canto. Gira con el scroll. */
  const edge = Array.from({ length: 8 }, (_, i) => `<i style="--i:${i + 1}"></i>`).join('');
  const phone = v => `      <div class="pj-phone" data-m="phone"><div class="pj-phone__body">${edge}<div class="pj-phone__screen preel">${/\.mp4$/i.test(v)
    ? `<video muted loop playsinline preload="none" poster="${asset(c, p.cover)}" data-src="${asset(c, v)}"></video>`
    : `<img loading="lazy" decoding="async" src="${asset(c, v)}" alt="${esc(p.title)}, reel">`}</div></div></div>`;
  /* Con un solo video vertical va un teléfono y, al lado, una foto. */
  const objs = verticals.map(phone);
  if (!verticals.length) objs.push(`      ${gap('pj-phone', 'Espacio para video vertical<br>9:16 · 406×720')}`);
  if (verticals.length < 2) objs.push(`      ${pick.side ? shot(pick.side, 'pj-card', 'card') : gap('pj-card', 'Espacio para foto<br>o material · vertical 4:5')}`);
  const rest = p.body.slice(1);
  const phonesMod = `  <section class="pj-m pj-m--phones${rest.length ? '' : ' pj-m--alone'}" data-n="${verticals.length + (pick.side ? 1 : 0)}" aria-label="${esc(t.pReel)}">
    <div class="pj-stage3d">
${objs.join('\n')}
    </div>${rest.length ? `
    <div class="pj-side">
      <h2 class="label">${esc(t.pConcept)}</h2>
${rest.map(x => `      <p>${esc(x)}</p>`).join('\n')}
    </div>` : ''}
  </section>`;

  /* Galería dispersa: tres columnas de imágenes chicas, de distinto tamaño, que
     se mueven a distinta velocidad. Al lado, dónde se presentó la obra. Hace
     falta un mínimo de dos fotos para que salga en el sitio publicado. */
  const wallOn = pick.wall.length >= 2;
  const tiles = Array.from({ length: Math.max(6, pick.wall.length) }, (_, i) => pick.wall[i]
    ? shot(pick.wall[i], '', 'tile') : gap('', 'Espacio para imagen<br>1920×1080'));
  const cols = [0, 1, 2].map(k => `      <div class="pj-wall__col" data-m="col">
${tiles.filter((_, i) => i % 3 === k).map(x => `        ${x}`).join('\n')}
      </div>`).join('\n');
  const historyInWall = wallOn && p.presentedAt.length > 0;
  const wallMod = `  <section class="pj-m pj-m--wall${historyInWall ? '' : ' pj-m--wall-solo'}" data-n="${wallOn ? pick.wall.length : 0}" aria-labelledby="wall-h">
    <div class="pj-wall__txt">
      <h2 class="label" id="wall-h">${esc(historyInWall ? t.pHistory : t.pGallery)}</h2>${historyInWall ? `
      <ul class="plain">${p.presentedAt.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    </div>
    <div class="pj-wall">
${cols}
    </div>
  </section>`;
  const historyBelow = !historyInWall && p.presentedAt.length > 0;

  const one = (type, ph) => `  <div class="pj-m pj-m--${type}" data-n="${ph ? 1 : 0}">
    ${ph ? shot(ph, '', type === 'bleed' ? 'bleed' : 'shot') : gap('', 'Espacio para imagen<br>horizontal · 1920×1080')}
  </div>`;
  const flow = [one('wide', pick.wide), phonesMod, wallMod, one('bleed', pick.bleed)];
  while (queue.length) {
    const pair = queue.splice(0, 2);
    flow.push(`  <div class="pj-m pj-m--duo" data-n="${pair.length}">\n${pair.map(x => `    ${shot(x)}`).join('\n')}\n  </div>`);
  }

  const legacy = site.legacyPages[p.slug];

  /* Cabecera viva (site.json → particles, hoy las 19 obras): sobre la foto,
     que se mueve despacio, se enciende un campo de partículas con la formación
     y los colores de la obra. Lo monta js/app.js con js/particles.js; sin eso
     (o sin entrada en particles) queda la foto. */
  const live = (site.particles || {})[p.slug];
  const body = `<section class="phero${live ? ' phero--live' : ''}" data-m="hero"${live ? ` data-particles="${esc(live.formation)}" data-colors="${esc(live.colors.join(','))}" style="--stage:${esc(live.stage)}"` : ''}>
  <img class="phero__bg" src="${asset(c, p.cover)}" alt="" width="1920" height="1080" fetchpriority="high">${live ? `
  <div class="phero__stage" aria-hidden="true"></div>` : ''}
  <div class="phero__txt">
    <p class="phero__eyebrow"><a href="${link(c, 'work/index.html')}">${esc(c.t.indexTitle)}</a> · ${esc(track)}</p>
    <h1>${esc(p.title)}</h1>
    <p class="phero__fmt">${esc(p.format)}</p>${live ? `
    <p class="phero__hint" aria-hidden="true"><span class="phero__hint-m">${esc(t.pParticlesHint)}</span><span class="phero__hint-t">${esc(t.pParticlesHintTouch)}</span></p>` : ''}
  </div>
  <div class="phero__slot" data-ameba-slot="project"></div>
</section>

<section class="pj-over" aria-labelledby="over-h">
  <div class="pj-over__lead">
    <h2 class="label" id="over-h">${esc(t.pOverview)}</h2>
    <p class="pj-over__txt">${esc(p.body[0] || p.desc)}</p>${legacy ? `
    <a class="more" href="${c.up}${legacy}">${esc(t.pPage)} <i aria-hidden="true">→</i></a>` : ''}
  </div>
  <dl class="pj-meta" aria-label="${esc(t.pSheet)}">
${metaHtml}
  </dl>
</section>

<div class="pj-flow">
${flow.join('\n\n')}
</div>

<div class="sheet">
  <section class="block">
    <div class="cols">
      <div>
        <h2 class="label">${esc(t.pCredits)}</h2>
        <ul class="plain">${p.credits.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>${historyBelow ? `
      <div>
        <h2 class="label">${esc(t.pHistory)}</h2>
        <ul class="plain">${p.presentedAt.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>` : ''}
    </div>
  </section>

  <section class="block enquire">
    <p>${esc(t.pEnquire)}</p>
    <button class="btn btn--solid" type="button" data-contact data-contact-subject="${esc(p.title)}">${esc(t.pEnquireCta)}</button>
  </section>

  <a class="next" href="${link(c, `work/${next.slug}.html`)}">
    <span class="label">${esc(t.pNext)}</span>
    <span class="next__n">${esc(next.title)}</span>
  </a>
</div>`;

  return [c.path, page(c, {
    title: `${p.title} — Alma Digital Studio`, desc: clip(p.desc, 165), ogImage: ogFor(p.slug),
    current: 'work', body, bodyClass: 'pg-project',
    runtime: site.perProjectPalette ? { palette: p.palette, back: p.back } : null,
    jsonld: {
      '@context': 'https://schema.org', '@type': 'CreativeWork', name: p.title, description: p.desc,
      url: abs(lang, c.rel), image: absAsset(ogFor(p.slug)), inLanguage: lang, genre: p.format,
      creator: { '@type': 'Organization', name: 'Alma Digital Studio', url: site.origin + '/' },
    },
  })];
}

/* ── Studio ─────────────────────────────────────────────────────────────── */
function buildStudio(lang) {
  const c = ctx(lang, 'studio.html');
  const t = c.t;
  const about = studio.about[lang]?.length ? studio.about[lang] : studio.about.en;
  const founders = studio.team.filter(m => m.founder);
  const rest = studio.team.filter(m => !m.founder);

  const founder = m => `    <article class="founder">
      <img loading="lazy" decoding="async" src="${asset(c, m.photo)}" alt="${esc(m.name)}">
      <div>
        <p class="label">${esc(m.role[lang] || m.role.en)}</p>
        <h3>${esc(m.name)}</h3>
        <p class="founder__bio">${esc(m.bio[lang] || m.bio.en)}</p>
      </div>
    </article>`;
  const member = m => `    <article class="member">
      <img loading="lazy" decoding="async" src="${asset(c, m.photo)}" alt="${esc(m.name)}">
      <p class="label">${esc(m.role[lang] || m.role.en)}</p>
      <h3>${esc(m.name)}</h3>
    </article>`;
  const spin = s => `    <a class="spin" href="${esc(s.url)}" target="_blank" rel="noopener">
      <img loading="lazy" decoding="async" src="${asset(c, s.image)}" alt="">
      <span class="spin__txt">
        <span class="label">${esc(s.kicker[lang] || s.kicker.en)}</span>
        <b>${esc(s.name)}</b>
        <span class="spin__desc">${esc(s.desc[lang] || s.desc.en)}</span>
        <span class="more">${esc(t.studioVisit)} <i aria-hidden="true">→</i></span>
      </span>
    </a>`;

  const body = `<div class="studio">
  ${phead(`      <h1>${esc(t.studioTitle)}</h1>`)}

  <section class="about">
${about.map(x => `    <p>${esc(x)}</p>`).join('\n')}
  </section>

  ${credsBlock(c)}

  <section class="sec" aria-labelledby="team-h">
    <h2 id="team-h">${esc(t.studioTeam)}</h2>
    <div class="founders">
${founders.map(founder).join('\n')}
    </div>
    <div class="team">
${rest.map(member).join('\n')}
      <button class="member member--join" type="button" data-contact>
        <span class="member__plus" aria-hidden="true">+</span>
        <b>${esc(t.studioJoin)}</b>
        <span class="label">${esc(t.studioJoinCta)}</span>
      </button>
    </div>
  </section>
${studio.spinoffs.length ? `
  <section class="sec" aria-labelledby="spin-h">
    <h2 id="spin-h">${esc(t.studioSpinoffs)}</h2>
    <div class="spins">
${studio.spinoffs.map(spin).join('\n')}
    </div>
  </section>` : ''}
</div>

${contactBand(c)}`;

  return [c.path, page(c, {
    title: `${t.studioTitle} — Alma Digital Studio`, desc: t.studioDesc, current: 'studio', body, bodyClass: 'pg-studio',
  })];
}

/* ── Escritura ──────────────────────────────────────────────────────────── */
const out = [];
for (const lang of LANGS) {
  out.push(world ? buildWorld(lang) : buildLanding(lang), buildIndex(lang), buildStudio(lang));
  projects.forEach((p, i) => out.push(buildProject(p, projects[(i + 1) % projects.length], lang)));
}

/* work/ y es/ son carpetas del generador: se rehacen enteras para no dejar
   fichas huérfanas si se saca una obra. */
for (const d of ['work/', 'es/']) await rm(new URL(d, ROOT), { recursive: true, force: true });
for (const [path, html] of out) {
  const url = new URL(path, ROOT);
  await mkdir(new URL('./', url), { recursive: true });
  await writeFile(url, html, 'utf8');
}

const urls = [
  ...LANGS.flatMap(l => ['index.html', 'work/index.html', 'studio.html', ...projects.map(p => `work/${p.slug}.html`)].map(r => abs(l, r))),
  ...Object.values(site.legacyPages).map(p => `${site.origin}/${p}`),
];
await writeFile(new URL('sitemap.xml', ROOT),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${esc(u)}</loc></url>`).join('\n')}\n</urlset>\n`, 'utf8');

const noEs = projects.filter(p => !esProjects[p.slug]).map(p => p.slug);
console.log(`${out.length} páginas generadas (${LANGS.join(' + ')}) + sitemap.xml`);
if (noEs.length) console.log(`sin traducción al español (${noEs.length}): ${noEs.join(', ')}`);
