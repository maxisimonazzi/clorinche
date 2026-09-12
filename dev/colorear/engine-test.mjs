// Prueba rápida del motor: tiempos de zonas y balde, y coloreado al azar.
import { launch, appUrl, saveDataUrl, SHOTS } from '../lib.mjs';
import path from 'node:path';
const t = await launch({ size: 'desktop' });
await t.page.goto(appUrl('inicio'));
await t.page.waitForTimeout(400);
const r = await t.page.evaluate(async () => {
  const ids = CL.drawings.all().map((d) => d.id);
  const id = ids[0];
  const src = await CL.coloring.loadSource(id, 2048);
  const lines = CL.coloring.rasterLines(src.image, src.w, src.h);
  let t0 = performance.now();
  const map = CL.regions.compute(lines);
  const sync = performance.now() - t0;
  t0 = performance.now();
  const map2 = await CL.regions.computeAsync(lines);
  const asy = performance.now() - t0;
  const p = CL.coloring.createPainter({ w: src.w, h: src.h, regions: map, lines });
  const times = [];
  for (let i = 0; i < map.count; i++) {
    if (map.locked[i]) continue;
    const b = map.bbox[i];
    // punto dentro de la zona
    let px = -1, py = -1;
    for (let y = b.y0; y <= b.y1 && px < 0; y += 3) for (let x = b.x0; x <= b.x1; x += 3) if (map.label[y * map.w + x] === i && map.at(x+2,y+2)===i) { px = x+2; py = y+2; break; }
    if (px < 0) continue;
    t0 = performance.now();
    await p.fillAt(px, py, { kind: ['solid','rainbow','gradient','sparkle','dots'][i % 5], color: CL.util.hsl(i * 47, 80, 60).replace(/hsla\((\d+),(\d+)%,(\d+)%,1\)/, (m) => m) }, { animate: false });
    times.push(performance.now() - t0);
  }
  const out = CL.coloring.composite(p.canvas, lines, 1024, 1024);
  const rr = await CL.coloring.renderRandom(id, 800, { bg: '#d6f0ff', withStats: true });
  return { ids, id, count: map.count, bg: map.bg, sync, asy, fills: times.length, fillAvg: times.reduce((a, b) => a + b, 0) / times.length, fillMax: Math.max(...times), png: out.toDataURL(), rnd: rr.canvas.toDataURL(), stats: rr.stats };
});
saveDataUrl(r.png, path.join(SHOTS, 'colorear', 'engine-fills.png'));
saveDataUrl(r.rnd, path.join(SHOTS, 'colorear', 'engine-random.png'));
delete r.png; delete r.rnd;
console.log(JSON.stringify(r, null, 1));
console.log(t.errors);
await t.close();
