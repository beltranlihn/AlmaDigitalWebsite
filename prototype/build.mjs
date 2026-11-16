/* ═══════════════════════════════════════════════════════════════════════════
   Alma Digital — generador del catálogo
   Lee projects.json y escribe index.html + work/<slug>.html.
   Sin framework, sin bundler: la salida es HTML estático, igual de desplegable
   que el sitio actual. Se corre a mano:  node prototype/build.mjs
   ═══════════════════════════════════════════════════════════════════════ */
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const HERE = new URL('./', import.meta.url);
const { meta, projects } = JSON.parse(await readFile(new URL('projects.json', HERE), 'utf8'));

const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Los assets viven fuera de prototype/, así que cada nivel necesita su prefijo. */
const up = n => '../'.repeat(n);
const asset = (p, depth) => up(depth) + String(p).split('/').map(encodeURIComponent).join('/');

/* Los filtros salen de meta.formats y del formatKey de cada obra: es una
   decisión editorial del estudio, no algo que convenga adivinar por regex
   sobre la etiqueta visible ("Neurocosm 360" es 360° y VR a la vez). */
const FORMATS = [['all', 'Todo'], ...Object.entries(meta.formats)];
const TRACKS = [['all', 'Todo'], ['studio', 'Studio'], ['commission', 'Commissions']];

const orphan = projects.filter(p => !meta.formats[p.formatKey]);
if (orphan.length) {
  throw new Error('formatKey sin etiqueta en meta.formats: ' + orphan.map(p => `${p.slug}=${p.formatKey}`).join(', '));
}

function shell({ title, depth, palette, back, body, bodyClass = '' }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Raleway:wght@200;300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${up(depth)}prototype/style.css">
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
<canvas id="fluid" aria-hidden="true"></canvas>
<div class="scrim" aria-hidden="true"></div>
<div class="page">
${body}
</div>

<aside class="proto">
  <button aria-label="Ocultar aviso">✕</button>
  <b>Prototipo</b>
  Estructura y datos reales. Faltan los años de cada obra y el material en alta
  — eso sale de los másters del estudio.
</aside>

<script>window.__ALMA__ = ${JSON.stringify({ palette: palette || null, back: back || null })};</script>
<script src="${up(depth)}prototype/fluid.js"></script>
<script src="${up(depth)}prototype/app.js"></script>
</body>
</html>
`;
}

function header(depth, current) {
  return `<header class="hdr">
  <a class="hdr__logo" href="${up(depth)}prototype/index.html">
    <img src="${asset('Asset/Asset 34.png', depth)}" alt="Alma Digital Studio">
    <span>Alma Digital</span>
  </a>
  <nav>
    <a href="${up(depth)}prototype/index.html"${current === 'landing' ? ' aria-current="page"' : ''}>Estudio</a>
    <a href="${up(depth)}prototype/obras.html"${current === 'obras' ? ' aria-current="page"' : ''}>Obras</a>
    <a href="${up(depth)}index.html">Sitio actual</a>
  </nav>
</header>`;
}

/* ── Landing: la puerta ─────────────────────────────────────────────────
   El índice sin esto era un catálogo sin entrada. La ameba, el título y el
   reel son lo que identifica al estudio; van primero.                      */
function buildLanding() {
  const d = 1;
  const featured = projects.slice(0, 8);

  const cards = featured.map(p => `      <a class="tcard" href="work/${p.slug}.html">
        <img loading="lazy" src="${asset(p.cover, d)}" alt="${esc(p.title)}">
        <span class="tcard__t"><b>${esc(p.title)}</b><span>${esc(p.format)}</span></span>
      </a>`).join('\n');

  const body = `${header(d, 'landing')}

<section id="hero" aria-label="Alma Digital Studio">
  <div class="hero-logo-wrap">
    <div class="hero-logo-stack">
      <img src="${asset('Asset/Logo Studio/Version 2/Logo.webp', d)}" alt="" class="hero-layer hero-layer--blob">
      <img src="${asset('Asset/Logo Studio/Version 2/Texto Logo 1.webp', d)}" alt="" class="hero-layer hero-layer--text1">
      <img src="${asset('Asset/Logo Studio/Version 2/Texto Logo 2.webp', d)}" alt="Alma Digital Studio" class="hero-layer hero-layer--text2">
    </div>
  </div>
  <div class="hero-cue"><span>Scroll</span><i></i></div>
</section>

<section id="reel-section" aria-labelledby="reel-title">
  <div class="sec-head">
    <h2 id="reel-title">El <em>reel</em></h2>
    <span class="sec-num">01</span>
  </div>
  <div class="reel-frame">
    <video muted loop playsinline autoplay preload="metadata"
           poster="${asset(projects[0].cover, d)}">
      <source src="${asset('Asset/Reel Portfolio/Reel Portfolio.mp4', d)}" type="video/mp4">
    </video>
    <div class="reel-frame__ui">
      <button class="reel-btn" type="button">Con sonido</button>
      <span class="reel-time">0:00 / 0:50</span>
    </div>
  </div>
</section>

<section id="work-teaser" aria-labelledby="teaser-title">
  <div class="sec-head">
    <h2 id="teaser-title">Obras <em>y encargos</em></h2>
    <span class="sec-num">02</span>
  </div>
  <div class="teaser-strip">
${cards}
  </div>
  <a class="teaser-all" href="obras.html">Ver las ${projects.length} obras <i>→</i></a>
</section>`;

  return shell({ title: 'Alma Digital Studio', depth: d, body });
}

/* ── Índice ─────────────────────────────────────────────────────────────── */
function buildIndex() {
  const rows = projects.map(p => `      <a class="row" href="work/${p.slug}.html"
        data-track="${p.track}" data-format-key="${p.formatKey}"
        data-title="${esc(p.title)}" data-format="${esc(p.format)}"
        data-cover="${asset(p.cover, 1)}" data-video="${p.video ? asset(p.video, 1) : ''}"
        data-palette='${JSON.stringify(p.palette || [])}' data-back="${p.back || ''}">
        <img class="row__thumb" loading="lazy" src="${asset(p.cover, 1)}" alt="">
        <span class="row__name">${esc(p.title)}</span>
        <span class="row__meta">${esc(p.format)}</span>
      </a>`).join('\n');

  const group = (label, dim, opts) => `      <div class="fgroup">
        <span class="fgroup__label">${label}</span>
${opts.map(([v, l]) => `        <button class="chip" data-dim="${dim}" data-val="${v}" aria-pressed="${v === 'all'}">${l}</button>`).join('\n')}
      </div>`;

  const body = `${header(1, 'obras')}
<main class="idx">
  <div class="idx__head">
    <h1 class="idx__title">Obras <em>y encargos</em></h1>
    <p class="idx__count">${projects.length} obras</p>
  </div>

  <div class="filters">
${group('Línea', 'track', TRACKS)}
${group('Formato', 'format', FORMATS)}
  </div>

  <div class="idx__body">
    <div class="list">
${rows}
      <p class="empty" hidden>No hay obras con esos filtros.</p>
    </div>

    <div class="preview" aria-hidden="true">
      <div class="preview__media">
        <img class="preview__img" alt="">
        <video class="preview__vid" muted loop playsinline></video>
      </div>
      <div class="preview__idle">Pasá por una obra</div>
      <div class="preview__cap"><h3></h3><p></p></div>
    </div>
  </div>
</main>`;

  return shell({ title: 'Obras — Alma Digital Studio', depth: 1, body });
}

/* ── Página de proyecto ─────────────────────────────────────────────────── */
function buildProject(p, next) {
  const d = 2;
  const specCell = (k, v) => `      <div class="spec__cell"><p class="spec__k">${k}</p><div class="spec__v">${v}</div></div>`;
  const cells = [];
  cells.push(specCell('Formato', `<p class="spec__v">${esc(p.format)}</p>`));
  cells.push(specCell('Línea', `<p class="spec__v">${p.track === 'studio' ? 'Obra propia' : 'Encargo'}</p>`));
  if (p.year) cells.push(specCell('Año', `<p class="spec__v">${esc(p.year)}</p>`));
  if (p.tech?.length) cells.push(specCell('Tecnología', `<p class="spec__v">${p.tech.map(esc).join(' · ')}</p>`));
  if (p.commissionedBy) cells.push(specCell('Encargado por', `<p class="spec__v">${esc(p.commissionedBy)}</p>`));
  if (p.presentedAt?.length) {
    cells.push(specCell('Sedes', `<ul>${p.presentedAt.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`));
  }

  const shots = p.photos.map((ph, i) => `      <figure class="shot${i === 0 ? ' shot--wide' : ''}">
        <img loading="lazy" src="${asset(ph, d)}" alt="${esc(p.title)} — imagen ${i + 1}">
        <figcaption class="shot__n">IMG · ${String(i + 1).padStart(3, '0')}</figcaption>
      </figure>`).join('\n');

  const body = `${header(d, 'project')}

<section class="hero">
  <img class="hero__bg" src="${asset(p.cover, d)}" alt="">
  <div class="hero__txt">
    <p class="hero__eyebrow">${p.track === 'studio' ? 'Studio Project' : 'Commission'}</p>
    <h1>${esc(p.title)}</h1>
    <p class="hero__fmt">${esc(p.format)}</p>
  </div>
</section>

<div class="sheet">

  <section class="block">
    <p class="block__label">Ficha técnica</p>
    <div class="spec">
${cells.join('\n')}
    </div>
  </section>

  <section class="block concept">
    <p class="block__label">Concepto</p>
    <div class="concept__body">
${p.body.map(t => `      <p>${esc(t)}</p>`).join('\n')}
    </div>
  </section>

${p.photos.length ? `  <section class="block">
    <p class="block__label">Registro — ${p.photos.length} ${p.photos.length === 1 ? 'imagen' : 'imágenes'}</p>
    <div class="gal">
${shots}
    </div>
  </section>` : ''}

${p.video || p.reelImage ? `  <section class="block">
    <p class="block__label">Reel</p>
    <div class="reel">
      ${p.video
        ? `<video src="${asset(p.video, d)}" muted loop playsinline autoplay preload="metadata"></video>`
        : `<img src="${asset(p.reelImage, d)}" alt="${esc(p.title)} — reel">`}
    </div>
  </section>` : ''}

  <section class="block">
    <div class="cols">
      <div>
        <p class="block__label">Créditos</p>
        <ul class="plain">${p.credits.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
      </div>
${p.presentedAt?.length ? `      <div>
        <p class="block__label">Historial de exhibición</p>
        <ul class="plain">${p.presentedAt.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      </div>` : ''}
    </div>
  </section>

  <a class="next" href="${next.slug}.html">
    <span class="next__k">Siguiente</span>
    <span class="next__n">${esc(next.title)}</span>
  </a>

</div>`;

  return shell({
    title: `${p.title} — Alma Digital Studio`,
    depth: d, palette: p.palette, back: p.back, body,
  });
}

/* ── Escritura ──────────────────────────────────────────────────────────── */
await mkdir(new URL('work/', HERE), { recursive: true });
await writeFile(new URL('index.html', HERE), buildLanding(), 'utf8');
await writeFile(new URL('obras.html', HERE), buildIndex(), 'utf8');

for (let i = 0; i < projects.length; i++) {
  const p = projects[i];
  const next = projects[(i + 1) % projects.length];
  await writeFile(new URL(`work/${p.slug}.html`, HERE), buildProject(p, next), 'utf8');
}

console.log(`landing + índice + ${projects.length} páginas generadas`);
console.log(meta.note);
