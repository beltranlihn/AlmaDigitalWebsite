/* ═══════════════════════════════════════════════════════════════════════════
   Alma Digital Studio — interacción del sitio

   NAVEGACIÓN CONTINUA. Cada página es un HTML completo, pero al navegar dentro
   del sitio no se recarga: se pide el HTML de destino y se reemplazan sólo
   <header>, <main>, <footer> y el modal de contacto. El fluido (#fluid) y la
   ameba (#ameba-wrap) quedan vivos, así que el fondo no se corta y la ameba
   viaja de un lugar a otro. Si algo falla, se navega de la forma normal.

   Por eso el código está partido en dos:
     · lo GLOBAL se engancha una sola vez (contacto, navegación, barra de tema);
     · lo de PÁGINA se inicia en initPage() después de cada cambio y se
       desmonta en teardown() antes del siguiente (listeners, observers, nodos).

   Los textos llegan en window.__ALMA__ (los escribe src/build.mjs en el idioma
   de la página, y se actualizan en cada navegación). El fluido y el cursor son
   módulos aparte y no se tocan desde acá.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.documentElement;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window) || window.innerWidth <= 767;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  /* Carpeta de este script, absoluta: los import() relativos se resolverían contra
     la URL de la página, que cambia al navegar. */
  var scriptBase = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/[^\/]*$/, '') : '';
  function CFG() { return window.__ALMA__ || {}; }
  function T(k) { var t = CFG().t || {}; return t[k] || ''; }
  function play(el) { var p = el.play(); if (p && p.catch) p.catch(function () {}); }

  /* El cursor del sistema sólo se oculta si el propio existe (css: html.has-cursor). */
  if (fine && document.getElementById('cursor-ring')) root.classList.add('has-cursor');

  /* ── Ciclo de vida de la página ───────────────────────────────────────── */
  var life = null;
  function newLife() { return { ac: ('AbortController' in window) ? new AbortController() : null, nodes: [], obs: [], cleanups: [] }; }
  /* addEventListener que se desengancha solo al cambiar de página. */
  function on(target, type, fn, opts) {
    opts = opts || {};
    if (life.ac) opts.signal = life.ac.signal;
    target.addEventListener(type, fn, opts);
  }
  function observe(el, cb, opts) {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(cb, opts); io.observe(el); life.obs.push(io);
  }
  function teardown() {
    if (!life) return;
    if (life.ac) life.ac.abort();
    life.nodes.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    life.obs.forEach(function (o) { o.disconnect(); });
    life.cleanups.forEach(function (fn) { try { fn(); } catch (e) {} });
    root.style.overflow = '';
    life = null;
  }

  /* ── Header: fondo esmerilado al dejar el tope (global) ───────────────── */
  function stuck() { var h = document.getElementById('hdr'); if (h) h.classList.toggle('is-stuck', window.scrollY > 24); }
  window.addEventListener('scroll', stuck, { passive: true });

  /* ── Formulario de contacto (global, delegado) ────────────────────────
     El modal queda abierto hasta saber si el envío salió bien. Si falla,
     avisa y conserva lo escrito. Los elementos se buscan en el momento: el
     modal se reemplaza al cambiar de idioma. */
  var cm = { sending: false, timer: 0, opener: null, subject: '' };
  function say(text, isError) {
    var f = $('#cm-feedback'); if (!f) return;
    f.textContent = text || ''; f.classList.toggle('is-error', !!isError);
  }
  function openContact(from) {
    var m = document.getElementById('contact-modal'); if (!m) return;
    cm.opener = from || document.activeElement;
    cm.subject = (from && from.getAttribute && from.getAttribute('data-contact-subject')) || '';
    var about = $('#cm-about');
    if (about) { about.hidden = !cm.subject; about.textContent = cm.subject ? T('modalAbout') + ': ' + cm.subject : ''; }
    m.hidden = false;
    root.style.overflow = 'hidden';
    var n = $('#cm-name'); if (n) n.focus();
  }
  function closeContact(force) {
    var m = document.getElementById('contact-modal');
    if (!m || m.hidden) return;
    if (cm.sending && !force) return;      // con un envío en curso se perdería el resultado
    clearTimeout(cm.timer);
    m.hidden = true;
    root.style.overflow = '';
    var form = $('#cm-form'); if (form) form.reset();
    say('');
    var s = $('#cm-submit'); if (s) { s.disabled = false; s.textContent = T('modalSend'); }
    if (cm.opener && cm.opener.focus && document.contains(cm.opener)) cm.opener.focus();
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var trigger = e.target.closest('[data-contact]');
    if (trigger) { e.preventDefault(); openContact(trigger); return; }
    if (e.target.closest('[data-cm-close]')) closeContact(false);
  });
  document.addEventListener('keydown', function (e) {
    var m = document.getElementById('contact-modal');
    if (!m || m.hidden) return;
    if (e.key === 'Escape') { closeContact(false); return; }
    if (e.key !== 'Tab') return;           // el foco no sale del modal
    var f = $$('a[href], button:not([disabled]), input, textarea', m);
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.addEventListener('submit', function (e) {
    if (!e.target || e.target.id !== 'cm-form') return;
    e.preventDefault();
    if (cm.sending) return;
    var nameEl = $('#cm-name'), emailEl = $('#cm-email'), msgEl = $('#cm-message'), submit = $('#cm-submit');
    var name = nameEl.value.trim(), email = emailEl.value.trim(), message = msgEl.value.trim();
    if (!name || !email || !message) { say(T('modalFill'), true); return; }
    if (!emailEl.checkValidity()) { say(T('modalBadEmail'), true); emailEl.focus(); return; }

    cm.sending = true;
    submit.disabled = true; submit.textContent = T('modalSending');
    say('');

    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var abort = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    var payload = { name: name, email: email, message: message, language: CFG().lang };
    if (cm.subject) { payload.project = cm.subject; payload._subject = 'Alma Digital — ' + cm.subject; }

    fetch(CFG().endpoint, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (res) { return res.ok; }, function () { return false; }).then(function (ok) {
      clearTimeout(abort);
      cm.sending = false;
      var s = $('#cm-submit'), form = $('#cm-form');
      if (ok) {
        if (form) form.reset();
        if (s) s.textContent = T('modalSent');
        say(T('modalOk'));
        cm.timer = setTimeout(function () { closeContact(false); }, 2800);
      } else {
        if (s) { s.disabled = false; s.textContent = T('modalSend'); }
        say(T('modalFail') + ' ' + CFG().email + '.', true);
      }
    });
  });

  /* ══ LO DE CADA PÁGINA ══════════════════════════════════════════════════ */

  /* ── Reel del estudio ─────────────────────────────────────────────────
     El reel pesa 21 MB (7,5 MB la versión vertical) y el ancho de banda es lo
     que agotó los créditos de Netlify en octubre de 2026. Por eso NO se pide
     hasta que alguien lo quiere ver:

       modo "click" (por defecto)  se muestra el póster; el video se descarga
                                   recién al apretar reproducir.
       modo "view"                 arranca solo y en silencio cuando al menos
                                   un cuarto del video está en pantalla, y se
                                   pausa al salir (site.json → reelAutoplayOnView). */
  function initReel() {
    var v = document.getElementById('reel-video');
    if (!v) return;
    var wrap = v.closest('[data-reel]');
    var btn = wrap && $('[data-reel-sound]', wrap);
    var auto = wrap && wrap.getAttribute('data-reel') === 'view';

    if (isMobile) {                       // el teléfono nunca pide la versión de escritorio
      if (v.dataset.srcMobile) v.dataset.src = v.dataset.srcMobile;
      if (v.dataset.posterMobile) v.poster = v.dataset.posterMobile;
      if (wrap) wrap.classList.add('reel--vertical');
    }

    var loaded = false, fullOpen = false;
    function load() { if (!loaded) { v.src = v.dataset.src; loaded = true; } }

    if (auto) {
      var queued = false;
      var inView = function () {
        var r = v.getBoundingClientRect();
        var seen = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
        return seen >= r.height * 0.25;
      };
      var update = function () {
        queued = false;
        if (inView()) { load(); if (v.paused && !fullOpen) play(v); }
        else if (loaded && !v.paused) v.pause();
      };
      var schedule = function () { if (queued) return; queued = true; setTimeout(update, 80); };  // temporizador, no rAF
      observe(v, schedule, { threshold: [0, .25, .5] });
      on(window, 'scroll', schedule, { passive: true });
      on(window, 'resize', schedule, { passive: true });
      setTimeout(schedule, 0);
    }

    /* Teléfono: se reproduce en su lugar, con sonido y los controles del sistema. */
    if (isMobile) {
      var startMobile = function () {
        load(); v.muted = false; v.controls = true; play(v);
        wrap.classList.add('is-playing');
        if (btn) btn.hidden = true;
      };
      if (btn) btn.addEventListener('click', function (e) { e.stopPropagation(); startMobile(); });
      v.addEventListener('click', function () { if (!wrap.classList.contains('is-playing')) startMobile(); });
      return;
    }

    /* Escritorio: pantalla completa con sonido. */
    var rf = document.createElement('div');
    rf.className = 'rf';
    rf.innerHTML = '<button class="rf__close" type="button" aria-label="' + (T('reelClose') || 'Close') + '">✕</button><video playsinline controls></video>';
    document.body.appendChild(rf);
    life.nodes.push(rf);
    var rfVideo = $('video', rf);

    function openReel() {
      if (fullOpen) return;
      fullOpen = true;
      if (!v.paused) v.pause();
      rfVideo.src = v.dataset.src;
      rfVideo.muted = false; rfVideo.loop = true;
      var p = rfVideo.play();
      if (p && p.catch) p.catch(function () { rfVideo.muted = true; play(rfVideo); });
      rf.classList.add('is-open');
      root.style.overflow = 'hidden';
      $('.rf__close', rf).focus();
    }
    function closeReel() {
      if (!fullOpen) return;
      fullOpen = false;
      rf.classList.remove('is-open');
      rfVideo.pause(); rfVideo.removeAttribute('src'); rfVideo.load();
      root.style.overflow = '';
      if (btn) btn.focus();
    }
    if (btn) btn.addEventListener('click', function (e) { e.stopPropagation(); openReel(); });
    v.addEventListener('click', openReel);
    rf.addEventListener('click', function (e) { if (e.target !== rfVideo) closeReel(); });
    on(document, 'keydown', function (e) { if (e.key === 'Escape' && fullOpen) closeReel(); });
  }

  /* ── Reel de la ficha: se pide cuando ya se ve, se pausa al salir ─────── */
  function initProjectReels() {
    $$('.preel video[data-src]').forEach(function (v) {
      var loaded = false, timer = 0;
      function check() {
        if (!document.contains(v)) return;
        var r = v.getBoundingClientRect();
        var seen = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
        if (seen >= r.height * 0.25) {     // sin precarga: se pide cuando ya se ve
          if (!loaded) { v.src = v.dataset.src; loaded = true; }
          if (v.paused) play(v);
        } else if (loaded && !v.paused) v.pause();
      }
      function schedule() { clearTimeout(timer); timer = setTimeout(check, 100); }
      observe(v, schedule, { threshold: [0, .25, .5] });
      on(window, 'scroll', schedule, { passive: true });
      setTimeout(schedule, 0);
    });
  }

  /* ── Paleta del fluido por obra (apagado: site.json → perProjectPalette) ── */
  function fluidReady(fn) {
    if (window.AlmaFluid) return fn(window.AlmaFluid);
    var t = setInterval(function () { if (window.AlmaFluid) { clearInterval(t); fn(window.AlmaFluid); } }, 60);
    setTimeout(function () { clearInterval(t); }, 8000);
  }
  function initPalette() {
    var c = CFG();
    if (c.palette) fluidReady(function (F) { F.setPalette(c.palette, c.back, 0.119); });
    else if (window.AlmaFluid && window.AlmaFluid.__tinted) { window.AlmaFluid.reset(); }
    if (window.AlmaFluid) window.AlmaFluid.__tinted = !!c.palette;
  }

  /* ── Listas con vista previa: índice de obras y "lo que hacemos" ──────── */
  function initIndex() {
    var list = $('.list');
    if (!list) return;
    var rows = $$('.row', list);
    var pImg = $('.preview__img'), pVid = $('.preview__vid'), pCap = $('.preview__cap'), pIdle = $('.preview__idle');
    var pTitle = pCap && $('h3', pCap), pFmt = pCap && $('p', pCap);
    var empty = $('.empty'), count = $('.idx__count');
    var current = null, vidTimer = 0;

    function show(row) {
      if (current === row) return;
      current = row;
      var d = row.dataset;
      if (pImg) { pImg.src = d.cover; pImg.classList.add('on'); }
      if (pIdle) pIdle.classList.add('off');
      if (pCap) { pCap.classList.add('on'); pTitle.textContent = d.title; pFmt.textContent = d.format; }
      if (pVid) {
        pVid.classList.remove('on'); pVid.removeAttribute('src'); pVid.load();
        clearTimeout(vidTimer);
        if (d.video) vidTimer = setTimeout(function () {
          if (current !== row) return;
          pVid.src = d.video; play(pVid);
          pVid.classList.add('on');
        }, 320);
      }
      if (d.palette) fluidReady(function (F) { if (current === row) F.setPalette(JSON.parse(d.palette), d.back, 0.119); });
      rows.forEach(function (r) { r.classList.toggle('is-active', r === row); });
    }
    function clear() {
      var hadPalette = current && current.dataset.palette;
      current = null;
      clearTimeout(vidTimer);
      rows.forEach(function (r) { r.classList.remove('is-active'); });
      if (pVid) { pVid.classList.remove('on'); pVid.removeAttribute('src'); pVid.load(); }
      if (pImg) pImg.classList.remove('on');
      if (pCap) pCap.classList.remove('on');
      if (pIdle) pIdle.classList.remove('off');
      list.classList.remove('has-hover');
      if (hadPalette) fluidReady(function (F) { if (!current) F.reset(); });
    }
    if (fine) {
      rows.forEach(function (r) {
        r.addEventListener('pointerenter', function () { list.classList.add('has-hover'); show(r); });
        r.addEventListener('focus', function () { list.classList.add('has-hover'); show(r); });
      });
      list.addEventListener('pointerleave', clear);
    }

    var chips = $$('.chip');
    if (!chips.length) return;
    var state = { track: 'all', format: 'all' };
    function apply() {
      var n = 0;
      rows.forEach(function (r) {
        var vis = (state.track === 'all' || r.dataset.track === state.track) &&
                  (state.format === 'all' || r.dataset.formatKey === state.format);
        r.hidden = !vis;
        if (vis) n++;
      });
      if (empty) empty.hidden = n > 0;
      if (count) count.textContent = n === 1 ? T('indexCountOne') : T('indexCount').replace('{n}', n);
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(state[c.dataset.dim] === c.dataset.val)); });
      if (current && current.hidden) clear();
    }
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () { state[chip.dataset.dim] = chip.dataset.val; apply(); });
    });
    /* El landing enlaza a /work/?format=dome (y ?line=studio): llega ya filtrado. */
    try {
      var q = new URLSearchParams(location.search);
      [['format', 'format'], ['line', 'track']].forEach(function (pair) {
        var v = q.get(pair[0]);
        if (v && chips.some(function (c) { return c.dataset.dim === pair[1] && c.dataset.val === v; })) state[pair[1]] = v;
      });
    } catch (e) {}
    apply();
  }

  /* ── Lightbox de la galería ───────────────────────────────────────────── */
  function initLightbox() {
    var shots = $$('.shot');
    if (!shots.length) return;
    var srcs = shots.map(function (s) { return $('img', s).src; });
    var lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', T('lbLabel'));
    lb.innerHTML =
      '<img class="lb__img" alt="">' +
      '<button class="lb__nav lb__prev" type="button" aria-label="' + T('lbPrev') + '">‹</button>' +
      '<button class="lb__nav lb__next" type="button" aria-label="' + T('lbNext') + '">›</button>' +
      '<button class="lb__btn lb__close" type="button">' + T('lbClose') + ' ✕</button>' +
      '<div class="lb__bar"><span class="lb__pos"></span>' +
      '<button class="lb__btn lb__zoom" type="button">' + T('lbZoom') + '</button>' +
      '<span class="lb__hint">' + T('lbHint') + '</span></div>';
    document.body.appendChild(lb);
    life.nodes.push(lb);

    var img = $('.lb__img', lb), pos = $('.lb__pos', lb), zoomBtn = $('.lb__zoom', lb);
    var idx = 0, opener = null;
    function unzoom() { lb.classList.remove('zoom'); img.style.transform = ''; zoomBtn.textContent = T('lbZoom'); }
    function render() { img.src = srcs[idx]; pos.textContent = (idx + 1) + ' / ' + srcs.length; unzoom(); }
    function open(i, from) {
      idx = i; opener = from || null;
      lb.classList.add('open'); render();
      requestAnimationFrame(function () { lb.classList.add('shown'); });
      root.style.overflow = 'hidden';
      $('.lb__close', lb).focus();
    }
    function close() {
      lb.classList.remove('shown');
      setTimeout(function () { lb.classList.remove('open'); unzoom(); }, 300);
      root.style.overflow = '';
      if (opener) opener.focus();
    }
    function go(d) { idx = (idx + d + srcs.length) % srcs.length; render(); }
    function toggleZoom() {
      if (lb.classList.contains('zoom')) { unzoom(); return; }
      lb.classList.add('zoom'); zoomBtn.textContent = T('lbZoomOut');
    }
    shots.forEach(function (s, i) {
      s.setAttribute('tabindex', '0'); s.setAttribute('role', 'button');
      s.addEventListener('click', function () { open(i, s); });
      s.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i, s); } });
    });
    $('.lb__close', lb).addEventListener('click', close);
    $('.lb__prev', lb).addEventListener('click', function (e) { e.stopPropagation(); go(-1); });
    $('.lb__next', lb).addEventListener('click', function (e) { e.stopPropagation(); go(1); });
    zoomBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleZoom(); });
    img.addEventListener('click', function (e) { e.stopPropagation(); toggleZoom(); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    lb.addEventListener('pointermove', function (e) {
      if (!lb.classList.contains('zoom')) return;
      var mx = (e.clientX / window.innerWidth - 0.5) * -1, my = (e.clientY / window.innerHeight - 0.5) * -1;
      img.style.transform = 'translate(' + (mx * 34) + '%,' + (my * 30) + '%)';
    }, { passive: true });
    on(window, 'keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    });
  }

  /* ── Tarjetas de obras destacadas ─────────────────────────────────────
     Con mouse: se inclinan hacia donde entra el cursor (con un poco de peso) y,
     tras una breve espera, reproducen su reel adentro. Un cursor de paso no
     descarga nada (los reels pesan 0,6 a 4 MB). */
  function initCards() {
    if (!fine) return;
    $$('.wcard').forEach(function (card) {
      var v = $('.wcard__v', card), img = $('img', card), timer = 0;
      card.addEventListener('pointerenter', function () {
        if (!v) return;
        clearTimeout(timer);
        timer = setTimeout(function () {
          if (!document.contains(card)) return;
          if (!v.getAttribute('src')) v.src = v.dataset.src;
          play(v);
          card.classList.add('is-playing');
        }, 320);
      });
      if (!reduce) card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        card.style.transform = 'perspective(1100px) rotateX(' + (-y * 5).toFixed(2) + 'deg) rotateY(' + (x * 6).toFixed(2) + 'deg)';
        if (img) img.style.transform = 'scale(1.08) translate(' + (-x * 14).toFixed(1) + 'px,' + (-y * 10).toFixed(1) + 'px)';
      });
      card.addEventListener('pointerleave', function () {
        clearTimeout(timer);
        card.classList.remove('is-playing');
        if (v) v.pause();
        card.style.transform = ''; if (img) img.style.transform = '';
      });
    });
  }

  /* ── Franja de credenciales: botón de pausa (WCAG 2.2.2) ──────────────── */
  function initCreds() {
    var b = $('.creds__pause'); if (!b) return;
    var sec = b.closest('.creds');
    b.addEventListener('click', function () {
      var paused = sec.classList.toggle('is-paused');
      b.setAttribute('aria-pressed', String(paused));
      b.textContent = paused ? b.dataset.play : b.dataset.pause;
    });
  }

  /* ── Partículas en la cabecera de las obras principales ───────────────
     js/particles.js es un módulo aparte (el único que usa Three.js) y se pide
     sólo en las fichas que lo declaran, así el resto del sitio no lo descarga.
     Al cambiar de página se desmonta para soltar su contexto WebGL. */
  function initParticles() {
    var hero = $('.phero[data-particles]');
    var stage = hero && $('.phero__stage', hero);
    if (!stage || !scriptBase) return;
    var mine = life;
    import(scriptBase + 'particles.js').then(function (m) {
      if (life !== mine || !document.contains(hero)) return;   // ya se navegó a otra página
      var handle = m.mount(stage, {
        formation: hero.getAttribute('data-particles'),
        colors: (hero.getAttribute('data-colors') || '').split(',').filter(Boolean),
        hero: hero,
      });
      if (!handle) return;
      hero.classList.add('is-live');
      mine.cleanups.push(handle.dispose);
    }).catch(function () {});                                   // sin CDN o sin WebGL: queda la foto
  }

  /* ── El mundo interior (página de prueba) ─────────────────────────────
     js/world.js es un módulo aparte (usa Three.js, como las partículas) y se
     pide sólo en esa página. El HTML llega como lista de obras (world--flat);
     acá se arma el escenario y, si el 3D no arranca, se vuelve a la lista. */
  function initWorld() {
    var sec = $('[data-world]');
    if (!sec || !scriptBase) return;
    var mine = life;
    function flat() { if (document.contains(sec)) sec.classList.add('world--flat'); }
    sec.classList.remove('world--flat');
    import(scriptBase + 'world.js').then(function (m) {
      if (life !== mine || !document.contains(sec)) return;     // ya se navegó a otra página
      var handle = m.mount(sec, {
        reduce: reduce,
        coarse: window.matchMedia('(pointer: coarse)').matches,
        sound: window.AlmaSound,
        navigate: function (href) {
          try { go(new URL(href, location.href), true); } catch (e) { location.href = href; }
        },
      });
      if (!handle) { flat(); return; }
      sec.classList.add('is-live');
      mine.cleanups.push(handle.dispose);
    }).catch(flat);
  }

  /* ── Sonido: profundidad de la página ─────────────────────────────────
     js/sound.js es global y sigue sonando al navegar. Acá sólo se le dice qué
     tan "hondo" está la página (la ficha de una obra es el fondo) y se pone al
     día el botón del menú, que se reemplaza en cada cambio. */
  function pageDepth() {
    var c = document.body.classList;
    return c.contains('pg-project') ? 1 : c.contains('pg-index') ? 0.25 : 0;
  }
  function initSound() {
    var S = window.AlmaSound; if (!S) return;
    S.sync();
    S.setDepth(pageDepth());
  }

  function initPage() {
    life = newLife();
    initReel(); initProjectReels(); initPalette(); initIndex(); initLightbox(); initCards(); initCreds(); initParticles(); initSound(); initWorld();
    if (window.AlmaAmeba && window.AlmaAmeba.showBreath) window.AlmaAmeba.showBreath();
    stuck();
  }

  /* ══ NAVEGACIÓN CONTINUA ════════════════════════════════════════════════ */
  var cache = {};                          // HTML de páginas ya pedidas
  var navToken = 0, vtRunning = false;
  var currentKey = location.pathname + location.search;

  /* ¿Es un enlace a otra página del sitio que se puede cambiar sin recargar? */
  function eligible(a) {
    if (!a || a.target || a.hasAttribute('download')) return null;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#') return null;
    var u;
    try { u = new URL(a.href, location.href); } catch (e) { return null; }
    if (u.origin !== location.origin) return null;
    if (!/(\/|\.html)$/.test(u.pathname) || u.pathname.indexOf('/prototype/') >= 0) return null;
    var legacy = CFG().legacy || [];       // páginas hechas a mano (soul-charger.html): carga normal
    for (var i = 0; i < legacy.length; i++) if (u.pathname.slice(-legacy[i].length - 1) === '/' + legacy[i]) return null;
    return u;
  }
  function load(u) {
    var key = u.pathname;
    if (cache[key]) return Promise.resolve(cache[key]);
    return fetch(u.pathname, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.text();
    }).then(function (html) { cache[key] = html; return html; });
  }

  /* Lleva al <head> lo que cambia de una página a otra. */
  function syncHead(doc) {
    document.title = doc.title;
    root.lang = doc.documentElement.lang || root.lang;
    var copy = function (sel, attr) {
      var a = document.head.querySelector(sel), b = doc.head.querySelector(sel);
      if (a && b) a.setAttribute(attr, b.getAttribute(attr));
    };
    copy('meta[name="description"]', 'content');
    copy('link[rel="canonical"]', 'href');
    $$('meta[property^="og:"], meta[name^="twitter:"]', doc.head).forEach(function (b) {
      var key = b.getAttribute('property') ? 'property' : 'name';
      var a = document.head.querySelector('meta[' + key + '="' + b.getAttribute(key) + '"]');
      if (a) a.setAttribute('content', b.getAttribute('content'));
    });
    $$('link[rel="alternate"][hreflang], script[type="application/ld+json"]', document.head).forEach(function (n) { n.parentNode.removeChild(n); });
    $$('link[rel="alternate"][hreflang], script[type="application/ld+json"]', doc.head).forEach(function (n) {
      document.head.appendChild(document.importNode(n, true));
    });
  }
  function swap(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var next = doc.getElementById('main');
    if (!next) throw new Error('página sin <main>');
    ['#hdr', '#main', '.ftr', '#contact-modal'].forEach(function (sel) {
      var a = $(sel), b = doc.querySelector(sel);
      if (a && b) a.parentNode.replaceChild(document.importNode(b, true), a);
    });
    var review = document.body.classList.contains('has-review');
    document.body.className = doc.body.className + (review ? ' has-review' : '');
    syncHead(doc);
    var data = doc.getElementById('alma-data');
    if (data) { try { window.__ALMA__ = JSON.parse(data.textContent); } catch (e) {} }
  }
  function scrollNow(y) {
    try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); }
    catch (e) { root.style.scrollBehavior = 'auto'; window.scrollTo(0, y); root.style.scrollBehavior = ''; }
  }
  function clearVT() {
    vtRunning = false;
    $$('[data-vt]').forEach(function (el) { el.style.viewTransitionName = ''; el.removeAttribute('data-vt'); });
  }

  /* ── Zambullida ───────────────────────────────────────────────────────
     Entrar a una obra es sumergirse: el agua sube y tapa la pantalla, la página
     cambia por debajo y el agua se aclara. Salir es volver a la superficie: el
     agua aparece, la página cambia y el agua baja. Entre dos obras no hay
     zambullida (ya se está abajo). El aspecto está en css/site.css (.dive).
     Devuelve covered (promesa: ya tapa todo), reveal() y cancel(). */
  var WAVE = '<path d="M0 40C120 12 240 12 360 40S600 68 720 40S960 12 1080 40S1320 68 1440 40V80H0Z"/></svg>';
  function isWork(path) { return /\/work\/(?!index\.html$)[^\/]+\.html$/.test(path); }
  function water(mode) {
    var el = document.createElement('div'), bubbles = '';
    el.className = 'dive dive--' + mode;
    el.setAttribute('aria-hidden', 'true');
    if (mode === 'dive') for (var i = 0; i < 14; i++) {
      bubbles += '<i style="left:' + (4 + Math.random() * 92).toFixed(1) + '%;--s:' + (4 + Math.random() * 11).toFixed(1) +
        'px;--d:' + (Math.random() * 0.5).toFixed(2) + 's;--t:' + (0.9 + Math.random() * 0.8).toFixed(2) + 's"></i>';
    }
    var svg = '<svg viewBox="0 0 1440 80" preserveAspectRatio="none" class="dive__wave';
    el.innerHTML = '<div class="dive__water">' + svg + ' dive__wave--back">' + WAVE + svg + '">' + WAVE +
      '<div class="dive__body"></div></div><div class="dive__bubbles">' + bubbles + '</div>';
    document.body.appendChild(el);
    var body = el.firstChild, OUT = 'translateY(112%)', IN = 'translateY(0)';
    /* Si las animaciones están frenadas (pestaña en segundo plano), el temporizador evita que la navegación se cuelgue. */
    function done(anim, ms) {
      return Promise.race([anim.finished.catch(function () {}), new Promise(function (r) { setTimeout(r, ms + 400); })]);
    }
    function remove() { if (el.parentNode) el.parentNode.removeChild(el); }
    var covered = mode === 'dive'
      ? done(body.animate([{ transform: OUT }, { transform: IN }], { duration: 480, easing: 'cubic-bezier(.5, 0, .25, 1)', fill: 'forwards' }), 480)
      : done(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out', fill: 'forwards' }), 240);
    return {
      covered: covered,
      cancel: remove,
      reveal: function () {
        var a = mode === 'dive'
          ? el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 620, easing: 'cubic-bezier(.3, 0, .3, 1)', fill: 'forwards' })
          : body.animate([{ transform: IN }, { transform: OUT }], { duration: 640, easing: 'cubic-bezier(.6, 0, .3, 1)', fill: 'forwards' });
        done(a, 640).then(remove);
      },
    };
  }
  window.addEventListener('pageshow', function () {       // al volver con el botón atrás del navegador no queda agua colgada
    $$('.dive').forEach(function (n) { n.parentNode.removeChild(n); });
  });

  /* push=true: navegación nueva (arriba de todo). push=false: atrás/adelante (vuelve a su scroll). */
  function go(u, push, y) {
    var token = ++navToken;
    var url = u.pathname + u.search + u.hash;
    closeContact(true);
    /* "Abajo" es la ficha de una obra y también el interior del mundo de prueba
       (html.is-under): entre dos lugares de abajo no hay agua. Al volver con
       "atrás" a ese mundo ya recorrido, tampoco. */
    var deep = document.body.classList.contains('pg-project') || root.classList.contains('is-under');
    var deeper = isWork(u.pathname) ||
      (!push && /\/inner-world\.html$/.test(u.pathname) && (y || 0) > window.innerHeight * 0.6);
    var mode = (deep === deeper || reduce || document.hidden || !root.animate) ? '' : (deeper ? 'dive' : 'surface');
    var w = mode ? water(mode) : null;
    if (mode && window.AlmaSound) {
      window.AlmaSound.splash(mode);
      if (deeper) window.AlmaSound.setDepth(1, 0.7);      // se ensordece mientras el agua sube
    }
    Promise.all([load(u), w ? w.covered : null]).then(function (loaded) {
      var html = loaded[0];
      if (token !== navToken) { if (w) w.cancel(); return; }
      var from = window.AlmaAmeba ? window.AlmaAmeba.rect() : null;
      var useVT = !w && !!document.startViewTransition && !reduce;
      var run = function () {
        if (push) {
          history.replaceState({ alma: true, y: window.scrollY }, '');
          history.pushState({ alma: true, y: 0 }, '', url);   // antes de insertar: las rutas relativas del HTML nuevo se resuelven contra esta URL
        }
        teardown();
        swap(html);
        /* El mundo de prueba llega como lista corta y pasa a ser una sección alta: se arma
           antes de reponer el scroll, o al volver con "atrás" quedaría más arriba de donde estaba. */
        var w3d = scriptBase && $('[data-world]');
        if (w3d) w3d.classList.remove('world--flat');
        currentKey = location.pathname + location.search;
        scrollNow(push ? 0 : (y || 0));
        initPage();
        if (window.AlmaAmeba) window.AlmaAmeba.refresh(!useVT, from);
        var m = document.getElementById('main');
        if (m) {
          m.setAttribute('tabindex', '-1');
          try { m.focus({ preventScroll: true }); } catch (e) {}
          if (!useVT && !reduce && !w) { m.classList.add('is-entering'); setTimeout(function () { m.classList.remove('is-entering'); }, 700); }
        }
      };
      if (w) { run(); w.reveal(); }
      else if (useVT) {
        vtRunning = true;
        try { var tr = document.startViewTransition(run); tr.finished.then(clearVT, clearVT); }
        catch (e) { clearVT(); run(); }
      } else run();
    }).catch(function () { location.href = url; });       // cualquier problema: navegación normal
  }

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  try { history.replaceState({ alma: true, y: window.scrollY }, ''); } catch (e) {}

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    var u = eligible(a);
    if (!u) return;
    if (u.pathname + u.search === currentKey) {
      if (u.hash) return;                  // ancla dentro de la misma página: lo resuelve el navegador
      e.preventDefault(); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      return;
    }
    e.preventDefault();
    go(u, true);
  });
  window.addEventListener('popstate', function (e) {
    var key = location.pathname + location.search;
    if (key === currentKey) return;        // sólo cambió el ancla
    go(new URL(location.href), false, (e.state && e.state.y) || 0);
  });
  /* Al posar el cursor (o tocar) un enlace interno se pide su página: el clic ya la encuentra lista. */
  var preTimer = 0;
  function prefetch(e) {
    var a = e.target.closest && e.target.closest('a[href]');
    var u = eligible(a);
    if (!u || cache[u.pathname] || u.pathname + u.search === currentKey) return;
    clearTimeout(preTimer);
    preTimer = setTimeout(function () { load(u).catch(function () {}); }, 120);
  }
  document.addEventListener('pointerover', prefetch, { passive: true });
  document.addEventListener('touchstart', prefetch, { passive: true });

  /* ── Transición de portada a ficha ────────────────────────────────────
     Al hacer clic en una obra, su imagen visible toma el nombre que en la
     ficha tiene la foto de cabecera (css: view-transition-name: work-cover),
     y el navegador anima una hacia la otra. Va en captura: tiene que quedar
     puesto antes de que arranque la navegación. Sin soporte, no pasa nada. */
  if (window.CSS && CSS.supports && CSS.supports('view-transition-name', 'none')) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a.wcard, a.row');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      if (!vtRunning) clearVT();
      var img = $('img', a);
      // En el índice de escritorio la miniatura está oculta: se usa la vista previa, si muestra esta obra.
      var prev = $('.preview__img.on');
      if (a.classList.contains('row') && prev && a.classList.contains('is-active')) img = prev;
      if (!img || !img.getClientRects().length) return;
      img.style.viewTransitionName = 'work-cover';
      img.setAttribute('data-vt', '');
    }, true);
    window.addEventListener('pageshow', function () { if (!vtRunning) clearVT(); });
  }

  /* ── Barra de revisión: comparar los dos temas (global) ───────────────
     Sólo aparece en localhost y en las vistas previas de Netlify, nunca en
     el dominio publicado. */
  (function () {
    var h = location.hostname;
    if (!(h === 'localhost' || h === '127.0.0.1' || /\.netlify\.app$/.test(h))) return;
    var bar = document.createElement('div');
    bar.className = 'review';
    bar.innerHTML = '<span>Tema</span>' +
      '<button type="button" data-theme-set="aura">Aura</button>' +
      '<button type="button" data-theme-set="night">Night</button>' +
      (CFG().world ? '<button type="button" data-review-world>Mundo 3D</button>' : '');
    document.body.appendChild(bar);
    document.body.classList.add('has-review');
    function sync() {
      var cur = root.getAttribute('data-theme') || 'aura';
      $$('button[data-theme-set]', bar).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.themeSet === cur)); });
    }
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-review-world')) {           // acceso a la página de prueba, en el idioma en que se está
        go(new URL((CFG().lang === 'es' ? '../es/' : '../') + 'inner-world.html', scriptBase), true);
        return;
      }
      root.setAttribute('data-theme', b.dataset.themeSet);
      try { sessionStorage.setItem('alma-theme', b.dataset.themeSet); } catch (err) {}
      sync();
    });
    sync();
  })();

  initPage();
})();
