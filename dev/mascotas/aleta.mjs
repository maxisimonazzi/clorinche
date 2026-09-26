// Busca la posición/giro de la aleta lateral del pez que no deje zonas chicas ni tiras finas
// entre la aleta y las escamas.  Uso: cd dev && node mascotas/aleta.mjs
import path from 'node:path';
import { launch, fileUrl, DEV } from '../lib.mjs';

const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
await t.page.addScriptTag({ path: path.join(DEV, 'mascotas', 'zonelib.js') });

const res = await t.page.evaluate(async () => {
  const inner = CL.drawings.get('pez').inner;
  const m = inner.match(/<g id="aleta"[^>]*>([\s\S]*?)<\/g>/);
  if (!m) throw new Error('no encontré <g id="aleta">');
  const fin = m[1];
  const score = (zs) => {
    let s = 0;
    for (const z of zs) {
      if (z.x > 200 && z.x < 330 && z.y > 380 && z.y < 500) continue; // brillitos del ojo
      if (z.area < 1600) s += 1000 + (1600 - z.area);
      if (z.grosor < 30) s += (30 - z.grosor) * 40;
    }
    return s;
  };
  const out = [];
  for (let a = -20; a <= 20; a += 10)
    for (let dx = -60; dx <= 60; dx += 10)
      for (let dy = -50; dy <= 50; dy += 10) {
        const g = `<g transform="translate(${dx} ${dy}) rotate(${a} 470 590)">${fin}</g>`;
        const r = await window.zoneList(inner.replace(m[0], g), 700);
        out.push({ a, dx, dy, s: score(r.zones) });
      }
  out.sort((p, q) => p.s - q.s);
  return out.slice(0, 15);
});
for (const r of res) console.log(JSON.stringify(r));
await t.close();
