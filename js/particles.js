/* ═══════════════════════════════════════════════════════════════════════════
   Alma Digital — partículas en la cabecera de las obras principales
   Un campo de puntos luminosos que toma una "formación" distinta según la
   obra y reacciona al visitante:

     · arrastrar lo gira, con inercia
     · el cursor aparta las partículas que tiene cerca
     · un clic (o un toque) lo dispersa un momento

   Formaciones (site.json → particles):
     attractor  madeja que nunca se repite (atractor de Thomas)   Neurocosm XR
     pulse      organismos que laten, cada uno a su ritmo         Collective Pulse
     halo       anillos concéntricos que respiran cada 6 s        Soul Charger
     strokes    trazos que fluyen como pinceladas                 Neural Canvas

   ÚNICA PIEZA DEL SITIO QUE USA THREE.JS. Es un módulo ES que js/app.js carga
   con import() sólo en las fichas que lo piden, así que el resto del sitio no
   lo descarga. Three.js viene de jsDelivr con la versión fijada (unos 155 KB
   comprimidos, que el navegador guarda en caché). Si el CDN no responde o
   WebGL falla, la ficha queda con su foto, como cualquier otra.

   Cuida los recursos como la ameba: resolución limitada, menos partículas en
   teléfonos, pausa fuera de pantalla o con la pestaña oculta, y con "reducir
   movimiento" dibuja un cuadro quieto. mount() devuelve dispose(): js/app.js
   lo llama al cambiar de página para soltar el contexto WebGL.
   ═══════════════════════════════════════════════════════════════════════ */
/* "+esm" es el paquete de un solo archivo que arma jsDelivr (156 KB comprimido).
   El build/three.module.min.js del paquete importa el núcleo SIN minificar
   (285 KB en total), por eso no se usa. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.187.0/+esm';

const TAU = Math.PI * 2;
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));

/* ── Formaciones ──────────────────────────────────────────────────────
   Cada una recibe la cantidad de partículas y el arreglo de posiciones, y
   devuelve step(dt, t), que las mueve, y warm: cuántos pasos dar antes del
   primer cuadro para que la forma ya esté armada. Todo cabe en ±1,7. */
const FORMATIONS = {
  /* Atractor de Thomas: dx = sin y − b·x (y sus rotaciones). Caótico y acotado. */
  attractor(n, pos) {
    const B = 0.208186, S = 0.42;
    const st = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) st[i] = rnd(-2.4, 2.4);
    return {
      warm: 240,
      step(dt) {
        const h = Math.min(dt, 0.05) * 2.4;
        for (let i = 0; i < n; i++) {
          const k = i * 3, x = st[k], y = st[k + 1], z = st[k + 2];
          st[k] = x + (Math.sin(y) - B * x) * h;
          st[k + 1] = y + (Math.sin(z) - B * y) * h;
          st[k + 2] = z + (Math.sin(x) - B * z) * h;
          pos[k] = st[k] * S; pos[k + 1] = st[k + 1] * S; pos[k + 2] = st[k + 2] * S;
        }
      },
    };
  },

  /* Organismos blandos que laten como un corazón (dos golpes), cada uno a su ritmo,
     y derivan lentamente unos hacia otros. */
  pulse(n, pos) {
    const K = 7, org = [];
    for (let k = 0; k < K; k++) {
      org.push({ x: rnd(-1.5, 1.5), y: rnd(-0.75, 0.75), z: rnd(-0.8, 0.8), r: rnd(0.26, 0.56), bpm: rnd(54, 74), ph: rnd(), d: rnd(TAU) });
    }
    const who = new Uint8Array(n), dir = new Float32Array(n * 3), rad = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      who[i] = (Math.random() * K) | 0;
      const u = rnd(-1, 1), a = rnd(TAU), s = Math.sqrt(1 - u * u);
      dir[i * 3] = s * Math.cos(a); dir[i * 3 + 1] = u; dir[i * 3 + 2] = s * Math.sin(a);
      rad[i] = 0.5 + 0.5 * Math.pow(Math.random(), 0.45);            // casi todas cerca de la piel
    }
    const beat = (t, o) => {
      const p = (t * o.bpm / 60 + o.ph) % 1;
      return Math.exp(-Math.pow((p - 0.08) / 0.045, 2)) + 0.55 * Math.exp(-Math.pow((p - 0.30) / 0.06, 2));
    };
    const cx = new Float32Array(K), cy = new Float32Array(K), cz = new Float32Array(K), cs = new Float32Array(K);
    return {
      warm: 1,
      step(dt, t) {
        for (let k = 0; k < K; k++) {
          const o = org[k];
          cx[k] = o.x + Math.sin(t * 0.11 + o.d) * 0.28;
          cy[k] = o.y + Math.cos(t * 0.09 + o.d * 1.7) * 0.18;
          cz[k] = o.z + Math.sin(t * 0.07 + o.d * 0.6) * 0.2;
          cs[k] = o.r * (1 + 0.24 * beat(t, o));
        }
        for (let i = 0; i < n; i++) {
          const k = i * 3, w = who[i], s = cs[w] * rad[i] * (1 + 0.03 * Math.sin(t * 1.3 + i));
          pos[k] = cx[w] + dir[k] * s; pos[k + 1] = cy[w] + dir[k + 1] * s; pos[k + 2] = cz[w] + dir[k + 2] * s;
        }
      },
    };
  },

  /* Anillos concéntricos alrededor de un núcleo. Todo respira cada 6 s. */
  halo(n, pos) {
    const RINGS = [0.55, 0.85, 1.15, 1.45];
    const ring = new Float32Array(n), ang = new Float32Array(n), oy = new Float32Array(n), core = new Uint8Array(n), dir = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      if (Math.random() < 0.17) {
        core[i] = 1;
        const u = rnd(-1, 1), a = rnd(TAU), s = Math.sqrt(1 - u * u), r = 0.3 * Math.cbrt(Math.random());
        dir[i * 3] = s * Math.cos(a) * r; dir[i * 3 + 1] = u * r; dir[i * 3 + 2] = s * Math.sin(a) * r;
      } else {
        ring[i] = RINGS[(Math.random() * RINGS.length) | 0] + rnd(-0.045, 0.045);
        ang[i] = rnd(TAU); oy[i] = rnd(-0.045, 0.045);
      }
    }
    return {
      warm: 1,
      step(dt, t) {
        const breath = 1 + 0.1 * Math.sin(TAU * t / 6);
        for (let i = 0; i < n; i++) {
          const k = i * 3;
          if (core[i]) {
            const s = breath * (1 + 0.12 * Math.sin(t * 0.9 + i));
            pos[k] = dir[k] * s; pos[k + 1] = dir[k + 1] * s; pos[k + 2] = dir[k + 2] * s;
          } else {
            ang[i] += dt * 0.2 / ring[i];
            const R = ring[i] * breath;
            pos[k] = Math.cos(ang[i]) * R; pos[k + 1] = oy[i] + 0.04 * Math.sin(ang[i] * 3 + t); pos[k + 2] = Math.sin(ang[i]) * R;
          }
        }
      },
    };
  },

  /* Trazos: las partículas nacen en unos pocos puntos y siguen un mismo campo
     de flujo, así que cada origen dibuja una cinta. */
  strokes(n, pos) {
    const S = 30, seeds = [];
    for (let s = 0; s < S; s++) seeds.push([rnd(-1.7, 1.7), rnd(-0.95, 0.95), rnd(-0.7, 0.7)]);
    const age = new Float32Array(n), life = new Float32Array(n);
    const spawn = (i) => {
      const s = seeds[(Math.random() * S) | 0], k = i * 3;
      pos[k] = s[0] + rnd(-0.03, 0.03); pos[k + 1] = s[1] + rnd(-0.03, 0.03); pos[k + 2] = s[2] + rnd(-0.03, 0.03);
      age[i] = 0; life[i] = rnd(2.5, 6.5);
    };
    for (let i = 0; i < n; i++) { spawn(i); age[i] = rnd(life[i]); }
    return {
      warm: 200,
      step(dt, t) {
        const h = Math.min(dt, 0.05) * 0.34;
        for (let i = 0; i < n; i++) {
          const k = i * 3, x = pos[k], y = pos[k + 1], z = pos[k + 2];
          pos[k] = x + (Math.sin(y * 1.7 + t * 0.21) + Math.cos(z * 1.3)) * h;
          pos[k + 1] = y + (Math.sin(z * 1.5 + t * 0.17) + Math.cos(x * 1.9)) * h;
          pos[k + 2] = z + (Math.sin(x * 1.4 + t * 0.13) + Math.cos(y * 1.6)) * h * 0.6;
          age[i] += dt;
          if (age[i] > life[i] || Math.abs(pos[k]) > 2.3 || Math.abs(pos[k + 1]) > 1.5 || Math.abs(pos[k + 2]) > 1.3) spawn(i);
        }
      },
    };
  },
};

const VERT = `
  attribute vec3 aColor; attribute float aSize;
  uniform float uPx; uniform vec2 uMouse; uniform float uPush; uniform float uBurst;
  varying vec3 vColor; varying float vFade;
  void main() {
    vec3 p = position * (1.0 + uBurst * 0.4);                 // el clic lo dispersa
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;
    vec2 ndc = clip.xy / clip.w;
    vec2 d = ndc - uMouse;                                     // el cursor aparta lo que tiene cerca
    ndc += normalize(d + 1e-5) * exp(-dot(d, d) * 9.0) * uPush * 0.2;
    clip.xy = ndc * clip.w;
    gl_Position = clip;
    float depth = -mv.z;
    gl_PointSize = aSize * uPx * (4.6 / depth);
    vFade = smoothstep(7.2, 3.0, depth);                       // lo lejano se apaga
    vColor = aColor;
  }`;
const FRAG = `
  varying vec3 vColor; varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, a * a * vFade * 0.85);         // disco blando; se suma (blending aditivo)
  }`;

/* host: contenedor donde va el canvas. opts: { formation, colors[], hero } */
export function mount(host, opts) {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const hero = opts.hero || host;
  const n = coarse ? 5200 : 13000;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' }); }
  catch (e) { canvas.remove(); return null; }
  renderer.setClearColor(0x000000, 0);
  const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 30);
  camera.position.set(0, 0, 4.6);

  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n);
  const palette = (opts.colors && opts.colors.length ? opts.colors : ['#c99ef9', '#7a5cf2', '#5b8def', '#ffffff']).map((c) => new THREE.Color(c.trim()));
  for (let i = 0; i < n; i++) {
    const c = palette[(Math.random() * palette.length) | 0];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    size[i] = Math.random() < 0.04 ? rnd(2.4, 4.6) : rnd(0.6, 1.5);   // unas pocas grandes, como bokeh
  }
  const form = (FORMATIONS[opts.formation] || FORMATIONS.attractor)(n, pos);
  let simT = 0;
  for (let i = 0; i < form.warm; i++) { form.step(1 / 60, simT); simT += 1 / 60; }

  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));

  const uniforms = { uPx: { value: 3.2 * dpr }, uMouse: { value: new THREE.Vector2(9, 9) }, uPush: { value: 0 }, uBurst: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  const baseTilt = opts.formation === 'halo' ? 1.08 : 0.18;
  /* La madeja y los trazos ocupan todo su volumen; se achican para que entren
     enteros y no pasen por detrás del menú. */
  const fit = { attractor: 0.74, strokes: 0.78 }[opts.formation] || 1;
  let yaw = 0, pitch = 0, vyaw = 0, vpitch = 0;
  let dragging = false, dragId = null, lx = 0, ly = 0, moved = 0;
  let push = 0, pushT = 0, burst = 0, boost = 0;
  const mouseT = new THREE.Vector2(9, 9);
  let visible = true, raf = 0, last = 0, disposed = false;

  function resize() {
    const w = Math.max(2, host.clientWidth), h = Math.max(2, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // En pantallas anchas la forma va a la derecha (el título está abajo a la izquierda); en angostas, arriba.
    const wide = camera.aspect > 1.35;
    group.position.set(wide ? Math.min(1.5, camera.aspect * 0.42) : 0, wide ? 0.1 : 0.5, 0);
    group.scale.setScalar((wide ? 1 : 0.7) * fit);
    if (still) render();
  }
  function render() {
    group.rotation.set(baseTilt + pitch, yaw, 0);
    renderer.render(scene, camera);
  }
  function frame(now) {
    raf = 0;
    if (disposed || !visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    boost += (0 - boost) * 0.04; burst += (0 - burst) * 0.05;
    push += (pushT - push) * 0.08;
    const sdt = dt * (1 + boost * 3);
    simT += sdt;
    form.step(sdt, simT);
    posAttr.needsUpdate = true;
    if (!dragging) { yaw += vyaw + dt * 0.06; pitch += vpitch; vyaw *= 0.94; vpitch *= 0.94; }
    pitch = Math.max(-1.2, Math.min(1.2, pitch));
    uniforms.uMouse.value.lerp(mouseT, 0.18);
    uniforms.uPush.value = push;
    uniforms.uBurst.value = burst;
    render();
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && !still && !disposed) raf = requestAnimationFrame(frame); }

  const ac = new AbortController(), sig = { signal: ac.signal };
  const interactive = (el) => !!(el.closest && el.closest('a, button'));
  hero.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouseT.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    pushT = 1;
    if (dragging && e.pointerId === dragId) {
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      vyaw = dx * 0.006; vpitch = dy * 0.006; yaw += vyaw; pitch += vpitch;
      if (still) render();
    }
  }, sig);
  hero.addEventListener('pointerleave', () => { pushT = 0; }, sig);
  hero.addEventListener('pointerdown', (e) => {
    if (e.button || interactive(e.target)) return;
    dragging = true; dragId = e.pointerId; lx = e.clientX; ly = e.clientY; moved = 0; vyaw = vpitch = 0;
  }, sig);
  const release = (e, cancelled) => {
    if (!dragging || e.pointerId !== dragId) return;
    dragging = false;
    if (!cancelled && moved < 6) { burst = 1; boost = 1; }   // clic sin arrastre: se dispersa
  };
  window.addEventListener('pointerup', (e) => release(e, false), sig);
  window.addEventListener('pointercancel', (e) => release(e, true), sig);
  document.addEventListener('visibilitychange', kick, sig);

  const ro = ('ResizeObserver' in window) ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(host); else window.addEventListener('resize', resize, sig);
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) kick(); }) : null;
  if (io) io.observe(canvas);

  resize();
  render();
  kick();

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ac.abort();
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      geo.dispose(); mat.dispose();
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (e) {}
      canvas.remove();
    },
  };
}
