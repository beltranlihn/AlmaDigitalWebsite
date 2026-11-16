/* ═══════════════════════════════════════════════════════════════════════════
   Alma Digital Studio — interacción del sitio
   Header, formulario de contacto, reel con carga diferida, filtros del índice
   y lightbox de las fichas. Los textos llegan en window.__ALMA__ (los escribe
   src/build.mjs en el idioma de la página). El fluido y el cursor son módulos
   aparte y no se tocan desde acá.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CFG = window.__ALMA__ || {};
  var T = CFG.t || {};
  var root = document.documentElement;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var isMobile = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window) || window.innerWidth <= 767;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };

  /* El cursor del sistema sólo se oculta si el propio existe (css: html.has-cursor). */
  if (fine && document.getElementById('cursor-ring')) root.classList.add('has-cursor');

  /* ── Header: fondo esmerilado al dejar el tope ────────────────────────── */
  var hdr = document.getElementById('hdr');
  if (hdr) {
    var stuck = function () { hdr.classList.toggle('is-stuck', window.scrollY > 24); };
    window.addEventListener('scroll', stuck, { passive: true });
    stuck();
  }

  /* ── Formulario de contacto ───────────────────────────────────────────
     El modal queda abierto hasta saber si el envío salió bien. Si falla,
     avisa y conserva lo escrito. */
  (function () {
    var modal = document.getElementById('contact-modal');
    if (!modal) return;
    var form = $('#cm-form', modal), submit = $('#cm-submit', modal), feedback = $('#cm-feedback', modal);
    var nameEl = $('#cm-name', modal), emailEl = $('#cm-email', modal), msgEl = $('#cm-message', modal);
    var sub = $('.cm__sub', modal);
    var about = document.createElement('p');
    about.className = 'label'; about.hidden = true; about.style.marginBottom = '14px';
    form.parentNode.insertBefore(about, form);

    var sending = false, closeTimer = 0, opener = null, subject = '';

    function say(text, isError) {
      feedback.textContent = text || '';
      feedback.classList.toggle('is-error', !!isError);
    }
    function open(from) {
      opener = from || document.activeElement;
      subject = (from && from.getAttribute && from.getAttribute('data-contact-subject')) || '';
      about.hidden = !subject;
      about.textContent = subject ? T.modalAbout + ': ' + subject : '';
      modal.hidden = false;
      root.style.overflow = 'hidden';
      nameEl.focus();
    }
    function close() {
      if (sending) return;                 // con un envío en curso se perdería el resultado
      clearTimeout(closeTimer);
      modal.hidden = true;
      root.style.overflow = '';
      form.reset(); say('');
      submit.disabled = false; submit.textContent = T.modalSend;
      if (opener && opener.focus) opener.focus();
    }

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest && e.target.closest('[data-contact]');
      if (trigger) { e.preventDefault(); open(trigger); return; }
      if (e.target.closest && e.target.closest('[data-cm-close]')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;         // el foco no sale del modal
      var f = $$('a[href], button:not([disabled]), input, textarea', modal);
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      var name = nameEl.value.trim(), email = emailEl.value.trim(), message = msgEl.value.trim();
      if (!name || !email || !message) { say(T.modalFill, true); return; }
      if (!emailEl.checkValidity()) { say(T.modalBadEmail, true); emailEl.focus(); return; }

      sending = true;
      submit.disabled = true; submit.textContent = T.modalSending;
      say('');

      var ctrl = ('AbortController' in window) ? new AbortController() : null;
      var abort = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
      var payload = { name: name, email: email, message: message, language: CFG.lang };
      if (subject) { payload.project = subject; payload._subject = 'Alma Digital — ' + subject; }

      fetch(CFG.endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl ? ctrl.signal : undefined,
      }).then(function (res) { return res.ok; }, function () { return false; }).then(function (ok) {
        clearTimeout(abort);
        sending = false;
        if (ok) {
          form.reset();
          submit.textContent = T.modalSent;
          say(T.modalOk);
          closeTimer = setTimeout(close, 2800);
        } else {
          submit.disabled = false; submit.textContent = T.modalSend;
          say(T.modalFail + ' ' + CFG.email + '.', true);
        }
      });
    });
    if (sub) sub.style.userSelect = 'text';
  })();

  /* ── Reel del estudio ─────────────────────────────────────────────────
     El reel pesa 21 MB (7,5 MB la versión vertical) y el ancho de banda es lo
     que agotó los créditos de Netlify en octubre de 2026. Por eso NO se pide
     hasta que alguien lo quiere ver:

       modo "click" (por defecto)  se muestra el póster; el video se descarga
                                   recién al apretar reproducir.
       modo "view"                 arranca solo y en silencio cuando al menos
                                   un cuarto del video está en pantalla, y se
                                   pausa al salir (site.json → reelAutoplayOnView).

     En el sitio anterior el reel estaba dos pantallas más abajo y arrancaba al
     acercarse. Ahora es el segundo bloque: con ese criterio lo descargaría
     casi toda visita. */
  (function () {
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
    function play(el) { var p = el.play(); if (p && p.catch) p.catch(function () {}); }

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
      if ('IntersectionObserver' in window) { v._io = new IntersectionObserver(schedule, { threshold: [0, .25, .5] }); v._io.observe(v); }
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
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
    rf.innerHTML = '<button class="rf__close" type="button" aria-label="' + (T.reelClose || 'Close') + '">✕</button><video playsinline controls></video>';
    document.body.appendChild(rf);
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
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && fullOpen) closeReel(); });
  })();

  /* ── Reel de la ficha: se carga y arranca al acercarse, se pausa al salir ── */
  $$('.preel video[data-src]').forEach(function (v) {
    var loaded = false;
    function check() {
      var r = v.getBoundingClientRect();
      var seen = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      var near = seen >= r.height * 0.25;   // sin precarga: se pide cuando ya se ve
      if (near) {
        if (!loaded) { v.src = v.dataset.src; loaded = true; }
        if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      } else if (loaded && !v.paused) v.pause();
    }
    var timer = 0;
    function schedule() { clearTimeout(timer); timer = setTimeout(check, 100); }
    if ('IntersectionObserver' in window) { v._io = new IntersectionObserver(schedule, { threshold: [0, .25, .5] }); v._io.observe(v); }
    window.addEventListener('scroll', schedule, { passive: true });
    setTimeout(schedule, 0);
  });

  /* ── Paleta del fluido por obra (apagado: site.json → perProjectPalette) ── */
  function fluidReady(fn) {
    if (window.AlmaFluid) return fn(window.AlmaFluid);
    var t = setInterval(function () { if (window.AlmaFluid) { clearInterval(t); fn(window.AlmaFluid); } }, 60);
    setTimeout(function () { clearInterval(t); }, 8000);
  }
  if (CFG.palette) fluidReady(function (F) { F.setPalette(CFG.palette, CFG.back, 0.119); });

  /* ── Índice de obras: filtros y vista previa ──────────────────────────── */
  (function () {
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
          pVid.src = d.video;
          var p = pVid.play(); if (p && p.catch) p.catch(function () {});
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

    var state = { track: 'all', format: 'all' };
    var chips = $$('.chip');
    function apply() {
      var n = 0;
      rows.forEach(function (r) {
        var vis = (state.track === 'all' || r.dataset.track === state.track) &&
                  (state.format === 'all' || r.dataset.formatKey === state.format);
        r.hidden = !vis;
        if (vis) n++;
      });
      if (empty) empty.hidden = n > 0;
      if (count) count.textContent = n === 1 ? T.indexCountOne : String(T.indexCount).replace('{n}', n);
      if (current && current.hidden) clear();
    }
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        state[chip.dataset.dim] = chip.dataset.val;
        chips.forEach(function (c) { if (c.dataset.dim === chip.dataset.dim) c.setAttribute('aria-pressed', String(c === chip)); });
        apply();
      });
    });
    apply();
  })();

  /* ── Lightbox de la galería ───────────────────────────────────────────── */
  (function () {
    var shots = $$('.shot');
    if (!shots.length) return;
    var srcs = shots.map(function (s) { return $('img', s).src; });
    var lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', T.lbLabel);
    lb.innerHTML =
      '<img class="lb__img" alt="">' +
      '<button class="lb__nav lb__prev" type="button" aria-label="' + T.lbPrev + '">‹</button>' +
      '<button class="lb__nav lb__next" type="button" aria-label="' + T.lbNext + '">›</button>' +
      '<button class="lb__btn lb__close" type="button">' + T.lbClose + ' ✕</button>' +
      '<div class="lb__bar"><span class="lb__pos"></span>' +
      '<button class="lb__btn lb__zoom" type="button">' + T.lbZoom + '</button>' +
      '<span class="lb__hint">' + T.lbHint + '</span></div>';
    document.body.appendChild(lb);

    var img = $('.lb__img', lb), pos = $('.lb__pos', lb), zoomBtn = $('.lb__zoom', lb);
    var idx = 0, opener = null;
    function unzoom() { lb.classList.remove('zoom'); img.style.transform = ''; zoomBtn.textContent = T.lbZoom; }
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
      lb.classList.add('zoom'); zoomBtn.textContent = T.lbZoomOut;
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
    window.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    });
  })();

  /* ── Barra de revisión: comparar los dos temas ────────────────────────
     Sólo aparece en localhost y en las vistas previas de Netlify, nunca en
     el dominio publicado. */
  (function () {
    var h = location.hostname;
    if (!(h === 'localhost' || h === '127.0.0.1' || /\.netlify\.app$/.test(h))) return;
    var bar = document.createElement('div');
    bar.className = 'review';
    bar.innerHTML = '<span>Tema</span>' +
      '<button type="button" data-theme-set="aura">Aura</button>' +
      '<button type="button" data-theme-set="night">Night</button>';
    document.body.appendChild(bar);
    document.body.classList.add('has-review');
    function sync() {
      var cur = root.getAttribute('data-theme') || 'aura';
      $$('button', bar).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.themeSet === cur)); });
    }
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      root.setAttribute('data-theme', b.dataset.themeSet);
      try { sessionStorage.setItem('alma-theme', b.dataset.themeSet); } catch (err) {}
      sync();
    });
    sync();
  })();
})();
