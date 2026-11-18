/* ═══════════════════════════════════════════════════════════════════════════
   Alma Digital — el mundo interior (la portada: index.html)

   Un recorrido en 3D. Idea tomada de mirages.nrly.fun (Nathan Riley, Unseen
   Studio), llevada a la marca:

     · la primera pantalla es sólo el título y el logo; se entra por una ameba
       grande, que es la puerta;
     · adentro, la primera parada es la ameba del estudio, con su descripción;
     · la segunda es el reel: una pantalla que flota y se reproduce sola, en
       silencio (una versión liviana; "Ver con sonido" abre el reel completo);
     · después, el paso a las obras: la cámara atraviesa tres anillos de luz,
       como los del icono, mientras aparece "Obras seleccionadas";
     · una ameba por obra, y al final un cierre (las obras, el estudio, contacto);
     · las amebas están repartidas en el espacio: a distinta altura, a un lado
       u otro, más cerca o más lejos, y la cámara gira hacia cada una. Al
       avanzar sube, baja, se corre, gira y se ladea;
     · adentro está oscuro. Las amebas son de vidrio y llevan adentro un arte
       hecho con los colores de su obra, que se mezclan como tinta en agua
       (no llevan fotos: deformadas por la gota se veían poco profesionales);
     · el fondo sigue siendo el fluido del sitio, teñido de violeta profundo:
       sus remolinos son el "líquido" de este mundo y responden al cursor;
     · hay polvo en suspensión y tres corrientes de partículas que giran
       alrededor del camino;
     · cada ameba tiene su enjambre: suelto mientras se pasa, y al detenerse
       frente a ella se ordena en una forma propia (anillos, madeja, domo…);
     · al avanzar, unos hilos de luz se adelantan y dos luces con cola van
       por delante, como guías;
     · se avanza con el scroll NORMAL de la página (no se secuestra la rueda):
       la sección es alta y el escenario queda fijo mientras se la recorre;
     · un clic en la ameba de una obra (o en "Entrar a la obra") la derrama
       como un líquido hasta cubrir la pantalla; en ese líquido aparece la
       portada, que se asienta en la cabecera de la ficha, y la ficha se abre.

   Sin esto la página igual sirve: js/app.js deja a la vista el título, el reel
   con su póster y la lista de obras si Three.js o WebGL no arrancan, y sin
   JavaScript queda eso mismo.

   Three.js llega del CDN (el mismo archivo que usa js/particles.js, así que
   el navegador lo descarga una sola vez). Cuida los recursos como la ameba:
   resolución limitada, pausa fuera de pantalla o con la pestaña oculta; el
   video del reel se pide recién al acercarse a su parada. Con "reducir
   movimiento" las amebas no ondulan, la cámara no tiene inercia y el reel
   queda en su póster.

   mount(section, opts) → { dispose() } o null.
   opts: { navigate(href), sound (window.AlmaSound o nada), reduce, coarse,
           reelFull() → abre el reel completo con sonido; true si lo abrió }
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.187.0/+esm';
/* Dos piezas de los ejemplos oficiales de Three.js, del mismo CDN y la misma versión:
   el entorno de estudio que ilumina los íconos y las cajas de puntas redondas. */
import { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/environments/RoomEnvironment.js/+esm';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/geometries/RoundedBoxGeometry.js/+esm';

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
/* Vidrio: borde claro, un reflejo curvo arriba y algo de iridiscencia. Las
   amebas del recorrido (uArt = 1) llevan adentro un arte con los colores de su
   obra; las demás son luminosas, como la del logo. */
const FRAG = `
  uniform float uArt, uOpacity, uTime, uSeed, uFocus, uGlow, uSolid;
  uniform vec3 uA, uB, uC, uP0, uP1, uP2, uP3, uStage;
  uniform vec2 uLook;
  varying vec3 vN; varying vec3 vP;
  void main() {
    vec3 N = normalize(vN), V = normalize(-vP);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 2.4);
    vec2 d = N.xy; float r = length(d);

    float g = 0.5 + 0.5 * N.y + 0.22 * sin(N.x * 3.0 + uTime * 0.4 + uSeed);
    vec3 glow = mix(uA, uB, clamp(g, 0.0, 1.0));
    glow = mix(glow, uC, smoothstep(0.25, 0.95, ndv) * 0.3);

    /* El arte de adentro: los colores de la obra mezclándose despacio, como tinta
       en agua. La normal hace de lente (el dibujo se curva con la gota) y todo se
       corre un poco con el cursor, como al mirar dentro de una bola de cristal.
       Hacia el borde se hunde en el color de fondo de la obra. */
    vec2 uv = d * (0.74 + 0.26 * r * r) * 1.5 + uLook * 3.0 * (1.0 - r * r);
    float t = uTime * 0.16 + uSeed * 3.0;
    vec2 w = uv + 0.60 * vec2(sin(uv.y * 2.1 + t * 1.3 + uSeed), cos(uv.x * 1.9 - t * 1.1));
    w += 0.32 * vec2(sin(w.y * 3.7 - t * 0.9 + uSeed * 2.0), cos(w.x * 3.3 + t * 0.7));
    float f1 = 0.5 + 0.5 * sin(w.x * 2.1 + w.y * 1.3 + t);
    float f2 = 0.5 + 0.5 * sin(w.y * 2.7 - w.x * 1.5 - t * 0.8 + 2.0);
    float f3 = 0.5 + 0.5 * sin(length(w + vec2(0.3, -0.2)) * 4.2 - t * 1.4);
    vec3 art = mix(uP0, uP1, smoothstep(0.2, 0.8, f1));
    art = mix(art, uP2, smoothstep(0.35, 0.95, f2) * 0.85);
    art = mix(art, uP3, smoothstep(0.72, 1.0, f3) * 0.6);
    art = mix(art, uStage, smoothstep(0.3, 1.05, r) * 0.7);
    art *= 0.8 + 0.2 * uFocus;
    vec3 col = mix(glow, art, uArt);

    /* Película líquida: bandas de color que se arrastran por la superficie, como en una pompa de jabón. */
    float film = 0.5 + 0.5 * sin(d.x * 5.0 + sin(d.y * 6.0 + uTime * 0.45 + uSeed) * 1.6 + uTime * 0.3);
    vec3 irid = 0.5 + 0.5 * cos(6.2832 * (fres * 0.9 + film * 0.35 + vec3(0.02, 0.36, 0.62)) + uSeed);
    col = mix(col, vec3(0.93, 0.86, 1.0), fres * 0.55);
    col += irid * (fres * 0.22 + film * smoothstep(0.35, 1.0, r) * 0.1);
    vec3 L1 = normalize(vec3(-0.55, 0.75, 0.6)), L2 = normalize(vec3(0.7, -0.35, 0.5));
    col += smoothstep(0.62, 0.97, dot(N, L1)) * mix(0.09, 0.16, uArt);
    col += pow(max(dot(N, normalize(L1 + V)), 0.0), 260.0) * mix(0.3, 0.7, uArt);
    col += pow(max(dot(N, normalize(L2 + V)), 0.0), 60.0) * mix(0.08, 0.2, uArt);
    col += uGlow * vec3(0.55, 0.42, 1.0) * (0.12 + 0.5 * fres);

    float soft = mix(0.34, 0.95, fres);
    float a = mix(mix(soft, 0.94, uSolid), 0.98, uArt);
    gl_FragColor = vec4(col, a * uOpacity);
  }`;

/* ── El reel: una pantalla que flota ───────────────────────────────────
   Un plano con el video (antes, su póster), de puntas redondas, con filo de
   vidrio y un resplandor violeta alrededor que respira. El plano es más grande
   que el video (uPad) para tener dónde dibujar el resplandor. */
const REEL_VERT = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const REEL_FRAG = `
  uniform sampler2D uMap;
  uniform float uOpacity, uAspect, uHas, uTime, uPad;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * (1.0 + 2.0 * uPad);              // de -0,5 a 0,5 es el video
    vec2 s = vec2(uAspect, 1.0);                            // en altos del video
    float rad = 0.04 * min(uAspect, 1.0) + 0.012;
    vec2 qd = abs(p) * s - (s * 0.5 - rad);
    float d = length(max(qd, 0.0)) + min(max(qd.x, qd.y), 0.0) - rad;   // distancia al borde redondeado
    float inside = smoothstep(0.004, -0.004, d);
    vec3 idle = mix(vec3(0.10, 0.07, 0.24), vec3(0.21, 0.14, 0.44), p.y + 0.5);
    vec3 col = mix(idle, texture2D(uMap, p + 0.5).rgb, uHas);
    col += vec3(0.93, 0.86, 1.0) * smoothstep(0.011, 0.0, abs(d)) * 0.4;   // filo de vidrio
    float reach = uPad * min(uAspect, 1.0);
    float halo = exp(-max(d, 0.0) * 11.0) * 0.42 * smoothstep(reach, reach * 0.3, d) * (0.85 + 0.15 * sin(uTime * 1.0472));
    gl_FragColor = vec4(mix(vec3(0.58, 0.44, 1.0), col, inside), max(inside, halo) * uOpacity);
  }`;

/* Partículas: polvo que deriva y titila, y corrientes (aFlow) que giran
   alrededor del camino. El cursor las aparta y crecen cuando se avanza rápido. */
const DUST_VERT = `
  attribute float aSize, aSeed, aTint, aFlow;
  uniform float uPx, uTime, uBoost, uPush, uDrift;
  uniform vec2 uMouse;
  varying float vFade; varying float vTint;
  void main() {
    vec3 p = position;
    if (aFlow > 0.5) {
      float a = uTime * 0.045, c = cos(a), s = sin(a);
      p.xy = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
      p.y *= 0.62;
    }
    p.x += sin(uTime * 0.21 + aSeed * 6.3) * 0.3 * uDrift;
    p.y += cos(uTime * 0.17 + aSeed * 9.1) * 0.26 * uDrift;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;
    vec2 ndc = clip.xy / clip.w, d = ndc - uMouse;
    ndc += normalize(d + 1e-5) * exp(-dot(d, d) * 14.0) * uPush * 0.12;
    clip.xy = ndc * clip.w;
    gl_Position = clip;
    float depth = -mv.z;
    gl_PointSize = aSize * uPx * (5.0 / depth) * (1.0 + uBoost * 1.5);
    float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 1.4) + aSeed * 40.0);
    vFade = smoothstep(28.0, 7.0, depth) * smoothstep(0.3, 1.6, depth) * twinkle;
    vTint = aTint;
  }`;
const DUST_FRAG = `
  uniform float uDeep;
  varying float vFade; varying float vTint;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec3 lilac = vec3(0.86, 0.78, 1.0), blue = vec3(0.62, 0.72, 1.0), pink = vec3(1.0, 0.74, 0.92);
    vec3 c = vTint < 0.5 ? mix(lilac, blue, vTint * 2.0) : mix(blue, pink, vTint * 2.0 - 1.0);
    gl_FragColor = vec4(c, a * a * vFade * 0.9 * uDeep);
  }`;

/* ── El enjambre de cada obra ──────────────────────────────────────────
   Unas cientos de partículas por obra. Sueltas, son una nube que deriva
   alrededor de la ameba; al detenerse frente a la obra (uForm → 1) cada una
   va a su lugar en la forma, en espiral y a destiempo. La forma gira, y según
   la obra late, respira u ondula. */
const SWARM_VERT = `
  attribute vec3 aTarget, aColor;
  attribute float aSeed, aSize;
  uniform float uForm, uTime, uPx, uSpin, uBeat, uBpm, uBreath, uWave;
  uniform mat3 uTilt;
  varying vec3 vColor; varying float vA;
  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
  float beat(float t) {                      // latido: dos golpes
    float p = fract(t), a = (p - 0.08) / 0.045, b = (p - 0.30) / 0.06;
    return exp(-a * a) + 0.55 * exp(-b * b);
  }
  void main() {
    vec3 f = position;
    f.xz = rot(uTime * 0.04) * f.xz;
    f += vec3(sin(uTime * 0.23 + aSeed * 17.0), cos(uTime * 0.19 + aSeed * 11.0), sin(uTime * 0.17 + aSeed * 5.0)) * 0.22;

    vec3 t = aTarget;
    float far = length(t);
    t.xz = rot(uTime * uSpin) * t.xz;
    t.y += uWave * sin(length(t.xz) * 5.0 - uTime * 2.2);
    t *= 1.0 + uBeat * beat(uTime * uBpm / 60.0 - far * 0.22) + uBreath * sin(uTime * 1.0472);   // 1,0472 = un ciclo cada 6 s
    t = uTilt * t;

    float k = smoothstep(aSeed * 0.45, aSeed * 0.45 + 0.55, uForm);
    vec3 p = mix(f, t, k);
    p.xz = rot((1.0 - k) * k * 2.4) * p.xz;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = aSize * uPx * (5.0 / depth) * mix(0.55, 1.0, k);        // sueltas se confunden con el polvo; formadas, se destacan
    float tw = 0.6 + 0.4 * sin(uTime * (0.7 + aSeed * 1.6) + aSeed * 40.0);
    vA = smoothstep(0.3, 1.6, depth) * mix(0.3, 1.0, k) * mix(tw, 0.75 + 0.25 * tw, k);
    vColor = mix(vec3(0.86, 0.78, 1.0), aColor, 0.35 + 0.65 * k);
  }`;
const SWARM_FRAG = `
  uniform float uOpacity;
  varying vec3 vColor; varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, a * a * vA * uOpacity);
  }`;
const TAU2 = Math.PI * 2;
function onSphere(r) {
  const u = rnd(-1, 1), a = rnd(0, TAU2), q = Math.sqrt(1 - u * u);
  return [q * Math.cos(a) * r, u * r, q * Math.sin(a) * r];
}
/* Formas: n puntos alrededor de la ameba (radio 1,25), centrados en ella. */
const FORMS = {
  /* Anillos concéntricos, como los de la respiración (Soul Charger). */
  halo(n, put) {
    const R = [1.62, 1.92, 2.22, 2.52];
    for (let i = 0; i < n; i++) {
      const r = R[(Math.random() * R.length) | 0] + rnd(-0.035, 0.035), a = rnd(0, TAU2);
      put(i, Math.cos(a) * r, rnd(-0.03, 0.03), Math.sin(a) * r);
    }
  },
  /* Anillos de frente, como el icono de Alma (la ameba del estudio). */
  logo(n, put) {
    const R = [1.6, 1.85, 2.1, 2.35, 2.6];
    for (let i = 0; i < n; i++) {
      const r = R[(Math.random() * R.length) | 0] + rnd(-0.025, 0.025), a = rnd(0, TAU2);
      put(i, Math.cos(a) * r, rnd(-0.02, 0.02), Math.sin(a) * r);
    }
  },
  /* Madeja que no se repite: atractor de Thomas (Neurocosm XR). */
  attractor(n, put) {
    const B = 0.208186;
    for (let i = 0; i < n; i++) {
      let x = rnd(-2.4, 2.4), y = rnd(-2.4, 2.4), z = rnd(-2.4, 2.4);
      for (let k = 0; k < 260; k++) {
        const dx = Math.sin(y) - B * x, dy = Math.sin(z) - B * y, dz = Math.sin(x) - B * z;
        x += dx * 0.09; y += dy * 0.09; z += dz * 0.09;
      }
      put(i, x * 0.56, y * 0.56, z * 0.56);
    }
  },
  /* Tres capas que laten de adentro hacia afuera (Collective Pulse). */
  pulse(n, put) {
    for (let i = 0; i < n; i++) {
      const w = Math.random(), r = (w < 0.5 ? 1.7 : w < 0.8 ? 2.1 : 2.5) + rnd(-0.04, 0.04), q = onSphere(r);
      put(i, q[0], q[1], q[2]);
    }
  },
  /* Pinceladas: arcos gruesos al medio y finos en las puntas (Neural Canvas). */
  strokes(n, put) {
    const S = 9, st = [];
    for (let k = 0; k < S; k++) st.push({ r: rnd(1.65, 2.5), a: rnd(0, TAU2), len: rnd(1.3, 2.8), rise: rnd(-0.5, 0.5), rx: rnd(-0.9, 0.9), rz: rnd(-0.9, 0.9) });
    for (let i = 0; i < n; i++) {
      const k = st[i % S], u = Math.random(), a = k.a + u * k.len, r = k.r + (u - 0.5) * 0.25 + rnd(-1, 1) * 0.06 * Math.sin(Math.PI * u);
      let x = Math.cos(a) * r, y = k.rise * (u - 0.5) + rnd(-1, 1) * 0.05 * Math.sin(Math.PI * u), z = Math.sin(a) * r;
      const cx = Math.cos(k.rx), sx = Math.sin(k.rx), cz = Math.cos(k.rz), sz = Math.sin(k.rz);
      const y1 = y * cx - z * sx, z1 = y * sx + z * cx;            // inclinación propia de cada trazo
      put(i, x * cz - y1 * sz, x * sz + y1 * cz, z1);
    }
  },
  /* Media esfera de meridianos y paralelos (Neurocosm Full Dome). */
  dome(n, put) {
    const R = 2.25;
    for (let i = 0; i < n; i++) {
      let th, ph;
      if (Math.random() < 0.55) { ph = ((Math.random() * 14) | 0) / 14 * TAU2; th = Math.acos(Math.random()); }
      else { th = (((Math.random() * 5) | 0) + 1) / 5.6 * Math.PI / 2; ph = rnd(0, TAU2); }
      put(i, R * Math.sin(th) * Math.cos(ph), R * Math.cos(th) - 0.75, R * Math.sin(th) * Math.sin(ph));
    }
  },
  /* Ondas que se abren en un plano, como sonido (Pacha Ibiza). */
  wave(n, put) {
    for (let i = 0; i < n; i++) {
      const r = 1.5 + ((Math.random() * 6) | 0) * 0.3 + rnd(-0.03, 0.03), a = rnd(0, TAU2);
      put(i, Math.cos(a) * r, -0.95, Math.sin(a) * r);
    }
  },
  /* Dos brazos en espiral, como una galaxia (paradas en galaxia). Es un disco
     redondo: el aplastamiento y la inclinación se los da la matriz de cada obra. */
  galaxy(n, put) {
    for (let i = 0; i < n; i++) {
      const arm = i % 2, u = Math.pow(Math.random(), 0.75), r = 0.85 + u * 2.75;
      const a = arm * Math.PI + r * 1.3 + rnd(-0.3, 0.3) * (1.25 - u);
      put(i, Math.cos(a) * r, rnd(-0.07, 0.07) * (1.5 - u), Math.sin(a) * r);
    }
  },
};
/* Cómo se mueve cada forma: giro (rad/s), inclinación, latido, respiración, onda. */
const FORM_FX = {
  logo: { spin: 0.1, tilt: [1.45, 0], breath: 0.05 },
  halo: { spin: 0.3, tilt: [1.08, 0.12], breath: 0.05 },
  attractor: { spin: 0.16, tilt: [0.25, 0], breath: 0.03 },
  pulse: { spin: 0.08, tilt: [0.15, 0], beat: 0.11, bpm: 62 },
  strokes: { spin: 0.2, tilt: [0.2, 0.1] },
  dome: { spin: 0.14, tilt: [0.3, 0], breath: 0.02 },
  wave: { spin: 0.1, tilt: [0.55, 0], wave: 0.13 },
  galaxy: { spin: 0.07, tilt: [0.36, 0] },
};

/* ── Luces que avanzan ─────────────────────────────────────────────────
   Hilos: líneas finas alrededor del camino que se adelantan a la cámara y se
   estiran con la velocidad; en reposo son chispas casi quietas.
   Guías: dos luces con cola que van por delante (siguen al scroll, no a la
   cámara, así que se adelantan y uno las alcanza). La cola tiembla un poco,
   como electricidad. */
const STREAK_VERT = `
  attribute float aEnd, aSeed;
  uniform float uCamZ, uTravel, uBoost, uDir, uTime, uDeep;
  varying float vA;
  void main() {
    float z = mod(position.z + uTravel + uTime * 0.25, 34.0);        // avanzan al doble que la cámara, y despacio en reposo
    float zw = uCamZ + 4.0 - z;                                   // de 4 por detrás de la cámara a 30 por delante
    zw += aEnd * (0.12 + uBoost * 3.2) * uDir;                    // la cola queda hacia donde se venía
    vec2 xy = position.xy + vec2(sin(zw * 1.3 + uTime * 2.0 + aSeed * 30.0), cos(zw * 1.1 + uTime * 1.7 + aSeed * 12.0)) * 0.07;
    vec4 mv = modelViewMatrix * vec4(xy, zw, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    vA = (1.0 - aEnd) * smoothstep(30.0, 14.0, depth) * smoothstep(0.5, 3.0, depth) * (0.22 + 0.78 * uBoost) * uDeep;
  }`;
const STREAK_FRAG = `
  varying float vA;
  void main() { gl_FragColor = vec4(0.9, 0.86, 1.0, vA); }`;
const WISP_VERT = `
  attribute float aAge;
  attribute vec3 aColor;
  uniform float uPx, uTime, uDeep;
  varying vec3 vColor; varying float vA;
  void main() {
    vec3 p = position;
    p.xy += vec2(sin(aAge * 38.0 - uTime * 9.0), cos(aAge * 31.0 - uTime * 7.0)) * 0.03 * aAge;   // la cola tiembla
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = uPx * (5.0 / depth) * mix(3.4, 0.5, aAge);
    vA = pow(1.0 - aAge, 1.6) * smoothstep(0.4, 2.0, depth) * uDeep;
    vColor = mix(vec3(1.0), aColor, smoothstep(0.0, 0.25, aAge));
  }`;
const WISP_FRAG = `
  varying vec3 vColor; varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, a * a * vA * 0.5);
  }`;

/* ── El derrame ────────────────────────────────────────────────────────
   Al entrar a una obra, su ameba se vuelve líquido: una mancha que crece desde
   donde estaba hasta cubrir la pantalla, con el borde ondulando. Arranca con
   los colores de la ameba; adentro va apareciendo la portada, y al final se
   acomoda en el encuadre y el degradado que tiene la cabecera de la ficha
   (css: .phero), así el cambio de página casi no se nota. Es un plano a
   pantalla completa, dibujado encima de todo.
   uT 0…1: hasta 0,62 crece; desde 0,62 se asienta. */
const LIQ_VERT = `
  varying vec2 vUv;
  void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const LIQ_FRAG = `
  uniform sampler2D uFull;
  uniform float uT, uTime, uAspect, uR0, uRMax, uHero, uImg, uSeed, uFade, uHasImg;
  uniform vec2 uCenter;
  uniform vec3 uP0, uP1, uP2;
  varying vec2 vUv;
  /* uv dentro de una caja con ese aspecto → uv de la imagen, como object-fit: cover. */
  vec2 coverUV(vec2 uv, float boxAspect) {
    vec2 k = boxAspect > uImg ? vec2(1.0, uImg / boxAspect) : vec2(boxAspect / uImg, 1.0);
    return (uv - 0.5) * k + 0.5;
  }
  void main() {
    vec2 p = vUv - uCenter; p.x *= uAspect;                      // en altos de pantalla
    float d = length(p), ang = atan(p.y, p.x);
    float grow = smoothstep(0.0, 0.62, uT);
    float settle = smoothstep(0.62, 1.0, uT);
    float calm = 1.0 - smoothstep(0.38, 0.72, uT);
    float lob = sin(ang * 3.0 + uTime * 1.6 + uSeed) * 0.16 + sin(ang * 5.0 - uTime * 2.1 + uSeed * 2.0) * 0.09
              + sin(ang * 8.0 + uTime * 2.7) * 0.04;
    float R = mix(uR0, uRMax, grow) * (1.0 + lob * calm * (0.35 + grow));
    float edge = d - R;
    float inside = smoothstep(0.006, -0.006, edge);
    if (inside < 0.002) discard;
    float band = smoothstep(-0.16 - 0.1 * grow, 0.0, edge);     // 0 adentro → 1 en el frente del líquido
    vec2 dir = p / max(d, 1e-4);

    /* La portada: a pantalla completa → encuadre de la cabecera de la ficha (un solo
       muestreo cuyo encuadre va cambiando: mezclar dos imágenes se veía doble). */
    vec2 bend = dir * band * band * 0.05 * (1.0 - settle);       // el frente dobla la imagen
    vec2 fullUV = coverUV(vUv - bend, uAspect);
    vec2 box = vec2(vUv.x, (vUv.y - (1.0 - uHero)) / uHero);     // la cabecera de la ficha: la franja de arriba
    vec2 heroUV = coverUV(box, uAspect / uHero);
    vec3 img = texture2D(uFull, mix(fullUV, heroUV, settle)).rgb;
    /* El líquido arranca con los colores de la ameba y la portada va apareciendo adentro. */
    float sw = 0.5 + 0.5 * sin(ang * 2.0 + d * 5.0 - uTime * 1.3 + uSeed);
    vec3 ink = mix(mix(uP0, uP1, sw), uP2, smoothstep(0.2, 1.0, band) * 0.6);
    vec3 col = mix(ink, img, smoothstep(0.08, 0.5, uT) * uHasImg);

    col = mix(col, vec3(0.93, 0.86, 1.0), pow(band, 5.0) * 0.45 * (1.0 - settle));
    vec3 irid = 0.5 + 0.5 * cos(6.2832 * (band * 0.9 + vec3(0.02, 0.36, 0.62)) + uSeed);
    col += irid * pow(band, 2.5) * 0.2 * (1.0 - settle);

    /* Al asentarse: el mismo degradado de .phero::after, y se abre por debajo de la cabecera. */
    float shade = box.y < 0.46 ? mix(0.9, 0.36, box.y / 0.46) : mix(0.36, 0.3, (box.y - 0.46) / 0.54);
    col = mix(col, mix(col, vec3(0.031, 0.027, 0.094), clamp(shade, 0.0, 1.0)), settle);
    float below = 1.0 - smoothstep(-0.03, 0.0, box.y);
    gl_FragColor = vec4(col, inside * (1.0 - below * settle) * uFade);
  }`;

/* ── Paradas en galaxia (variante: site.json → world.stops = "galaxy") ──
   En vez de una ameba, cada obra es una galaxia: 4 o 5 imágenes suyas que
   orbitan en un disco inclinado alrededor de un ícono 3D que la representa
   (un domo, un casco de VR, un sensor…), y un enjambre de partículas que, al
   detenerse frente a la obra, se ordena en brazos de espiral. */

/* Las imágenes: planos de puntas redondas, apenas curvados (el centro un poco
   hacia adelante), con filo de vidrio. Las de atrás se ven más apagadas. */
const CARD_VERT = `
  uniform float uBend;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += uBend * (0.25 - p.x * p.x);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const CARD_FRAG = `
  uniform sampler2D uMap;
  uniform float uOpacity, uHas, uAspect, uFocus;
  uniform vec3 uTint;
  varying vec2 vUv;
  void main() {
    vec2 s = vec2(uAspect, 1.0), p = (vUv - 0.5) * s;
    float rad = 0.07;
    vec2 q = abs(p) - (s * 0.5 - rad);
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
    if (d > 0.004) discard;
    vec3 col = mix(uTint * 0.45, texture2D(uMap, vUv).rgb, uHas);
    col *= 0.42 + 0.58 * uFocus;
    col += vec3(0.93, 0.86, 1.0) * smoothstep(0.016, 0.0, abs(d)) * 0.4;
    gl_FragColor = vec4(col, uOpacity * smoothstep(0.004, -0.004, d));
  }`;
/* ── Los íconos 3D ──────────────────────────────────────────────────────
   Objetos modelados con formas de Three.js (y RoundedBoxGeometry, de sus
   ejemplos oficiales), con materiales físicos: nácar iridiscente, vidrio
   oscuro, metal pulido y partes que brillan. Los ilumina un entorno de estudio
   (RoomEnvironment), así que tienen reflejos de verdad. Algunos llevan
   pantallas con las imágenes de la obra: las paredes de la sala, el interior
   del domo. Cada uno recibe M (los materiales de su obra) y S(k), que da una
   pantalla con la imagen k de la galaxia. makeIcon() los lleva a la misma medida. */
function roundRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const V2 = (x, y) => new THREE.Vector2(x, y);
function put(g, geo, mat, p, r, s) {
  const m = new THREE.Mesh(geo, mat);
  if (p) m.position.set(...p);
  if (r) m.rotation.set(...r);
  if (s) m.scale.set(...s);
  g.add(m);
  return m;
}
/* Una banda plana (correa, vincha, pincelada) que sigue una curva: grosor t y alto
   h, con el alto siempre lo más vertical posible (no depende de cómo gire la curva). */
function band(pts, t, h, steps) {
  const curve = new THREE.CatmullRomCurve3(pts), n = steps || 100, UP = V3(0, 1, 0);
  const P = V3(0, 0, 0), T = V3(0, 0, 0), A = V3(0, 0, 0), B = V3(0, 0, 0), pos = [], idx = [];
  const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  for (let k = 0; k <= n; k++) {
    curve.getPointAt(k / n, P); curve.getTangentAt(k / n, T);
    A.copy(UP).addScaledVector(T, -T.dot(UP)).normalize();      // hacia arriba, sin torcerse
    B.crossVectors(T, A).normalize();                            // de costado: el grosor
    corners.forEach(([a, b]) => pos.push(P.x + A.x * a * h / 2 + B.x * b * t / 2, P.y + A.y * a * h / 2 + B.y * b * t / 2, P.z + A.z * a * h / 2 + B.z * b * t / 2));
  }
  for (let k = 0; k < n; k++) for (let c = 0; c < 4; c++) {
    const a = k * 4 + c, b = k * 4 + (c + 1) % 4, d = a + 4, e = b + 4;
    idx.push(a, d, b, b, d, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/* Una barra entre dos puntos (las vigas del domo y los marcos de la sala). */
function beams(pairs, r, mat) {
  const geo = new THREE.CylinderGeometry(r, r, 1, 8, 1);
  const mesh = new THREE.InstancedMesh(geo, mat, pairs.length);
  const o = new THREE.Object3D(), up = V3(0, 1, 0);
  pairs.forEach(([a, b], k) => {
    const d = V3(0, 0, 0).subVectors(b, a);
    o.position.copy(a).addScaledVector(d, 0.5);
    o.quaternion.setFromUnitVectors(up, d.clone().normalize());
    o.scale.set(1, d.length(), 1);
    o.updateMatrix(); mesh.setMatrixAt(k, o.matrix);
  });
  return mesh;
}
const ICONS = {
  /* Casco de VR: cuerpo de nácar, frente de vidrio negro con sus cámaras, espuma,
     lentes que brillan, correas planas y la almohadilla de atrás. */
  headset(M) {
    const g = new THREE.Group();
    put(g, new RoundedBoxGeometry(1.5, 0.84, 0.6, 6, 0.27), M.shell);
    put(g, new RoundedBoxGeometry(1.36, 0.7, 0.08, 5, 0.2), M.glass, [0, 0, 0.29]);
    [[-0.52, 0.22], [0.52, 0.22], [-0.52, -0.22], [0.52, -0.22]].forEach(([x, y]) => {
      put(g, new THREE.CircleGeometry(0.05, 24), M.chrome, [x, y, 0.336]);
      put(g, new THREE.CircleGeometry(0.03, 20), M.glow, [x, y, 0.338]);
    });
    put(g, new RoundedBoxGeometry(1.32, 0.68, 0.22, 5, 0.17), M.dark, [0, -0.01, -0.37]);
    [-0.32, 0.32].forEach((x) => {
      put(g, new THREE.TorusGeometry(0.17, 0.028, 14, 48), M.chrome, [x, 0, -0.49]);
      put(g, new THREE.CircleGeometry(0.16, 40), M.glow, [x, 0, -0.486], [0, Math.PI, 0]);
    });
    put(g, band([V3(0.74, 0, -0.18), V3(0.93, 0, -0.62), V3(0.62, 0, -1.14), V3(0, 0, -1.3), V3(-0.62, 0, -1.14), V3(-0.93, 0, -0.62), V3(-0.74, 0, -0.18)], 0.055, 0.21), M.dark);
    put(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, 0.4, -0.1), V3(0, 0.72, -0.5), V3(0, 0.62, -1.0), V3(0, 0.16, -1.3)]), 60, 0.045, 10, false), M.dark);
    put(g, new RoundedBoxGeometry(0.54, 0.42, 0.12, 4, 0.05), M.shell, [0, 0.05, -1.33]);
    g.rotation.y = -0.5;
    return g;
  },
  /* Sensor EEG: una cabeza de vidrio con el cerebro encendido adentro y la vincha
     de electrodos en la frente. */
  eeg(M) {
    const g = new THREE.Group();
    const head = new THREE.SphereGeometry(0.8, 56, 40); head.scale(0.84, 1, 0.94);
    put(g, head, M.ghost, [0, 0.1, 0]);
    put(g, new THREE.CylinderGeometry(0.27, 0.34, 0.5, 40, 1, true), M.ghost, [0, -0.88, -0.04]);
    /* El cerebro: una esfera con pliegues y la ranura entre los hemisferios. */
    const brain = new THREE.SphereGeometry(0.5, 120, 80), pos = brain.attributes.position, v = V3(0, 0, 0);
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k).normalize();
      const fold = Math.sin(v.x * 13 + Math.sin(v.y * 9) * 2.2) * Math.sin(v.y * 12 + Math.sin(v.z * 8) * 2) * Math.sin(v.z * 11 + Math.sin(v.x * 7) * 2);
      const groove = Math.exp(-Math.pow(v.x / 0.07, 2)) * (v.y > -0.35 ? 1 : 0);
      const r = 0.5 * (1 + 0.07 * fold - 0.14 * groove);
      pos.setXYZ(k, v.x * r * 0.92, v.y * r * 0.78, v.z * r * 1.12);
    }
    brain.computeVertexNormals();
    put(g, brain, M.brain, [0, 0.3, 0.02]);
    /* La vincha: de una oreja a la otra, pasando por la frente. */
    const arc = [];
    for (let k = 0; k <= 12; k++) { const a = -1.75 + k * 3.5 / 12; arc.push(V3(Math.sin(a) * 0.71, 0.36 - 0.06 * Math.cos(a), Math.cos(a) * 0.79)); }
    put(g, band(arc, 0.06, 0.15), M.shell);
    [-1.75, 1.75].forEach((a) => put(g, new RoundedBoxGeometry(0.12, 0.3, 0.24, 4, 0.05), M.shell, [Math.sin(a) * 0.72, 0.24, Math.cos(a) * 0.8], [0, a, 0]));
    for (let k = 0; k < 5; k++) {
      const a = -0.9 + k * 0.45;
      put(g, new THREE.CylinderGeometry(0.045, 0.045, 0.04, 20), M.chrome, [Math.sin(a) * 0.765, 0.43 - 0.06 * Math.cos(a), Math.cos(a) * 0.855], [Math.PI / 2, 0, -a]);
      put(g, new THREE.SphereGeometry(0.022, 12, 8), M.glow, [Math.sin(a) * 0.79, 0.43 - 0.06 * Math.cos(a), Math.cos(a) * 0.88]);
    }
    return g;
  },
  /* Pincel: mango laqueado, virola de metal con sus anillos, cerdas cargadas de
     pintura y una pincelada que se enrosca alrededor. */
  brush(M) {
    const g = new THREE.Group(), b = new THREE.Group();
    put(b, new THREE.LatheGeometry([V2(0, -1.35), V2(0.06, -1.34), V2(0.085, -1.15), V2(0.11, -0.62), V2(0.125, -0.28), V2(0.105, -0.05)], 40), M.lacquer);
    put(b, new THREE.LatheGeometry([V2(0.105, -0.06), V2(0.135, -0.02), V2(0.135, 0.22), V2(0.122, 0.27)], 40), M.chrome);
    [0.02, 0.07].forEach((y) => put(b, new THREE.TorusGeometry(0.137, 0.012, 8, 40), M.chrome, [0, y, 0], [Math.PI / 2, 0, 0]));
    put(b, new THREE.LatheGeometry([V2(0.122, 0.26), V2(0.165, 0.4), V2(0.155, 0.6), V2(0.105, 0.8), V2(0.035, 0.97), V2(0, 1.0)], 40), M.bristle);
    put(b, new THREE.LatheGeometry([V2(0.158, 0.58), V2(0.11, 0.8), V2(0.04, 0.97), V2(0, 1.01)], 40), M.paint, [0, 0, 0], null, [1.04, 1, 1.04]);
    b.rotation.z = -0.55;
    g.add(b);
    /* La pincelada: una cinta ancha que sale de la punta y da una vuelta alrededor. */
    put(g, band([V3(0.66, 0.78, 0.0), V3(1.05, 0.5, 0.35), V3(0.85, 0.0, 0.75), V3(0.2, -0.3, 0.85), V3(-0.5, -0.2, 0.55), V3(-0.85, 0.2, 0.0), V3(-0.6, 0.55, -0.55), V3(0.0, 0.7, -0.7)], 0.03, 0.2, 140), M.paint);
    [[0.95, 1.12, 0.1, 0.05], [1.12, 0.78, 0.3, 0.035], [-0.42, 0.78, -0.5, 0.04]].forEach(([x, y, z, r]) => put(g, new THREE.SphereGeometry(r, 16, 12), M.paint, [x, y, z]));
    return g;
  },
  /* Sensor de pulso: un corazón brillante que late, con su electrocardiograma en un
     anillo de luz que lo rodea. */
  pulse(M) {
    const g = new THREE.Group();
    const h = new THREE.Shape();
    h.moveTo(5, 5); h.bezierCurveTo(5, 5, 4, 0, 0, 0); h.bezierCurveTo(-6, 0, -6, 7, -6, 7);
    h.bezierCurveTo(-6, 11, -3, 15.4, 5, 19); h.bezierCurveTo(12, 15.4, 16, 11, 16, 7);
    h.bezierCurveTo(16, 7, 16, 0, 10, 0); h.bezierCurveTo(7, 0, 5, 5, 5, 5);
    const heart = new THREE.ExtrudeGeometry(h, { depth: 3.4, bevelEnabled: true, bevelSize: 1.5, bevelThickness: 2.6, bevelSegments: 10, curveSegments: 48 });
    heart.center(); heart.rotateZ(Math.PI); heart.scale(0.07, 0.07, 0.07);   // girado y no espejado: si no, las caras quedan al revés
    put(g, heart, M.heart);
    const ring = [];
    for (let k = 0; k <= 240; k++) {
      const a = (k / 240) * Math.PI * 2, ph = (a / (Math.PI * 2)) * 3 % 1;
      const spike = ph < 0.06 ? Math.sin(ph / 0.06 * Math.PI) * 0.06 : ph < 0.1 ? -Math.sin((ph - 0.06) / 0.04 * Math.PI) * 0.08 : ph < 0.16 ? Math.sin((ph - 0.1) / 0.06 * Math.PI) * 0.42 : ph < 0.21 ? -Math.sin((ph - 0.16) / 0.05 * Math.PI) * 0.2 : 0;
      ring.push(V3(Math.cos(a) * 1.18, spike, Math.sin(a) * 1.18));
    }
    put(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ring, true), 480, 0.022, 8, true), M.glow, [0, -0.05, 0], [0.32, 0, 0.1]);
    return g;
  },
  /* Domo: cúpula geodésica de vigas de metal, con la imagen de la obra proyectada
     adentro, sobre su anillo y su piso. */
  dome(M, S) {
    const g = new THREE.Group();
    const ico = new THREE.IcosahedronGeometry(1, 2), p = ico.attributes.position;
    const verts = [], key = (v) => v.toArray().map((x) => x.toFixed(3)).join(',');
    const idx = new Map(), edges = new Set();
    const vid = (v) => { const kk = key(v); if (!idx.has(kk)) { idx.set(kk, verts.length); verts.push(v.clone()); } return idx.get(kk); };
    for (let k = 0; k < p.count; k += 3) {
      const t = [0, 1, 2].map((j) => vid(V3(0, 0, 0).fromBufferAttribute(p, k + j)));
      [[0, 1], [1, 2], [2, 0]].forEach(([a, b]) => { const e = Math.min(t[a], t[b]) + '-' + Math.max(t[a], t[b]); edges.add(e); });
    }
    ico.dispose();
    const top = (v) => v.y > -0.02;
    const pairs = [...edges].map((e) => e.split('-').map(Number)).filter(([a, b]) => top(verts[a]) && top(verts[b])).map(([a, b]) => [verts[a], verts[b]]);
    g.add(beams(pairs, 0.014, M.chrome));
    const nodes = verts.filter(top);
    const nm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 10, 8), M.chrome, nodes.length), o = new THREE.Object3D();
    nodes.forEach((v, k) => { o.position.copy(v); o.updateMatrix(); nm.setMatrixAt(k, o.matrix); });
    g.add(nm);
    put(g, new THREE.SphereGeometry(0.975, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), S(0, THREE.BackSide));
    put(g, new THREE.TorusGeometry(1.0, 0.03, 12, 96), M.chrome, null, [Math.PI / 2, 0, 0]);
    put(g, new THREE.CylinderGeometry(1.08, 1.12, 0.06, 72), M.dark, [0, -0.04, 0]);
    put(g, new THREE.SphereGeometry(0.06, 16, 12), M.glow, [0, 0.08, 0]);
    g.rotation.x = 0.28;
    return g;
  },
  /* Sala inmersiva: un túnel de pantallas con imágenes de la obra, sus marcos, el
     piso brillante y una persona adentro con los brazos arriba. */
  room(M, S) {
    const g = new THREE.Group(), W = 1.7, H = 1.08, D = 1.3, x = W / 2, y = H / 2, z = D / 2;
    put(g, new THREE.PlaneGeometry(D, H), S(1), [-x, 0, 0], [0, Math.PI / 2, 0]);
    put(g, new THREE.PlaneGeometry(D, H), S(2), [x, 0, 0], [0, -Math.PI / 2, 0]);
    put(g, new THREE.PlaneGeometry(W, H), S(3), [0, 0, -z]);
    put(g, new THREE.PlaneGeometry(W, D), S(4), [0, y, 0], [Math.PI / 2, 0, 0]);
    put(g, new THREE.PlaneGeometry(W, D), M.floor, [0, -y, 0], [-Math.PI / 2, 0, 0]);
    const c = (a, b, cc) => V3(a * x, b * y, cc * z);
    const frame = [[c(-1, -1, -1), c(1, -1, -1)], [c(-1, 1, -1), c(1, 1, -1)], [c(-1, -1, -1), c(-1, 1, -1)], [c(1, -1, -1), c(1, 1, -1)],
      [c(-1, -1, 1), c(-1, 1, 1)], [c(1, -1, 1), c(1, 1, 1)], [c(-1, 1, 1), c(1, 1, 1)], [c(-1, -1, 1), c(1, -1, 1)],
      [c(-1, 1, -1), c(-1, 1, 1)], [c(1, 1, -1), c(1, 1, 1)], [c(-1, -1, -1), c(-1, -1, 1)], [c(1, -1, -1), c(1, -1, 1)]];
    g.add(beams(frame, 0.016, M.chrome));
    const man = new THREE.Group(), fy = -y;
    put(man, new THREE.CapsuleGeometry(0.075, 0.26, 8, 16), M.shell, [0, fy + 0.4, 0]);
    put(man, new THREE.SphereGeometry(0.075, 20, 14), M.shell, [0, fy + 0.64, 0]);
    [-1, 1].forEach((sd) => {
      put(man, new THREE.CapsuleGeometry(0.028, 0.26, 6, 10), M.shell, [sd * 0.13, fy + 0.62, 0], [0, 0, -sd * 0.55]);
      put(man, new THREE.CapsuleGeometry(0.034, 0.28, 6, 10), M.shell, [sd * 0.045, fy + 0.15, 0]);
    });
    man.position.set(0.12, 0, 0.1);
    g.add(man);
    g.rotation.x = 0.16;
    return g;
  },
  /* Proyector: cuerpo de nácar, lente de vidrio y el haz de luz. */
  projector(M) {
    const g = new THREE.Group();
    put(g, new RoundedBoxGeometry(0.95, 0.48, 0.75, 5, 0.1), M.shell, [0, 0, -0.55]);
    put(g, new THREE.CylinderGeometry(0.19, 0.21, 0.18, 40), M.chrome, [0, 0, -0.1], [Math.PI / 2, 0, 0]);
    put(g, new THREE.CircleGeometry(0.16, 40), M.glass, [0, 0, -0.005]);
    put(g, new THREE.ConeGeometry(0.75, 1.5, 48, 1, true), M.beam, [0, 0, 0.74], [-Math.PI / 2, 0, 0]);
    return g;
  },
  /* Parlante: caja oscura, cono de nácar y sus anillos de luz. */
  speaker(M) {
    const g = new THREE.Group();
    put(g, new RoundedBoxGeometry(1.0, 1.3, 0.6, 5, 0.1), M.dark, [0, 0, -0.3]);
    put(g, new THREE.LatheGeometry([V2(0.05, 0.0), V2(0.18, -0.06), V2(0.38, -0.14), V2(0.42, -0.12)], 48), M.shell, [0, -0.15, 0.02], [-Math.PI / 2, 0, 0]);
    put(g, new THREE.SphereGeometry(0.08, 20, 12), M.chrome, [0, -0.15, 0.04]);
    put(g, new THREE.TorusGeometry(0.44, 0.02, 10, 60), M.glow, [0, -0.15, 0.03]);
    put(g, new THREE.TorusGeometry(0.16, 0.015, 10, 40), M.glow, [0, 0.38, 0.03]);
    return g;
  },
  /* Prisma: una gema facetada, para lo que no tiene otro ícono. */
  prism(M) {
    const g = new THREE.Group();
    put(g, new THREE.IcosahedronGeometry(0.9, 0), M.shell);
    put(g, new THREE.IcosahedronGeometry(0.3, 1), M.glow);
    return g;
  },
};
/* Los íconos que se ven mejor de frente se mecen en vez de girar entero. */
const SWING = { headset: 0.85, eeg: 0.75, pulse: 0.6, room: 0.55, projector: 0.7, speaker: 0.6 };
const heartbeat = (t) => { const p = t % 1, a = (p - 0.08) / 0.045, b = (p - 0.30) / 0.06; return Math.exp(-a * a) + 0.55 * Math.exp(-b * b); };

export function mount(section, opts) {
  opts = opts || {};
  const reduce = !!opts.reduce, coarse = !!opts.coarse, sound = opts.sound || null;
  const GAL = opts.stops === 'galaxy';     // las obras como galaxias de imágenes, en vez de amebas
  const q = (s) => section.querySelector(s);
  const stage = q('.world__stage'), host = q('.world__canvas');
  const intro = q('.world__intro'), hud = q('.world__hud'), end = q('.world__end'), dots = q('.world__dots');
  const links = [].slice.call(section.querySelectorAll('a[data-w-item]'));
  if (!stage || !host || !links.length) return null;
  const hudCount = q('[data-w-count]'), hudTitle = q('[data-w-title]'), hudFmt = q('[data-w-fmt]'), hudOpen = q('a[data-w-open]');
  const n = links.length;
  const hudDesc = q('[data-w-desc]'), hudCta = q('[data-w-cta]'), chapter = q('[data-w-chapter]');
  const hudTags = q('[data-w-tags]'), hudWhere = q('[data-w-where]'), hudCredit = q('[data-w-credit]');
  /* Tramos del recorrido: uno entre cada par de paradas y uno más antes de la
     primera obra, que es el paso a "Obras seleccionadas". */
  const kinds = links.map((a) => a.getAttribute('data-kind') || 'work');
  const FIRST = kinds.indexOf('work');
  const slot = (i) => i + (FIRST > 0 && i >= FIRST ? 1 : 0);
  const SLOTS = slot(n - 1);
  const ZFAR = -(15 + SLOTS * 10 + 40);            // hasta dónde llega el mundo

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
    /* Con paleta (o.pal) lleva el arte de la obra adentro; sin ella es una ameba luminosa. */
    const pal = o.pal || [C.violet, C.lilac, C.pink, C.mist];
    const P = (k) => ({ value: new THREE.Vector3(...pal[Math.min(k, pal.length - 1)]) });
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true,
      uniforms: {
        uTime: { value: 0 }, uSeed: { value: o.seed }, uWobble: { value: o.wobble },
        uArt: { value: o.pal ? 1 : 0 }, uOpacity: { value: 0 }, uFocus: { value: 0 },
        uGlow: { value: 0 }, uSolid: { value: o.solid || 0 }, uLook: { value: new THREE.Vector2() },
        uA: { value: new THREE.Vector3(...o.a) }, uB: { value: new THREE.Vector3(...o.b) }, uC: { value: new THREE.Vector3(...o.c) },
        uP0: P(0), uP1: P(1), uP2: P(2), uP3: P(3), uStage: { value: new THREE.Vector3(...(o.stage || [0.10, 0.07, 0.24])) },
      },
    });
    disposables.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { mesh, u: mat.uniforms, r: 1, base: new THREE.Vector3(), drift: o.drift || 0, seed: o.seed, far: o.far || 30, wob: o.wobble, hov: 0 };
  }
  /* El reel: un plano con el video. Se orienta y se mide en layout(). */
  const PAD = 0.2;                     // margen del plano alrededor del video, para el resplandor
  function screen(a) {
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.ShaderMaterial({
      vertexShader: REEL_VERT, fragmentShader: REEL_FRAG, transparent: true, depthWrite: false,
      uniforms: { uMap: { value: blank }, uOpacity: { value: 0 }, uAspect: { value: 16 / 9 }, uHas: { value: 0 }, uTime: { value: 0 }, uPad: { value: PAD } },
    });
    disposables.push(geo, mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.visible = false;
    scene.add(mesh);
    return {
      mesh, u: mat.uniforms, base: new THREE.Vector3(), quat: new THREE.Quaternion(), r: 1, seed: 0.7, hov: 0,
      src: a.getAttribute('data-video'), srcMobile: a.getAttribute('data-video-mobile'),
      poster: a.getAttribute('data-poster'), posterMobile: a.getAttribute('data-poster-mobile'),
      video: null, playing: false, vertical: false, w: 1, h: 1, has: 0, hasTo: 0, away: false,   // away: el reel completo está abierto encima
    };
  }
  const hex = (c) => { const h = c.trim().replace('#', ''); return [0, 2, 4].map((k) => parseInt(h.substr(k, 2), 16) / 255); };
  /* Una galaxia: el ícono al centro y las imágenes en un disco inclinado alrededor.
     root lleva la posición y la escala; orbit, la inclinación del disco. */
  const RX = 2.4, RZ = 1.5;            // radios del disco
  const ICON_Y = 0.42;                 // el ícono flota un poco por encima del disco, como un planeta sobre su anillo
  const cardGeo = new THREE.PlaneGeometry(1, 1, 24, 1);
  disposables.push(cardGeo);
  /* La luz de los íconos: un entorno de estudio (reflejos suaves, sin lámparas
     que cuidar). Sólo hace falta con las galaxias. Afecta únicamente a los
     materiales físicos: las amebas, el polvo y las imágenes tienen sus propios shaders. */
  if (GAL) {
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    scene.environmentRotation.set(0.25, 0.6, 0);
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.08;
    if (room.dispose) room.dispose();
    pmrem.dispose();
    disposables.push(env);
  }
  function makeIcon(kind, M, S) {
    const inner = (ICONS[kind] || ICONS.prism)(M, S);
    inner.traverse((o) => {
      if (!o.isMesh) return;
      o.renderOrder = 3; o.frustumCulled = false;
      disposables.push(o.geometry);
    });
    /* Todos miden lo mismo: lo más largo, 1,9. */
    inner.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(inner), size = box.getSize(V3(0, 0, 0)), mid = box.getCenter(V3(0, 0, 0));
    const center = new THREE.Group();
    inner.position.sub(mid);
    center.add(inner);
    const wrap = new THREE.Group();
    wrap.add(center);
    wrap.userData.fit = 1.9 / Math.max(size.x, size.y, size.z, 0.01);
    return wrap;
  }
  const blankSRGB = new THREE.DataTexture(new Uint8Array([40, 30, 90, 255]), 1, 1);
  blankSRGB.colorSpace = THREE.SRGBColorSpace; blankSRGB.needsUpdate = true;
  disposables.push(blankSRGB);
  function galaxy(a, i, pal) {
    const k = kinds.slice(0, i).filter((x) => x === 'work').length;     // su lugar entre las obras
    const root = new THREE.Group(), orbit = new THREE.Group();
    root.visible = false; root.add(orbit); scene.add(root);
    const tilt = [0.36 + (k % 2) * 0.1, 0, (k % 2 ? -1 : 1) * 0.12];
    orbit.rotation.set(...tilt);
    /* Los materiales del ícono, con los colores de la obra. base: la opacidad que
       tiene cuando la galaxia se ve entera. */
    const lift = (c, w) => c.map((x) => x + (1 - x) * w);            // un color más claro
    const deep = (c, w) => c.map((x) => x * w);                       // uno más oscuro
    const col = (c) => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
    const P0 = pal[0], P1 = pal[Math.min(1, pal.length - 1)], P2 = pal[Math.min(2, pal.length - 1)];
    const mats = [];
    const mk = (Ctor, o, base) => { const m = new Ctor({ transparent: true, opacity: 0, ...o }); m.userData.base = base == null ? 1 : base; mats.push(m); disposables.push(m); return m; };
    const M = {
      shell: mk(THREE.MeshPhysicalMaterial, { color: col(lift(P0, 0.62)), metalness: 0.1, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.9, iridescenceIOR: 1.35, iridescenceThicknessRange: [160, 640], envMapIntensity: 1.3 }),
      dark: mk(THREE.MeshPhysicalMaterial, { color: col(deep(P0, 0.22)), metalness: 0.2, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
      glass: mk(THREE.MeshPhysicalMaterial, { color: col([0.05, 0.035, 0.12]), metalness: 0.55, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 }),
      chrome: mk(THREE.MeshPhysicalMaterial, { color: col(lift(P0, 0.8)), metalness: 1, roughness: 0.14, envMapIntensity: 1.4 }),
      glow: mk(THREE.MeshBasicMaterial, { color: col(lift(P1, 0.2)), toneMapped: false }),
      ghost: mk(THREE.MeshPhysicalMaterial, { color: col(lift(P0, 0.78)), metalness: 0, roughness: 0.06, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.3, envMapIntensity: 1.5, depthWrite: false, side: THREE.DoubleSide }, 0.26),
      brain: mk(THREE.MeshPhysicalMaterial, { color: col(lift(P1, 0.35)), emissive: col(P1), emissiveIntensity: 0.55, roughness: 0.42, clearcoat: 0.6, sheen: 1, sheenColor: col(lift(P2, 0.5)) }),
      bristle: mk(THREE.MeshPhysicalMaterial, { color: col([0.78, 0.62, 0.45]), roughness: 0.62, sheen: 1, sheenColor: col([1, 0.9, 0.8]) }),
      paint: mk(THREE.MeshPhysicalMaterial, { color: col(P0), emissive: col(P0), emissiveIntensity: 0.7, roughness: 0.2, clearcoat: 1, side: THREE.DoubleSide }),
      lacquer: mk(THREE.MeshPhysicalMaterial, { color: col(deep(P2, 0.55)), metalness: 0.15, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0.5 }),
      heart: mk(THREE.MeshPhysicalMaterial, { color: col(P0), emissive: col(deep(P0, 0.9)), emissiveIntensity: 0.45, metalness: 0, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, iridescence: 0.2, sheen: 0.5, sheenColor: col(lift(P0, 0.5)), envMapIntensity: 0.7 }),
      floor: mk(THREE.MeshPhysicalMaterial, { color: col([0.04, 0.03, 0.1]), metalness: 0.7, roughness: 0.08, clearcoat: 1, envMapIntensity: 1.2 }),
      beam: mk(THREE.MeshBasicMaterial, { color: col(lift(P1, 0.3)), blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }, 0.16),
    };
    /* Las pantallas: muestran las imágenes de la galaxia (se cargan con ellas). */
    const screens = [];
    const S = (j, side) => {
      const m = mk(THREE.MeshBasicMaterial, { map: blankSRGB, toneMapped: false, side: side || THREE.DoubleSide });
      screens.push({ mat: m, j });
      return m;
    };
    const kind = a.getAttribute('data-icon') || 'prism';
    const icon = makeIcon(kind, M, S);
    root.add(icon);
    const list = (a.getAttribute('data-gallery') || '').split(',').filter(Boolean).map((x) => { const [src, ar] = x.split('|'); return { src, ar: parseFloat(ar) || 16 / 9 }; });
    screens.forEach((sc) => { sc.j = list.length ? sc.j % list.length : 0; });
    const cards = list.map((c, j) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: CARD_VERT, fragmentShader: CARD_FRAG, transparent: true,
        uniforms: { uMap: { value: blank }, uHas: { value: 0 }, uOpacity: { value: 0 }, uAspect: { value: c.ar }, uFocus: { value: 1 }, uBend: { value: 0.1 }, uTint: { value: V3(...pal[0]) } },
      });
      disposables.push(mat);
      const mesh = new THREE.Mesh(cardGeo, mat);
      mesh.renderOrder = 2; mesh.frustumCulled = false;
      orbit.add(mesh);
      const w = c.ar >= 1 ? 1.42 : 0.64;
      return { mesh, u: mat.uniforms, src: c.src, w, h: w / c.ar, ang: (j / list.length) * TAU2 + k * 0.9, lift: rnd(-0.3, 0.3), rad: rnd(0.88, 1.08), size: rnd(0.9, 1.12), has: 0, hasTo: 0 };
    });
    return {
      gal: true, mesh: root, orbit, icon, cards, mats, screens, tilt, beat: kind === 'pulse', swing: SWING[kind] || 0,
      u: { uOpacity: { value: 0 } }, base: new THREE.Vector3(), r: 1, gs: 1, hitR: 3, seed: 2.3 + i * 1.9,
      far: 30, hov: 0, spin: 0, loaded: false,
    };
  }
  const door = ameba(geoBig, { seed: 1.7, wobble: 1, solid: 1, a: C.violet, b: C.pink, c: C.mist });
  const core = ameba(geoBig, { seed: 4.2, wobble: 1, solid: 1, a: C.purple, b: C.lilac, c: C.mist, far: 44 });
  /* Las paradas, en el orden del HTML: la ameba del estudio, el reel y una ameba por obra. */
  const works = links.map((a, i) => {
    const list = (a.getAttribute('data-colors') || '').split(',').filter(Boolean);
    const pal = (list.length ? list : ['#c99ef9', '#f2b8dd', '#8fb0ff', '#ffffff']).map(hex);
    const stage = a.getAttribute('data-stage');
    const w = kinds[i] === 'reel' ? screen(a)
      : (GAL && kinds[i] === 'work') ? galaxy(a, i, pal)
      : ameba(geoBig, { seed: 2.3 + i * 1.9, wobble: 0.55, a: C.violet, b: C.blue, c: C.lilac, pal, stage: stage ? hex(stage) : null });
    w.kind = kinds[i];                                     // 'studio', 'reel' o 'work'
    w.pal = pal; w.href = a.href; w.cover = a.getAttribute('data-cover') || '';
    w.title = a.getAttribute('data-title') || ''; w.format = a.getAttribute('data-format') || '';
    w.desc = a.getAttribute('data-desc') || ''; w.cta = a.getAttribute('data-cta') || '';
    w.tags = (a.getAttribute('data-tags') || '').split('|').filter(Boolean);
    w.where = a.getAttribute('data-where') || ''; w.line = a.getAttribute('data-line') || '';
    w.credit = a.getAttribute('data-credit') || '';        // un crédito que la obra exige mostrar (projects.json → creditLine)
    w.asked = false;
    return w;
  });
  const NW = works.filter((x) => x.kind === 'work').length;        // obras de verdad
  const palette = [[C.violet, C.pink, C.mist], [C.blue, C.lilac, C.mist], [C.purple, C.pink, C.lilac], [C.blue, C.violet, C.pink]];
  const extras = [];
  for (let i = 0; i < (coarse ? 12 : 30); i++) {
    const p = palette[i % palette.length];
    const e = ameba(geoSmall, { seed: rnd(0, 20), wobble: 1.15, a: p[0], b: p[1], c: p[2], drift: rnd(0.15, 0.5) });
    const side = i % 2 ? 1 : -1;
    e.base.set(side * rnd(2.8, 6.6), rnd(-3.6, 3.6), rnd(-6, ZFAR + 12));
    e.r = i % 3 ? rnd(0.08, 0.3) : rnd(0.3, 0.85);       // muchas chicas, unas pocas grandes
    extras.push(e);
  }

  /* ── Polvo en suspensión: da la sensación de avanzar ────────────────── */
  const LOOSE = coarse ? 800 : 2600, FLOW = coarse ? 800 : 2900, DN = LOOSE + FLOW;
  const dPos = new Float32Array(DN * 3), dSize = new Float32Array(DN), dSeed = new Float32Array(DN);
  const dTint = new Float32Array(DN), dFlow = new Float32Array(DN);
  for (let i = 0; i < DN; i++) {
    dSeed[i] = Math.random(); dTint[i] = Math.random();
    if (i < LOOSE) {                   // polvo suelto
      dPos[i * 3] = rnd(-8, 8); dPos[i * 3 + 1] = rnd(-4.5, 4.5); dPos[i * 3 + 2] = rnd(4, ZFAR);
      dSize[i] = Math.random() < 0.07 ? rnd(2.4, 4.4) : rnd(0.7, 1.7);
    } else {                           // tres corrientes en hélice alrededor del camino
      const k = i % 3, z = rnd(2, ZFAR), a = z * 0.22 + k * 2.094 + rnd(-0.22, 0.22), rad = 3.3 + k * 0.6 + rnd(-0.4, 0.4);
      dPos[i * 3] = Math.cos(a) * rad; dPos[i * 3 + 1] = Math.sin(a) * rad; dPos[i * 3 + 2] = z;
      dSize[i] = Math.random() < 0.05 ? rnd(2, 3.2) : rnd(0.7, 1.7); dFlow[i] = 1;
      dTint[i] = clamp(k / 2 + rnd(-0.18, 0.18), 0, 1);     // cada corriente tira a un color
    }
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dGeo.setAttribute('aSize', new THREE.BufferAttribute(dSize, 1));
  dGeo.setAttribute('aSeed', new THREE.BufferAttribute(dSeed, 1));
  dGeo.setAttribute('aTint', new THREE.BufferAttribute(dTint, 1));
  dGeo.setAttribute('aFlow', new THREE.BufferAttribute(dFlow, 1));
  const dMat = new THREE.ShaderMaterial({
    vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uPx: { value: 4 * dpr }, uDeep: { value: 0 }, uTime: { value: 0 }, uBoost: { value: 0 },
      uPush: { value: 0 }, uMouse: { value: new THREE.Vector2(9, 9) }, uDrift: { value: 1 },
    },
  });
  const dust = new THREE.Points(dGeo, dMat);
  dust.frustumCulled = false;
  scene.add(dust);
  disposables.push(dGeo, dMat);

  /* ── Enjambre por obra ───────────────────────────────────────────────── */
  const SN = coarse ? 220 : 560;
  links.forEach((a, i) => {
    if (kinds[i] === 'reel') return;                       // la pantalla del reel no lleva enjambre
    const kind = works[i].gal ? 'galaxy' : a.getAttribute('data-form'), make = FORMS[kind] || FORMS.halo, fx = FORM_FX[kind] || FORM_FX.halo;
    const pal = works[i].pal;
    const free = new Float32Array(SN * 3), tgt = new Float32Array(SN * 3), col = new Float32Array(SN * 3);
    const seed = new Float32Array(SN), size = new Float32Array(SN);
    make(SN, (j, x, y, z) => { tgt[j * 3] = x; tgt[j * 3 + 1] = y; tgt[j * 3 + 2] = z; });
    for (let j = 0; j < SN; j++) {
      const q = onSphere(rnd(1.9, 4.2)), c = pal[(Math.random() * pal.length) | 0];
      free[j * 3] = q[0]; free[j * 3 + 1] = q[1] * 0.75; free[j * 3 + 2] = q[2];
      col[j * 3] = c[0]; col[j * 3 + 1] = c[1]; col[j * 3 + 2] = c[2];
      seed[j] = Math.random(); size[j] = Math.random() < 0.05 ? rnd(2, 2.8) : rnd(0.8, 1.6);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(free, 3));
    g.setAttribute('aTarget', new THREE.BufferAttribute(tgt, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    const tilt = works[i].gal
      ? new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...works[i].tilt)).multiply(new THREE.Matrix4().makeScale(1, 1, RZ / RX)))
      : new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(fx.tilt[0], 0, fx.tilt[1])));
    const m = new THREE.ShaderMaterial({
      vertexShader: SWARM_VERT, fragmentShader: SWARM_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uForm: { value: 0 }, uTime: { value: 0 }, uPx: { value: 7 * dpr }, uOpacity: { value: 0 }, uTilt: { value: tilt },   // más grandes que el polvo, o la forma se pierde
        uSpin: { value: fx.spin || 0 }, uBeat: { value: fx.beat || 0 }, uBpm: { value: fx.bpm || 60 },
        uBreath: { value: fx.breath || 0 }, uWave: { value: fx.wave || 0 },
      },
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false; pts.renderOrder = 2;          // después de las amebas: las de atrás quedan tapadas, las de adelante no
    scene.add(pts);
    disposables.push(g, m);
    works[i].swarm = { points: pts, u: m.uniforms, form: 0 };
  });

  /* ── El paso a las obras: tres anillos de luz, como los del icono ───────
     Van sobre el camino, entre la última parada del estudio y la primera obra
     (layout() los ubica): la cámara los atraviesa mientras aparece el título
     "Obras seleccionadas". Son puntos, con los mismos shaders del polvo. */
  let gate = null;
  if (FIRST > 0) {
    const RINGS = [3.9, 3.0, 2.15], PER = coarse ? 120 : 250, GN = RINGS.length * PER;
    const gPos = new Float32Array(GN * 3), gSize = new Float32Array(GN), gSeed = new Float32Array(GN), gTint = new Float32Array(GN);
    for (let k = 0; k < GN; k++) {
      const ring = (k / PER) | 0, r = RINGS[ring] + rnd(-0.03, 0.03), a = rnd(0, TAU2), cs = Math.cos(a), sn = Math.sin(a);
      gPos[k * 3] = Math.sign(cs) * Math.sqrt(Math.abs(cs)) * r;            // superelipse: el cuadrado de puntas redondas del icono
      gPos[k * 3 + 1] = Math.sign(sn) * Math.sqrt(Math.abs(sn)) * r;
      gPos[k * 3 + 2] = (1 - ring) * 1.7 + rnd(-0.03, 0.03);               // el más grande, adelante
      gSize[k] = Math.random() < 0.08 ? rnd(2.6, 3.6) : rnd(1.2, 2.2);
      gSeed[k] = Math.random(); gTint[k] = clamp(ring / 2 + rnd(-0.12, 0.12), 0, 1);
    }
    const gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
    gGeo.setAttribute('aSize', new THREE.BufferAttribute(gSize, 1));
    gGeo.setAttribute('aSeed', new THREE.BufferAttribute(gSeed, 1));
    gGeo.setAttribute('aTint', new THREE.BufferAttribute(gTint, 1));
    gGeo.setAttribute('aFlow', new THREE.BufferAttribute(new Float32Array(GN), 1));
    const gMat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uPx: { value: 5 * dpr }, uDeep: { value: 0 }, uTime: { value: 0 }, uBoost: { value: 0 },
        uPush: { value: 0 }, uMouse: { value: new THREE.Vector2(9, 9) }, uDrift: { value: 0.12 },
      },
    });
    const gPts = new THREE.Points(gGeo, gMat);
    gPts.frustumCulled = false; gPts.renderOrder = 1; gPts.visible = false;
    scene.add(gPts);
    disposables.push(gGeo, gMat);
    gate = { points: gPts, u: gMat.uniforms };
  }

  /* ── Hilos de luz ────────────────────────────────────────────────────── */
  const SK = coarse ? 22 : 52;
  const kPos = new Float32Array(SK * 6), kEnd = new Float32Array(SK * 2), kSeed = new Float32Array(SK * 2);
  for (let i = 0; i < SK; i++) {
    const a = rnd(0, TAU2), r = rnd(1.4, 5.2), x = Math.cos(a) * r, y = Math.sin(a) * r * 0.62, z = rnd(0, 34), sd = Math.random();
    for (let e = 0; e < 2; e++) {
      kPos[(i * 2 + e) * 3] = x; kPos[(i * 2 + e) * 3 + 1] = y; kPos[(i * 2 + e) * 3 + 2] = z;
      kEnd[i * 2 + e] = e; kSeed[i * 2 + e] = sd;
    }
  }
  const kGeo = new THREE.BufferGeometry();
  kGeo.setAttribute('position', new THREE.BufferAttribute(kPos, 3));
  kGeo.setAttribute('aEnd', new THREE.BufferAttribute(kEnd, 1));
  kGeo.setAttribute('aSeed', new THREE.BufferAttribute(kSeed, 1));
  const kMat = new THREE.ShaderMaterial({
    vertexShader: STREAK_VERT, fragmentShader: STREAK_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uCamZ: { value: 0 }, uTravel: { value: 0 }, uBoost: { value: 0 }, uDir: { value: 1 }, uTime: { value: 0 }, uDeep: { value: 0 } },
  });
  const streaks = new THREE.LineSegments(kGeo, kMat);
  streaks.frustumCulled = false; streaks.renderOrder = 1;
  scene.add(streaks);
  disposables.push(kGeo, kMat);

  /* ── Luces guía ──────────────────────────────────────────────────────── */
  const WISPS = coarse ? 1 : 2, TRAIL = 70;
  const wPos = new Float32Array(WISPS * TRAIL * 3), wAge = new Float32Array(WISPS * TRAIL), wCol = new Float32Array(WISPS * TRAIL * 3);
  const wTint = [[0.80, 0.70, 1.0], [1.0, 0.72, 0.9]];
  for (let w = 0; w < WISPS; w++) for (let j = 0; j < TRAIL; j++) {
    const k = w * TRAIL + j;
    wAge[k] = j / (TRAIL - 1);
    wCol[k * 3] = wTint[w][0]; wCol[k * 3 + 1] = wTint[w][1]; wCol[k * 3 + 2] = wTint[w][2];
  }
  const wGeo = new THREE.BufferGeometry();
  const wAttr = new THREE.BufferAttribute(wPos, 3);
  wAttr.setUsage(THREE.DynamicDrawUsage);
  wGeo.setAttribute('position', wAttr);
  wGeo.setAttribute('aAge', new THREE.BufferAttribute(wAge, 1));
  wGeo.setAttribute('aColor', new THREE.BufferAttribute(wCol, 3));
  const wMat = new THREE.ShaderMaterial({
    vertexShader: WISP_VERT, fragmentShader: WISP_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uPx: { value: 4 * dpr }, uTime: { value: 0 }, uDeep: { value: 0 } },
  });
  const wisps = new THREE.Points(wGeo, wMat);
  wisps.frustumCulled = false; wisps.renderOrder = 3;
  scene.add(wisps);
  disposables.push(wGeo, wMat);
  const heads = [];
  for (let w = 0; w < WISPS; w++) heads.push({ pos: new THREE.Vector3(), ready: false, dist: 5.2 + w * 1.5, ph: w * 2.4 });

  /* ── El derrame: plano a pantalla completa, sólo mientras se entra a una obra ── */
  const liqGeo = new THREE.PlaneGeometry(2, 2);
  const liqMat = new THREE.ShaderMaterial({
    vertexShader: LIQ_VERT, fragmentShader: LIQ_FRAG, transparent: true, depthTest: false, depthWrite: false,
    uniforms: {
      uFull: { value: blank }, uT: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 },
      uR0: { value: 0.2 }, uRMax: { value: 2 }, uHero: { value: 0.78 }, uImg: { value: 16 / 9 }, uSeed: { value: 0 },
      uFade: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uHasImg: { value: 0 },
      uP0: { value: new THREE.Vector3() }, uP1: { value: new THREE.Vector3() }, uP2: { value: new THREE.Vector3() },
    },
  });
  const liquid = new THREE.Mesh(liqGeo, liqMat);
  liquid.frustumCulled = false; liquid.renderOrder = 10; liquid.visible = false;
  scene.add(liquid);
  disposables.push(liqGeo, liqMat);

  /* ── Recorrido ──────────────────────────────────────────────────────
     Tiempos (0…1 del scroll): la puerta, una parada por ameba o pantalla, el
     final. Entre dos paradas la cámara acelera y frena, así que se detiene
     frente a cada una. Los tiempos salen de cuántas pantallas mide la sección
     (css: .world), para que cada tramo ocupe siempre casi una pantalla. */
  const SCREENS = Math.max(3, section.offsetHeight / Math.max(1, stage.clientHeight) - 1);
  const T_FIRST = clamp(1.4 / SCREENS, 0.05, 0.3), T_LAST = 1 - clamp(1.15 / SCREENS, 0.04, 0.3), T_DOOR = T_FIRST * 0.41;
  const tWork = (i) => (SLOTS === 0 ? 0.5 : lerp(T_FIRST, T_LAST, slot(i) / SLOTS));
  const HALF = SLOTS === 0 ? 0.2 : (T_LAST - T_FIRST) / SLOTS / 2;       // medio tramo
  const T_CHAP = FIRST > 0 ? (tWork(FIRST - 1) + tWork(FIRST)) / 2 : -1;  // el paso a las obras
  /* En cada parada la cámara se queda quieta durante un tramo del scroll (HOLD
     antes y después), así cuesta un poco más pasar a la siguiente. Además el
     navegador "imanta" el scroll a cada parada cuando uno suelta cerca de ella
     (scroll-snap de proximidad: css, html.w-snap). */
  const HOLD = HALF * 0.46;
  const STOPS = [0].concat(links.map((_, i) => tWork(i)), [1]);
  let keys = [];                       // [{ t, pos, look }]
  let formScale = 1;                   // los enjambres se achican en pantallas angostas
  function layout() {
    const w = Math.max(2, stage.clientWidth), h = Math.max(2, stage.clientHeight), aspect = w / h;
    renderer.setSize(w, h, false);
    camera.aspect = aspect; camera.updateProjectionMatrix();
    const wide = aspect > 1.05;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    /* Dónde cae en pantalla: fx, fy son fracciones del medio ancho/alto visible a la distancia d. */
    const at = (d, fx, fy) => [fx * TAN * d * aspect, fy * TAN * d];

    const d0 = 8.5, dr = wide ? 1.85 : 1.15;
    const [dx, dy] = wide ? at(d0, 0.5, -0.16) : at(d0, 0, 0.22);
    door.base.set(dx, dy, 0); door.r = dr;

    const R = 1.25;
    const D = Math.max(5, wide ? 5.7 : (2 * R) / (0.64 * 2 * TAN * aspect));
    formScale = wide ? 1 : clamp((TAN * D * aspect) / 2.7, 0.5, 1);
    keys = [
      { t: 0, pos: V(0, 0, d0), look: V(0, 0, 0) },
      { t: T_DOOR, pos: V(dx, dy, 0), look: V(dx * 0.4, dy * 0.4, -10) },
    ];
    /* Las paradas no van en fila. En cada una la cámara está en otro lugar
       (más alta o más baja, corrida a un lado) y mira en otra dirección; la
       ameba se ubica en un punto distinto de la pantalla y a otra distancia.
       Con eso quedan repartidas de verdad en el espacio, y para ir de una a
       otra la cámara tiene que subir, bajar, correrse y girar.
         fx, fy  dónde cae la ameba en pantalla (fracción del medio ancho / alto)
         dist    qué tan lejos queda (menos = más grande)
       La ficha va del lado contrario a la ameba. */
    const COMP = [
      { fx: 0.42, fy: 0.0, dist: 1.0 },
      { fx: -0.44, fy: 0.12, dist: 1.02 },
      { fx: 0.38, fy: -0.2, dist: 0.9 },
      { fx: -0.36, fy: -0.14, dist: 1.14 },
      { fx: 0.46, fy: 0.14, dist: 1.06 },
      { fx: -0.42, fy: 0.0, dist: 0.9 },
      { fx: 0.36, fy: -0.18, dist: 1.1 },
    ];
    const HEIGHTS = [0.3, 1.5, -1.3, 0.7, -1.7, 1.6, -0.8];
    let k = 0;                         // las amebas alternan de lado; la pantalla del reel va al centro y no cuenta
    works.forEach((wk, i) => {
      const reel = wk.kind === 'reel';
      const cmp = reel ? { fx: 0, fy: 0.07, dist: 1.1 } : COMP[k % COMP.length], side = Math.sign(cmp.fx);
      const cx = reel ? 0 : Math.sin(k * 1.3 + 0.6) * (wide ? 2.3 : 0.4);
      const cy = (reel ? 0.5 : HEIGHTS[k % HEIGHTS.length]) * (wide ? 1 : 0.4);
      if (!reel) k++;
      const z = -15 - slot(i) * 10;
      /* La galaxia es más ancha que una ameba: se mira desde un poco más lejos. */
      const d = D * (wide ? cmp.dist : 1) * (wk.gal && wide ? 1.3 : 1);
      const P = V(cx, cy, z + d);
      /* Hacia dónde mira: gira hacia el lado de la ameba y cabecea un poco. */
      const yaw = wide ? side * 0.2 : 0, pitch = (cy > 0 ? -1 : 1) * (wide ? 0.07 : 0.03);
      const f = V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
      const r = V(0, 0, 0).crossVectors(f, UP).normalize(), u = V(0, 0, 0).crossVectors(r, f);
      /* La galaxia va un poco más hacia el centro que la ameba: si no, sus imágenes se salen por el borde. */
      const fx = wide ? cmp.fx * (wk.gal ? 0.86 : 1) : 0, fy = wide ? cmp.fy : (reel ? 0.16 : wk.gal ? 0.24 : 0.3);
      wk.base.copy(P).addScaledVector(f, d).addScaledVector(r, fx * TAN * d * aspect).addScaledVector(u, fy * TAN * d);
      if (reel) {
        /* La pantalla: apaisada, o vertical en teléfono (se decide al pedir el video). Ocupa
           buena parte del cuadro y mira hacia donde se detiene la cámara. */
        if (!wk.asked) wk.vertical = !wide;
        const ar = wk.vertical ? 9 / 16 : 16 / 9;
        let hh = 2 * TAN * d * (wk.vertical ? 0.64 : 0.6), ww = hh * ar;
        const maxW = 2 * TAN * d * aspect * (wk.vertical ? 0.84 : 0.7);
        if (ww > maxW) { ww = maxW; hh = ww / ar; }
        wk.w = ww; wk.h = hh; wk.u.uAspect.value = ar; wk.r = hh * 0.5; wk.side = 0;
        wk.mesh.position.copy(wk.base); wk.mesh.lookAt(P); wk.quat.copy(wk.mesh.quaternion);
      } else if (wk.gal) {
        /* En pantallas angostas la galaxia se achica hasta entrar a lo ancho. */
        const halfW = TAN * d * aspect;
        wk.gs = wide ? 1 : clamp((1.08 * halfW) / (RX + 0.9), 0.35, 1);   // en teléfono las imágenes de los lados pueden asomarse un poco fuera
        wk.r = 0.9 * wk.gs; wk.hitR = (RX + 0.55) * wk.gs; wk.side = wide ? side : 0;
      } else { wk.r = R; wk.side = wide ? side : 0; }
      keys.push({ t: tWork(i), hold: HOLD, pos: P, look: P.clone().addScaledVector(f, 10), arc: V(wide ? -side * 0.9 : 0, (i % 2 ? 1 : -1) * (wide ? 1.0 : 0.5), 0) });
    });
    /* Los imanes del scroll: uno por parada, a la altura exacta de la página en que
       la cámara llega a ella. */
    const total = Math.max(1, section.offsetHeight - stage.clientHeight);
    snaps.forEach((el, k) => { el.style.top = Math.round(STOPS[k] * total) + 'px'; });
    const zc = -15 - SLOTS * 10 - 17, cr = wide ? 2.5 : 1.5, dc = wide ? 10.5 : 12;
    const [cx, cy] = wide ? at(dc, 0.46, 0) : at(dc, 0, 0.4);
    core.base.set(cx, cy, zc); core.r = cr;
    keys.push({ t: 1, pos: V(0, 0, zc + dc), look: V(0, 0, zc) });
    /* Los anillos del paso van sobre el camino, de frente a quien llega. */
    if (gate) {
      path(T_CHAP, tA, tB); path(T_CHAP - 0.004, tR, tB); path(T_CHAP + 0.004, tU, tB);
      tmp.copy(tR).sub(tU).normalize();
      gate.points.position.copy(tA);
      gate.points.lookAt(tA.x + tmp.x, tA.y + tmp.y, tA.z + tmp.z);
      gate.points.scale.setScalar(wide ? 1 : clamp(aspect * 1.25, 0.5, 1));
    }
    if (still) draw(0);
  }
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  function path(p, outPos, outLook) {
    let k = 0;
    while (k < keys.length - 2 && p > keys[k + 1].t) k++;
    const a = keys[k], b = keys[k + 1];
    const t0 = a.t + (a.hold || 0), t1 = b.t - (b.hold || 0);                // quieta mientras dura la pausa de cada parada
    const u = t1 > t0 ? smooth(t0, t1, p) : (p < b.t ? 0 : 1);
    const P = outPos || camPos;
    P.lerpVectors(a.pos, b.pos, u); (outLook || camLook).lerpVectors(a.look, b.look, u);
    if (b.arc) P.addScaledVector(b.arc, Math.sin(Math.PI * u));
  }

  /* ── Portadas: sólo para el derrame, y se piden al detenerse frente a la obra ── */
  function ask(wk) {
    wk.asked = true;
    if (!wk.cover) return;
    const img = new Image();
    img.decoding = 'async';
    img.onload = function () { if (!disposed) wk.img = img; };
    img.src = wk.cover;
  }
  /* ── El reel: primero el póster y después el video ────────────────────
     Se pide recién al acercarse a su parada. El video es una versión liviana y
     sin audio (site.json → world.reel), en silencio y en bucle; con "reducir
     movimiento" no se pide y queda el póster. */
  function askReel(wk) {
    wk.asked = true;
    const poster = wk.vertical ? (wk.posterMobile || wk.poster) : wk.poster;
    if (poster) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        if (disposed || wk.playing) return;
        const tex = new THREE.Texture(img);
        tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
        disposables.push(tex);
        wk.u.uMap.value = tex; wk.hasTo = 1;
        if (still) draw(0);
      };
      img.src = poster;
    }
    const src = wk.vertical ? (wk.srcMobile || wk.src) : wk.src;
    if (still || !src) return;
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.tabIndex = -1; v.className = 'world__reelvid';
    v.src = src;
    host.appendChild(v);
    v.addEventListener('playing', function () {
      if (disposed || wk.playing) return;
      const tex = new THREE.VideoTexture(v);
      tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
      disposables.push(tex);
      wk.u.uMap.value = tex; wk.hasTo = 1; wk.playing = true;
    }, sig);
    wk.video = v;
  }
  /* La pantalla del reel, cuadro a cuadro: aparece al llegar, flota, y se
     deshace cuando la cámara avanza hacia ella. */
  function reelFrame(wk, i, tw, deep) {
    if (!wk.asked && Math.abs(p - tw) < HALF * 2.4 && Math.abs(ps - tw) < HALF * 2.4) askReel(wk);
    wk.has += (wk.hasTo - wk.has) * (still ? 1 : 0.08);
    wk.hov += ((hover === i ? 1 : 0) - wk.hov) * 0.12;
    const o = smooth(tw - HALF * 1.74, tw - HALF * 0.7, ps) * (1 - smooth(tw + HALF * 0.4, tw + HALF * 0.95, ps)) *
      deep * (entering ? 1 - smooth(0, 0.4, entering.t) : 1);
    const m = wk.mesh, u = wk.u;
    u.uOpacity.value = o; u.uHas.value = wk.has; u.uTime.value = still ? 0 : time;
    m.visible = o > 0.01;
    if (m.visible) {
      m.position.copy(wk.base); m.quaternion.copy(wk.quat);
      if (!still) {
        m.position.y += Math.sin(time * TAU / 6) * 0.05;                     // sube y baja con la respiración de 6 s
        m.rotateY(mouse.sx * 0.1 + Math.sin(time * 0.37) * 0.035);          // y se inclina hacia el cursor
        m.rotateX(-mouse.sy * 0.07 + Math.sin(time * 0.29 + 1.0) * 0.02);
      }
      const k = (1 + 2 * PAD) * (1 + 0.02 * wk.hov);
      m.scale.set(wk.w * k, wk.h * k, 1);
    }
    /* Se reproduce sólo mientras se está frente a él, y nunca detrás del reel a pantalla completa. */
    if (wk.video) {
      if (wk.away && !document.querySelector('.rf.is-open')) wk.away = false;
      const want = o > 0.2 && !wk.away && visible && !document.hidden;
      if (want && wk.video.paused) { const pr = wk.video.play(); if (pr && pr.catch) pr.catch(function () {}); }
      else if (!want && !wk.video.paused) wk.video.pause();
    }
  }
  /* ── La galaxia, cuadro a cuadro ──────────────────────────────────────
     Aparece al salir de la parada anterior, con las imágenes abiertas, que se
     juntan en su órbita al llegar; al seguir, se abren y se apaga. Las
     imágenes se piden recién al acercarse. */
  const qInv = new THREE.Quaternion();
  function askGallery(wk) {
    wk.loaded = true;
    wk.cards.forEach((c, j) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        if (disposed) return;
        const tex = new THREE.Texture(img);
        tex.anisotropy = 4; tex.needsUpdate = true;
        disposables.push(tex);
        c.u.uMap.value = tex; c.hasTo = 1;
        /* Las pantallas del ícono que muestran esta imagen (con materiales de Three.js, que
           necesitan saber que la imagen está en sRGB). */
        const mine = wk.screens.filter((sc) => sc.j === j);
        if (mine.length) {
          const t2 = new THREE.Texture(img);
          t2.colorSpace = THREE.SRGBColorSpace; t2.anisotropy = 4; t2.needsUpdate = true;
          disposables.push(t2);
          mine.forEach((sc) => { sc.mat.map = t2; sc.mat.needsUpdate = true; });
        }
        if (still) draw(0);
      };
      img.src = c.src;
    });
  }
  function galaxyFrame(wk, i, tw, dt, mine) {
    if (!wk.loaded && Math.abs(p - tw) < HALF * 2.4) askGallery(wk);
    const root = wk.mesh;
    root.position.copy(wk.base);
    const dist = camera.position.distanceTo(root.position);
    let o = smooth(tw - HALF * 1.74, tw - HALF * 0.7, ps) * (1 - smooth(tw + HALF * 0.55, tw + HALF * 1.1, ps)) * smooth(wk.far, wk.far * 0.55, dist);
    if (entering) o *= 1 - smooth(mine ? 0.02 : 0, mine ? 0.16 : 0.5, entering.t);
    wk.u.uOpacity.value = o;
    root.visible = o > 0.01;
    if (!root.visible) return o;
    /* Las imágenes se juntan al llegar y se abren al irse. */
    const gather = smooth(tw - HALF * 1.6, tw - HALF * 0.3, ps) * (1 - smooth(tw + HALF * 0.3, tw + HALF * 1.1, ps));
    const spread = 1 + 0.85 * (1 - gather);
    if (!still) wk.spin += dt * (0.07 + vel * 0.3 + wk.hov * 0.05);
    root.scale.setScalar(wk.gs * (1 + 0.04 * wk.hov));
    root.rotation.set(still ? 0 : -mouse.sy * 0.08, still ? 0 : mouse.sx * 0.22, 0);   // se inclina hacia el cursor
    /* El ícono gira despacio y respira; el corazón, además, late. */
    const ic = wk.icon;
    /* Gira entero, o se mece si se ve mejor de frente. */
    ic.rotation.y = still ? 0.35 : wk.swing ? 0.3 + Math.sin(time * 0.33 + wk.seed) * wk.swing : time * 0.32 + wk.seed;
    ic.rotation.x = still ? 0.06 : 0.06 + Math.sin(time * 0.4 + wk.seed) * 0.07;
    ic.position.y = ICON_Y + (still ? 0 : Math.sin(time * TAU / 6) * 0.07);
    const beat = wk.beat && !still ? 1 + 0.07 * heartbeat(time * 62 / 60) : 1;
    ic.scale.setScalar(ic.userData.fit * (0.88 + 0.12 * gather) * (1 + 0.06 * wk.hov) * beat);
    wk.mats.forEach((m) => { m.opacity = m.userData.base * o; });
    /* Las imágenes: en órbita, siempre de frente a quien mira, con un giro leve según dónde estén. */
    wk.orbit.updateMatrixWorld(true);
    wk.orbit.getWorldQuaternion(qInv); qInv.invert();
    wk.cards.forEach((c, j) => {
      const a = c.ang + wk.spin, R = c.rad * spread * (1 + 0.05 * wk.hov);
      c.mesh.position.set(Math.cos(a) * RX * R, c.lift + (still ? 0 : Math.sin(time * 0.5 + j * 1.7) * 0.06), Math.sin(a) * RZ * R);
      c.mesh.quaternion.copy(qInv).multiply(camera.quaternion);
      c.mesh.rotateY(-Math.cos(a) * 0.32);
      c.mesh.scale.set(c.w * c.size, c.h * c.size, 1);
      c.has += (c.hasTo - c.has) * (still ? 1 : 0.08);
      const front = 0.5 + 0.5 * Math.sin(a);                         // 1 adelante, 0 atrás
      /* La que pasa justo por delante del ícono se aclara un poco, para no taparlo. */
      const veilIcon = smooth(0.55, 0.95, front) * (1 - smooth(0.2, 0.55, Math.abs(Math.cos(a))));
      c.u.uHas.value = c.has;
      c.u.uFocus.value = 0.5 + 0.5 * front;
      c.u.uOpacity.value = o * (0.55 + 0.45 * front) * (0.4 + 0.6 * gather) * (1 - 0.5 * veilIcon);
    });
    return o;
  }
  function hush() {                    // fuera de pantalla o con la pestaña oculta, el reel no sigue corriendo
    works.forEach((wk) => { if (wk.video && !wk.video.paused) wk.video.pause(); });
  }

  /* ── El fluido del sitio como líquido del mundo ───────────────────────
     Al entrar, el velo claro se retira y una capa violeta multiplica el fluido
     (css: .world-tint). Va al lado de .veil, fuera de <main>, porque sólo así
     puede mezclarse con el canvas del fluido. */
  const veil = document.querySelector('.veil');
  const tint = document.createElement('div');
  tint.className = 'world-tint'; tint.setAttribute('aria-hidden', 'true');
  if (veil && veil.parentNode) veil.parentNode.insertBefore(tint, veil.nextSibling); else document.body.appendChild(tint);
  const invite = q('[data-w-enter]');
  const snaps = STOPS.map(() => {
    const el = document.createElement('div');
    el.className = 'world__snap'; el.setAttribute('aria-hidden', 'true');
    section.appendChild(el);
    return el;
  });
  document.documentElement.classList.add('w-snap');

  /* ── Estado ─────────────────────────────────────────────────────────── */
  const still = reduce;
  let p = 0, ps = 0, time = 0, last = 0, raf = 0, visible = true, disposed = false;
  let index = -1, shown = -2, deepOn = null, sDepth = -1, hover = -1, started = false;
  let entering = null;                 // { i, t } mientras la cámara entra a una obra
  let vel = 0, pulse = 0, push = 0, fov = 45, tintO = -1;
  const TAU = Math.PI * 2;
  const mouse = { x: 0, y: 0, sx: 0, sy: 0, in: false, cx: 0, cy: 0 };
  const tmp = new THREE.Vector3(), ray = new THREE.Vector3();
  const tA = new THREE.Vector3(), tB = new THREE.Vector3(), tR = new THREE.Vector3(), tU = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  let dirS = 1;                        // hacia dónde se avanza: 1 adelante, -1 atrás (suavizado)
  let bank = 0, lastX = null;          // ladeo de la cámara al correrse de costado

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
      const wk = works[i], isWork = wk.kind === 'work';
      /* Las obras llevan su número; el estudio, su descripción; el reel, sólo el nombre y el botón. */
      const num = String(works.slice(0, i + 1).filter((x) => x.kind === 'work').length).padStart(2, '0') + ' / ' + String(NW).padStart(2, '0');
      if (hudCount) hudCount.textContent = isWork ? num + (wk.line ? ' · ' + wk.line : '') : (wk.kind === 'reel' ? wk.title : wk.format);
      if (hudTitle) hudTitle.textContent = wk.title;
      if (hudFmt) { hudFmt.textContent = isWork ? wk.format : ''; hudFmt.hidden = !isWork; }
      if (hudDesc) { hudDesc.textContent = wk.desc; hudDesc.hidden = !wk.desc; }
      /* Las obras suman la tecnología y dónde se presentaron. */
      if (hudTags) {
        hudTags.textContent = '';
        (isWork ? wk.tags : []).forEach((tg) => { const li = document.createElement('li'); li.textContent = tg; hudTags.appendChild(li); });
        hudTags.hidden = !hudTags.children.length;
      }
      if (hudWhere) {
        hudWhere.textContent = '';
        if (isWork && wk.where) {
          const lb = document.createElement('span');
          lb.className = 'label'; lb.textContent = hudWhere.getAttribute('data-label') || '';
          hudWhere.append(lb, ' ', wk.where);
        }
        hudWhere.hidden = !(isWork && wk.where);
      }
      if (hudCredit) { hudCredit.textContent = isWork ? wk.credit : ''; hudCredit.hidden = !(isWork && wk.credit); }
      if (hudCta) hudCta.textContent = wk.cta || hudCta.getAttribute('data-default') || '';
      if (hudOpen) hudOpen.href = wk.href;
      if (hud) {
        hud.setAttribute('data-kind', wk.kind);
        hud.setAttribute('data-side', wk.side < 0 ? 'right' : 'left');   // del lado contrario a la ameba
        hud.setAttribute('data-sound', opts.reelFull ? '1' : '0');       // en teléfono el reel no tiene audio
      }
    }
    if (dots) [].forEach.call(dots.children, (b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
  }

  function draw(dt) {
    readScroll();
    ps = still ? p : ps + (p - ps) * (1 - Math.exp(-dt * 5));
    if (Math.abs(p - ps) < 0.0004) ps = p;
    time += dt;
    /* Qué tan rápido se avanza (0…1): abre un poco el ángulo de la cámara, agita las amebas y agranda el polvo. */
    vel += (clamp(Math.abs(p - ps) * 60, 0, 1) - vel) * 0.1;
    pulse *= 0.94;

    /* Profundidad: se oscurece al entrar por la puerta. */
    const deep = smooth(0.16 / SCREENS, T_DOOR, ps);
    const dq = Math.round(deep * 200) / 200;
    if (dq !== tintO) {
      tintO = dq;
      stage.style.setProperty('--deep', dq);
      tint.style.opacity = dq;
      if (veil) veil.style.opacity = 1 - 0.85 * dq;
    }
    const du = dMat.uniforms;
    du.uDeep.value = 0.25 + 0.75 * deep; du.uTime.value = still ? 0 : time; du.uBoost.value = vel + pulse;
    push += ((mouse.in ? 1 : 0) - push) * 0.08;
    du.uPush.value = push; du.uMouse.value.set(mouse.sx, mouse.sy);
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
    setOpacity(intro, 1 - smooth(0.1 / SCREENS, 0.49 / SCREENS, ps));
    setOpacity(invite, 1 - smooth(0.1 / SCREENS, 0.49 / SCREENS, ps));
    setOpacity(hud, entering ? 0 : (index >= 0 ? 1 - smooth(HALF * 0.55, HALF, bestD) : 0));
    setOpacity(end, entering ? 0 : smooth(1 - 0.57 / SCREENS, 1 - 0.12 / SCREENS, ps));
    setOpacity(dots, entering ? 0 : deep);
    /* El paso a las obras: el título aparece en el medio del tramo, mientras se cruzan los anillos. */
    const S2 = HALF * 2;
    if (chapter) setOpacity(chapter, entering || T_CHAP < 0 ? 0 : smooth(T_CHAP - S2 * 0.55, T_CHAP - S2 * 0.2, ps) * (1 - smooth(T_CHAP + S2 * 0.2, T_CHAP + S2 * 0.55, ps)));
    if (gate) {
      const gu = gate.u;
      const go = entering ? 0 : smooth(T_CHAP - S2 * 0.8, T_CHAP - S2 * 0.45, ps) * (1 - smooth(T_CHAP + S2 * 0.3, T_CHAP + S2 * 0.6, ps));
      gu.uDeep.value = go; gu.uTime.value = still ? 0 : time; gu.uBoost.value = vel * 0.35;
      gu.uPush.value = push; gu.uMouse.value.set(mouse.sx, mouse.sy);
      gate.points.visible = go > 0.01;
    }

    /* Cámara. */
    path(ps);
    mouse.sx += (mouse.x - mouse.sx) * 0.06; mouse.sy += (mouse.y - mouse.sy) * 0.06;
    if (!still) {
      if (!coarse) { camPos.x += mouse.sx * 0.3; camPos.y += mouse.sy * 0.18; }
      camPos.y += Math.sin(time * TAU / 6) * 0.045;           // la cámara respira: un ciclo cada 6 s
      const f = 45 + vel * 7;
      if (Math.abs(f - fov) > 0.02) { fov = f; camera.fov = f; camera.updateProjectionMatrix(); }
    }
    if (entering) {
      entering.t = Math.min(1, entering.t + dt / 1.25);
      const lu = liqMat.uniforms;
      lu.uT.value = entering.t; lu.uTime.value = time; lu.uAspect.value = camera.aspect;
      lu.uFade.value = smooth(0, 0.1, entering.t);
      if (entering.t >= 1 && !entering.done) { entering.done = true; if (opts.navigate) opts.navigate(works[entering.i].href); }
    }
    camera.position.copy(camPos); camera.lookAt(camLook);
    /* Al correrse de costado la cámara se ladea un poco, como un cuerpo que gira. */
    if (!still && dt > 0) {
      const vx = lastX === null ? 0 : (camPos.x - lastX) / dt;
      bank += (clamp(-vx * 0.05, -0.13, 0.13) - bank) * 0.07;
      camera.rotateZ(bank);
    }
    lastX = camPos.x;

    /* Hilos de luz y luces guía: sólo adentro, y se apagan al entrar a una obra. */
    const lights = still ? 0 : deep * (entering ? 1 - smooth(0, 0.4, entering.t) : 1);
    if (Math.abs(p - ps) > 0.0006) dirS += ((p > ps ? 1 : -1) - dirS) * 0.1;
    const ku = kMat.uniforms;
    ku.uCamZ.value = camera.position.z; ku.uTravel.value = keys[0].pos.z - camera.position.z;
    ku.uBoost.value = vel; ku.uDir.value = dirS; ku.uTime.value = time; ku.uDeep.value = lights;
    streaks.visible = lights > 0.01;
    wMat.uniforms.uTime.value = time; wMat.uniforms.uDeep.value = lights;
    wisps.visible = lights > 0.01;
    if (wisps.visible) {
      /* Van por delante de donde ESTARÁ la cámara (el scroll sin suavizar), así que se adelantan. */
      path(p, tA, tB);
      tB.sub(tA).normalize(); tR.crossVectors(tB, UP).normalize(); tU.crossVectors(tR, tB);
      heads.forEach((h, w) => {
        const ox = Math.sin(time * 0.45 + h.ph) * 1.1 - 0.5, oy = Math.cos(time * 0.6 + h.ph * 1.7) * 0.7 - 0.1;
        tmp.copy(tA).addScaledVector(tB, h.dist).addScaledVector(tR, ox).addScaledVector(tU, oy);
        const base = w * TRAIL * 3;
        if (!h.ready) {
          h.ready = true; h.pos.copy(tmp);
          for (let j = 0; j < TRAIL; j++) { wPos[base + j * 3] = tmp.x; wPos[base + j * 3 + 1] = tmp.y; wPos[base + j * 3 + 2] = tmp.z; }
        } else {
          h.pos.lerp(tmp, 0.1);
          wPos.copyWithin(base + 3, base, base + (TRAIL - 1) * 3);    // la cola es por donde pasó
        }
        wPos[base] = h.pos.x; wPos[base + 1] = h.pos.y; wPos[base + 2] = h.pos.z;
      });
      wAttr.needsUpdate = true;
    }

    const stir = vel * 0.8 + pulse * 0.5;                      // agitación general
    door.u.uWobble.value = door.wob * (1 + stir);
    door.u.uOpacity.value = place(door, still ? 1 : 1 + 0.03 * Math.sin(time * TAU / 6), 1) * (1 - smooth(T_DOOR * 0.72, T_DOOR, ps));
    door.mesh.visible = door.u.uOpacity.value > 0.01;
    core.u.uOpacity.value = place(core, 1, 0.8);
    core.mesh.visible = core.u.uOpacity.value > 0.01;
    core.u.uGlow.value = 0.35; core.u.uWobble.value = core.wob * (1 + stir);
    works.forEach((wk, i) => {
      const tw = tWork(i), off = Math.abs(ps - tw);
      if (wk.kind === 'reel') { reelFrame(wk, i, tw, deep); return; }
      if (!wk.asked && off < HALF * 1.2) ask(wk);
      const mine = entering && entering.i === i;
      wk.hov += ((hover === i ? 1 : 0) - wk.hov) * 0.12;      // la que está bajo el cursor se hincha y se agita
      let o;
      if (wk.gal) o = galaxyFrame(wk, i, tw, dt, mine);
      else {
        /* Cada ameba aparece recién al salir de la parada anterior: como alternan de lado, la
           próxima quedaría justo detrás de la ficha de la que se está mirando. */
        o = place(wk, 1 + 0.05 * wk.hov, 0.7) * smooth(tw - HALF * 1.74, tw - HALF * 0.7, ps);
        /* Al entrar, la ameba le deja el lugar al derrame y las demás se apagan. */
        wk.u.uOpacity.value = entering ? o * (1 - smooth(mine ? 0.02 : 0, mine ? 0.14 : 0.5, entering.t)) : o;
        wk.mesh.visible = wk.u.uOpacity.value > 0.01;
      }
      /* Su enjambre: se ordena al detenerse frente a la obra y se suelta al seguir. */
      const sw = wk.swarm, su = sw.u;
      const want = (!entering && off < HALF * 0.5 && vel < 0.3) ? 1 : 0;
      sw.form = still ? want : sw.form + (want - sw.form) * (1 - Math.exp(-dt * (want ? 1.6 : 4.5)));
      sw.points.position.copy(wk.mesh.position); sw.points.scale.setScalar(wk.gal ? wk.gs : formScale);
      su.uForm.value = sw.form * (1 - pulse * 0.7); su.uTime.value = still ? 0 : time;
      su.uOpacity.value = o * deep * (entering ? 1 - smooth(0, 0.35, entering.t) : 1);
      sw.points.visible = su.uOpacity.value > 0.01;
      if (wk.gal) return;
      wk.u.uFocus.value = 1 - smooth(HALF * 0.6, HALF * 1.6, off);
      wk.u.uGlow.value = 0.6 * wk.hov;
      wk.u.uLook.value.set(mouse.sx * 0.07, mouse.sy * 0.07);
      wk.u.uWobble.value = wk.wob * (1 + 0.6 * wk.hov + stir);
    });
    /* Las amebas de fondo se apagan donde se cruzan, en pantalla, con la galaxia que se está
       mirando (si están delante de ella o a su altura): si no, le pasan por encima. */
    const gals = [];
    if (GAL) works.forEach((wk) => {
      if (!wk.gal || !wk.mesh.visible) return;
      const depth = -tmp.copy(wk.mesh.position).applyMatrix4(camera.matrixWorldInverse).z;
      if (depth <= 0.5) return;
      tmp.copy(wk.mesh.position).project(camera);
      gals.push({ x: tmp.x * camera.aspect, y: tmp.y, depth, rad: ((RX + 1.1) * wk.gs) / (depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) });
    });
    extras.forEach((e) => {
      e.u.uWobble.value = e.wob * (1 + stir);
      const o = place(e, 1, 1);
      let room = 1;
      if (gals.length && o > 0.01) {
        const depth = -tmp.copy(e.mesh.position).applyMatrix4(camera.matrixWorldInverse).z;
        tmp.copy(e.mesh.position).project(camera);
        gals.forEach((g) => {
          if (depth > g.depth + RX) return;                         // muy por detrás de la galaxia: no molesta
          room = Math.min(room, smooth(g.rad * 0.95, g.rad * 1.65, Math.hypot(tmp.x * camera.aspect - g.x, tmp.y - g.y)));
        });
      }
      e.u.uOpacity.value = o * deep * room * (entering ? 1 - entering.t : 1);
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
      if (wk.kind === 'reel') {         // la pantalla: dónde cruza el rayo su plano, y si cae dentro del video
        tB.set(0, 0, 1).applyQuaternion(wk.mesh.quaternion);
        const den = tB.dot(ray); if (Math.abs(den) < 1e-4) return;
        const tr = tmp.copy(wk.mesh.position).sub(camera.position).dot(tB) / den; if (tr < 0 || tr > bestT) return;
        wk.mesh.worldToLocal(tA.copy(camera.position).addScaledVector(ray, tr));
        const lim = 0.5 / (1 + 2 * PAD);
        if (Math.abs(tA.x) < lim && Math.abs(tA.y) < lim) { bestT = tr; bestI = i; }
        return;
      }
      tmp.copy(wk.mesh.position).sub(camera.position);
      const tc = tmp.dot(ray); if (tc < 0) return;
      const d2 = tmp.lengthSq() - tc * tc, rr = wk.gal ? wk.hitR : wk.r * 1.05;
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
    /* El reel: se abre completo y con sonido (js/app.js), y el flotante espera en pausa. */
    if (works[i].kind === 'reel') { if (opts.reelFull && opts.reelFull()) works[i].away = true; return; }
    /* La del estudio lleva a una página clara, no a una ficha: no hay derrame que valga. */
    if (still || works[i].kind === 'studio') { if (opts.navigate) opts.navigate(works[i].href); return; }
    const wk = works[i], lu = liqMat.uniforms, aspect = camera.aspect;
    /* Dónde está la ameba en pantalla y de qué tamaño se ve. */
    tmp.copy(wk.mesh.position).project(camera);
    const cx = tmp.x * 0.5 + 0.5, cy = tmp.y * 0.5 + 0.5;
    const depth = -tmp.copy(wk.mesh.position).applyMatrix4(camera.matrixWorldInverse).z;
    lu.uCenter.value.set(cx, cy);
    lu.uR0.value = (0.5 * wk.r) / (Math.max(0.5, depth) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    let far = 0;                       // hasta la esquina más lejana, con margen por el borde ondulado
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach((c) => { far = Math.max(far, Math.hypot((c[0] - cx) * aspect, c[1] - cy)); });
    lu.uRMax.value = far * 1.5;
    /* La cabecera de la ficha (css: .phero): min(78vh, 740px), con 420px de mínimo. */
    const vh = Math.max(1, stage.clientHeight);
    lu.uHero.value = clamp(Math.max(420, Math.min(0.78 * vh, 740)) / vh, 0.2, 1);
    lu.uSeed.value = wk.seed;
    lu.uP0.value.set(...wk.pal[0]); lu.uP1.value.set(...wk.pal[Math.min(1, wk.pal.length - 1)]); lu.uP2.value.set(...wk.pal[Math.min(2, wk.pal.length - 1)]);
    lu.uHasImg.value = wk.img ? 1 : 0;
    if (wk.img) {
      if (!wk.full) {                  // la portada entera, para el encuadre a pantalla completa
        wk.full = new THREE.Texture(wk.img);
        wk.full.minFilter = THREE.LinearFilter; wk.full.generateMipmaps = false; wk.full.needsUpdate = true;
        disposables.push(wk.full);
      }
      lu.uFull.value = wk.full; lu.uImg.value = wk.img.naturalWidth / Math.max(1, wk.img.naturalHeight);
    } else { lu.uFull.value = blank; lu.uImg.value = 1; }
    lu.uT.value = 0; lu.uFade.value = 0;
    liquid.visible = true;
    entering = { i, t: 0, done: false };
    stage.classList.add('is-entering');
    if (sound) sound.splash('dive');
  }

  const ac = new AbortController(), sig = { signal: ac.signal };
  let downX = 0, downY = 0;
  stage.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.in = true; mouse.cx = e.clientX; mouse.cy = e.clientY;
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  }, sig);
  stage.addEventListener('pointerleave', () => { mouse.in = false; mouse.x = mouse.y = 0; hover = -1; stage.classList.remove('is-hot'); }, sig);
  host.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; }, sig);
  host.addEventListener('click', (e) => {
    if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 8) return;   // fue un arrastre o un scroll con el dedo
    const i = hit(e.clientX, e.clientY);
    if (i < 0) {                       // tocar el agua: todo se agita un momento y suena una nota
      if (deepOn && !still) { pulse = 1; if (sound && sound.chime) sound.chime((Math.random() * 6) | 0); }
      return;
    }
    if (Math.abs(ps - tWork(i)) > HALF * 0.7) scrollToT(tWork(i)); else enter(i);  // si está lejos, primero se va hasta ella
  }, sig);
  /* "Entra al mundo interior": lleva hasta la primera obra. */
  if (invite) invite.addEventListener('click', () => scrollToT(tWork(0)), sig);
  /* Flechas izquierda y derecha: parada anterior y siguiente (arriba y abajo siguen siendo el scroll normal). */
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    if (e.altKey || e.metaKey || e.ctrlKey || !visible || entering) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    let k = 0;
    STOPS.forEach((v, i) => { if (Math.abs(v - p) < Math.abs(STOPS[k] - p)) k = i; });
    const next = clamp(k + (e.key === 'ArrowRight' ? 1 : -1), 0, STOPS.length - 1);
    if (next === k) return;
    e.preventDefault();
    scrollToT(STOPS[next]);
  }, sig);
  if (hudOpen) hudOpen.addEventListener('click', (e) => {
    if (shown >= 0 && works[shown].kind === 'reel') { e.preventDefault(); enter(shown); return; }
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
      b.setAttribute('aria-label', wk.title);
      b.addEventListener('click', () => scrollToT(tWork(i)), sig);
      dots.appendChild(b);
    });
  }
  window.addEventListener('scroll', () => { if (still) draw(0); }, { passive: true, signal: ac.signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) hush(); kick(); }, sig);
  const ro = ('ResizeObserver' in window) ? new ResizeObserver(layout) : null;
  if (ro) ro.observe(stage); else window.addEventListener('resize', layout, sig);
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) kick(); else hush(); }) : null;
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
      works.forEach((wk) => { if (wk.video) { wk.video.pause(); wk.video.removeAttribute('src'); wk.video.load(); wk.video.remove(); } });
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (e) {}
      canvas.remove();
      if (dots) dots.textContent = '';
      tint.remove();
      snaps.forEach((el) => el.remove());
      document.documentElement.classList.remove('w-snap');
      if (veil) veil.style.opacity = '';
      document.documentElement.classList.remove('is-under');
    },
  };
}
