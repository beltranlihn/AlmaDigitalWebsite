/* ═══════════════════════════════════════════════════════════════════════════
   Alma Digital — la ameba viva del hero
   Un fragment shader (WebGL 1, sin librerías) que dibuja la ameba como un
   campo de distancias: un núcleo y seis lóbulos fundidos entre sí.

     · respira: una respiración cada 6 s, la unidad de tiempo de la marca
     · sigue al puntero y se puede arrastrar para girarla, con inercia
     · se aplasta un poco mientras se la presiona
     · muta con el scroll, y cambia de forma con un clic o un toque
     · "Respira con ella": un minuto guiado (inhalar 4 s, exhalar 6 s, seis
       veces) en el que la ameba marca el ritmo. No pide micrófono ni cámara.

   Corre en un canvas chico, propio, encima del fluido (que es otro canvas y
   no se toca). Para no pesar: resolución limitada, se pausa fuera de pantalla
   o con la pestaña oculta, baja sola de resolución si el equipo no da, y con
   "reducir movimiento" dibuja un único cuadro quieto (salvo durante el minuto
   guiado, que la persona pide a propósito). Si WebGL no arranca queda la
   imagen de siempre (.hero__fallback) y el botón de respirar no aparece.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var wrap = document.getElementById('ameba-wrap');
  var canvas = document.getElementById('ameba');
  if (!wrap || !canvas) return;

  var T = (window.__ALMA__ && window.__ALMA__.t) || {};

  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uRes;uniform float uTime;uniform vec2 uRot;uniform float uMorph;',
    'uniform float uBreath;uniform float uGuide;uniform float uPress;',
    // unión suave de dos distancias (Inigo Quilez)
    'float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}',
    'mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}',
    'float map(vec3 p){',
    // respiración: sola cada 6 s, o la que marca el minuto guiado
    '  float breath=mix(.5-.5*cos(uTime*1.0471976),uBreath,uGuide);',
    '  float s=1.+uGuide*.15*(uBreath-.4)-.05*uPress;',      // en el minuto guiado crece y se recoge entera
    '  float sq=1.+.16*uPress;',                             // al presionarla se aplasta
    '  p/=s;p.y*=sq;',
    '  p.xz*=rot(uTime*.10+uRot.x+uMorph*.35);',
    '  p.yz*=rot(.35+uRot.y);',
    '  float d=length(p)-(.50+.035*breath);',
    '  for(int i=0;i<6;i++){',
    '    float f=float(i);',
    '    float a=f*1.0471976+uMorph*.9+sin(uTime*.13+f)*.25;',
    '    float b=sin(f*2.4+uTime*.21+uMorph*1.7)*.85;',
    '    float rad=.45+.14*sin(uTime*.29+f*1.9+uMorph*2.3);',
    '    vec3 c=vec3(cos(a)*cos(b),sin(b),sin(a)*cos(b))*rad;',
    '    float r=.28+.07*sin(f*3.1+uMorph*1.3+uTime*.17)+.02*breath;',
    '    d=smin(d,length(p-c)-r,.30);',
    '  }',
    '  return d*s/sq;',                                      // corrige la distancia por las dos escalas
    '}',
    'vec3 nrm(vec3 p){vec2 e=vec2(.0025,0.);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}',
    'void main(){',
    '  vec2 uv=(gl_FragCoord.xy*2.-uRes)/min(uRes.x,uRes.y);',
    '  vec3 ro=vec3(uv*1.2,2.2);vec3 rd=vec3(0.,0.,-1.);',
    '  float r2=dot(ro.xy,ro.xy);',
    '  vec3 halo=vec3(.478,.361,.949);',                     // #7a5cf2: el glow de la marca
    '  float ha=.30*exp(-max(sqrt(r2)-.72,0.)*6.5);',
    '  if(r2>1.25){gl_FragColor=vec4(halo*ha,ha);return;}',  // fuera de la esfera envolvente: sólo halo
    '  float t=2.2-sqrt(1.25-r2);float md=10.;bool hit=false;',
    '  for(int i=0;i<44;i++){',
    '    float d=map(ro+rd*t);md=min(md,d);',
    '    if(d<.0025){hit=true;break;}',
    '    t+=d*.9;if(t>3.5)break;',
    '  }',
    '  float edge=1.-smoothstep(0.,.012,md);',
    '  vec3 col=halo;float a=ha;',
    '  if(hit||edge>0.){',
    '    vec3 p=ro+rd*t;vec3 n=nrm(p);',
    // espectro del blob del sistema de marca
    '    vec3 violet=vec3(.478,.361,.949),orchid=vec3(.541,.306,.878),lilac=vec3(.788,.620,.976),',
    '         glow=vec3(.937,.804,.996),pink=vec3(.949,.722,.867),aurora=vec3(.357,.553,.937),deep=vec3(.353,.251,.643);',
    '    float fr=pow(1.-max(n.z,0.),2.2);',
    '    vec3 c=mix(orchid,aurora,smoothstep(-.6,.7,n.x+.25*sin(uTime*.2+uMorph)));',
    '    c=mix(c,violet,.28);',
    '    c=mix(c,pink,smoothstep(.15,.95,n.y)*.85);',
    '    c=mix(c,deep,smoothstep(.1,.95,-n.y)*.6);',
    '    c=mix(c,lilac,smoothstep(.2,1.,n.z)*.3);',
    '    c=mix(c,glow,fr*.85);',
    '    c=mix(c,glow,uGuide*uBreath*.16);',                 // al inhalar se ilumina apenas
    '    vec3 l=normalize(vec3(-.45,.7,.6));',
    '    c+=pow(max(dot(reflect(rd,n),l),0.),26.)*.22;',
    '    float body=hit?1.:edge;',
    '    col=mix(halo,c,body);a=mix(ha,1.,body);',
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
    if (!vs || !fs) return false;
    var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uRes', 'uTime', 'uRot', 'uMorph', 'uBreath', 'uGuide', 'uPress'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    return true;
  }

  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5) * scale;
    var w = Math.max(2, Math.round(canvas.clientWidth * dpr)), h = Math.max(2, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  var ease = function (k) { return .5 - .5 * Math.cos(Math.PI * Math.min(1, Math.max(0, k))); };

  function stepGuide(now) {
    if (!guiding) { guide += (0 - guide) * .06; return; }
    guide += (1 - guide) * .06;
    var t = (now - gStart) / 1000, cycle = Math.floor(t / (IN + OUT)), w = t % (IN + OUT);
    if (cycle >= CYCLES) { stopGuide(true); return; }
    var phase = w < IN ? 'in' : 'out';
    breath = phase === 'in' ? ease(w / IN) : 1 - ease((w - IN) / OUT);
    if (phase !== gPhase || cycle !== gCycle) { gPhase = phase; gCycle = cycle; cue(phase === 'in' ? T.breathIn : T.breathOut, (cycle + 1) + ' / ' + CYCLES); }
  }

  function draw(now) {
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
  function once() { if (gl) { if (still) kick(); } }

  if (!init()) return;

  /* ── Puntero lejano, scroll ── */
  window.addEventListener('pointermove', function (e) {
    tx = (e.clientX / window.innerWidth) * 2 - 1; ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  window.addEventListener('scroll', function () { tm = window.scrollY / 520; once(); }, { passive: true });
  window.addEventListener('resize', once, { passive: true });

  /* ── Arrastrar para girar; un toque sin arrastre cambia de forma ──
     En táctil el canvas deja pasar el scroll vertical (touch-action: pan-y en el
     CSS): sólo el arrastre horizontal llega acá. */
  canvas.addEventListener('pointerdown', function (e) {
    if (e.button) return;
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

  /* ── Respira con ella ── */
  var box = document.getElementById('breath');
  var btn = document.getElementById('breath-btn');
  var cueEl = document.getElementById('breath-cue');
  var countEl = document.getElementById('breath-count');
  var endTimer = 0;

  function cue(text, count) {
    if (cueEl) cueEl.textContent = text || '';
    if (countEl) countEl.textContent = count || '';
  }
  function startGuide() {
    clearTimeout(endTimer);
    guiding = true; gStart = performance.now(); gPhase = ''; gCycle = -1; breath = 0;
    if (box) box.classList.add('is-on');
    if (btn) { btn.textContent = T.breathStop; btn.setAttribute('aria-pressed', 'true'); }
    kick();
  }
  function stopGuide(finished) {
    guiding = false; breath = 0;
    if (btn) { btn.textContent = T.breathStart; btn.setAttribute('aria-pressed', 'false'); }
    if (finished) {
      cue(T.breathEnd, '');
      endTimer = setTimeout(function () { cue('', ''); if (box) box.classList.remove('is-on'); }, 5000);
    } else {
      cue('', '');
      if (box) box.classList.remove('is-on');
    }
    kick();
  }
  if (box && btn) {
    box.hidden = false;                    // el botón sólo existe si la ameba está viva
    btn.addEventListener('click', function () { guiding ? stopGuide(false) : startGuide(); });
  }

  draw(performance.now());
  wrap.classList.add('is-live');
  kick();
})();
