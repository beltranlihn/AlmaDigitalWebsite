/* ═══════════════════════════════════════════════════════════════════════════
   Alma Digital — la ameba viva del hero
   Un fragment shader (WebGL 1, sin librerías) que dibuja la ameba como un
   campo de distancias: un núcleo y seis lóbulos fundidos entre sí.

     · respira: una respiración cada 6 s, la unidad de tiempo de la marca
     · gira con el puntero
     · muta con el scroll, y cambia de forma con un clic o un toque

   Corre en un canvas chico, propio, encima del fluido (que es otro canvas y
   no se toca). Para no pesar: resolución limitada, se pausa fuera de pantalla
   o con la pestaña oculta, baja sola de resolución si el equipo no da, y con
   "reducir movimiento" dibuja un único cuadro quieto. Si WebGL no arranca
   queda la imagen de siempre (.hero__fallback).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var wrap = document.getElementById('ameba-wrap');
  var canvas = document.getElementById('ameba');
  if (!wrap || !canvas) return;

  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uRes;uniform float uTime;uniform vec2 uPtr;uniform float uMorph;',
    // unión suave de dos distancias (Inigo Quilez)
    'float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}',
    'mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}',
    'float map(vec3 p){',
    '  float breath=.5-.5*cos(uTime*1.0471976);',            // 2π/6: una respiración cada 6 s
    '  p.xz*=rot(uTime*.10+uPtr.x*.7+uMorph*.35);',
    '  p.yz*=rot(.35+uPtr.y*.45);',
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
    '  return d;',
    '}',
    'vec3 nrm(vec3 p){vec2 e=vec2(.0025,0.);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}',
    'void main(){',
    '  vec2 uv=(gl_FragCoord.xy*2.-uRes)/min(uRes.x,uRes.y);',
    '  vec3 ro=vec3(uv*1.16,2.2);vec3 rd=vec3(0.,0.,-1.);',
    '  float r2=dot(ro.xy,ro.xy);',
    '  vec3 halo=vec3(.478,.361,.949);',                     // #7a5cf2: el glow de la marca
    '  float ha=.30*exp(-max(sqrt(r2)-.70,0.)*6.5);',
    '  if(r2>1.10){gl_FragColor=vec4(halo*ha,ha);return;}',  // fuera de la esfera envolvente: sólo halo
    '  float t=2.2-sqrt(1.10-r2);float md=10.;bool hit=false;',
    '  for(int i=0;i<44;i++){',
    '    float d=map(ro+rd*t);md=min(md,d);',
    '    if(d<.0025){hit=true;break;}',
    '    t+=d*.9;if(t>3.4)break;',
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
    '    vec3 l=normalize(vec3(-.45,.7,.6));',
    '    c+=pow(max(dot(reflect(rd,n),l),0.),26.)*.22;',
    '    float body=hit?1.:edge;',
    '    col=mix(halo,c,body);a=mix(ha,1.,body);',
    '  }',
    '  gl_FragColor=vec4(col*a,a);',                         // alfa premultiplicado
    '}'].join('\n');

  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl = null, uRes, uTime, uPtr, uMorph;
  var px = 0, py = 0, tx = 0, ty = 0, morph = 0, tm = 0, click = 0;
  var visible = true, raf = 0, t0 = performance.now();
  var scale = 1, frames = 0, acc = 0, last = 0;

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
    uRes = gl.getUniformLocation(prog, 'uRes'); uTime = gl.getUniformLocation(prog, 'uTime');
    uPtr = gl.getUniformLocation(prog, 'uPtr'); uMorph = gl.getUniformLocation(prog, 'uMorph');
    return true;
  }

  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5) * scale;
    var w = Math.max(2, Math.round(canvas.clientWidth * dpr)), h = Math.max(2, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  function draw() {
    size();
    px += (tx - px) * .05; py += (ty - py) * .05; morph += (tm + click - morph) * .06;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, still ? 3. : (performance.now() - t0) / 1000);
    gl.uniform2f(uPtr, px, py);
    gl.uniform1f(uMorph, still ? tm + click : morph);
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
    draw();
    raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && !still && gl) raf = requestAnimationFrame(loop); }

  if (!init()) return;

  window.addEventListener('pointermove', function (e) {
    tx = (e.clientX / window.innerWidth) * 2 - 1; ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  window.addEventListener('scroll', function () { tm = window.scrollY / 520; if (still) draw(); }, { passive: true });
  window.addEventListener('resize', function () { if (still && gl) draw(); }, { passive: true });
  canvas.addEventListener('click', function () { click += 1.35; if (still) draw(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; kick(); }).observe(canvas);
  }
  document.addEventListener('visibilitychange', kick);
  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault(); gl = null; wrap.classList.remove('is-live');
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  });
  canvas.addEventListener('webglcontextrestored', function () {
    if (init()) { draw(); wrap.classList.add('is-live'); kick(); }
  });

  draw();
  wrap.classList.add('is-live');
  kick();
})();
