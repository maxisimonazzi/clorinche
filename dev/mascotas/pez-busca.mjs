// Busca parámetros de escamas (y posición de la aleta lateral) del pez que den zonas grandes y parejas.
// Uso: cd dev && node mascotas/pez-busca.mjs
import path from 'node:path';
import { launch, fileUrl, DEV } from '../lib.mjs';
import { escamas } from './escamas.mjs';

const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
await t.page.addScriptTag({ path: path.join(DEV, 'mascotas', 'zonelib.js') });
const base = await t.page.evaluate(() => CL.drawings.get('pez').inner);
const finM = base.match(/<g id="aleta"[^>]*>([\s\S]*?)<\/g>/);
const make = (p, fin) => {
  const e = escamas(p);
  return base
    .replace(/<path d="M370 267Q470 500 370 733" fill="none"\/>/, `<path d="${e.gill}" fill="none"/>`)
    .replace(/<path d="M397 261[^"]*"/, `<path d="${e.d}"`)
    .replace(finM[0], fin ? `<g transform="translate(${fin.dx} ${fin.dy}) rotate(${fin.a} 470 590)">${finM[1]}</g>` : '');
};
const score = (zs) => {
  let s = 0;
  for (const z of zs) {
    if (z.x < 330 || z.x > 800) continue; // sólo la zona de escamas
    if (z.area <= 6) { s += 30; continue; }
    if (z.area < 2000) s += 1000 + (2000 - z.area);
    if (z.grosor < 32) s += (32 - z.grosor) * 40;
  }
  return s;
};
const evalInner = (inner) => t.page.evaluate((i) => window.zoneList(i, 700), inner);

const cands = [];
const G = JSON.parse(process.argv[2] || "null");
if (G) cands.push(...G); else for (const b of [66, 74, 82]) for (const s of [60, 68, 76]) for (const h of [150, 170, 190])
  for (const x0 of [440, 463, 486]) for (const y0 of [480, 500]) cands.push({ b, s, h, x0, y0 });
const res = [];
for (const p of cands) {
  const r = await evalInner(make(p, null));
  const n = r.zones.filter((z) => z.x >= 330 && z.x <= 800 && z.area > 6).length;
  res.push({ p, s: score(r.zones), n });
}
res.sort((a, b) => a.s - b.s);
console.log('escamas (sin aleta):');
for (const r of res.slice(0, 8)) console.log(JSON.stringify(r));

const best = [];
for (const r of res.slice(0, 4)) {
  for (let a = -20; a <= 20; a += 10) for (let dx = -40; dx <= 60; dx += 20) for (let dy = -40; dy <= 40; dy += 20) {
    const fin = { a, dx, dy };
    const z = await evalInner(make(r.p, fin));
    best.push({ p: r.p, fin, s: score(z.zones) });
  }
}
best.sort((a, b) => a.s - b.s || Math.abs(a.fin.dx) + Math.abs(a.fin.dy) - Math.abs(b.fin.dx) - Math.abs(b.fin.dy));
console.log('con aleta:');
for (const r of best.slice(0, 10)) console.log(JSON.stringify(r));
await t.close();
