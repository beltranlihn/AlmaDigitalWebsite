/* ═══════════════════════════════════════════════════════════════════════════
   Alma Digital — el mundo interior (PÁGINA DE PRUEBA: inner-world.html)

   Un recorrido en 3D por las obras principales. Idea tomada de
   mirages.nrly.fun (Nathan Riley, Unseen Studio), llevada a la marca:

     · se entra por una ameba grande, la del logo: es la puerta;
     · adentro está oscuro y cada obra flota dentro de una ameba de vidrio que
       deforma su portada como una gota;
     · se avanza con el scroll NORMAL de la página (no se secuestra la rueda):
       la sección es alta y el escenario queda fijo mientras se la recorre;
     · un clic en una ameba (o en "Entrar a la obra") hace que la cámara entre
       en ella y abre la ficha.

   Sin esto la página igual sirve: js/app.js deja la lista de obras a la vista
   si Three.js o WebGL no arrancan, y sin JavaScript queda esa misma lista.

   Three.js llega del CDN (el mismo archivo que usa js/particles.js, así que
   el navegador lo descarga una sola vez). Las portadas se piden de a una, a
   medida que uno se acerca. Cuida los recursos como la ameba: resolución
   limitada, pausa fuera de pantalla o con la pestaña oculta. Con "reducir
   movimiento" las amebas no ondulan y la cámara no tiene inercia.

   mount(section, opts) → { dispose() } o null.
   opts: { navigate(href), sound (window.AlmaSound o nada), reduce, coarse }
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.187.0/+esm';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);

/* Paleta del blob de marca, en sRGB tal cual (los shaders no convierten). */
const C = {
  violet: [0.478, 0.361, 0.949], purple: [0.541, 0.306, 0.878], lilac: [0.788, 0.620, 0.976],
  mist: [0.937, 0.804, 0.996], pink: [0.949, 0.722, 0.867], blue: [0.357, 0.553, 0.937],
};

/* ── La ameba ──────────────────────────────────────────────────────────
   Una esfera que se deforma en el vértice con lóbulos lentos (sumas de senos:
   baratas y sin saltos). La normal se saca desplazando dos vecinos. */
const VERT = `
  uniform float uTime, uSeed, uWobble;
  varying vec3 vN; varying vec3 vP;
  float lobes(vec3 p) {
    float t = uTime;
    float a = sin(p.x * 1.6 + t * 0.50 + uSeed) * sin(p.y * 1.8 - t * 0.42 + uSeed * 1.7) * sin(p.z * 1.5 + t * 0.36 + uSeed * 0.6);
    float b = sin(p.x * 3.0 - t * 0.31 + uSeed * 2.3) * sin(p.y * 2.6 + t * 0.38 + uSeed) * sin(p.z * 3.2 - t * 0.27);
    return a * 0.24 + b * 0.07;
  }
  vec3 shape(vec3 n) { return n * (1.0 + uWobble * lobes(n * 1.25)); }
  void main() {
    vec3 n = normalize(position);
    vec3 ref = abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 t1 = normalize(cross(ref, n)), t2 = cross(n, t1);
    vec3 p0 = shape(n), p1 = shape(normalize(n + t1 * 0.03)), p2 = shape(normalize(n + t2 * 0.03));
    vec4 mv = modelViewMatrix * vec4(p0, 1.0);
    vN = normalize(normalMatrix * normalize(cross(p1 - p0, p2 - p0)));
    vP = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;
/* Vidrio: la portada se ve adentro como a través de una gota (la normal hace
   de lente), con borde claro, un reflejo curvo arriba y algo de iridiscencia.
   Sin portada es una ameba luminosa, como la del logo. */
const FRAG = `
  uniform sampler2D uMap;
  uniform float uHasMap, uOpacity, uTime, uSeed, uFocus, uGlow, uSolid;
  uniform vec3 uA, uB, uC;
  varying vec3 vN; varying vec3 vP;
  void main() {
    vec3 N = normalize(vN), V = normalize(-vP);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 2.4);
    vec2 d = N.xy; float r = length(d);

    float g = 0.5 + 0.5 * N.y + 0.22 * sin(N.x * 3.0 + uTime * 0.4 + uSeed);
    vec3 glow = mix(uA, uB, clamp(g, 0.0, 1.0));
    glow = mix(glow, uC, smoothstep(0.25, 0.95, ndv) * 0.3);

    vec3 img = texture2D(uMap, 0.5 + d * 0.5 * (0.74 + 0.26 * r * r)).rgb;
    img *= mix(1.0, 0.6, smoothstep(0.55, 1.0, r));
    img *= 0.72 + 0.28 * uFocus;
    vec3 col = mix(glow, img, uHasMap);

    vec3 irid = 0.5 + 0.5 * cos(6.2832 * (fres * 0.9 + vec3(0.02, 0.36, 0.62)) + uSeed);
    col = mix(col, vec3(0.93, 0.86, 1.0), fres * 0.55);
    col += irid * fres * 0.22;
    vec3 L1 = normalize(vec3(-0.55, 0.75, 0.6)), L2 = normalize(vec3(0.7, -0.35, 0.5));
    col += smoothstep(0.62, 0.97, dot(N, L1)) * mix(0.09, 0.22, uHasMap);
    col += pow(max(dot(N, normalize(L1 + V)), 0.0), 260.0) * mix(0.3, 0.7, uHasMap);
    col += pow(max(dot(N, normalize(L2 + V)), 0.0), 60.0) * mix(0.08, 0.22, uHasMap);
    col += uGlow * vec3(0.55, 0.42, 1.0) * (0.12 + 0.5 * fres);

    float soft = mix(0.34, 0.95, fres);
    float a = mix(mix(soft, 0.94, uSolid), 0.98, uHasMap);
    gl_FragColor = vec4(col, a * uOpacity);
  }`;

const DUST_VERT = `
  attribute float aSize;
  uniform float uPx;
  varying float vFade;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = aSize * uPx * (5.0 / depth);
    vFade = smoothstep(26.0, 7.0, depth) * smoothstep(0.3, 1.6, depth);
  }`;
const DUST_FRAG = `
  uniform float uDeep;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vec3(0.86, 0.78, 1.0), a * a * vFade * 0.6 * uDeep);
  }`;

export function mount(section, opts) {
  opts = opts || {};
  const reduce = !!opts.reduce, coarse = !!opts.coarse, sound = opts.sound || null;
  const q = (s) => section.querySelector(s);
  const stage = q('.world__stage'), host = q('.world__canvas');
  const intro = q('.world__intro'), hud = q('.world__hud'), end = q('.world__end'), dots = q('.world__dots');
  const links = [].slice.call(section.querySelectorAll('a[data-w-item]'));
  if (!stage || !host || !links.length) return null;
  const hudCount = q('[data-w-count]'), hudTitle = q('[data-w-title]'), hudFmt = q('[data-w-fmt]'), hudOpen = q('a[data-w-open]');
  const n = links.length;

  const canvas = document.createElement('canvas');
  host.appendChild(canvas);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !coarse, powerPreference: 'high-performance' }); }
  catch (e) { canvas.remove(); return null; }
  renderer.setClearColor(0x000000, 0);
  const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 140);
  const TAN = Math.tan(THREE.MathUtils.degToRad(22.5));

  /* ── Amebas ─────────────────────────────────────────────────────────── */
  const geoBig = new THREE.IcosahedronGeometry(1, coarse ? 14 : 22);
  const geoSmall = new THREE.IcosahedronGeometry(1, coarse ? 7 : 10);
  const blank = new THREE.DataTexture(new Uint8Array([40, 30, 90, 255]), 1, 1);
  blank.needsUpdate = true;
  const disposables = [geoBig, geoSmall, blank];
  function ameba(geo, o) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true,
      uniforms: {
        uTime: { value: 0 }, uSeed: { value: o.seed }, uWobble: { value: o.wobble },
        uMap: { value: blank }, uHasMap: { value: 0 }, uOpacity: { value: 0 }, uFocus: { value: 0 },
        uGlow: { value: 0 }, uSolid: { value: o.solid || 0 },
        uA: { value: new THREE.Vector3(...o.a) }, uB: { value: new THREE.Vector3(...o.b) }, uC: { value: new THREE.Vector3(...o.c) },
      },
    });
    disposables.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { mesh, u: mat.uniforms, r: 1, base: new THREE.Vector3(), drift: o.drift || 0, seed: o.seed, far: o.far || 30 };
  }
  const door = ameba(geoBig, { seed: 1.7, wobble: 1, solid: 1, a: C.violet, b: C.pink, c: C.mist });
  const core = ameba(geoBig, { seed: 4.2, wobble: 1, solid: 1, a: C.purple, b: C.lilac, c: C.mist, far: 44 });
  const works = links.map((a, i) => {
    const w = ameba(geoBig, { seed: 2.3 + i * 1.9, wobble: 0.55, a: C.violet, b: C.blue, c: C.lilac });
    w.href = a.href; w.cover = a.getAttribute('data-cover');
    w.title = a.getAttribute('data-title') || ''; w.format = a.getAttribute('data-format') || '';
    w.asked = false; w.mix = 0; w.mixTo = 0;
    return w;
  });
  const palette = [[C.violet, C.pink, C.mist], [C.blue, C.lilac, C.mist], [C.purple, C.pink, C.lilac], [C.blue, C.violet, C.pink]];
  const extras = [];
  for (let i = 0; i < (coarse ? 9 : 18); i++) {
    const p = palette[i % palette.length];
    const e = ameba(geoSmall, { seed: rnd(0, 20), wobble: 1.15, a: p[0], b: p[1], c: p[2], drift: rnd(0.15, 0.5) });
    const side = i % 2 ? 1 : -1;
    e.base.set(side * rnd(2.6, 6.2), rnd(-3.2, 3.2), rnd(-6, -74));
    e.r = rnd(0.22, 0.85);
    extras.push(e);
  }

  /* ── Polvo en suspensión: da la sensación de avanzar ────────────────── */
  const DN = coarse ? 450 : 1100;
  const dPos = new Float32Array(DN * 3), dSize = new Float32Array(DN);
  for (let i = 0; i < DN; i++) {
    dPos[i * 3] = rnd(-8, 8); dPos[i * 3 + 1] = rnd(-4.5, 4.5); dPos[i * 3 + 2] = rnd(4, -84);
    dSize[i] = Math.random() < 0.06 ? rnd(2.2, 4) : rnd(0.5, 1.4);
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dGeo.setAttribute('aSize', new THREE.BufferAttribute(dSize, 1));
  const dMat = new THREE.ShaderMaterial({
    vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uPx: { value: 3 * dpr }, uDeep: { value: 0 } },
  });
  const dust = new THREE.Points(dGeo, dMat);
  dust.frustumCulled = false;
  scene.add(dust);
  disposables.push(dGeo, dMat);

  /* ── Recorrido ──────────────────────────────────────────────────────
     Tiempos (0…1 del scroll): puerta, una parada por obra, final. Entre dos
     paradas la cámara acelera y frena, así que se detiene frente a cada obra. */
  const T_DOOR = 0.085, T_FIRST = 0.17, T_LAST = 0.83;
  const tWork = (i) => (n === 1 ? 0.5 : lerp(T_FIRST, T_LAST, i / (n - 1)));
  const HALF = n === 1 ? 0.2 : (T_LAST - T_FIRST) / (n - 1) / 2;
  let keys = [];                       // [{ t, pos, look }]
  let DIST = 5;                        // distancia de la cámara a la obra en cada parada
  function layout() {
    const w = Math.max(2, stage.clientWidth), h = Math.max(2, stage.clientHeight), aspect = w / h;
    renderer.setSize(w, h, false);
    camera.aspect = aspect; camera.updateProjectionMatrix();
    const wide = aspect > 1.05;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    /* Dónde cae en pantalla: fx, fy son fracciones del medio ancho/alto visible a la distancia d. */
    const at = (d, fx, fy) => [fx * TAN * d * aspect, fy * TAN * d];

    const d0 = 8.5, dr = wide ? 2.1 : 1.3;
    const [dx, dy] = wide ? at(d0, 0.5, 0.04) : at(d0, 0, 0.42);
    door.base.set(dx, dy, 0); door.r = dr;

    const R = 1.25;
    const D = Math.max(5, wide ? 5.7 : (2 * R) / (0.64 * 2 * TAN * aspect));
    const [wx, wy] = wide ? at(D, 0.4, 0) : at(D, 0, 0.3);
    DIST = D;
    keys = [
      { t: 0, pos: V(0, 0, d0), look: V(0, 0, 0) },
      { t: T_DOOR, pos: V(dx, dy, 0), look: V(dx * 0.4, dy * 0.4, -10) },
    ];
    works.forEach((wk, i) => {
      const z = -11 - i * 10, y = Math.sin(i * 1.7) * 0.32;
      wk.base.set(wx, wy + (wide ? y : y * 0.4), z); wk.r = R;
      keys.push({ t: tWork(i), pos: V(0, y * 0.5, z + D), look: V(0, y * 0.5, z) });
    });
    const zc = -11 - (n - 1) * 10 - 17, cr = wide ? 2.5 : 1.5, dc = wide ? 10.5 : 12;
    const [cx, cy] = wide ? at(dc, 0.46, 0) : at(dc, 0, 0.4);
    core.base.set(cx, cy, zc); core.r = cr;
    keys.push({ t: 1, pos: V(0, 0, zc + dc), look: V(0, 0, zc) });
    if (still) draw(0);
  }
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  function path(p) {
    let k = 0;
    while (k < keys.length - 2 && p > keys[k + 1].t) k++;
    const a = keys[k], b = keys[k + 1];
    const u = smooth(0, 1, (p - a.t) / (b.t - a.t));
    camPos.lerpVectors(a.pos, b.pos, u); camLook.lerpVectors(a.look, b.look, u);
  }

  /* ── Portadas: se piden cuando uno se acerca ────────────────────────── */
  const SIZE = coarse ? 512 : 1024;
  function ask(wk) {
    wk.asked = true;
    const img = new Image();
    img.decoding = 'async';
    img.onload = function () {
      if (disposed) return;
      const cv = document.createElement('canvas'); cv.width = cv.height = SIZE;
      const s = Math.min(img.naturalWidth, img.naturalHeight);      // recorte cuadrado del centro
      cv.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, SIZE, SIZE);
      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 4;
      disposables.push(tex);
      wk.u.uMap.value = tex; wk.mixTo = 1;
      if (still) draw(0);
    };
    img.src = wk.cover;
  }

  /* ── Estado ─────────────────────────────────────────────────────────── */
  const still = reduce;
  let p = 0, ps = 0, time = 0, last = 0, raf = 0, visible = true, disposed = false;
  let index = -1, shown = -2, deepOn = null, sDepth = -1, hover = -1, started = false;
  let entering = null;                 // { i, t } mientras la cámara entra a una obra
  const mouse = { x: 0, y: 0, sx: 0, sy: 0, in: false, cx: 0, cy: 0 };
  const tmp = new THREE.Vector3(), ray = new THREE.Vector3();

  function readScroll() {
    const r = section.getBoundingClientRect();
    const total = Math.max(1, r.height - stage.clientHeight);
    p = clamp(-r.top / total, 0, 1);
  }
  function scrollToT(t) {
    const r = section.getBoundingClientRect();
    const total = Math.max(1, r.height - stage.clientHeight);
    window.scrollTo({ top: window.scrollY + r.top + t * total, behavior: still ? 'auto' : 'smooth' });
  }
  function setOpacity(el, v) {
    if (!el) return;
    v = Math.round(v * 100) / 100;
    if (el._o === v) return;
    el._o = v;
    el.style.opacity = v;
    el.style.visibility = v < 0.02 ? 'hidden' : 'visible';
  }
  function showWork(i) {
    if (i === shown) return;
    shown = i;
    if (i >= 0) {
      const wk = works[i];
      if (hudCount) hudCount.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
      if (hudTitle) hudTitle.textContent = wk.title;
      if (hudFmt) hudFmt.textContent = wk.format;
      if (hudOpen) hudOpen.href = wk.href;
    }
    if (dots) [].forEach.call(dots.children, (b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
  }

  function draw(dt) {
    readScroll();
    ps = still ? p : ps + (p - ps) * (1 - Math.exp(-dt * 5));
    if (Math.abs(p - ps) < 0.0004) ps = p;
    time += dt;

    /* Profundidad: se oscurece al entrar por la puerta. */
    const deep = smooth(0.02, T_DOOR, ps);
    stage.style.setProperty('--deep', deep.toFixed(3));
    dMat.uniforms.uDeep.value = 0.25 + 0.75 * deep;
    const on = deep > 0.55;
    if (on !== deepOn) {
      const first = deepOn === null;
      deepOn = on;
      stage.classList.toggle('is-deep', on);
      document.documentElement.classList.toggle('is-under', on);
      if (!first && sound) sound.splash(on ? 'dive' : 'surface');
    }
    const sd = Math.round(deep * 0.85 * 50) / 50;
    if (sound && sd !== sDepth) { sDepth = sd; sound.setDepth(sd, 0.3); }

    /* Qué obra está al frente. */
    let best = -1, bestD = 9;
    for (let i = 0; i < n; i++) { const dd = Math.abs(ps - tWork(i)); if (dd < bestD) { bestD = dd; best = i; } }
    const near = bestD < HALF ? best : -1;
    if (near !== index) {
      if (near >= 0 && started && sound && sound.chime) sound.chime(near);   // una nota suave al llegar a cada obra
      index = near;
    }
    showWork(index >= 0 ? index : (shown >= 0 ? shown : -1));
    setOpacity(intro, 1 - smooth(0.012, 0.06, ps));
    setOpacity(hud, entering ? 0 : (index >= 0 ? 1 - smooth(HALF * 0.55, HALF, bestD) : 0));
    setOpacity(end, entering ? 0 : smooth(0.93, 0.985, ps));
    setOpacity(dots, entering ? 0 : deep);

    /* Cámara. */
    path(ps);
    mouse.sx += (mouse.x - mouse.sx) * 0.06; mouse.sy += (mouse.y - mouse.sy) * 0.06;
    if (!still && !coarse) { camPos.x += mouse.sx * 0.3; camPos.y += mouse.sy * 0.18; }
    let grow = 1;
    if (entering) {
      entering.t = Math.min(1, entering.t + dt / 0.9);
      const e = entering.t * entering.t * (3 - 2 * entering.t), wk = works[entering.i];
      /* La cámara se pone de frente y la ameba crece hasta llenar la pantalla
         (la cámara queda afuera: desde adentro no se vería nada). */
      tmp.set(wk.base.x, wk.base.y, wk.base.z + DIST);
      camPos.lerp(tmp, e); camLook.lerp(wk.base, e);
      grow = lerp(1, (DIST * 0.9) / wk.r, e);
      if (entering.t >= 1 && !entering.done) { entering.done = true; if (opts.navigate) opts.navigate(wk.href); }
    }
    camera.position.copy(camPos); camera.lookAt(camLook);

    door.u.uOpacity.value = place(door, 1, 1) * (1 - smooth(T_DOOR * 0.72, T_DOOR, ps));
    door.mesh.visible = door.u.uOpacity.value > 0.01;
    core.u.uOpacity.value = place(core, 1, 0.8);
    core.mesh.visible = core.u.uOpacity.value > 0.01;
    core.u.uGlow.value = 0.35;
    works.forEach((wk, i) => {
      if (!wk.asked && tWork(i) - ps < HALF * 4.5) ask(wk);
      wk.mix += (wk.mixTo - wk.mix) * (still ? 1 : 0.06);
      const mine = entering && entering.i === i;
      const o = place(wk, mine ? grow : 1, 0.7);
      wk.u.uOpacity.value = mine ? Math.max(o, entering.t) : (entering ? o * (1 - entering.t) : o);
      wk.mesh.visible = wk.u.uOpacity.value > 0.01;
      wk.u.uHasMap.value = wk.mix;
      wk.u.uFocus.value = 1 - smooth(HALF * 0.6, HALF * 1.6, Math.abs(ps - tWork(i)));
      wk.u.uGlow.value += ((hover === i ? 0.6 : 0) - wk.u.uGlow.value) * 0.12;
      if (mine) wk.u.uWobble.value = 0.55 * (1 - entering.t);
    });
    extras.forEach((e) => {
      e.u.uOpacity.value = place(e, 1, 1) * deep * (entering ? 1 - entering.t : 1);
      e.mesh.visible = e.u.uOpacity.value > 0.01;
    });
    renderer.render(scene, camera);
    started = true;
  }
  /* Ubica una ameba y devuelve cuánto se ve: se apaga lejos (niebla) y cuando
     la cámara le pasa por al lado, para que no corte contra la pantalla. */
  function place(a, scale, wob) {
    const m = a.mesh;
    m.position.copy(a.base);
    if (a.drift && !still) {
      m.position.x += Math.sin(time * a.drift + a.seed) * 0.35;
      m.position.y += Math.cos(time * a.drift * 0.8 + a.seed * 1.3) * 0.3;
    }
    m.scale.setScalar(a.r * scale);
    a.u.uTime.value = still ? a.seed : time * wob;
    const dist = camera.position.distanceTo(m.position);
    return smooth(a.far, a.far * 0.55, dist) * smooth(a.r * scale * 0.9, a.r * scale * 0.9 + 2.2, dist);
  }
  function frame(now) {
    raf = 0;
    if (disposed || !visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    if (mouse.in) pick();
    draw(dt);
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && !still && !disposed) raf = requestAnimationFrame(frame); }

  /* ── Tocar una ameba ────────────────────────────────────────────────── */
  function hit(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ray.set(((cx - r.left) / r.width) * 2 - 1, -(((cy - r.top) / r.height) * 2 - 1), 0.5).unproject(camera).sub(camera.position).normalize();
    let bestI = -1, bestT = 1e9;
    works.forEach((wk, i) => {
      if (!wk.mesh.visible || wk.u.uOpacity.value < 0.35) return;
      tmp.copy(wk.mesh.position).sub(camera.position);
      const tc = tmp.dot(ray); if (tc < 0) return;
      const d2 = tmp.lengthSq() - tc * tc, rr = wk.r * 1.05;
      if (d2 < rr * rr && tc < bestT) { bestT = tc; bestI = i; }
    });
    return bestI;
  }
  function pick() {
    const h = entering ? -1 : hit(mouse.cx, mouse.cy);
    if (h === hover) return;
    hover = h;
    stage.classList.toggle('is-hot', h >= 0);
  }
  function enter(i) {
    if (entering || i < 0) return;
    if (still) { if (opts.navigate) opts.navigate(works[i].href); return; }
    entering = { i, t: 0, done: false };
    stage.classList.add('is-entering');
  }

  const ac = new AbortController(), sig = { signal: ac.signal };
  let downX = 0, downY = 0;
  host.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.in = true; mouse.cx = e.clientX; mouse.cy = e.clientY;
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  }, sig);
  host.addEventListener('pointerleave', () => { mouse.in = false; mouse.x = mouse.y = 0; hover = -1; stage.classList.remove('is-hot'); }, sig);
  host.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; }, sig);
  host.addEventListener('click', (e) => {
    if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 8) return;   // fue un arrastre o un scroll con el dedo
    const i = hit(e.clientX, e.clientY);
    if (i < 0) return;
    if (Math.abs(ps - tWork(i)) > HALF * 0.7) scrollToT(tWork(i)); else enter(i);  // si está lejos, primero se va hasta ella
  }, sig);
  if (hudOpen) hudOpen.addEventListener('click', (e) => {
    if (still || e.metaKey || e.ctrlKey || e.shiftKey || e.button || shown < 0) return;   // en pestaña nueva: enlace normal
    e.preventDefault();
    enter(shown);
  }, sig);
  /* Con teclado: al enfocar una obra de la lista, el recorrido va hasta ella. */
  links.forEach((a, i) => a.addEventListener('focus', () => scrollToT(tWork(i)), sig));
  if (dots) {
    works.forEach((wk, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', String(i + 1).padStart(2, '0') + '. ' + wk.title);
      b.addEventListener('click', () => scrollToT(tWork(i)), sig);
      dots.appendChild(b);
    });
  }
  window.addEventListener('scroll', () => { if (still) draw(0); }, { passive: true, signal: ac.signal });
  document.addEventListener('visibilitychange', kick, sig);
  const ro = ('ResizeObserver' in window) ? new ResizeObserver(layout) : null;
  if (ro) ro.observe(stage); else window.addEventListener('resize', layout, sig);
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) kick(); }) : null;
  if (io) io.observe(stage);

  layout();
  readScroll(); ps = p;                // al volver con "atrás" arranca donde estaba, sin viaje
  draw(0);
  kick();

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ac.abort();
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (e) {}
      canvas.remove();
      if (dots) dots.textContent = '';
      document.documentElement.classList.remove('is-under');
    },
  };
}
