/* ═══════════════════════════════════════════════════════════════════════════
   Alma Digital — el mundo interior (PÁGINA DE PRUEBA: inner-world.html)

   Un recorrido en 3D por las obras principales. Idea tomada de
   mirages.nrly.fun (Nathan Riley, Unseen Studio), llevada a la marca:

     · la primera pantalla es sólo el título; se entra por una ameba grande,
       la del logo, que es la puerta;
     · adentro, la primera parada es la ameba del estudio, con su descripción;
       después vienen las obras y al final un cierre (todas las obras, el
       estudio, contacto);
     · las amebas están repartidas en el espacio: a distinta altura, a un lado
       u otro, más cerca o más lejos, y la cámara gira hacia cada una. Al
       avanzar sube, baja, se corre, gira y se ladea;
     · adentro está oscuro y cada obra flota dentro de una ameba de vidrio que
       deforma su portada como una gota;
     · el fondo sigue siendo el fluido del sitio, teñido de violeta profundo:
       sus remolinos son el "líquido" de este mundo y responden al cursor;
     · hay polvo en suspensión y tres corrientes de partículas que giran
       alrededor del camino;
     · cada obra tiene su enjambre: suelto mientras se pasa, y al detenerse
       frente a ella se ordena en una forma propia (anillos, madeja, domo…);
     · al avanzar, unos hilos de luz se adelantan y dos luces con cola van
       por delante, como guías;
     · se avanza con el scroll NORMAL de la página (no se secuestra la rueda):
       la sección es alta y el escenario queda fijo mientras se la recorre;
     · un clic en una ameba (o en "Entrar a la obra") la derrama como un
       líquido hasta cubrir la pantalla, y ese líquido se asienta en la
       cabecera de la ficha, que se abre a continuación.

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

    /* La portada se corre un poco con el cursor, como al mirar dentro de una bola de cristal. */
    vec3 img = texture2D(uMap, 0.5 + d * 0.5 * (0.74 + 0.26 * r * r) + uLook * (1.0 - r * r)).rgb;
    img *= mix(1.0, 0.6, smoothstep(0.55, 1.0, r));
    img *= 0.72 + 0.28 * uFocus;
    vec3 col = mix(glow, img, uHasMap);

    /* Película líquida: bandas de color que se arrastran por la superficie, como en una pompa de jabón. */
    float film = 0.5 + 0.5 * sin(d.x * 5.0 + sin(d.y * 6.0 + uTime * 0.45 + uSeed) * 1.6 + uTime * 0.3);
    vec3 irid = 0.5 + 0.5 * cos(6.2832 * (fres * 0.9 + film * 0.35 + vec3(0.02, 0.36, 0.62)) + uSeed);
    col = mix(col, vec3(0.93, 0.86, 1.0), fres * 0.55);
    col += irid * (fres * 0.22 + film * smoothstep(0.35, 1.0, r) * 0.1);
    vec3 L1 = normalize(vec3(-0.55, 0.75, 0.6)), L2 = normalize(vec3(0.7, -0.35, 0.5));
    col += smoothstep(0.62, 0.97, dot(N, L1)) * mix(0.09, 0.22, uHasMap);
    col += pow(max(dot(N, normalize(L1 + V)), 0.0), 260.0) * mix(0.3, 0.7, uHasMap);
    col += pow(max(dot(N, normalize(L2 + V)), 0.0), 60.0) * mix(0.08, 0.22, uHasMap);
    col += uGlow * vec3(0.55, 0.42, 1.0) * (0.12 + 0.5 * fres);

    float soft = mix(0.34, 0.95, fres);
    float a = mix(mix(soft, 0.94, uSolid), 0.98, uHasMap);
    gl_FragColor = vec4(col, a * uOpacity);
  }`;

/* Partículas: polvo que deriva y titila, y corrientes (aFlow) que giran
   alrededor del camino. El cursor las aparta y crecen cuando se avanza rápido. */
const DUST_VERT = `
  attribute float aSize, aSeed, aTint, aFlow;
  uniform float uPx, uTime, uBoost, uPush;
  uniform vec2 uMouse;
  varying float vFade; varying float vTint;
  void main() {
    vec3 p = position;
    if (aFlow > 0.5) {
      float a = uTime * 0.045, c = cos(a), s = sin(a);
      p.xy = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
      p.y *= 0.62;
    }
    p.x += sin(uTime * 0.21 + aSeed * 6.3) * 0.3;
    p.y += cos(uTime * 0.17 + aSeed * 9.1) * 0.26;
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
   donde estaba hasta cubrir la pantalla, con el borde ondulando. Adentro, la
   portada pasa de verse como a través de la gota a verse plana, y al final se
   acomoda en el encuadre y el degradado que tiene la cabecera de la ficha
   (css: .phero), así el cambio de página casi no se nota. Es un plano a
   pantalla completa, dibujado encima de todo.
   uT 0…1: hasta 0,62 crece; desde 0,62 se asienta. */
const LIQ_VERT = `
  varying vec2 vUv;
  void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const LIQ_FRAG = `
  uniform sampler2D uFull;
  uniform float uT, uTime, uAspect, uR0, uRMax, uHero, uImg, uSeed, uFade;
  uniform vec2 uCenter;
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

    /* Un solo muestreo cuyo encuadre va cambiando (mezclar dos imágenes se veía doble):
       como en la gota → portada a pantalla completa → encuadre de la cabecera de la ficha. */
    vec2 q = p / max(R, 1e-4); float rr = min(length(q), 1.0);
    vec2 lens = 0.5 + q * 0.5 * (0.74 + 0.26 * rr * rr);         // la gota mostraba el cuadrado del centro
    vec2 dropUV = vec2(0.5 + (lens.x - 0.5) / uImg, lens.y);
    vec2 bend = dir * band * band * 0.05 * (1.0 - settle);       // el frente dobla la imagen
    vec2 fullUV = coverUV(vUv - bend, uAspect);
    vec2 box = vec2(vUv.x, (vUv.y - (1.0 - uHero)) / uHero);     // la cabecera de la ficha: la franja de arriba
    vec2 heroUV = coverUV(box, uAspect / uHero);
    vec2 uv = mix(mix(dropUV, fullUV, smoothstep(0.0, 0.55, uT)), heroUV, settle);
    vec3 col = texture2D(uFull, uv).rgb;

    col = mix(col, vec3(0.93, 0.86, 1.0), pow(band, 5.0) * 0.45 * (1.0 - settle));
    vec3 irid = 0.5 + 0.5 * cos(6.2832 * (band * 0.9 + vec3(0.02, 0.36, 0.62)) + uSeed);
    col += irid * pow(band, 2.5) * 0.2 * (1.0 - settle);

    /* Al asentarse: el mismo degradado de .phero::after, y se abre por debajo de la cabecera. */
    float shade = box.y < 0.46 ? mix(0.9, 0.36, box.y / 0.46) : mix(0.36, 0.3, (box.y - 0.46) / 0.54);
    col = mix(col, mix(col, vec3(0.031, 0.027, 0.094), clamp(shade, 0.0, 1.0)), settle);
    float below = 1.0 - smoothstep(-0.03, 0.0, box.y);
    gl_FragColor = vec4(col, inside * (1.0 - below * settle) * uFade);
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
  const hudDesc = q('[data-w-desc]'), hudCta = q('[data-w-cta]');

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
        uGlow: { value: 0 }, uSolid: { value: o.solid || 0 }, uLook: { value: new THREE.Vector2() },
        uA: { value: new THREE.Vector3(...o.a) }, uB: { value: new THREE.Vector3(...o.b) }, uC: { value: new THREE.Vector3(...o.c) },
      },
    });
    disposables.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { mesh, u: mat.uniforms, r: 1, base: new THREE.Vector3(), drift: o.drift || 0, seed: o.seed, far: o.far || 30, wob: o.wobble, hov: 0 };
  }
  const door = ameba(geoBig, { seed: 1.7, wobble: 1, solid: 1, a: C.violet, b: C.pink, c: C.mist });
  const core = ameba(geoBig, { seed: 4.2, wobble: 1, solid: 1, a: C.purple, b: C.lilac, c: C.mist, far: 44 });
  const works = links.map((a, i) => {
    const w = ameba(geoBig, { seed: 2.3 + i * 1.9, wobble: 0.55, a: C.violet, b: C.blue, c: C.lilac });
    w.href = a.href; w.cover = a.getAttribute('data-cover');
    w.title = a.getAttribute('data-title') || ''; w.format = a.getAttribute('data-format') || '';
    w.kind = a.getAttribute('data-kind') || 'work';        // 'studio': la ameba del estudio, que abre la parada
    w.desc = a.getAttribute('data-desc') || ''; w.cta = a.getAttribute('data-cta') || '';
    w.asked = false; w.mix = 0; w.mixTo = 0;
    return w;
  });
  const NW = works.filter((x) => x.kind !== 'studio').length;      // obras de verdad, sin la ameba del estudio
  const palette = [[C.violet, C.pink, C.mist], [C.blue, C.lilac, C.mist], [C.purple, C.pink, C.lilac], [C.blue, C.violet, C.pink]];
  const extras = [];
  for (let i = 0; i < (coarse ? 12 : 30); i++) {
    const p = palette[i % palette.length];
    const e = ameba(geoSmall, { seed: rnd(0, 20), wobble: 1.15, a: p[0], b: p[1], c: p[2], drift: rnd(0.15, 0.5) });
    const side = i % 2 ? 1 : -1;
    e.base.set(side * rnd(2.8, 6.6), rnd(-3.6, 3.6), rnd(-6, -96));
    e.r = i % 3 ? rnd(0.08, 0.3) : rnd(0.3, 0.85);       // muchas chicas, unas pocas grandes
    extras.push(e);
  }

  /* ── Polvo en suspensión: da la sensación de avanzar ────────────────── */
  const LOOSE = coarse ? 800 : 2200, FLOW = coarse ? 800 : 2400, DN = LOOSE + FLOW;
  const dPos = new Float32Array(DN * 3), dSize = new Float32Array(DN), dSeed = new Float32Array(DN);
  const dTint = new Float32Array(DN), dFlow = new Float32Array(DN);
  for (let i = 0; i < DN; i++) {
    dSeed[i] = Math.random(); dTint[i] = Math.random();
    if (i < LOOSE) {                   // polvo suelto
      dPos[i * 3] = rnd(-8, 8); dPos[i * 3 + 1] = rnd(-4.5, 4.5); dPos[i * 3 + 2] = rnd(4, -104);
      dSize[i] = Math.random() < 0.07 ? rnd(2.4, 4.4) : rnd(0.7, 1.7);
    } else {                           // tres corrientes en hélice alrededor del camino
      const k = i % 3, z = rnd(2, -104), a = z * 0.22 + k * 2.094 + rnd(-0.22, 0.22), rad = 3.3 + k * 0.6 + rnd(-0.4, 0.4);
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
      uPush: { value: 0 }, uMouse: { value: new THREE.Vector2(9, 9) },
    },
  });
  const dust = new THREE.Points(dGeo, dMat);
  dust.frustumCulled = false;
  scene.add(dust);
  disposables.push(dGeo, dMat);

  /* ── Enjambre por obra ───────────────────────────────────────────────── */
  const SN = coarse ? 220 : 560;
  const hex = (c) => { const h = c.trim().replace('#', ''); return [0, 2, 4].map((k) => parseInt(h.substr(k, 2), 16) / 255); };
  links.forEach((a, i) => {
    const kind = a.getAttribute('data-form'), make = FORMS[kind] || FORMS.halo, fx = FORM_FX[kind] || FORM_FX.halo;
    const list = (a.getAttribute('data-colors') || '').split(',').filter(Boolean);
    const pal = (list.length ? list : ['#c99ef9', '#f2b8dd', '#8fb0ff', '#ffffff']).map(hex);
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
    const tilt = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(fx.tilt[0], 0, fx.tilt[1])));
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
      uFade: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    },
  });
  const liquid = new THREE.Mesh(liqGeo, liqMat);
  liquid.frustumCulled = false; liquid.renderOrder = 10; liquid.visible = false;
  scene.add(liquid);
  disposables.push(liqGeo, liqMat);

  /* ── Recorrido ──────────────────────────────────────────────────────
     Tiempos (0…1 del scroll): puerta, una parada por obra, final. Entre dos
     paradas la cámara acelera y frena, así que se detiene frente a cada obra. */
  const T_DOOR = 0.07, T_FIRST = 0.17, T_LAST = 0.86;   // puerta · primera parada (el estudio) · última obra
  const tWork = (i) => (n === 1 ? 0.5 : lerp(T_FIRST, T_LAST, i / (n - 1)));
  const HALF = n === 1 ? 0.2 : (T_LAST - T_FIRST) / (n - 1) / 2;
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
    works.forEach((wk, i) => {
      const cmp = COMP[i % COMP.length], side = Math.sign(cmp.fx);
      const cx = Math.sin(i * 1.3 + 0.6) * (wide ? 2.3 : 0.4);
      const cy = HEIGHTS[i % HEIGHTS.length] * (wide ? 1 : 0.4);
      const z = -15 - i * 10;
      const d = D * (wide ? cmp.dist : 1);
      const P = V(cx, cy, z + d);
      /* Hacia dónde mira: gira hacia el lado de la ameba y cabecea un poco. */
      const yaw = wide ? side * 0.2 : 0, pitch = (cy > 0 ? -1 : 1) * (wide ? 0.07 : 0.03);
      const f = V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
      const r = V(0, 0, 0).crossVectors(f, UP).normalize(), u = V(0, 0, 0).crossVectors(r, f);
      const fx = wide ? cmp.fx : 0, fy = wide ? cmp.fy : 0.3;
      wk.base.copy(P).addScaledVector(f, d).addScaledVector(r, fx * TAN * d * aspect).addScaledVector(u, fy * TAN * d);
      wk.r = R; wk.side = wide ? side : 0;
      keys.push({ t: tWork(i), pos: P, look: P.clone().addScaledVector(f, 10), arc: V(wide ? -side * 0.9 : 0, (i % 2 ? 1 : -1) * (wide ? 1.0 : 0.5), 0) });
    });
    const zc = -15 - (n - 1) * 10 - 17, cr = wide ? 2.5 : 1.5, dc = wide ? 10.5 : 12;
    const [cx, cy] = wide ? at(dc, 0.46, 0) : at(dc, 0, 0.4);
    core.base.set(cx, cy, zc); core.r = cr;
    keys.push({ t: 1, pos: V(0, 0, zc + dc), look: V(0, 0, zc) });
    if (still) draw(0);
  }
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  function path(p, outPos, outLook) {
    let k = 0;
    while (k < keys.length - 2 && p > keys[k + 1].t) k++;
    const a = keys[k], b = keys[k + 1];
    const u = smooth(0, 1, (p - a.t) / (b.t - a.t));
    const P = outPos || camPos;
    P.lerpVectors(a.pos, b.pos, u); (outLook || camLook).lerpVectors(a.look, b.look, u);
    if (b.arc) P.addScaledVector(b.arc, Math.sin(Math.PI * u));
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
      wk.u.uMap.value = tex; wk.mixTo = 1; wk.img = img;
      if (still) draw(0);
    };
    img.src = wk.cover;
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
      const wk = works[i];
      const isStudio = wk.kind === 'studio';
      /* La ameba del estudio no lleva número ni formato: lleva su descripción. */
      if (hudCount) hudCount.textContent = isStudio ? wk.format : String(works.slice(0, i + 1).filter((x) => x.kind !== 'studio').length).padStart(2, '0') + ' / ' + String(NW).padStart(2, '0');
      if (hudTitle) hudTitle.textContent = wk.title;
      if (hudFmt) { hudFmt.textContent = isStudio ? '' : wk.format; hudFmt.hidden = isStudio; }
      if (hudDesc) { hudDesc.textContent = wk.desc; hudDesc.hidden = !wk.desc; }
      if (hudCta) hudCta.textContent = wk.cta || hudCta.getAttribute('data-default') || '';
      if (hudOpen) hudOpen.href = wk.href;
      if (hud) hud.setAttribute('data-side', wk.side < 0 ? 'right' : 'left');   // del lado contrario a la ameba
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
    const deep = smooth(0.02, T_DOOR, ps);
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
    setOpacity(intro, 1 - smooth(0.012, 0.06, ps));
    setOpacity(invite, 1 - smooth(0.012, 0.06, ps));
    setOpacity(hud, entering ? 0 : (index >= 0 ? 1 - smooth(HALF * 0.55, HALF, bestD) : 0));
    setOpacity(end, entering ? 0 : smooth(0.93, 0.985, ps));
    setOpacity(dots, entering ? 0 : deep);

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
      if (!wk.asked && tWork(i) - ps < HALF * 4.5) ask(wk);
      wk.mix += (wk.mixTo - wk.mix) * (still ? 1 : 0.06);
      const mine = entering && entering.i === i;
      wk.hov += ((hover === i ? 1 : 0) - wk.hov) * 0.12;      // la que está bajo el cursor se hincha y se agita
      /* Cada ameba aparece recién al salir de la parada anterior: como alternan de lado, la
         próxima quedaría justo detrás de la ficha de la que se está mirando. */
      const o = place(wk, 1 + 0.05 * wk.hov, 0.7) * smooth(tWork(i) - 0.1, tWork(i) - 0.04, ps);
      /* Al entrar, la ameba le deja el lugar al derrame y las demás se apagan. */
      wk.u.uOpacity.value = entering ? o * (1 - smooth(mine ? 0.02 : 0, mine ? 0.14 : 0.5, entering.t)) : o;
      wk.mesh.visible = wk.u.uOpacity.value > 0.01;
      /* Su enjambre: se ordena al detenerse frente a la obra y se suelta al seguir. */
      const sw = wk.swarm, su = sw.u;
      const want = (!entering && Math.abs(ps - tWork(i)) < HALF * 0.5 && vel < 0.3) ? 1 : 0;
      sw.form = still ? want : sw.form + (want - sw.form) * (1 - Math.exp(-dt * (want ? 1.6 : 4.5)));
      sw.points.position.copy(wk.mesh.position); sw.points.scale.setScalar(formScale);
      su.uForm.value = sw.form * (1 - pulse * 0.7); su.uTime.value = still ? 0 : time;
      su.uOpacity.value = o * deep * (entering ? 1 - smooth(0, 0.35, entering.t) : 1);
      sw.points.visible = su.uOpacity.value > 0.01;
      wk.u.uHasMap.value = wk.mix;
      wk.u.uFocus.value = 1 - smooth(HALF * 0.6, HALF * 1.6, Math.abs(ps - tWork(i)));
      wk.u.uGlow.value = 0.6 * wk.hov;
      wk.u.uLook.value.set(mouse.sx * 0.07, mouse.sy * 0.07);
      wk.u.uWobble.value = wk.wob * (1 + 0.6 * wk.hov + stir);
    });
    extras.forEach((e) => {
      e.u.uWobble.value = e.wob * (1 + stir);
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
  const STOPS = [0].concat(works.map((_, i) => tWork(i)), [1]);
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
      tint.remove();
      if (veil) veil.style.opacity = '';
      document.documentElement.classList.remove('is-under');
    },
  };
}
