/* ═══════════════════════════════════════════════════════════════════════════
   Alma Digital — prototipo de catálogo
   Cursor, fluido reactivo, filtros del índice y lightbox de galería.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var fine = window.matchMedia('(pointer: fine)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Cursor: anillo + punto, con lerp ─────────────────────────────────── */
  if (fine) {
    var ring = document.createElement('div'); ring.className = 'cur-ring';
    var dot = document.createElement('div'); dot.className = 'cur-dot';
    document.body.appendChild(ring); document.body.appendChild(dot);
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    }, { passive: true });
    (function tick() {
      rx += (mx - rx) * 0.17; ry += (my - ry) * 0.17;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      requestAnimationFrame(tick);
    })();
    var hoverSel = 'a,button,.row,.shot,.chip';
    document.addEventListener('pointerover', function (e) {
      if (e.target.closest && e.target.closest(hoverSel)) ring.classList.add('big');
    });
    document.addEventListener('pointerout', function (e) {
      if (e.target.closest && e.target.closest(hoverSel)) ring.classList.remove('big');
    });
  }

  /* ── Fluido: paleta de la obra + inyección al hacer scroll ────────────── */
  var fluidReady = function (fn) {
    if (window.AlmaFluid) return fn(window.AlmaFluid);
    var t = setInterval(function () {
      if (window.AlmaFluid) { clearInterval(t); fn(window.AlmaFluid); }
    }, 60);
    setTimeout(function () { clearInterval(t); }, 8000);
  };

  var PAGE = window.__ALMA__ || {};

  fluidReady(function (F) {
    if (PAGE.palette) F.setPalette(PAGE.palette, PAGE.back, 0.119);

    // Idea nº4 de la propuesta: el scroll inyecta fluido proporcional a la velocidad.
    if (reduce) return;
    var last = scrollY, acc = 0, ticking = false;
    addEventListener('scroll', function () {
      var d = scrollY - last; last = scrollY;
      acc += Math.abs(d);
      if (ticking || acc < 90) return;
      ticking = true;
      requestAnimationFrame(function () {
        var force = Math.max(-0.055, Math.min(0.055, d * 0.0016));
        F.push(0.14 + Math.random() * 0.72, 0.5 + (Math.random() - 0.5) * 0.5, 0, force);
        acc = 0; ticking = false;
      });
    }, { passive: true });
  });

  /* ── Hero: la ameba ───────────────────────────────────────────────────
     Respiración por capa + hover pixel-perfect + press. Los valores son los
     de index.html: es la identidad del estudio, no se reinterpreta.         */
  (function () {
    var wrap = document.querySelector('.hero-logo-wrap');
    if (!wrap) return;
    var stack = wrap.querySelector('.hero-logo-stack');

    /* Hover pixel-perfect: sólo cuenta como hover si el puntero está sobre
       píxel con contenido, no sobre el rectángulo de la imagen. */
    var off = document.createElement('canvas');
    var ctx = off.getContext('2d', { willReadFrequently: true });
    var iw = 0, ih = 0, rect = null, lastHit = 0;
    var hit = new Image();
    hit.src = stack.querySelector('.hero-layer--blob').getAttribute('src');
    hit.onload = function () {
      iw = hit.naturalWidth; ih = hit.naturalHeight;
      off.width = iw; off.height = ih;
      ctx.drawImage(hit, 0, 0);
    };
    function measure() { rect = stack.getBoundingClientRect(); }
    measure();
    addEventListener('resize', measure, { passive: true });
    addEventListener('scroll', measure, { passive: true });

    if (fine) {
      wrap.addEventListener('pointermove', function (e) {
        if (!iw || !rect) return;
        var now = performance.now();
        if (now - lastHit < 33) return;   // ~30fps
        lastHit = now;
        var x = Math.round((e.clientX - rect.left) / rect.width * iw);
        var y = Math.round((e.clientY - rect.top) / rect.height * ih);
        if (x < 0 || x >= iw || y < 0 || y >= ih) { wrap.classList.remove('logo-hover'); return; }
        var px = ctx.getImageData(x, y, 1, 1).data;
        var lum = (px[0] + px[1] + px[2]) / 3;
        wrap.classList.toggle('logo-hover', px[3] > 24 && lum > 26);
      }, { passive: true });
      wrap.addEventListener('pointerleave', function () { wrap.classList.remove('logo-hover'); });
    }

    var CFG = [
      { sel: '.hero-layer--blob',  amp: 0.025, period: 7200, phase: 0,              hScale: 1.030, hY: 0 },
      { sel: '.hero-layer--text1', amp: 0.016, period: 5500, phase: Math.PI * 0.65, hScale: 1.055, hY: -5 },
      { sel: '.hero-layer--text2', amp: 0.011, period: 9100, phase: Math.PI * 1.35, hScale: 1.040, hY: -10 },
    ];
    var layers = CFG.map(function (c) {
      return { el: wrap.querySelector(c.sel), amp: c.amp, w: 2 * Math.PI / c.period,
               phase: c.phase, hScale: c.hScale, hY: c.hY, th: 0 };
    }).filter(function (l) { return l.el; });

    var pressed = false, pressT = 0;
    ['pointerdown'].forEach(function (ev) { wrap.addEventListener(ev, function () { pressed = true; }); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
      wrap.addEventListener(ev, function () { pressed = false; });
    });

    if (reduce) return;
    var t0 = performance.now();
    (function tick(now) {
      var t = now - t0;
      pressT += ((pressed ? 1 : 0) - pressT) * (pressed ? 0.09 : 0.055);
      var hovered = wrap.classList.contains('logo-hover');
      layers.forEach(function (l) {
        l.th += ((hovered ? 1 : 0) - l.th) * 0.055;
        var sc = (1 + l.amp * Math.sin(l.w * t + l.phase))
               * (1 + (l.hScale - 1) * l.th)
               * (1 + 0.16 * pressT);
        l.el.style.transform = 'scale(' + sc.toFixed(5) + ') translateY(' + (l.hY * l.th).toFixed(2) + 'px)';
      });
      requestAnimationFrame(tick);
    })(t0);
  })();

  /* ── Reel del estudio ─────────────────────────────────────────────────── */
  (function () {
    var frame = document.querySelector('.reel-frame');
    if (!frame) return;
    var v = frame.querySelector('video');
    var btn = frame.querySelector('.reel-btn');
    var time = frame.querySelector('.reel-time');

    function label() { btn.textContent = v.muted ? 'Con sonido' : 'Silenciar'; }
    label();
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      v.muted = !v.muted;
      if (!v.muted) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      label();
    });

    function fmt(s) {
      if (!isFinite(s)) return '--:--';
      var m = Math.floor(s / 60), r = Math.floor(s % 60);
      return m + ':' + String(r).padStart(2, '0');
    }
    v.addEventListener('timeupdate', function () {
      time.textContent = fmt(v.currentTime) + ' / ' + fmt(v.duration);
    });

    // El reel arranca solo (autoplay + muted). El observer sólo lo pausa cuando
    // sale de vista: si se dependiera de él para *arrancar*, cualquier entorno
    // donde no entregue callbacks deja el reel congelado en el póster.
    function play() { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    v.addEventListener('canplay', play, { once: true });
    play();

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.isIntersecting ? play() : v.pause(); });
      }, { threshold: 0.15 });
      io.observe(frame);
      frame._io = io;   // referencia retenida: un observer sin referencia puede recolectarse
    }
  })();

  /* ── Aviso de prototipo ───────────────────────────────────────────────── */
  var proto = document.querySelector('.proto');
  if (proto) {
    try { if (sessionStorage.getItem('alma-proto-hid') === '1') proto.hidden = true; } catch (e) {}
    var pb = proto.querySelector('button');
    if (pb) pb.addEventListener('click', function () {
      proto.hidden = true;
      try { sessionStorage.setItem('alma-proto-hid', '1'); } catch (e) {}
    });
  }

  /* ── ÍNDICE ───────────────────────────────────────────────────────────── */
  var list = document.querySelector('.list');
  if (list) {
    var rows = [].slice.call(list.querySelectorAll('.row'));
    var pImg = document.querySelector('.preview__img');
    var pVid = document.querySelector('.preview__vid');
    var pCap = document.querySelector('.preview__cap');
    var pIdle = document.querySelector('.preview__idle');
    var pTitle = pCap && pCap.querySelector('h3');
    var pFmt = pCap && pCap.querySelector('p');
    var empty = document.querySelector('.empty');

    var current = null, vidTimer = 0;

    function show(row) {
      if (current === row) return;
      current = row;
      var d = row.dataset;
      if (pImg) { pImg.src = d.cover; pImg.classList.add('on'); }
      if (pIdle) pIdle.classList.add('off');
      if (pCap) {
        pCap.classList.add('on');
        if (pTitle) pTitle.textContent = d.title;
        if (pFmt) pFmt.textContent = d.format;
      }
      if (pVid) {
        pVid.classList.remove('on');
        pVid.removeAttribute('src'); pVid.load();
        clearTimeout(vidTimer);
        if (d.video) vidTimer = setTimeout(function () {
          if (current !== row) return;
          pVid.src = d.video;
          var p = pVid.play();
          if (p && p.catch) p.catch(function () {});
          pVid.classList.add('on');
        }, 260);
      }
      fluidReady(function (F) {
        if (current !== row) return;
        F.setPalette(JSON.parse(d.palette), d.back, 0.119);
      });
      rows.forEach(function (r) { r.classList.toggle('is-active', r === row); });
    }

    function clear() {
      current = null;
      clearTimeout(vidTimer);
      rows.forEach(function (r) { r.classList.remove('is-active'); });
      if (pVid) { pVid.classList.remove('on'); pVid.removeAttribute('src'); pVid.load(); }
      if (pImg) pImg.classList.remove('on');
      if (pCap) pCap.classList.remove('on');
      if (pIdle) pIdle.classList.remove('off');
      list.classList.remove('has-hover');
      fluidReady(function (F) { if (!current) F.reset(); });
    }

    if (fine) {
      rows.forEach(function (r) {
        r.addEventListener('pointerenter', function () { list.classList.add('has-hover'); show(r); });
        r.addEventListener('focus', function () { list.classList.add('has-hover'); show(r); });
      });
      list.addEventListener('pointerleave', clear);
    }

    /* Filtros */
    var state = { track: 'all', format: 'all' };
    var chips = [].slice.call(document.querySelectorAll('.chip'));

    function apply() {
      var n = 0;
      rows.forEach(function (r) {
        var okT = state.track === 'all' || r.dataset.track === state.track;
        var okF = state.format === 'all' || r.dataset.formatKey === state.format;
        var vis = okT && okF;
        r.hidden = !vis;
        if (vis) n++;
      });
      if (empty) empty.hidden = n > 0;
      var c = document.querySelector('.idx__count');
      if (c) c.textContent = n + (n === 1 ? ' obra' : ' obras');
      if (current && current.hidden) clear();
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var dim = chip.dataset.dim, val = chip.dataset.val;
        state[dim] = val;
        chips.forEach(function (c) {
          if (c.dataset.dim === dim) c.setAttribute('aria-pressed', String(c === chip));
        });
        apply();
      });
    });
    apply();
  }

  /* ── Lightbox de galería ──────────────────────────────────────────────── */
  var shots = [].slice.call(document.querySelectorAll('.shot'));
  if (shots.length) {
    var srcs = shots.map(function (s) { return s.querySelector('img').src; });
    var lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Galería ampliada');
    lb.innerHTML =
      '<img class="lb__img" alt="">' +
      '<button class="lb__nav lb__prev" aria-label="Anterior">‹</button>' +
      '<button class="lb__nav lb__next" aria-label="Siguiente">›</button>' +
      '<button class="lb__btn lb__close" aria-label="Cerrar">Cerrar ✕</button>' +
      '<div class="lb__bar"><span class="lb__pos"></span>' +
      '<button class="lb__btn lb__zoom">Zoom</button>' +
      '<span>← → para navegar · Esc para salir</span></div>';
    document.body.appendChild(lb);

    var lbImg = lb.querySelector('.lb__img');
    var lbPos = lb.querySelector('.lb__pos');
    var lbZoom = lb.querySelector('.lb__zoom');
    var idx = 0, opener = null;

    function render() {
      lbImg.src = srcs[idx];
      lbPos.textContent = 'IMG ' + String(idx + 1).padStart(3, '0') + ' / ' + String(srcs.length).padStart(3, '0');
      unzoom();
    }
    function open(i, from) {
      idx = i; opener = from || null;
      lb.classList.add('open');
      render();
      requestAnimationFrame(function () { lb.classList.add('shown'); });
      document.documentElement.style.overflow = 'hidden';
      lb.querySelector('.lb__close').focus();
    }
    function close() {
      lb.classList.remove('shown');
      setTimeout(function () { lb.classList.remove('open'); unzoom(); }, 300);
      document.documentElement.style.overflow = '';
      if (opener) opener.focus();
    }
    function go(d) { idx = (idx + d + srcs.length) % srcs.length; render(); }
    function unzoom() { lb.classList.remove('zoom'); lbImg.style.transform = ''; lbZoom.textContent = 'Zoom'; }
    function toggleZoom() {
      if (lb.classList.contains('zoom')) { unzoom(); return; }
      lb.classList.add('zoom'); lbZoom.textContent = 'Alejar';
    }

    shots.forEach(function (s, i) {
      s.setAttribute('tabindex', '0');
      s.setAttribute('role', 'button');
      s.addEventListener('click', function () { open(i, s); });
      s.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i, s); }
      });
    });

    lb.querySelector('.lb__close').addEventListener('click', close);
    lb.querySelector('.lb__prev').addEventListener('click', function (e) { e.stopPropagation(); go(-1); });
    lb.querySelector('.lb__next').addEventListener('click', function (e) { e.stopPropagation(); go(1); });
    lbZoom.addEventListener('click', function (e) { e.stopPropagation(); toggleZoom(); });
    lbImg.addEventListener('click', function (e) { e.stopPropagation(); toggleZoom(); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });

    // Con zoom activo, el mouse desplaza la imagen.
    lb.addEventListener('pointermove', function (e) {
      if (!lb.classList.contains('zoom')) return;
      var px = (e.clientX / innerWidth - 0.5) * -1;
      var py = (e.clientY / innerHeight - 0.5) * -1;
      lbImg.style.transform = 'translate(' + (px * 34) + '%,' + (py * 30) + '%)';
    }, { passive: true });

    addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'z' || e.key === 'Z') toggleZoom();
    });
  }
})();
