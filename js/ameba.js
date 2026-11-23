/* ═══════════════════════════════════════════════════════════════════════════
   Alma Digital — la ameba viva
   Un fragment shader (WebGL 1, sin librerías) que dibuja la ameba como un
   campo de distancias: doce esferas fundidas (metaballs), mate, con la rampa
   de lilas del blob de la marca.

     · respira: una respiración cada 6 s, la unidad de tiempo de la marca
     · sigue al puntero y se puede arrastrar para girarla, con inercia
     · se aplasta un poco mientras se la presiona
     · muta con el scroll, y cambia de forma con un clic o un toque
     · viaja: vive fuera de <main>, así que no se recarga al cambiar de página.
       Se posa sobre el [data-ameba-slot] que esté más en pantalla y, cuando
       ese lugar cambia (otro bloque del landing, otra página), se desliza
       hasta el nuevo.

   Corre en un canvas chico, propio, encima del fluido (que es otro canvas y
   no se toca). Para no pesar: resolución limitada, se pausa fuera de pantalla
   o con la pestaña oculta, baja sola de resolución si el equipo no da, y con
   "reducir movimiento" dibuja un único cuadro quieto y no se desliza. Si WebGL
   no arranca queda la imagen de siempre (.ameba__fallback), en el mismo lugar.

   "Respira con ella" (minuto guiado) sigue acá pero apagado: su botón sólo se
   genera con site.json → breathing: true.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var wrap = document.getElementById('ameba-wrap');
  var canvas = document.getElementById('ameba');
  if (!wrap || !canvas) return;

  var T = function (k) { var a = window.__ALMA__; return (a && a.t && a.t[k]) || ''; };

  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  /* La ameba de la marca: doce esferas fundidas (metaballs) con la superficie mate
     y una rampa de cuatro lilas, como el blob del logo y del reel (prototipo WebGPU
     alma-ameba-webgpu, 2026-11-21, llevado a WebGL 1). Las esferas las calcula
     ballsAt() en JS en cada cuadro; el shader recorre el campo de distancias. */
  var FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uRes;uniform float uTime;uniform vec2 uRot;uniform float uMorph;',
    'uniform float uBreath;uniform float uGuide;uniform float uPress;',
    'uniform vec4 uB[12];',
    'float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
    'float vnoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);',
    '  return mix(mix(mix(hash(i),hash(i+vec3(1.,0.,0.)),f.x),mix(hash(i+vec3(0.,1.,0.)),hash(i+vec3(1.,1.,0.)),f.x),f.y),',
    '             mix(mix(hash(i+vec3(0.,0.,1.)),hash(i+vec3(1.,0.,1.)),f.x),mix(hash(i+vec3(0.,1.,1.)),hash(i+vec3(1.,1.,1.)),f.x),f.y),f.z)*2.-1.;}',
    // unión suave de dos distancias
    'float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;}',
    'mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}',
    'float balls(vec3 p){float d=1e5;for(int i=0;i<12;i++){d=smin(d,length(p-uB[i].xyz)-uB[i].w,.18);}return d;}',
    'float map(vec3 p){',
    // respiración: sola cada 6 s, o la que marca el minuto guiado
    '  float breath=mix(.5-.5*cos(uTime*1.0471976),uBreath,uGuide);',
    '  float s=1.+uGuide*.15*(uBreath-.4)-.05*uPress+.03*breath;',   // crece y se recoge entera
    '  float sq=1.+.16*uPress;',                                     // al presionarla se aplasta
    '  p/=s;p.y*=sq;',
    '  p.xz*=rot(uTime*.10+uRot.x+uMorph*.35);',
    '  p.yz*=rot(.35+uRot.y);',
    '  float d=balls(p);',
    '  if(d<.15){float m=uTime*.11;vec3 q=p*2.1+vec3(0.,m,m*.45);',   // cerca del borde, una deformación apenas
    '    vec3 w=vec3(vnoise(q),vnoise(q+vec3(5.2,1.3,2.8)),vnoise(q+vec3(1.7,9.2,3.4)));',
    '    d+=vnoise(p*2.1+w*.8-vec3(0.,m*.6,0.))*.034;}',
    '  return d*s/sq;',                                              // corrige la distancia por las dos escalas
    '}',
    'vec3 nrm(vec3 p){vec2 e=vec2(1.,-1.)*.002;return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}',
    'float occ(vec3 p,vec3 n){float o=0.,sc=1.;for(int i=1;i<=4;i++){float h=.02+.06*float(i);o+=(h-map(p+n*h))*sc;sc*=.72;}return clamp(1.-2.6*o,0.,1.);}',
    'void main(){',
    '  vec2 uv=(gl_FragCoord.xy*2.-uRes)/min(uRes.x,uRes.y);',
    '  vec3 ro=vec3(uv*1.2,2.2);vec3 rd=vec3(0.,0.,-1.);',
    '  float r2=dot(ro.xy,ro.xy);',
    '  vec3 halo=vec3(.478,.361,.949);',                     // #7a5cf2: el glow de la marca
    '  float ha=.30*exp(-max(sqrt(r2)-.72,0.)*6.5);',
    '  if(r2>1.25){gl_FragColor=vec4(halo*ha,ha);return;}',  // fuera de la esfera envolvente: sólo halo
    '  float t=2.2-sqrt(1.25-r2);float md=10.;float tm=t;bool hit=false;',
    '  for(int i=0;i<48;i++){',
    '    float d=map(ro+rd*t);if(d<md){md=d;tm=t;}',
    '    if(d<.0015){hit=true;break;}',
    '    t+=d*.85;if(t>3.5)break;',
    '  }',
    '  float px=2.4/min(uRes.x,uRes.y);',                    // un píxel, en unidades de la ameba
    '  float edge=1.-smoothstep(0.,px*1.5,md);',
    '  vec3 col=halo;float a=ha;',
    '  if(hit||edge>0.){',
    '    vec3 p=ro+rd*(hit?t:tm);vec3 n=nrm(p);float o=occ(p,n);',
    // la rampa del blob de marca: sombra, medio, luz, brillo y el acento celeste en los pliegues
    '    vec3 s0=vec3(.361,.122,.780),s1=vec3(.561,.278,.933),s2=vec3(.796,.627,.984),s3=vec3(.988,.839,.973),acc=vec3(.298,.784,.961);',
    '    vec3 key=normalize(vec3(-.42,.78,.5));',
    '    float wrap=pow(clamp((dot(n,key)+.85)/1.85,0.,1.),.9);',
    '    float fres=pow(1.-clamp(n.z,0.,1.),2.5);',
    '    float l=wrap*mix(.62,1.,o);',
    '    vec3 c=mix(s0,s1,smoothstep(0.,.5,l));c=mix(c,s2,smoothstep(.35,.88,l));c=mix(c,s3,smoothstep(.78,1.05,l)*.4);',
    '    float h1=clamp(vnoise(p*1.6+vec3(0.,0.,uTime*.06))*1.3+.5,0.,1.);',
    '    float h2=clamp(vnoise(p*2.2+vec3(7.1,uTime*.05,2.3))*1.3+.5,0.,1.);',
    '    c=mix(c,c*vec3(1.05,.9,1.),smoothstep(.55,.9,h1)*.4);',
    '    c=mix(c,c*vec3(.9,.95,1.06),smoothstep(.5,.9,h2)*(1.-l)*.4);',
    '    c=mix(c,acc,clamp((1.-o)*smoothstep(.4,.85,h2)*.35,0.,.25));c=mix(c,s2,fres*.18);',
    '    c=mix(c,s3,uGuide*uBreath*.12);',                   // al inhalar se ilumina apenas
    '    float body=hit?1.:edge;',
    '    col=mix(halo,c,body);a=mix(ha,1.-fres*.3,body);',
    '  }',
    '  gl_FragColor=vec4(col*a,a);',                         // alfa premultiplicado
    '}'].join('\n');

  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl = null, U = {};
  var t0 = performance.now(), visible = true, raf = 0;
  var scale = 1, frames = 0, acc = 0, last = 0;

  // puntero lejano (sigue suave), arrastre (gira con inercia), scroll y clic (mutan)
  var px = 0, py = 0, tx = 0, ty = 0;
  var yaw = 0, pitch = 0, vyaw = 0, vpitch = 0;
  var dragging = false, dragId = null, lx = 0, ly = 0, moved = 0;
  var press = 0, morph = 0, tm = 0, click = 0;

  // minuto guiado
  var IN = 4, OUT = 6, CYCLES = 6;
  var guiding = false, gStart = 0, guide = 0, breath = 0, gPhase = '', gCycle = -1;

  function compile(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  function init() {
    try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' }); }
    catch (e) { gl = null; }
    if (!gl) return false;
    var vs = compile(gl.VERTEX_SHADER, VS), fs = compile(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) { gl = null; return false; }
    var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl = null; return false; }
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uRes', 'uTime', 'uRot', 'uMorph', 'uBreath', 'uGuide', 'uPress', 'uB'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    return true;
  }

  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5) * scale;
    var w = Math.max(2, Math.round(canvas.clientWidth * dpr)), h = Math.max(2, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  var ease = function (k) { return .5 - .5 * Math.cos(Math.PI * Math.min(1, Math.max(0, k))); };

  /* Las doce esferas en este instante: una al centro y once sobre una esfera de Fibonacci
     que deambulan alrededor de su lugar. "m" (la mutación del scroll y del clic) las reubica. */
  var BALLS = new Float32Array(48);
  function ballsAt(t, m) {
    for (var i = 0; i < 12; i++) {
      var x = 0, y = 0, z = 0, r = .38;
      if (i > 0) {
        var k = i - 1, yy = 1 - 2 * (k + .5) / 11, rr = Math.sqrt(1 - yy * yy), th = k * 2.39996 + m * .9, w = .09;
        x = .44 * rr * Math.cos(th) + w * Math.sin(t * (.31 + .07 * (k % 5)) + k * 1.7 + m);
        y = .44 * yy + w * Math.sin(t * (.27 + .05 * (k % 4)) + k * 2.3 + m * 1.3);
        z = .44 * rr * Math.sin(th) + w * Math.sin(t * (.23 + .06 * (k % 3)) + k * .9 + m * .6);
        r = .28 * (.85 + .15 * ((k * 7) % 5) / 4);
      }
      r += .025 * Math.sin(t * .6 + i * 2.1);
      BALLS[i * 4] = x; BALLS[i * 4 + 1] = y; BALLS[i * 4 + 2] = z; BALLS[i * 4 + 3] = r;
    }
    return BALLS;
  }

  function stepGuide(now) {
    if (!guiding) { guide += (0 - guide) * .06; return; }
    guide += (1 - guide) * .06;
    var t = (now - gStart) / 1000, cycle = Math.floor(t / (IN + OUT)), w = t % (IN + OUT);
    if (cycle >= CYCLES) { stopGuide(true); return; }
    var phase = w < IN ? 'in' : 'out';
    breath = phase === 'in' ? ease(w / IN) : 1 - ease((w - IN) / OUT);
    if (phase !== gPhase || cycle !== gCycle) { gPhase = phase; gCycle = cycle; cue(phase === 'in' ? T('breathIn') : T('breathOut'), (cycle + 1) + ' / ' + CYCLES); }
  }

  function draw(now) {
    if (!gl) return;
    size();
    stepGuide(now);
    px += (tx - px) * .05; py += (ty - py) * .05;
    if (!dragging) { yaw += vyaw; pitch += vpitch; vyaw *= .94; vpitch *= .94; }
    press += ((dragging ? 1 : 0) - press) * .14;
    morph += (tm + click - morph) * .06;
    var frozen = still && !guiding;
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, frozen ? 3. : (now - t0) / 1000);
    gl.uniform2f(U.uRot, px * .7 + yaw, py * .45 + pitch);
    gl.uniform1f(U.uMorph, frozen ? tm + click : morph);
    gl.uniform1f(U.uBreath, breath);
    gl.uniform1f(U.uGuide, guide);
    gl.uniform1f(U.uPress, press);
    gl.uniform4fv(U.uB, ballsAt(frozen ? 3. : (now - t0) / 1000, frozen ? tm + click : morph));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) {
    raf = 0;
    if (!visible || document.hidden || !gl) { last = 0; return; }
    // Si los cuadros tardan demasiado, se baja la resolución (hasta la mitad).
    if (last) { acc += now - last; frames++; }
    last = now;
    if (frames >= 45) {
      if (acc / frames > 34 && scale > .5) scale = Math.max(.5, scale * .8);
      frames = 0; acc = 0;
    }
    draw(now);
    if (!still || guiding || guide > .01 || dragging || Math.abs(vyaw) + Math.abs(vpitch) > .0005 || press > .01) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && gl) raf = requestAnimationFrame(loop); }
  function once() { if (gl && still) kick(); }

  /* ── Dónde se posa ────────────────────────────────────────────────────
     El contenedor es position:absolute en coordenadas del documento, así que
     acompaña el scroll sin JavaScript. Sólo se recalcula cuando cambia el lugar
     (otro slot, otra página) o el layout (resize, imágenes que cargan). */
  var current = null, placed = false, anim = null, ticking = false;

  function box(el) { var r = el.getBoundingClientRect(); return (r.width > 1 && r.height > 1) ? r : null; }
  function seen(r) {
    var h = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    var w = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0);
    return (h > 0 && w > 0) ? (h * w) / (r.width * r.height) : 0;
  }
  function pick() {
    var list = [].slice.call(document.querySelectorAll('[data-ameba-slot]'));
    var best = null, bestQ = 0, curQ = 0, first = null;
    list.forEach(function (el) {
      var r = box(el); if (!r) return;
      if (!first) first = el;
      var q = seen(r);
      if (el === current) curQ = q;
      if (q > bestQ) { bestQ = q; best = el; }
    });
    if (current && document.contains(current) && box(current)) {
      if (!best || best === current) return current;
      // Con histéresis: cambia sólo si el otro lugar está claramente más a la vista.
      return (bestQ >= .55 && bestQ > curQ + .2) ? best : current;
    }
    return best || first;
  }
  function setRect(el) {
    var r = box(el); if (!r) return false;
    var s = Math.min(r.width, r.height);
    wrap.style.width = s + 'px'; wrap.style.height = s + 'px';
    wrap.style.left = (r.left + window.scrollX + (r.width - s) / 2) + 'px';
    wrap.style.top = (r.top + window.scrollY + (r.height - s) / 2) + 'px';
    return true;
  }
  /* animate: deslizarse desde donde estaba. from: rectángulo de pantalla de
     partida (lo pasa la navegación, que lo mide antes de cambiar la página). */
  function place(animate, from) {
    var next = pick();
    if (!next) { current = null; placed = false; wrap.classList.remove('is-placed'); return; }
    var first = from || wrap.getBoundingClientRect();
    var had = placed, changed = next !== current;
    current = next;
    if (!setRect(next)) return;
    placed = true; wrap.classList.add('is-placed');
    if (animate && had && changed && !still && wrap.animate && first.width > 1) {
      var lastR = wrap.getBoundingClientRect();
      // Si hay una animación en curso, lastR ya la incluye: se parte de lo que se ve.
      if (anim) { anim.cancel(); lastR = wrap.getBoundingClientRect(); }
      var dx = first.left - lastR.left, dy = first.top - lastR.top, sc = first.width / Math.max(1, lastR.width);
      anim = wrap.animate(
        [{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ')' }, { transform: 'none' }],
        { duration: 1100, easing: 'cubic-bezier(.22,1,.36,1)' });
      anim.onfinish = anim.oncancel = function () { anim = null; };
    }
    once(); kick();
  }
  function onScroll() {
    tm = window.scrollY / 520; once();
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      if (pick() !== current) place(true);
    });
  }
  function relayout() { if (current && document.contains(current)) setRect(current); else place(false); once(); }

  window.AlmaAmeba = {
    /* Rectángulo actual en pantalla: la navegación lo mide antes de cambiar la página. */
    rect: function () { return wrap.getBoundingClientRect(); },
    /* Tras cambiar el contenido: buscar el lugar nuevo. animate=false cuando la
       transición del navegador (View Transitions) ya se encarga del movimiento. */
    refresh: function (animate, from) { if (current && !document.contains(current)) current = null; place(!!animate, from); },
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', relayout, { passive: true });
  window.addEventListener('load', relayout);
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(document.body);

  var hasGL = init();

  /* ── Puntero lejano ── */
  window.addEventListener('pointermove', function (e) {
    tx = (e.clientX / window.innerWidth) * 2 - 1; ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  /* ── Arrastrar para girar; un toque sin arrastre cambia de forma ──
     En táctil el canvas deja pasar el scroll vertical (touch-action: pan-y en el
     CSS): sólo el arrastre horizontal llega acá. */
  canvas.addEventListener('pointerdown', function (e) {
    if (e.button || !gl) return;
    dragging = true; dragId = e.pointerId; lx = e.clientX; ly = e.clientY; moved = 0; vyaw = vpitch = 0;
    try { canvas.setPointerCapture(dragId); } catch (err) {}
    kick();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging || e.pointerId !== dragId) return;
    var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    vyaw = dx * .009; vpitch = dy * .009;
    yaw += vyaw; pitch += vpitch;
  });
  function release(e, cancelled) {
    if (!dragging || (e && e.pointerId !== dragId)) return;
    dragging = false;
    try { canvas.releasePointerCapture(dragId); } catch (err) {}
    if (!cancelled && moved < 6) { click += 1.35; vyaw = vpitch = 0; }
    kick();
  }
  canvas.addEventListener('pointerup', function (e) { release(e, false); });
  canvas.addEventListener('pointercancel', function (e) { release(e, true); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && guiding) stopGuide(false);
    else kick();
  });
  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault(); gl = null; wrap.classList.remove('is-live');
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (guiding) stopGuide(false);
  });
  canvas.addEventListener('webglcontextrestored', function () {
    if (init()) { wrap.classList.add('is-live'); kick(); }
  });

  /* ── Respira con ella (sólo si la página trae el bloque #breath) ── */
  var endTimer = 0;
  function el(id) { return document.getElementById(id); }
  function cue(text, count) {
    var c = el('breath-cue'), n = el('breath-count');
    if (c) c.textContent = text || '';
    if (n) n.textContent = count || '';
  }
  function startGuide() {
    clearTimeout(endTimer);
    guiding = true; gStart = performance.now(); gPhase = ''; gCycle = -1; breath = 0;
    var b = el('breath'), btn = el('breath-btn');
    if (b) b.classList.add('is-on');
    if (btn) { btn.textContent = T('breathStop'); btn.setAttribute('aria-pressed', 'true'); }
    kick();
  }
  function stopGuide(finished) {
    guiding = false; breath = 0;
    var b = el('breath'), btn = el('breath-btn');
    if (btn) { btn.textContent = T('breathStart'); btn.setAttribute('aria-pressed', 'false'); }
    if (finished) {
      cue(T('breathEnd'), '');
      endTimer = setTimeout(function () { cue('', ''); var x = el('breath'); if (x) x.classList.remove('is-on'); }, 5000);
    } else {
      cue('', '');
      if (b) b.classList.remove('is-on');
    }
    kick();
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('#breath-btn');
    if (btn && gl) { guiding ? stopGuide(false) : startGuide(); }
  });
  function showBreath() { var b = el('breath'); if (b && gl) b.hidden = false; }

  place(false);
  if (hasGL) { draw(performance.now()); wrap.classList.add('is-live'); kick(); }
  showBreath();
  window.AlmaAmeba.showBreath = showBreath;
})();
