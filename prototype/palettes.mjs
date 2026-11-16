/* Extrae una paleta de cada portada: la simulación de fluido toma sus colores
   de la obra en vez de una paleta fija escrita a mano. */
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const doc = JSON.parse(await readFile(new URL('./projects.json', import.meta.url), 'utf8'));
const raw = doc.projects;

const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (mx === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h, s: mx ? d / mx : 0, v: mx };
}
function fromHsv(h, s, v) {
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const m = [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i % 6];
  return m.map(x => x * 255);
}

async function paletteFor(coverPath) {
  const { data, info } = await sharp(coverPath)
    .resize(80, 45, { fit: 'fill' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });

  // Histograma grueso: 5 bits por canal.
  const bins = new Map();
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let e = bins.get(k);
    if (!e) bins.set(k, (e = { n: 0, r: 0, g: 0, b: 0 }));
    e.n++; e.r += r; e.g += g; e.b += b;
  }
  const all = [...bins.values()].map(e => ({ n: e.n, r: e.r / e.n, g: e.g / e.n, b: e.b / e.n }));

  // Media global → fondo claro (el fluido necesita un fondo luminoso, como el #adc8ed actual)
  let tr = 0, tg = 0, tb = 0, tn = 0;
  for (const c of all) { tr += c.r * c.n; tg += c.g * c.n; tb += c.b * c.n; tn += c.n; }
  const avg = { r: tr / tn, g: tg / tn, b: tb / tn };
  const ah = hsv(avg.r, avg.g, avg.b);
  // Fondo claro pero con cuerpo: el #adc8ed original está en v≈0.93 / s≈0.27.
  const back = fromHsv(ah.h, Math.max(0.14, Math.min(0.32, ah.s * 0.7)), 0.88);

  // Colores de simulación: los más presentes, con saturación real y separados en tono.
  const cand = all
    .map(c => ({ ...c, ...hsv(c.r, c.g, c.b) }))
    .filter(c => c.s > 0.18 && c.v > 0.16 && c.v < 0.99)
    .sort((a, b) => b.n * (0.45 + a.s * 0.55) - a.n * (0.45 + b.s * 0.55));

  const picked = [];
  for (const c of cand) {
    if (picked.length >= 5) break;
    const clash = picked.some(p => {
      const d = Math.abs(p.h - c.h);
      return Math.min(d, 1 - d) < 0.055 && Math.abs(p.v - c.v) < 0.22;
    });
    if (!clash) picked.push(c);
  }
  while (picked.length && picked.length < 4) picked.push(picked[picked.length - 1]);
  if (!picked.length) return null;

  // Empujar saturación/valor: el fluido multiplica por 0.119, los apagados desaparecen.
  const colors = picked.map(c => {
    const s = Math.min(1, c.s * 1.28 + 0.14);
    const v = Math.min(1, Math.max(0.55, c.v * 1.18));
    const [r, g, b] = fromHsv(c.h, s, v);
    return hex(r, g, b);
  });

  // Ancla oscura, con triple peso. La paleta oficial lleva #3530a0 tres veces
  // por la misma razón: sin un tono profundo en la mezcla el fondo se aclara
  // entero y el texto blanco encima deja de leerse. Una obra de pasteles
  // (Collective Pulse) es justo el caso que lo rompe.
  const lead = picked[0];
  const [ar, ag, ab] = fromHsv(lead.h, Math.min(1, lead.s * 1.15 + 0.28), 0.34);
  const anchor = hex(ar, ag, ab);

  return {
    palette: [anchor, anchor, anchor, ...colors, colors[0]],
    back: hex(...back),
  };
}

for (const p of raw) {
  try {
    const res = await paletteFor(p.cover);
    if (res) { p.palette = res.palette; p.back = res.back; }
    console.log(p.slug.padEnd(28), res ? res.palette.join(' ') + '   fondo ' + res.back : 'sin paleta');
  } catch (e) {
    console.log(p.slug.padEnd(28), 'ERROR', e.message);
  }
}
await writeFile(new URL('./projects.json', import.meta.url), JSON.stringify(doc, null, 2), 'utf8');
console.log('\nlisto');
