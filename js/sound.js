/* ═══════════════════════════════════════════════════════════════════════════
   Alma Digital — sonido de ambiente e inmersión

   Una música de fondo que NO arranca sola: el visitante la enciende con el
   botón "Sonido" del menú (los navegadores tampoco dejan sonar una página sin
   un clic). Como el sitio no recarga al navegar, sigue sonando de una página
   a otra sin cortes.

   La profundidad cambia el sonido: en la superficie (landing) la música suena
   abierta; al entrar a una obra pasa por un filtro que la deja sorda y grave,
   como bajo el agua. setDepth(0…1) lo mueve; splash() hace el chapuzón.

   Sobre la música va una capa muy suave de "aire de superficie" (ruido
   filtrado que sube y baja como oleaje, generado acá, sin archivo). Hace
   falta porque la pista actual es casi toda grave (bajo 150 Hz): el filtro
   no tendría qué apagar y la zambullida no se oiría. Con una música que tenga
   medios y agudos se puede bajar o quitar (site.json → sound.air: 0).

   Cuida el ancho de banda y al visitante:
     · el archivo (site.json → sound.src, 1,8 MB) se pide recién al encender;
     · se calla cuando la pestaña queda oculta y mientras suena un video;
     · la elección se recuerda sólo durante la visita (sessionStorage): una
       visita nueva siempre empieza en silencio.

   El bucle: dos elementos <audio> que se relevan con un cruce de 6 s cerca
   del final. Un solo <audio loop> deja un hueco audible en cada vuelta, y
   decodificar el archivo entero en memoria pesa unos 60 MB.

   API: window.AlmaSound = { toggle(), setDepth(d, seg), splash('dive'|'surface'),
   sync(), level(), analyser, on, playing }. Sin Web Audio o sin sound.src no existe, y el botón
   del menú queda oculto (css: html.has-sound).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var AC = window.AudioContext || window.webkitAudioContext;
  var cfg = (window.__ALMA__ || {}).sound;
  var here = (document.currentScript && document.currentScript.src) || '';
  if (!AC || !cfg || !cfg.src || !here) return;

  var URL_SRC = new URL('../' + cfg.src, here).href;   // Asset/ está al lado de js/
  var LEVEL = cfg.level || 0.55;                       // volumen general
  var AIR = cfg.air === undefined ? 1 : +cfg.air;      // capa de aire de superficie (0 la quita)
  var CROSS = 6;                                       // s de cruce al repetir
  var KEY = 'alma-sound';
  var root = document.documentElement;

  var ctx = null, master, lp, lp2, rumble, air, fx, meter, noise;
  var els = [], gains = [], active = 0, crossing = false, ticker = 0, offTimer = 0;
  var want = false;        // lo que eligió el visitante
  var running = false;     // está sonando de verdad
  var ducked = false;      // callada porque suena un video
  var depth = 0;

  /* Filtro "bajo el agua": de 20 kHz (no se nota) a 520 Hz, con algo de resonancia.
     Son dos en serie (24 dB por octava): uno solo deja pasar demasiado. */
  function cutoff(d) { return 20000 * Math.pow(520 / 20000, d); }
  function reso(d) { return 0.7 + d * 1.6; }

  function build() {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    meter = ctx.createAnalyser(); meter.fftSize = 2048;
    master.connect(meter); meter.connect(ctx.destination);

    lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.value = cutoff(depth); lp.Q.value = reso(depth);
    lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass';
    lp2.frequency.value = cutoff(depth); lp2.Q.value = 0.7;
    lp.connect(lp2); lp2.connect(master);

    for (var i = 0; i < 2; i++) {
      var a = new Audio(); a.preload = 'auto';
      var g = ctx.createGain(); g.gain.value = i === 0 ? 1 : 0;
      ctx.createMediaElementSource(a).connect(g); g.connect(lp);
      a.addEventListener('ended', onEnded);
      els.push(a); gains.push(g);
    }

    /* Ruido blanco: sirve para el rumor del fondo y para los chapuzones. */
    noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    var data = noise.getChannelData(0);
    for (var n = 0; n < data.length; n++) data[n] = Math.random() * 2 - 1;

    /* Rumor grave que aparece con la profundidad (presión del agua). */
    var src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
    var f1 = ctx.createBiquadFilter(); f1.type = 'lowpass'; f1.frequency.value = 130;
    var f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 130;
    rumble = ctx.createGain(); rumble.gain.value = depth * 0.5;
    src.connect(f1); f1.connect(f2); f2.connect(rumble); rumble.connect(master);
    src.start();

    /* Aire de superficie: ruido en dos bandas (cuerpo y brillo) que sube y baja
       despacio, como oleaje. Pasa por el filtro, así que al sumergirse se apaga. */
    air = ctx.createGain(); air.gain.value = airLevel(depth);
    if (AIR > 0) {
      var a1 = ctx.createBufferSource(); a1.buffer = noise; a1.loop = true;
      var body = ctx.createBiquadFilter(); body.type = 'bandpass'; body.frequency.value = 850; body.Q.value = 0.6;
      var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400;
      var sheen = ctx.createGain(); sheen.gain.value = 0.3;
      var swell = ctx.createGain(); swell.gain.value = 0.6;
      [[1 / 12, 0.28], [1 / 7.3, 0.12]].forEach(function (l) {      // dos ritmos que no coinciden
        var o = ctx.createOscillator(), d = ctx.createGain();
        o.frequency.value = l[0]; d.gain.value = l[1];
        o.connect(d); d.connect(swell.gain); o.start();
      });
      a1.connect(body); body.connect(swell);
      a1.connect(hp); hp.connect(sheen); sheen.connect(swell);
      swell.connect(air); air.connect(lp);
      a1.start();
    }

    fx = ctx.createGain(); fx.gain.value = 1; fx.connect(master);
  }
  function airLevel(d) { return 0.12 * AIR * (1 - 0.9 * d); }

  function setLevel(seconds) {
    if (!ctx) return;
    var t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(running && !ducked ? LEVEL : 0, t, seconds / 3);
  }

  function start() {
    clearTimeout(offTimer);
    if (!ctx) build();
    if (ctx.state === 'suspended') ctx.resume();
    var a = els[active];
    if (!a.getAttribute('src')) a.src = URL_SRC;       // recién acá se descarga
    var p = a.play();
    running = true;
    setLevel(2.4);
    if (p && p.catch) p.catch(function () { running = false; setLevel(0.2); arm(); });   // todavía sin gesto: espera el próximo
    clearInterval(ticker);
    ticker = setInterval(tick, 200);
  }
  function stop(fast) {
    running = false;
    clearInterval(ticker);
    if (!ctx) return;
    setLevel(fast ? 0.25 : 0.6);
    clearTimeout(offTimer);
    offTimer = setTimeout(function () {
      els.forEach(function (a) { a.pause(); });
      if (ctx.state === 'running') ctx.suspend();
    }, fast ? 350 : 800);
  }

  /* ── El bucle ─────────────────────────────────────────────────────────── */
  function tick() {
    var a = els[active], d = a.duration;
    if (!running || crossing || !d || !isFinite(d)) return;
    var other = els[1 - active];
    if (!other.getAttribute('src') && a.currentTime > d * 0.5) other.src = URL_SRC;   // ya está en caché
    if (a.currentTime >= d - CROSS - 0.3) cross();
  }
  function curve(up) {                      // cruce de potencia constante
    var c = new Float32Array(33);
    for (var i = 0; i < 33; i++) { var x = i / 32; c[i] = up ? Math.sin(x * Math.PI / 2) : Math.cos(x * Math.PI / 2); }
    return c;
  }
  function cross() {
    crossing = true;
    var from = active, to = 1 - active, t = ctx.currentTime + 0.05;
    var b = els[to];
    if (!b.getAttribute('src')) b.src = URL_SRC;
    try { b.currentTime = 0; } catch (e) {}
    var p = b.play(); if (p && p.catch) p.catch(function () {});
    try {
      gains[to].gain.cancelScheduledValues(0); gains[to].gain.setValueCurveAtTime(curve(true), t, CROSS);
      gains[from].gain.cancelScheduledValues(0); gains[from].gain.setValueCurveAtTime(curve(false), t, CROSS);
    } catch (e) { gains[to].gain.value = 1; gains[from].gain.value = 0; }
    active = to;
    setTimeout(function () { els[from].pause(); crossing = false; }, CROSS * 1000 + 400);
  }
  function onEnded(e) {                     // si el cruce no llegó a tiempo (temporizadores frenados)
    if (!running || e.target !== els[active]) return;
    try { e.target.currentTime = 0; } catch (err) {}
    var p = e.target.play(); if (p && p.catch) p.catch(function () {});
  }

  /* ── Profundidad y chapuzones ─────────────────────────────────────────── */
  function setDepth(d, seconds) {
    depth = Math.max(0, Math.min(1, +d || 0));
    if (!ctx) return;
    var t = ctx.currentTime, tc = (seconds === undefined ? 1.4 : seconds) / 3 + 0.01;
    lp.frequency.cancelScheduledValues(t); lp.frequency.setTargetAtTime(cutoff(depth), t, tc);
    lp.Q.cancelScheduledValues(t); lp.Q.setTargetAtTime(reso(depth), t, tc);
    lp2.frequency.cancelScheduledValues(t); lp2.frequency.setTargetAtTime(cutoff(depth), t, tc);
    air.gain.cancelScheduledValues(t); air.gain.setTargetAtTime(airLevel(depth), t, tc);
    rumble.gain.cancelScheduledValues(t); rumble.gain.setTargetAtTime(depth * 0.5, t, tc);
  }
  function bubble(t) {
    var o = ctx.createOscillator(), g = ctx.createGain(), f = 300 + Math.random() * 520;
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.3, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g); g.connect(fx); o.start(t); o.stop(t + 0.16);
  }
  /* 'dive': golpe de agua que se hunde y unas burbujas. 'surface': el agua que se abre. */
  function splash(kind) {
    if (!ctx || !running || ducked) return;
    var down = kind !== 'surface', t = ctx.currentTime + 0.02, len = down ? 1.5 : 1.0;
    var src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(down ? 2600 : 300, t);
    bp.frequency.exponentialRampToValueAtTime(down ? 240 : 3200, t + len * 0.75);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(down ? 0.34 : 0.22, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(bp); bp.connect(g); g.connect(fx);
    src.start(t); src.stop(t + len + 0.1);
    if (down) for (var i = 0; i < 7; i++) bubble(t + 0.35 + Math.random() * 1.2);
  }

  /* ── Botón del menú ───────────────────────────────────────────────────── */
  function sync() {
    root.classList.toggle('sound-on', want);
    var b = document.querySelectorAll('[data-sound]');
    for (var i = 0; i < b.length; i++) b[i].setAttribute('aria-pressed', String(want));
  }
  function remember() { try { sessionStorage.setItem(KEY, want ? '1' : '0'); } catch (e) {} }
  function toggle() {
    want = !want;
    remember(); disarm();
    if (want) start(); else stop(false);
    sync();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-sound]');
    if (b) { e.preventDefault(); toggle(); }
  });

  /* Si ya la había encendido en esta visita (recarga, o ida y vuelta a una
     página que carga de la forma normal), vuelve con el primer gesto. */
  var GESTURES = ['pointerup', 'keydown', 'touchend'];
  function onGesture(e) {
    if (e.target && e.target.closest && e.target.closest('[data-sound]')) return;   // lo resuelve toggle()
    disarm();
    if (want && !running && !document.hidden) start();
  }
  function arm() { GESTURES.forEach(function (t) { window.addEventListener(t, onGesture, true); }); }
  function disarm() { GESTURES.forEach(function (t) { window.removeEventListener(t, onGesture, true); }); }

  /* ── Convivencia ──────────────────────────────────────────────────────── */
  document.addEventListener('visibilitychange', function () {
    if (!want) return;
    if (document.hidden) { if (running) stop(true); }
    else if (!running) start();
  });
  /* Un video con sonido (el reel a pantalla completa) calla la música. Los
     eventos de medios no burbujean: se escuchan en captura. */
  function recheck() {
    var v = document.querySelectorAll('video'), loud = false;
    for (var i = 0; i < v.length; i++) if (!v[i].paused && !v[i].muted && v[i].volume > 0) { loud = true; break; }
    if (loud === ducked) return;
    ducked = loud;
    setLevel(loud ? 0.4 : 1.6);
  }
  ['play', 'playing', 'pause', 'ended', 'emptied', 'volumechange'].forEach(function (type) {
    document.addEventListener(type, function (e) { if (e.target && e.target.tagName === 'VIDEO') recheck(); }, true);
  });

  /* Nivel de salida (0…1, RMS). Lo usa la verificación; sirve para que algo reaccione a la música. */
  function level() {
    if (!meter || !meter.getFloatTimeDomainData) return 0;
    var buf = new Float32Array(meter.fftSize), sum = 0;
    meter.getFloatTimeDomainData(buf);
    for (var i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }

  window.AlmaSound = {
    toggle: toggle, setDepth: setDepth, splash: splash, level: level,
    sync: function () { sync(); recheck(); },
    get on() { return want; },
    get playing() { return running; },
    get analyser() { return meter; },
  };

  root.classList.add('has-sound');
  try { want = sessionStorage.getItem(KEY) === '1'; } catch (e) {}
  if (want) arm();
  sync();
})();
