// Lista las zonas diminutas (bloqueadas) y las zonas angostas de cada dibujo de la granja,
// con su centro en coordenadas del lienzo (0..1000), para revisar que sólo sean brillitos.
//   node granja/zonas.mjs [ids separados por coma]
import path from 'node:path';
import { launch, fileUrl, DEV } from '../lib.mjs';

const ids = (process.argv[2] || 'vaca,chancho,gallina,oveja,caballo,pato').split(',');
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
for (const id of ids) {
  const out = await t.page.evaluate(async (id) => {
    const RES = 2048, K = 1000 / RES;
    const src = await raster(id);
    const { label, sizes, n } = regions(src.getContext('2d', { willReadFrequently: true }), RES, RES);
    const bg = label[2 * RES + 2];
    const acc = Array.from({ length: n }, () => ({ sx: 0, sy: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1 }));
    for (let p = 0; p < label.length; p++) {
      const l = label[p]; if (l < 0) continue;
      const x = p % RES, y = (p / RES) | 0, a = acc[l];
      a.sx += x; a.sy += y; if (x < a.x0) a.x0 = x; if (x > a.x1) a.x1 = x; if (y < a.y0) a.y0 = y; if (y > a.y1) a.y1 = y;
    }
    const min = 0.0004 * RES * RES;
    const res = [];
    for (let i = 0; i < n; i++) {
      if (i === bg) continue;
      const a = acc[i], s = sizes[i];
      const w = (a.x1 - a.x0 + 1) * K, h = (a.y1 - a.y0 + 1) * K;
      // "Ancho medio" aproximado: área / lado mayor del rectángulo (en unidades del lienzo).
      const grosor = (s * K * K) / Math.max(w, h);
      if (s < min || grosor < 30) res.push({ tipo: s < min ? 'diminuta' : 'angosta', cx: Math.round(a.sx / s * K), cy: Math.round(a.sy / s * K), w: Math.round(w), h: Math.round(h), grosor: Math.round(grosor) });
    }
    return res;
  }, id);
  console.log(id, JSON.stringify(out));
}
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
