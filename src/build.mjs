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
import { existsSync } from 'node:fs';
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
<link rel="stylesheet" href="${c.up}css/site.css">
<!-- En el tema claro las partículas del cursor se tiñen de tinta con un filtro del
     propio documento; va acá porque url(#id) desde un CSS externo no es confiable. -->
<style>html[data-theme="aura"] .cursor-particle{filter:url(#cursor-ink)}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>`;
}

/* Música de ambiente (site.json → sound). Con enabled en false no se genera ni
   el botón ni el script. */
const sound = site.sound && site.sound.enabled && site.sound.src ? site.sound : null;

/* El mundo interior: página de prueba (site.json → world). */
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
  'modalAbout', 'indexCount', 'indexCountOne', 'reelSound', 'reelMute', 'reelUnmute', 'reelClose',
  'lbClose', 'lbPrev', 'lbNext', 'lbZoom', 'lbZoomOut', 'lbHint', 'lbLabel',
  'breathStart', 'breathStop', 'breathIn', 'breathOut', 'breathEnd'];

function page(c, { title, desc, ogImage, jsonld, current, body, bodyClass, runtime, noindex }) {
  const t = c.t;
  const rt = {
    lang: c.lang, email: site.email, endpoint: site.formspree, legacy: Object.values(site.legacyPages),
    t: Object.fromEntries(RUNTIME_KEYS.map(k => [k, t[k]])),
    ...(sound ? { sound: { src: sound.src, level: sound.level } } : {}),
    ...(world ? { world: true } : {}),
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
<script src="${c.up}js/fluid.js"></script>
<script src="${c.up}js/cursor.js"></script>
<script src="${c.up}js/ameba.js"></script>${sound ? `
<script src="${c.up}js/sound.js"></script>` : ''}
<script src="${c.up}js/app.js"></script>
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

/* ── Landing ────────────────────────────────────────────────────────────── */
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

  const track = arr => arr.map(x => `<span class="marquee__item">${esc(x)}</span>`).join('');
  const marquee = (arr, rev) => `    <div class="marquee${rev ? ' marquee--rev' : ''}">
      <div class="marquee__track">${track(arr)}</div>
      <div class="marquee__track" aria-hidden="true">${track(arr)}</div>
    </div>`;

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
  <div class="reel" data-reel="${site.reelAutoplayOnView ? 'view' : 'click'}">
    <!-- El video no se descarga hasta que alguien lo reproduce (ver js/app.js y
         site.json → reelAutoplayOnView). Con autoplay se bajaba entero en cada visita. -->
    <video id="reel-video" muted loop playsinline preload="none"
           poster="${asset(c, 'Asset/Reel Portfolio/Reel Poster.webp')}"
           data-src="${asset(c, 'Asset/Reel Portfolio/Reel Portfolio.mp4')}"
           data-src-mobile="${asset(c, 'Asset/Reel Portfolio/Reel Vertical Web.mp4')}"
           data-poster-mobile="${asset(c, 'Asset/Reel Portfolio/Reel Vertical Poster.webp')}"></video>
    <button class="reel__btn" type="button" data-reel-sound><span class="reel__play" aria-hidden="true"></span>${esc(site.reelAutoplayOnView ? t.reelSound : t.reelPlay)}</button>
  </div>
</section>

<section class="sec creds" aria-labelledby="cl-title">
  <div class="sec__head">
    <h2 id="cl-title">${em(t.clientsTitle)}</h2>
    <button class="creds__pause" type="button" aria-pressed="false" data-pause="${esc(t.credsPause)}" data-play="${esc(t.credsPlay)}">${esc(t.credsPause)}</button>
  </div>
  <div class="creds__rows">
${marquee(site.clients.institutions, false)}
${marquee(site.clients.brands, true)}
  </div>
  <p class="creds__award"><span class="label">${esc(t.clientsAward)}</span>${esc(site.clients.award[lang])}</p>
</section>

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

/* ── El mundo interior (PÁGINA DE PRUEBA) ───────────────────────────────────
   Recorrido en 3D por las obras principales (js/world.js). No está enlazada
   desde el menú ni va al sitemap, y pide a los buscadores que no la indexen.
   El HTML trae la lista de obras como tarjetas: es lo que se ve sin JavaScript
   o si el 3D no arranca (class "world--flat"; js/app.js la quita al montarlo). */
function buildWorld(lang) {
  const c = ctx(lang, 'inner-world.html');
  const t = c.t;
  const slugs = world.works && world.works.length ? world.works : site.featured;
  const works = slugs.map(s => loc(projects.find(p => p.slug === s), lang));
  /* Forma y colores de las partículas que rodean a cada obra: los de su ficha
     (site.json → particles) o, si no tiene, los de world.forms. */
  const formOf = slug => (world.forms && world.forms[slug]) || (site.particles && site.particles[slug]) || { formation: 'halo', colors: [] };
  const items = works.map(p => `      <li><a class="wcard" data-w-item href="${link(c, `work/${p.slug}.html`)}" data-cover="${asset(c, p.cover)}" data-title="${esc(p.title)}" data-format="${esc(p.format)}" data-form="${esc(formOf(p.slug).formation)}" data-colors="${esc((formOf(p.slug).colors || []).join(','))}">
        <img loading="lazy" decoding="async" width="1920" height="1080" src="${asset(c, p.cover)}" alt="">
        <span class="wcard__t"><b>${esc(p.title)}</b><span>${esc(p.format)}</span></span>
      </a></li>`).join('\n');

  const body = `<section class="world world--flat" data-world aria-labelledby="world-title" style="--n:${works.length}">
  <div class="world__stage">
    <div class="world__depth" aria-hidden="true"></div>
    <div class="world__canvas" aria-hidden="true"></div>
    <!-- Primera pantalla: sólo el título (el mismo del landing, site.json → heroTitle). -->
    <div class="world__intro">
      <p class="eyebrow">${esc(t.heroEyebrow)}</p>
      <h1 id="world-title">${em(t.heroTitle)}</h1>
    </div>
    <!-- Primera parada, ya adentro: qué hace el estudio y dónde se presentó. -->
    <div class="world__story" data-w-story>
      <p class="label">${esc(t.worldStoryLabel)}</p>
      <p class="world__story-txt">${esc(t.heroLead)}</p>
      <p class="hero__proof world__proof"><span class="label">${esc(t.heroProof)}</span>${site.proof.map(esc).join(' · ')}</p>
    </div>
    <!-- La invitación va sobre la ameba de entrada. Un clic lleva hasta la primera obra. -->
    <button class="world__invite" type="button" data-w-enter>
      <span class="world__invite-t">${em(t.worldTitle)}</span>
      <span class="label">${esc(t.worldHint)} <i aria-hidden="true">↓</i></span>
    </button>
    <div class="world__hud">
      <p class="label" data-w-count></p>
      <p class="world__name" data-w-title></p>
      <p class="world__fmt" data-w-fmt></p>
      <a class="btn" data-w-open href="${link(c, `work/${works[0].slug}.html`)}">${esc(t.worldOpen)} <i aria-hidden="true">→</i></a>
    </div>
    <nav class="world__dots" aria-label="${esc(t.worldListLabel)}"></nav>
    <!-- Cierre: el resto de las obras, el estudio y el contacto. -->
    <div class="world__end">
      <h2>${em(t.worldEndTitle)}</h2>
      <p class="world__end-txt">${esc(fill(t.worldEndLead, { n: projects.length }))}</p>
      <div class="world__row">
        <a class="btn btn--solid" href="${link(c, 'work/index.html')}">${esc(fill(t.worldEndAll, { n: projects.length }))}</a>
        <a class="btn" href="${link(c, 'studio.html')}">${esc(t.worldEndStudio)}</a>
        <button class="btn" type="button" data-contact>${esc(t.heroCtaContact)}</button>
      </div>
    </div>
    <ol class="world__list wgrid" aria-label="${esc(t.worldListLabel)}">
${items}
    </ol>
  </div>
</section>`;

  return [c.path, page(c, {
    title: t.worldTitleTag, desc: t.worldDesc, current: '', body, bodyClass: 'pg-world', noindex: true,
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
      <p class="label idx__count" aria-live="polite">${esc(fill(t.indexCount, { n: projects.length }))}</p>`)}

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
     El diseño completo tiene 8 lugares para fotos y 2 para video vertical:
       ancha · teléfonos + texto · a sangre · dúo escalonado · trío en mosaico · ancha
     Las fotos de projects.json los van ocupando en orden (la portada va al
     final: ya está arriba). Con pocas fotos, los lugares que faltan quedan
     vacíos: en el sitio publicado es espacio en blanco o el bloque no sale; en
     localhost y en las vistas previas se ven marcados, para saber qué sumar.
     Más de 8 fotos siguen en dúos. La aparición curva es sólo CSS. */
  const order = [...p.photos.filter(x => x !== p.cover), ...p.photos.filter(x => x === p.cover)];
  let used = 0;
  const gap = (kind, text) => `    <div class="slot slot--${kind}" aria-hidden="true"><span>${text}</span></div>`;
  const mod = (type, size) => {
    const items = [];
    let real = 0;
    for (let i = 0; i < size; i++) {
      const ph = order[used];
      if (ph) {
        used++; real++;
        items.push(`    <figure class="shot"><img loading="lazy" decoding="async" width="1920" height="1080" src="${asset(c, ph)}" alt="${esc(p.title)}, ${esc(t.pImage)} ${used}"></figure>`);
      } else items.push(gap('img', 'Espacio para imagen<br>horizontal · 1920×1080'));
    }
    return `  <div class="pj-m pj-m--${type}" data-n="${real}">\n${items.join('\n')}\n  </div>`;
  };

  /* Videos verticales, en marco de teléfono. El primero es el reel de la obra;
     "verticals" (opcional en projects.json) suma más: .mp4 o imagen 9:16. */
  const verticals = [p.video || p.reelImage, ...(p.verticals || [])].filter(Boolean).slice(0, 2);
  const phone = v => `      <div class="pj-phone"><div class="pj-phone__screen preel">${/\.mp4$/i.test(v)
    ? `<video muted loop playsinline preload="none" poster="${asset(c, p.cover)}" data-src="${asset(c, v)}"></video>`
    : `<img loading="lazy" decoding="async" src="${asset(c, v)}" alt="${esc(p.title)}, reel">`}</div></div>`;
  const phones = [...verticals.map(phone)];
  while (phones.length < 2) phones.push(`      <div class="pj-phone pj-phone--empty slot" aria-hidden="true"><span>Espacio para video vertical<br>9:16 · 406×720</span></div>`);
  /* Al lado: el resto del texto si lo hay; si no, dónde se presentó. */
  const rest = p.body.slice(1);
  const side = rest.length
    ? `<h2 class="label">${esc(t.pConcept)}</h2>\n${rest.map(x => `      <p>${esc(x)}</p>`).join('\n')}`
    : (p.presentedAt.length ? `<h2 class="label">${esc(t.pHistory)}</h2>\n      <ul class="plain">${p.presentedAt.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  const historyBelow = rest.length > 0 && p.presentedAt.length > 0;
  const phonesMod = `  <section class="pj-m pj-m--phones${side ? '' : ' pj-m--alone'}" data-n="${verticals.length}" aria-label="${esc(t.pReel)}">
    <div class="pj-phones">
${phones.join('\n')}
    </div>${side ? `
    <div class="pj-side">
      ${side}
    </div>` : ''}
  </section>`;

  const flow = [mod('wide', 1), phonesMod, mod('bleed', 1), mod('duo', 2), mod('trio', 3), mod('wide', 1)];
  while (used < order.length) flow.push(mod('duo', 2));

  const legacy = site.legacyPages[p.slug];

  /* Obras principales (site.json → particles): sobre la foto se enciende un
     campo de partículas con la formación y los colores de la obra. Lo monta
     js/app.js con js/particles.js; sin eso, queda la foto como en las demás. */
  const live = (site.particles || {})[p.slug];
  const body = `<section class="phero${live ? ' phero--live' : ''}"${live ? ` data-particles="${esc(live.formation)}" data-colors="${esc(live.colors.join(','))}" style="--stage:${esc(live.stage)}"` : ''}>
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
  out.push(buildLanding(lang), buildIndex(lang), buildStudio(lang));
  if (world) out.push(buildWorld(lang));
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
